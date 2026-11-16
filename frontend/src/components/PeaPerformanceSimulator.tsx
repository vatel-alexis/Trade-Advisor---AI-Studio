"use client";

import { useMemo, useState } from "react";

import { EquityLines, type Line } from "@/components/LabCharts";
import type { PeaBenchmark, PeaPortfolioConfig, PeaReport } from "@/lib/api";
import { day, eur, pct, pnlClass, signedEur, signedPct } from "@/lib/format";
import { simulateDcaCurve } from "@/lib/peaCalc";

const INITIAL_PRESETS = [5_000, 10_000, 25_000, 50_000, 100_000];
const DCA_PRESETS = [0, 100, 250, 500, 1_000];
const HORIZONS = [
  { key: "all", label: "Depuis 2007 (20 ans)" },
  { key: "15", label: "15 ans" },
  { key: "10", label: "10 ans" },
  { key: "5", label: "5 ans" },
  { key: "3", label: "3 ans" },
  { key: "1", label: "1 an" },
];

const LEVEL_COLORS: Record<string, string> = {
  securite: "#2bd48f",
  moyen: "#3fe3ea",
  dynamique: "#5a4ee6",
};

const BENCHMARK_META: { key: string; label: string; ticker: string; color: string }[] = [
  { key: "sp500", label: "S&P 500", ticker: "PSP5", color: "#f2b84b" },
  { key: "nasdaq", label: "Nasdaq-100", ticker: "PUST", color: "#f25a6b" },
  { key: "world", label: "MSCI World", ticker: "WPEA", color: "#a855f7" },
  { key: "europe", label: "Europe Stoxx 600", ticker: "PCEU", color: "#ec4899" },
  { key: "emerging", label: "Émergents", ticker: "PAEEM", color: "#14b8a6" },
  { key: "japan", label: "Japon Topix", ticker: "PTPXE", color: "#94a3b8" },
];

const PERIODS = ["1", "3", "5", "10", "15"];

