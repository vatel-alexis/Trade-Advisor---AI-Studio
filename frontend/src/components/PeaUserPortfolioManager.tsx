"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthContext";
import { EquityLines, type Line } from "@/components/LabCharts";
import type { PeaPortfolioConfig, PeaReport, PeaWeights } from "@/lib/api";
import { dateTime, eur, eur2, pct, pnlClass, signedEur, signedPct } from "@/lib/format";
import { buildCustomPortfolioCurve, computePeriodReturn, simulateDcaCurve } from "@/lib/peaCalc";

const PERIODS = [1, 3, 5, 10, 15];

export function PeaUserPortfolioManager({
  report,
  initialConfig,
  initialLevelKey,
}: {
  report: PeaReport;
  initialConfig: PeaPortfolioConfig;
  initialLevelKey?: string;
}) {
  const { user, getFreshToken } = useAuth();
  const [inputMode, setInputMode] = useState<"eur" | "pct">(initialConfig.input_mode || "eur");
  const [targetLevelKey, setTargetLevelKey] = useState<string>(
    initialLevelKey || initialConfig.target_level || "moyen",
  );
  const [holdingsEur, setHoldingsEur] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const a of report.assets) {
      base[a.key] = initialConfig.holdings_eur?.[a.key] ?? 0;
    }
    return base;
  });
  const [holdingsPct, setHoldingsPct] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const a of report.assets) {
      base[a.key] = Math.round((initialConfig.holdings_pct?.[a.key] ?? 0) * 1000) / 10;
    }
    return base;
  });
  const [totalCapitalPctMode, setTotalCapitalPctMode] = useState<number>(initialConfig.total_capital || 25_000);
  const [cashToInvest, setCashToInvest] = useState<number>(initialConfig.cash_available ?? 0);
  const [horizon, setHorizon] = useState<string>("10");
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialConfig.updated_at);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const token = await getFreshToken();
      if (!token) return;
      const res = await fetch("/api/pea/portfolio", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && !cancelled) {
        const cfg = (await res.json()) as PeaPortfolioConfig;
        setInputMode(cfg.input_mode || "eur");
        if (!initialLevelKey && cfg.target_level) setTargetLevelKey(cfg.target_level);
        if (cfg.holdings_eur) setHoldingsEur(cfg.holdings_eur);
        if (cfg.holdings_pct) {
          const nextPct: Record<string, number> = {};
          for (const a of report.assets) {
            nextPct[a.key] = Math.round((cfg.holdings_pct[a.key] ?? 0) * 1000) / 10;
          }
          setHoldingsPct(nextPct);
        }
        if (cfg.total_capital) setTotalCapitalPctMode(cfg.total_capital);
        if (typeof cfg.cash_available === "number") setCashToInvest(cfg.cash_available);
        setLastSavedAt(cfg.updated_at);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getFreshToken, initialLevelKey, report.assets]);

  const targetLevel =
    report.levels.find((l) => l.key === targetLevelKey) ??
    report.levels.find((l) => l.key === "moyen") ??
    report.levels[0];

  const priceByAsset = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sc of report.scores) {
      if (sc.price && sc.price > 0) map[sc.asset] = sc.price;
    }
    if (!map.cash) map.cash = 104.5;
    return map;
  }, [report.scores]);

  // Derived totals and normalized weights from either EUR mode or PCT mode
  const { totalInvestedEur, totalPortfolioEur, currentWeights, currentAmountsEur, rawPctSum } = useMemo(() => {
    if (inputMode === "eur") {
      const invested = report.assets.reduce((acc, a) => acc + Math.max(0, holdingsEur[a.key] ?? 0), 0);
      const total = invested + Math.max(0, cashToInvest);
      const weights: PeaWeights = {};
      const amounts: Record<string, number> = {};
      for (const a of report.assets) {
        const val = Math.max(0, holdingsEur[a.key] ?? 0);
        amounts[a.key] = val;
        weights[a.key] = invested > 0 ? val / invested : 0;
      }
      return {
        totalInvestedEur: invested,
        totalPortfolioEur: total,
        currentWeights: weights,
        currentAmountsEur: amounts,
        rawPctSum: 100,
      };
    } else {
      const sumPct = report.assets.reduce((acc, a) => acc + Math.max(0, holdingsPct[a.key] ?? 0), 0);
      const cap = Math.max(0, totalCapitalPctMode);
      const total = cap + Math.max(0, cashToInvest);
      const weights: PeaWeights = {};
      const amounts: Record<string, number> = {};
      for (const a of report.assets) {
        const p = Math.max(0, holdingsPct[a.key] ?? 0);
        const normW = sumPct > 0 ? p / sumPct : 0;
        weights[a.key] = normW;
        amounts[a.key] = Math.round(cap * (p / 100));
      }
      return {
        totalInvestedEur: cap,
        totalPortfolioEur: total,
        currentWeights: weights,
        currentAmountsEur: amounts,
        rawPctSum: Math.round(sumPct * 10) / 10,
      };
    }
  }, [inputMode, report.assets, holdingsEur, holdingsPct, totalCapitalPctMode, cashToInvest]);

  // Switch between EUR and PCT while keeping values synchronized
  function handleSwitchMode(nextMode: "eur" | "pct") {
    if (nextMode === inputMode) return;
    if (nextMode === "pct") {
      setTotalCapitalPctMode(totalInvestedEur > 0 ? Math.round(totalInvestedEur) : 25_000);
      const nextPct: Record<string, number> = {};
      for (const a of report.assets) {
        nextPct[a.key] = Math.round((currentWeights[a.key] ?? 0) * 1000) / 10;
      }
      setHoldingsPct(nextPct);
    } else {
      const nextEur: Record<string, number> = {};
      for (const a of report.assets) {
        nextEur[a.key] = Math.round(currentAmountsEur[a.key] ?? 0);
      }
      setHoldingsEur(nextEur);
    }
    setInputMode(nextMode);
  }

  function handleNormalizePct() {
    if (rawPctSum <= 0) return;
    const next: Record<string, number> = {};
    for (const a of report.assets) {
      next[a.key] = Math.round(((holdingsPct[a.key] ?? 0) / rawPctSum) * 1000) / 10;
    }
    setHoldingsPct(next);
  }

  function handleApplyTargetToInputs() {
    const cap = totalPortfolioEur > 0 ? totalPortfolioEur : 25_000;
    const nextEur: Record<string, number> = {};
    const nextPct: Record<string, number> = {};
    for (const a of report.assets) {
      const tw = targetLevel.target[a.key] ?? 0;
      nextEur[a.key] = Math.round(cap * tw);
      nextPct[a.key] = Math.round(tw * 1000) / 10;
    }
    setHoldingsEur(nextEur);
    setHoldingsPct(nextPct);
    setTotalCapitalPctMode(cap);
    setCashToInvest(0);
    setFeedback(`Portefeuille aligné sur la cible ${targetLevel.label}. Pensez à enregistrer.`);
  }

  async function handleSavePortfolio() {
    setSaving(true);
    setFeedback(null);
    const normPctRecord: Record<string, number> = {};
    for (const a of report.assets) {
      normPctRecord[a.key] = Math.round((currentWeights[a.key] ?? 0) * 10000) / 10000;
    }
    try {
      const token = await getFreshToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/pea/portfolio", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          input_mode: inputMode,
          target_level: targetLevel.key,
          total_capital: totalInvestedEur,
          cash_available: cashToInvest,
          holdings_eur: currentAmountsEur,
          holdings_pct: normPctRecord,
        }),
      });
      if (res.ok) {
        const saved = (await res.json()) as PeaPortfolioConfig;
        setLastSavedAt(saved.updated_at);
        setFeedback("Portefeuille enregistré en base de données PostgreSQL.");
      } else {
        setFeedback("Erreur lors de la sauvegarde du portefeuille.");
      }
    } catch {
      setFeedback("Erreur réseau lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  // Rebalancing plan rows (exact € to buy or sell for each ETF)
  const rebalancingRows = useMemo(() => {
    const capitalForTarget = totalPortfolioEur > 0 ? totalPortfolioEur : 10_000;
    return report.assets.map((asset) => {
      const currentEur = currentAmountsEur[asset.key] ?? 0;
      const currentW = totalPortfolioEur > 0 ? currentEur / totalPortfolioEur : 0;
      const targetW = targetLevel.target[asset.key] ?? 0;
      const targetEur = Math.round(capitalForTarget * targetW);
      const deltaEur = targetEur - currentEur;
      const deltaW = targetW - currentW;
      const unitPrice = priceByAsset[asset.key] ?? 50;
      const estShares = unitPrice > 0 ? Math.round((Math.abs(deltaEur) / unitPrice) * 10) / 10 : 0;

      let action: "acheter" | "vendre" | "conserver" = "conserver";
      if (deltaEur >= 25) action = "acheter";
      else if (deltaEur <= -25) action = "vendre";

      return {
        asset,
        currentEur,
        currentW,
        targetEur,
        targetW,
        deltaEur,
        deltaW,
        unitPrice,
        estShares,
        action,
      };
    });
  }, [report.assets, currentAmountsEur, totalPortfolioEur, targetLevel.target, priceByAsset]);

  // Alignment score: 1 - 0.5 * sum(|w_current - w_target|)
  const alignmentScore = useMemo(() => {
    const sumAbsDiff = rebalancingRows.reduce((acc, r) => acc + Math.abs(r.currentW - r.targetW), 0);
    return Math.max(0, Math.min(1, 1 - sumAbsDiff / 2));
  }, [rebalancingRows]);

  function exportRebalancingCsv() {
    const headers = [
      "ETF",
      "Ticker",
      "ISIN",
      "Actuel (EUR)",
      "Actuel (%)",
      "Cible (EUR)",
      "Cible (%)",
      "Action",
      "Montant Ordre (EUR)",
      "Cours Indicatif (EUR)",
      "Parts Estimées",
    ];
    const rows = rebalancingRows.map((r) => [
      r.asset.label,
      r.asset.ticker,
      r.asset.isin ?? "",
      Math.round(r.currentEur),
      (r.currentW * 100).toFixed(1),
      Math.round(r.targetEur),
      (r.targetW * 100).toFixed(1),
      r.action.toUpperCase(),
      Math.round(r.deltaEur),
      r.unitPrice.toFixed(2),
      r.estShares,
    ]);
    const csv = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-ordres-pea-${targetLevel.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Historical & Simulated Performance of "Mon portefeuille" vs "Répartition cible"
  const userCustomCurve = useMemo(
    () => buildCustomPortfolioCurve(report, currentWeights),
    [report, currentWeights],
  );

  const simCapital = totalPortfolioEur > 0 ? totalPortfolioEur : 10_000;

  const userSim = useMemo(
    () => simulateDcaCurve(userCustomCurve, simCapital, 0, horizon),
    [userCustomCurve, simCapital, horizon],
  );
  const targetSim = useMemo(
    () => simulateDcaCurve(targetLevel.curve, simCapital, 0, horizon),
    [targetLevel.curve, simCapital, horizon],
  );
  const worldCurve = report.asset_curves?.world ?? report.benchmark_curve;
  const worldSim = useMemo(
    () => simulateDcaCurve(worldCurve, simCapital, 0, horizon),
    [worldCurve, simCapital, horizon],
  );

  const comparisonLines: Line[] = useMemo(
    () => [
      {
        label: `Répartition cible (${targetLevel.label})`,
        color: "#3fe3ea",
        dashed: false,
        points: targetSim.pointsEur,
      },
      {
        label: "Mon portefeuille actuel",
        color: "#5a4ee6",
        dashed: false,
        points: userSim.pointsEur,
      },
      {
        label: "MSCI World (WPEA)",
        color: "#f2b84b",
        dashed: true,
        points: worldSim.pointsEur,
      },
    ],
    [targetLevel.label, targetSim.pointsEur, userSim.pointsEur, worldSim.pointsEur],
  );

  const cagrDiff = targetSim.cagr - userSim.cagr;
  const gainDiffEur = targetSim.finalValue - userSim.finalValue;
  const ddDiff = userSim.maxDrawdown - targetSim.maxDrawdown;

  const card = "rounded-2xl border border-line bg-surface p-4 sm:p-5";
  const th = "px-2.5 py-2 font-medium";
  const td = "px-2.5 py-2 tabular-nums";

  return (
    <div className="space-y-6">
      {/* Top Bar: Profile target selector + Dual input mode toggle + Save button */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold">
              Composition de mon portefeuille PEA
            </h2>
            <p className="text-xs text-muted">
              Saisissez vos positions actuelles en <b>euros (€)</b> ou en <b>pourcentages (%)</b> pour calculer vos ordres de rééquilibrage et comparer votre performance.
              {lastSavedAt ? ` · Dernière sauvegarde : ${dateTime(lastSavedAt)}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dual mode toggle: EUR vs PCT */}
            <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1 text-xs">
              <button
                type="button"
                onClick={() => handleSwitchMode("eur")}
                className={`rounded-lg px-3 py-1.5 font-mono font-medium transition-colors ${
                  inputMode === "eur"
                    ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Montants (€)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("pct")}
                className={`rounded-lg px-3 py-1.5 font-mono font-medium transition-colors ${
                  inputMode === "pct"
                    ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Pourcentages (%)
              </button>
            </div>

            <button
              type="button"
              onClick={handleApplyTargetToInputs}
              className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-foreground"
            >
              Pré-remplir avec la cible
            </button>

            <button
              type="button"
              onClick={handleSavePortfolio}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 font-mono text-xs font-bold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Enregistrer mon portefeuille"}
            </button>
          </div>
        </div>

        {feedback ? (
          <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs text-accent">
            {feedback}
          </div>
        ) : null}

        {/* Target Profile Selector & Global Capital Bar */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted">
              Profil cible de référence
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {report.levels.map((lv) => {
                const active = lv.key === targetLevel.key;
                return (
                  <button
                    key={lv.key}
                    type="button"
                    onClick={() => setTargetLevelKey(lv.key)}
                    className={`rounded-xl border px-2.5 py-2 text-center text-xs font-semibold transition-all ${
                      active
                        ? "border-accent bg-accent/15 text-accent ring-1 ring-accent/40"
                        : "border-line bg-surface-2 text-muted hover:text-foreground"
                    }`}
                  >
                    {lv.label}
                  </button>
                );
              })}
            </div>
          </div>

          {inputMode === "pct" ? (
            <div>
              <label
                htmlFor="portfolio-total-capital"
                className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted"
              >
                Valeur totale des ETF détenus (€)
              </label>
              <input
                id="portfolio-total-capital"
                type="number"
                min={0}
                step={500}
                value={totalCapitalPctMode}
                onChange={(e) => setTotalCapitalPctMode(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-sm font-bold text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <div className="mb-1.5 font-mono text-xs uppercase tracking-wider text-muted">
                Total investi sur les ETF
              </div>
              <div className="flex h-[38px] items-center rounded-xl border border-line bg-surface-2/60 px-3.5 font-mono text-base font-bold tabular-nums">
                {eur(totalInvestedEur)}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="portfolio-cash-available"
              className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted"
            >
              Liquidités espèces à investir (€)
            </label>
            <input
              id="portfolio-cash-available"
              type="number"
              min={0}
              step={100}
              value={cashToInvest}
              onChange={(e) => setCashToInvest(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-sm font-bold text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* ETF Holdings Grid */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {report.assets.map((asset) => {
            const targetW = targetLevel.target[asset.key] ?? 0;
            const currW = currentWeights[asset.key] ?? 0;
            const currEur = currentAmountsEur[asset.key] ?? 0;
            return (
              <div
                key={asset.key}
                className={`rounded-xl border p-3 transition-colors ${
                  targetW > 0 ? "border-accent/35 bg-surface-2/70" : "border-line bg-surface-2/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{asset.label}</span>
                  <span className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-accent">
                    {asset.ticker}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-muted">
                  {asset.isin ?? "ETF PEA"} · Cible {pct(targetW)}
                </div>

                <div className="mt-2.5 relative">
                  {inputMode === "eur" ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        aria-label={`Montant ${asset.label} en euros`}
                        value={holdingsEur[asset.key] ?? 0}
                        onChange={(e) =>
                          setHoldingsEur((prev) => ({
                            ...prev,
                            [asset.key]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 pr-10 font-mono text-sm font-bold tabular-nums focus:border-accent focus:outline-none"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-xs text-muted">
                        €
                      </span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        aria-label={`Poids ${asset.label} en pourcentage`}
                        value={holdingsPct[asset.key] ?? 0}
                        onChange={(e) =>
                          setHoldingsPct((prev) => ({
                            ...prev,
                            [asset.key]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 pr-10 font-mono text-sm font-bold tabular-nums focus:border-accent focus:outline-none"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-xs text-muted">
                        %
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted tabular-nums">
                  <span>Actuel : { inputMode === "eur" ? pct(currW) : eur(currEur) }</span>
                  <span className={Math.abs(currW - targetW) < 0.02 ? "text-success" : "text-warning"}>
                    Écart {signedPct(currW - targetW)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Summary KPI Tile inside the grid */}
          <div className="flex flex-col justify-between rounded-xl border border-accent/40 bg-accent/10 p-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
                Valorisation totale PEA
              </div>
              <div className="mt-1 font-display text-2xl font-extrabold tabular-nums">
                {eur(totalPortfolioEur)}
              </div>
              <div className="mt-1 text-xs text-muted">
                Dont {eur(cashToInvest)} de liquidités à investir
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-accent/25 pt-2 font-mono text-xs">
              <span>Score d&apos;alignement :</span>
              <b className={alignmentScore >= 0.9 ? "text-success" : "text-warning"}>
                {pct(alignmentScore)}
              </b>
            </div>
            {inputMode === "pct" && Math.abs(rawPctSum - 100) > 0.1 ? (
              <button
                type="button"
                onClick={handleNormalizePct}
                className="mt-2 w-full rounded-lg bg-warning/20 py-1 font-mono text-[11px] font-semibold text-warning hover:bg-warning/30"
              >
                Total = {rawPctSum} % · Normaliser à 100 %
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Section 2: Exact Rebalancing Order Plan (in € and shares) */}
      <div className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">
              Plan d&apos;ordres de rééquilibrage vers le profil {targetLevel.label}
            </h2>
            <p className="text-xs text-muted">
              Montants exacts à acheter ou vendre sur votre PEA ({eur(totalPortfolioEur)}) pour atteindre la répartition cible du mois.
            </p>
          </div>
          <button
            type="button"
            onClick={exportRebalancingCsv}
            className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
          >
            Exporter les ordres (CSV)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className={th}>ETF PEA</th>
                <th className={`${th} text-right`}>Position actuelle</th>
                <th className={`${th} text-right`}>Poids actuel</th>
                <th className={`${th} text-right`}>Cible ({targetLevel.label})</th>
                <th className={`${th} text-right`}>Poids cible</th>
                <th className={`${th} text-right`}>Action recommandée</th>
                <th className={`${th} text-right`}>Montant de l&apos;ordre</th>
                <th className={`${th} text-right`}>Qté indicative</th>
              </tr>
            </thead>
            <tbody>
              {rebalancingRows.map((row) => (
                <tr key={row.asset.key} className="border-t border-line">
                  <td className={td}>
                    <div className="font-medium">{row.asset.label}</div>
                    <div className="font-mono text-[11px] text-muted">
                      {row.asset.ticker} {row.asset.isin ? `· ${row.asset.isin}` : ""}
                    </div>
                  </td>
                  <td className={`${td} text-right font-mono`}>{eur(row.currentEur)}</td>
                  <td className={`${td} text-right font-mono text-muted`}>{pct(row.currentW)}</td>
                  <td className={`${td} text-right font-mono font-semibold`}>{eur(row.targetEur)}</td>
                  <td className={`${td} text-right font-mono font-semibold text-accent`}>{pct(row.targetW)}</td>
                  <td className={`${td} text-right`}>
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-bold uppercase ${
                        row.action === "acheter"
                          ? "bg-success/15 text-success"
                          : row.action === "vendre"
                            ? "bg-danger/15 text-danger"
                            : "bg-surface-2 text-muted"
                      }`}
                    >
                      {row.action === "acheter"
                        ? "Acheter"
                        : row.action === "vendre"
                          ? "Vendre"
                          : "Conserver"}
                    </span>
                  </td>
                  <td
                    className={`${td} text-right font-mono font-bold ${
                      row.action === "acheter"
                        ? "text-success"
                        : row.action === "vendre"
                          ? "text-danger"
                          : "text-muted"
                    }`}
                  >
                    {row.action === "conserver" ? "0 €" : signedEur(row.deltaEur)}
                  </td>
                  <td className={`${td} text-right font-mono text-xs text-muted`}>
                    {row.action === "conserver"
                      ? "—"
                      : `≈ ${row.estShares.toLocaleString("fr-FR")} part${row.estShares >= 2 ? "s" : ""} (${eur2(row.unitPrice)})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Performance Comparison — Mon portefeuille vs Répartition cible */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">
              Comparatif de performance : Mon portefeuille vs Répartition cible ({targetLevel.label})
            </h2>
            <p className="text-xs text-muted">
              Backtest historique comparant le maintien de votre répartition actuelle face à la stratégie dynamique cible ({targetLevel.label}) sur un capital de {eur(simCapital)}.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-line bg-surface p-1 text-xs">
            {[
              { key: "3", label: "3 ans" },
              { key: "5", label: "5 ans" },
              { key: "10", label: "10 ans" },
              { key: "all", label: "Depuis 2007" },
            ].map((h) => (
              <button
                key={h.key}
                type="button"
                onClick={() => setHorizon(h.key)}
                className={`rounded-lg px-2.5 py-1 font-mono transition-colors ${
                  horizon === h.key ? "bg-accent/20 font-semibold text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Comparative KPI Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className={card}>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Rendement annuel · Mon portefeuille
            </div>
            <div className={`mt-1 font-display text-xl font-bold tabular-nums ${pnlClass(userSim.cagr)}`}>
              {signedPct(userSim.cagr)} / an
            </div>
            <div className="mt-1 text-xs text-muted">
              Capital final : <b className="font-mono text-foreground">{eur(userSim.finalValue)}</b>
            </div>
          </div>

          <div className={card}>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Rendement annuel · Cible {targetLevel.label}
            </div>
            <div className={`mt-1 font-display text-xl font-bold tabular-nums text-accent`}>
              {signedPct(targetSim.cagr)} / an
            </div>
            <div className="mt-1 text-xs text-muted">
              Capital final : <b className="font-mono text-foreground">{eur(targetSim.finalValue)}</b>
            </div>
          </div>

          <div className={card}>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Gain additionnel de la cible
            </div>
            <div className={`mt-1 font-display text-xl font-bold tabular-nums ${pnlClass(gainDiffEur)}`}>
              {signedEur(gainDiffEur)}
            </div>
            <div className="mt-1 text-xs text-muted">
              Soit {signedPct(cagrDiff)} de rendement annuel
            </div>
          </div>

          <div className={card}>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Protection contre les baisses (Max DD)
            </div>
            <div className="mt-1 font-display text-xl font-bold tabular-nums text-danger">
              {pct(-userSim.maxDrawdown)} vs {pct(-targetSim.maxDrawdown)}
            </div>
            <div className="mt-1 text-xs text-muted">
              {ddDiff > 0
                ? `La cible réduit le drawdown de ${pct(ddDiff)}`
                : "Profil défensif sur les replis"}
            </div>
          </div>
        </div>

        {/* Comparative Chart */}
        <div className={card}>
          <h3 className="mb-2 font-display text-base font-bold">
            Courbe comparée ({eur(simCapital)} investis sur la période sélectionnée)
          </h3>
          <EquityLines currency="EUR" capital={simCapital} lines={comparisonLines} />
        </div>

        {/* Multi-period Comparative Table */}
        <div className={card}>
          <h3 className="mb-3 font-display text-base font-bold">
            Rendements annualisés comparés par durée de détention
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className={th}>Allocation</th>
                  {PERIODS.map((p) => (
                    <th key={p} className={`${th} text-right`}>
                      {p} an{p === 1 ? "" : "s"}
                    </th>
                  ))}
                  <th className={`${th} text-right`}>Depuis 2007</th>
                  <th className={`${th} text-right`}>Baisse max</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line bg-indigo/10">
                  <td className={`${td} font-semibold`}>Mon portefeuille actuel</td>
                  {PERIODS.map((p) => {
                    const r = computePeriodReturn(userCustomCurve, p);
                    return (
                      <td key={p} className={`${td} text-right font-mono ${pnlClass(r)}`}>
                        {signedPct(r)}
                      </td>
                    );
                  })}
                  <td className={`${td} text-right font-mono font-bold ${pnlClass(userSim.cagr)}`}>
                    {signedPct(computePeriodReturn(userCustomCurve, 20))}
                  </td>
                  <td className={`${td} text-right font-mono text-danger`}>
                    {pct(-simulateDcaCurve(userCustomCurve, 10_000, 0, "all").maxDrawdown)}
                  </td>
                </tr>

                <tr className="border-t border-line bg-accent/5">
                  <td className={`${td} font-semibold text-accent`}>
                    Répartition cible ({targetLevel.label})
                  </td>
                  {PERIODS.map((p) => {
                    const r = targetLevel.summary.periods[String(p)];
                    return (
                      <td key={p} className={`${td} text-right font-mono font-medium ${pnlClass(r)}`}>
                        {signedPct(r)}
                      </td>
                    );
                  })}
                  <td className={`${td} text-right font-mono font-bold ${pnlClass(targetLevel.summary.cagr)}`}>
                    {signedPct(targetLevel.summary.cagr)}
                  </td>
                  <td className={`${td} text-right font-mono text-danger`}>
                    {pct(-targetLevel.summary.max_drawdown)}
                  </td>
                </tr>

                <tr className="border-t border-line text-muted">
                  <td className={td}>Écart (Cible − Mon portefeuille)</td>
                  {PERIODS.map((p) => {
                    const rUser = computePeriodReturn(userCustomCurve, p) ?? 0;
                    const rTarget = targetLevel.summary.periods[String(p)] ?? 0;
                    const diff = rTarget - rUser;
                    return (
                      <td key={p} className={`${td} text-right font-mono ${pnlClass(diff)}`}>
                        {signedPct(diff)}
                      </td>
                    );
                  })}
                  <td
                    className={`${td} text-right font-mono font-bold ${pnlClass(
                      (targetLevel.summary.cagr ?? 0) - (computePeriodReturn(userCustomCurve, 20) ?? 0),
                    )}`}
                  >
                    {signedPct((targetLevel.summary.cagr ?? 0) - (computePeriodReturn(userCustomCurve, 20) ?? 0))}
                  </td>
                  <td className={`${td} text-right font-mono`}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