export function PeaPerformanceSimulator({
  report,
  initialConfig,
}: {
  report: PeaReport;
  initialConfig: PeaPortfolioConfig;
}) {
  const [initialCapital, setInitialCapital] = useState<number>(initialConfig.sim_initial_capital || 10_000);
  const [monthlyDca, setMonthlyDca] = useState<number>(initialConfig.sim_monthly_dca ?? 200);
  const [horizon, setHorizon] = useState<string>(initialConfig.sim_horizon || "all");
  const [chartMode, setChartMode] = useState<"EUR" | "PCT">("EUR");
  const [showInvestedLine, setShowInvestedLine] = useState<boolean>(true);
  const [activeLevels, setActiveLevels] = useState<string[]>(["securite", "moyen", "dynamique"]);
  const [activeBenchmarks, setActiveBenchmarks] = useState<string[]>(
    initialConfig.sim_benchmarks?.length ? initialConfig.sim_benchmarks : ["sp500", "nasdaq", "world"],
  );
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const toggleLevel = (key: string) => {
    setActiveLevels((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) : [...prev, key],
    );
  };

  const toggleBenchmark = (key: string) => {
    setActiveBenchmarks((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const levelSims = useMemo(() => {
    return Object.fromEntries(
      report.levels.map((lv) => [
        lv.key,
        simulateDcaCurve(lv.curve, initialCapital, monthlyDca, horizon),
      ]),
    );
  }, [report.levels, initialCapital, monthlyDca, horizon]);

  const benchmarkSims = useMemo(() => {
    const curves = report.asset_curves ?? { sp500: report.benchmark_curve };
    return Object.fromEntries(
      BENCHMARK_META.map((bm) => [
        bm.key,
        simulateDcaCurve(curves[bm.key] ?? report.benchmark_curve, initialCapital, monthlyDca, horizon),
      ]),
    );
  }, [report.asset_curves, report.benchmark_curve, initialCapital, monthlyDca, horizon]);

  const chartLines = useMemo(() => {
    const lines: Line[] = [];

    for (const lv of report.levels) {
      if (!activeLevels.includes(lv.key)) continue;
      const sim = levelSims[lv.key];
      if (!sim) continue;
      lines.push({
        label: `Profil ${lv.label}`,
        color: LEVEL_COLORS[lv.key] ?? "var(--series-1)",
        dashed: false,
        points: chartMode === "EUR" ? sim.pointsEur : sim.pointsPct,
      });
    }

    for (const bm of BENCHMARK_META) {
      if (!activeBenchmarks.includes(bm.key)) continue;
      const sim = benchmarkSims[bm.key];
      if (!sim) continue;
      lines.push({
        label: `${bm.label} (${bm.ticker})`,
        color: bm.color,
        dashed: true,
        points: chartMode === "EUR" ? sim.pointsEur : sim.pointsPct,
      });
    }

    const firstSim = levelSims[activeLevels[0] ?? "moyen"] ?? levelSims.moyen;
    if (chartMode === "EUR" && showInvestedLine && monthlyDca > 0 && firstSim?.pointsInvested.length) {
      lines.push({
        label: "Total des versements cumulés",
        color: "#64748b",
        dashed: true,
        points: firstSim.pointsInvested,
      });
    }

    return lines;
  }, [
    report.levels,
    activeLevels,
    activeBenchmarks,
    levelSims,
    benchmarkSims,
    chartMode,
    showInvestedLine,
    monthlyDca,
  ]);

  async function handleSavePreferences() {
    setSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch("/api/pea/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sim_initial_capital: initialCapital,
          sim_monthly_dca: monthlyDca,
          sim_horizon: horizon,
          sim_benchmarks: activeBenchmarks,
        }),
      });
      if (res.ok) {
        setSaveFeedback("Paramètres de simulation enregistrés en base de données.");
      } else {
        setSaveFeedback("Erreur lors de la sauvegarde.");
      }
    } catch {
      setSaveFeedback("Erreur réseau lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  const refSim = levelSims.moyen ?? Object.values(levelSims)[0];
  const yearsList = Object.keys(report.levels[0]?.summary.yearly ?? {})
    .sort()
    .reverse();

  const card = "rounded-2xl border border-line bg-surface p-4 sm:p-5";
  const th = "px-2.5 py-2 font-medium";
  const td = "px-2.5 py-2 tabular-nums";

  return (
    <div className="space-y-6">
      {/* Interactive Configuration Panel */}
      <div className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="font-display text-lg font-bold">
              Paramètres de simulation &amp; Comparateur d&apos;indices
            </h2>
            <p className="text-xs text-muted">
              Configurez votre versement initial, vos investissements mensuels (DCA), la période et les indices de référence à comparer.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveFeedback ? (
              <span className="font-mono text-xs text-success">{saveFeedback}</span>
            ) : null}
            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={saving}
              className="rounded-lg bg-accent/15 px-3.5 py-1.5 font-mono text-xs font-semibold text-accent ring-1 ring-accent/40 transition-colors hover:bg-accent/25 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Enregistrer mes paramètres"}
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Initial Capital */}
          <div className="space-y-2">
            <label htmlFor="sim-initial-capital" className="block font-mono text-xs uppercase tracking-wider text-muted">
              Montant d&apos;investissement initial (€)
            </label>
            <div className="relative">
              <input
                id="sim-initial-capital"
                type="number"
                min={0}
                step={500}
                value={initialCapital}
                onChange={(e) => setInitialCapital(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-base font-bold text-foreground focus:border-accent focus:outline-none"
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-mono text-xs text-muted">
                EUR
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INITIAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInitialCapital(preset)}
                  className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${
                    initialCapital === preset
                      ? "bg-accent/20 font-semibold text-accent ring-1 ring-accent/40"
                      : "border border-line bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {eur(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly DCA */}
          <div className="space-y-2">
            <label htmlFor="sim-monthly-dca" className="block font-mono text-xs uppercase tracking-wider text-muted">
              Investissement mensuel régulier — DCA (€ / mois)
            </label>
            <div className="relative">
              <input
                id="sim-monthly-dca"
                type="number"
                min={0}
                step={50}
                value={monthlyDca}
                onChange={(e) => setMonthlyDca(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-base font-bold text-foreground focus:border-accent focus:outline-none"
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-mono text-xs text-muted">
                € / mois
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DCA_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMonthlyDca(preset)}
                  className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${
                    monthlyDca === preset
                      ? "bg-accent/20 font-semibold text-accent ring-1 ring-accent/40"
                      : "border border-line bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {preset === 0 ? "0 € (sans DCA)" : `+${eur(preset)}/m`}
                </button>
              ))}
            </div>
          </div>

          {/* Horizon & Chart Mode */}
          <div className="space-y-2">
            <label htmlFor="sim-horizon" className="block font-mono text-xs uppercase tracking-wider text-muted">
              Période d&apos;analyse &amp; Affichage
            </label>
            <select
              id="sim-horizon"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm font-medium text-foreground focus:border-accent focus:outline-none"
            >
              {HORIZONS.map((h) => (
                <option key={h.key} value={h.key}>
                  {h.label}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMode("EUR")}
                  className={`rounded-md px-2.5 py-1 font-mono transition-colors ${
                    chartMode === "EUR" ? "bg-accent/20 font-semibold text-accent" : "text-muted hover:text-foreground"
                  }`}
                >
                  Valeur (€)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode("PCT")}
                  className={`rounded-md px-2.5 py-1 font-mono transition-colors ${
                    chartMode === "PCT" ? "bg-accent/20 font-semibold text-accent" : "text-muted hover:text-foreground"
                  }`}
                >
                  Gain net (%)
                </button>
              </div>
              {chartMode === "EUR" && monthlyDca > 0 ? (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={showInvestedLine}
                    onChange={(e) => setShowInvestedLine(e.target.checked)}
                    className="accent-accent"
                  />
                  Afficher cumul versé
                </label>
              ) : null}
            </div>
          </div>
        </div>

        {/* Series Toggles: 3 Risk Profiles + 6 Reference Benchmarks */}
        <div className="mt-5 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
              Profils PEA affichés sur le graphique
            </div>
            <div className="flex flex-wrap gap-2">
              {report.levels.map((lv) => {
                const active = activeLevels.includes(lv.key);
                const color = LEVEL_COLORS[lv.key] ?? "#3fe3ea";
                return (
                  <button
                    key={lv.key}
                    type="button"
                    onClick={() => toggleLevel(lv.key)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "border-accent/50 bg-surface-2 text-foreground"
                        : "border-line bg-surface text-muted opacity-60 hover:opacity-100"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span>Profil {lv.label}</span>
                    <span className="font-mono text-[11px] text-success">
                      {signedPct(levelSims[lv.key]?.cagr)}/an
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
              Indices &amp; ETF de référence comparés
            </div>
            <div className="flex flex-wrap gap-2">
              {BENCHMARK_META.map((bm) => {
                const active = activeBenchmarks.includes(bm.key);
                return (
                  <button
                    key={bm.key}
                    type="button"
                    onClick={() => toggleBenchmark(bm.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                      active
                        ? "border-accent/50 bg-surface-2 font-medium text-foreground"
                        : "border-line bg-surface text-muted opacity-65 hover:opacity-100"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: bm.color }} />
                    <span>{bm.label}</span>
                    <span className="font-mono text-[10px] text-muted">{bm.ticker}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards for the 3 Risk Profiles under the user's DCA configuration */}
      <div className="grid gap-4 md:grid-cols-3">
        {report.levels.map((lv) => {
          const sim = levelSims[lv.key];
          const color = LEVEL_COLORS[lv.key] ?? "#3fe3ea";
          const spSim = benchmarkSims.sp500;
          const diffVsSp = sim && spSim ? sim.finalValue - spSim.finalValue : 0;
          return (
            <div key={lv.key} className={`${card} relative overflow-hidden`}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="font-display text-base font-bold">Profil {lv.label}</h3>
                </div>
                <span className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                  CAGR {signedPct(sim?.cagr)}
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Capital final simulé</div>
                  <div className="font-display text-2xl font-extrabold tabular-nums">{eur(sim?.finalValue)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Plus-value nette</div>
                  <div className={`font-mono text-sm font-bold tabular-nums ${pnlClass(sim?.netGain)}`}>
                    {signedEur(sim?.netGain)} ({signedPct(sim?.totalReturnPct)})
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line/70 pt-2.5 font-mono text-[11px] tabular-nums">
                <div>
                  <div className="text-muted">Total versé</div>
                  <div className="font-semibold">{eur(sim?.totalInvested)}</div>
                </div>
                <div>
                  <div className="text-muted">Max Drawdown</div>
                  <div className="font-semibold text-danger">{pct(-(sim?.maxDrawdown ?? 0))}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted">Écart S&amp;P 500</div>
                  <div className={`font-semibold ${pnlClass(diffVsSp)}`}>{signedEur(diffVsSp)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Chart */}
      <div className={card}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold">
              Évolution comparée :{" "}
              {initialCapital > 0 ? `${eur(initialCapital)} initiaux` : "0 € initial"}
              {monthlyDca > 0 ? ` + ${eur(monthlyDca)} / mois` : " (sans versement mensuel)"}
            </h2>
            <p className="text-xs text-muted">
              Total investi sur la période ({Math.round((refSim?.years ?? 19.9) * 10) / 10} ans) :{" "}
              <b className="font-mono text-foreground">{eur(refSim?.totalInvested)}</b> · Survolez la courbe pour inspecter chaque mois.
            </p>
          </div>
          <span className="font-mono text-xs text-muted">
            Données arrêtées au {day(report.as_of)}
          </span>
        </div>

        <EquityLines
          currency={chartMode}
          capital={chartMode === "EUR" ? initialCapital : 0}
          lines={chartLines}
        />
      </div>

      {/* Multi-benchmark & Multi-profile Comprehensive Comparison Table */}
      <div className={card}>
        <h2 className="mb-1 font-display text-lg font-bold">
          Comparatif détaillé : Profils PEA vs Indices de référence
        </h2>
        <p className="mb-3 text-xs text-muted">
          Comparaison des rendements annualisés par période, du capital final simulé (avec vos paramètres ci-dessus) et du risque historique.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className={th}>Profil / Indice</th>
                <th className={`${th} text-right`}>Capital final</th>
                <th className={`${th} text-right`}>Plus-value</th>
                {PERIODS.map((p) => (
                  <th key={p} className={`${th} text-right`}>
                    {p} an{p === "1" ? "" : "s"}
                  </th>
                ))}
                <th className={`${th} text-right`}>Depuis 2007</th>
                <th className={`${th} text-right`}>Baisse max</th>
                <th className={`${th} text-right`}>Volatilité</th>
                <th className={`${th} text-right`}>Pire année</th>
              </tr>
            </thead>
            <tbody>
              {report.levels.map((lv) => {
                const sim = levelSims[lv.key];
                const s = lv.summary;
                return (
                  <tr key={lv.key} className="border-t border-line bg-accent/5">
                    <td className={`${td} font-semibold`}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: LEVEL_COLORS[lv.key] ?? "#3fe3ea" }}
                        />
                        <span>Profil {lv.label}</span>
                      </div>
                    </td>
                    <td className={`${td} text-right font-mono font-bold`}>{eur(sim?.finalValue)}</td>
                    <td className={`${td} text-right font-mono ${pnlClass(sim?.netGain)}`}>
                      {signedEur(sim?.netGain)}
                    </td>
                    {PERIODS.map((p) => (
                      <td key={p} className={`${td} text-right ${pnlClass(s.periods[p])}`}>
                        {signedPct(s.periods[p])}
                      </td>
                    ))}
                    <td className={`${td} text-right font-bold ${pnlClass(s.cagr)}`}>{signedPct(s.cagr)}</td>
                    <td className={`${td} text-right text-danger`}>{pct(-s.max_drawdown)}</td>
                    <td className={`${td} text-right`}>{pct(s.volatility)}</td>
                    <td className={`${td} text-right font-mono text-xs`}>
                      {s.worst_year ? `${s.worst_year[0]} (${signedPct(s.worst_year[1])})` : "—"}
                    </td>
                  </tr>
                );
              })}

              {BENCHMARK_META.map((bm) => {
                const bSummary: PeaBenchmark | undefined =
                  report.benchmarks?.[bm.key] ?? (bm.key === "sp500" ? { ...report.benchmark, key: "sp500" } : undefined);
                const sim = benchmarkSims[bm.key];
                if (!bSummary) return null;
                return (
                  <tr key={bm.key} className="border-t border-line">
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: bm.color }} />
                        <span>{bm.label}</span>
                        <span className="font-mono text-[11px] text-muted">{bm.ticker}</span>
                      </div>
                    </td>
                    <td className={`${td} text-right font-mono`}>{eur(sim?.finalValue)}</td>
                    <td className={`${td} text-right font-mono ${pnlClass(sim?.netGain)}`}>
                      {signedEur(sim?.netGain)}
                    </td>
                    {PERIODS.map((p) => (
                      <td key={p} className={`${td} text-right ${pnlClass(bSummary.periods[p])}`}>
                        {signedPct(bSummary.periods[p])}
                      </td>
                    ))}
                    <td className={`${td} text-right font-medium ${pnlClass(bSummary.cagr)}`}>
                      {signedPct(bSummary.cagr)}
                    </td>
                    <td className={`${td} text-right text-danger`}>{pct(-bSummary.max_drawdown)}</td>
                    <td className={`${td} text-right text-muted`}>{pct(bSummary.volatility)}</td>
                    <td className={`${td} text-right font-mono text-xs text-muted`}>
                      {bSummary.worst_year
                        ? `${bSummary.worst_year[0]} (${signedPct(bSummary.worst_year[1])})`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Annual Performance Calendar Table */}
      <div className={card}>
        <h2 className="mb-1 font-display text-lg font-bold">
          Calendrier des performances année par année
        </h2>
        <p className="mb-3 text-xs text-muted">
          Rendements annuels calendaires des 3 profils PEA face aux indices S&amp;P 500, Nasdaq-100 et MSCI World. Notez l&apos;amortissement lors des krachs de 2008 et 2022.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className={th}>Année</th>
                {report.levels.map((lv) => (
                  <th key={lv.key} className={`${th} text-right`}>
                    Profil {lv.label}
                  </th>
                ))}
                <th className={`${th} text-right`}>S&amp;P 500</th>
                <th className={`${th} text-right`}>Nasdaq-100</th>
                <th className={`${th} text-right`}>MSCI World</th>
              </tr>
            </thead>
            <tbody>
              {yearsList.map((y) => {
                const spY = report.benchmarks?.sp500?.yearly?.[y] ?? report.benchmark.yearly[y];
                const nqY = report.benchmarks?.nasdaq?.yearly?.[y];
                const wdY = report.benchmarks?.world?.yearly?.[y];
                return (
                  <tr key={y} className="border-t border-line">
                    <td className={`${td} font-mono font-semibold`}>{y}</td>
                    {report.levels.map((lv) => {
                      const val = lv.summary.yearly[y];
                      return (
                        <td key={lv.key} className={`${td} text-right font-mono font-medium ${pnlClass(val)}`}>
                          {signedPct(val)}
                        </td>
                      );
                    })}
                    <td className={`${td} text-right font-mono text-muted`}>{signedPct(spY)}</td>
                    <td className={`${td} text-right font-mono text-muted`}>{signedPct(nqY)}</td>
                    <td className={`${td} text-right font-mono text-muted`}>{signedPct(wdY)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
