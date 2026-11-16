import Link from "next/link";

import { ApiDown, Stat } from "@/components/Stat";
import { getPea, type PeaChange, type PeaLevel, type PeaReport, type PeaWeights } from "@/lib/api";
import { dateTime, day, eur, eur2, pct, pnlClass, signedPct } from "@/lib/format";

export const dynamic = "force-dynamic";

const ALERT_DAYS = 10;
const PERIODS = ["1", "3", "5", "10", "15"];

type Search = Record<string, string | string[] | undefined>;

function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000);
}

function Weights({
  weights,
  report,
  showDetails = true,
}: {
  weights: PeaWeights;
  report: PeaReport;
  showDetails?: boolean;
}) {
  const scoreMap = Object.fromEntries(report.scores.map((s) => [s.asset, s]));
  const rows = report.assets.filter((a) => (weights[a.key] ?? 0) > 0.0001);
  return (
    <ul className="space-y-3.5">
      {rows.map((a) => {
        const w = weights[a.key];
        const sc = scoreMap[a.key];
        return (
          <li key={a.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.label}</span>
                  <span className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-accent">
                    {a.ticker}
                  </span>
                  {a.isin ? (
                    <span className="font-mono text-[11px] text-muted">{a.isin}</span>
                  ) : null}
                  {showDetails && sc ? (
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        sc.trend_ok ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                      }`}
                    >
                      {sc.trend_ok ? `Momentum ${signedPct(sc.momentum)}` : "Repli défensif"}
                    </span>
                  ) : null}
                </div>
                {showDetails ? (
                  <div className="truncate text-xs text-muted">{a.name}</div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold tabular-nums">{pct(w)}</div>
                {showDetails ? (
                  <div className="font-mono text-[11px] text-muted tabular-nums">
                    {eur(Math.round(w * 10_000))} / 10 000 €
                  </div>
                ) : null}
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(w * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Changes({ changes, label }: { changes: PeaChange[]; label: Record<string, string> }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {changes.map((c) => {
        const delta = c.to - c.from;
        return (
          <li key={c.asset} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/60 bg-surface-2/50 px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <span
                className={`rounded px-2 py-0.5 font-mono text-xs font-semibold uppercase ${
                  c.action === "acheter" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                }`}
              >
                {c.action === "acheter" ? "Acheter" : "Vendre"}
              </span>
              <span className="font-medium">{label[c.asset] ?? c.asset}</span>
            </div>
            <div className="font-mono text-xs tabular-nums">
              <span className="text-muted">{pct(c.from)}</span>
              <span className="mx-1.5 text-muted">→</span>
              <b className="text-foreground">{pct(c.to)}</b>
              <span className={`ml-2 ${delta >= 0 ? "text-success" : "text-danger"}`}>
                ({signedPct(delta)})
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AlertBox({ level, report, label }: { level: PeaLevel; report: PeaReport; label: Record<string, string> }) {
  const recent = daysBetween(report.signal_day, report.as_of) <= ALERT_DAYS;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {level.changes.length > 0 ? (
        <div
          className={`rounded-2xl border p-4 ${recent ? "border-warning/50 bg-warning/10" : "border-line bg-surface"}`}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className={`font-display font-bold ${recent ? "text-warning" : ""}`}>
              Ajustements du mois ({day(report.signal_day)})
            </p>
            <span className="rounded border border-warning/40 bg-warning/15 px-2 py-0.5 font-mono text-[11px] text-warning">
              {level.changes.length} mouvement{level.changes.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mb-3 text-xs text-muted">
            Arbitrages issus du signal mensuel de fin de mois, à exécuter en ordres à cours limité.
          </p>
          <Changes changes={level.changes} label={label} />
        </div>
      ) : (
        <div className="rounded-2xl border border-success/40 bg-success/5 p-4 text-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <b className="font-display text-base text-success">Aucun ajustement ce mois-ci</b>
            <span className="rounded border border-success/40 bg-success/15 px-2 py-0.5 font-mono text-[11px] text-success">
              Maintien
            </span>
          </div>
          <p className="text-xs text-muted">
            Au signal du {day(report.signal_day)}, les ETF en portefeuille conservent leur rang en tête du classement momentum. Conservez la répartition cible actuelle.
          </p>
        </div>
      )}

      {report.provisional_day && level.preview_changes.length > 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="font-display font-bold">Signal provisoire au {day(report.provisional_day)}</p>
            <span className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted">
              En observation
            </span>
          </div>
          <p className="mb-3 text-xs text-muted">
            Si le mois se clôturait aujourd&apos;hui, voici la rotation qui serait déclenchée. Aucun ordre avant la fin du mois.
          </p>
          <Changes changes={level.preview_changes} label={label} />
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="font-display font-bold">Signal provisoire au {day(report.provisional_day ?? report.as_of)}</p>
            <span className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted">
              Stable
            </span>
          </div>
          <p className="mb-3 text-xs text-muted">
            Aux cours actuels ({day(report.as_of)}), la hiérarchie des tendances reste inchangée pour la prochaine clôture mensuelle.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/60 bg-surface-2/40 px-3 py-2 text-xs">
            <span className="text-muted">Prochain calcul définitif :</span>
            <span className="font-mono font-medium">Dernier jour de bourse du mois</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const data = await getPea();
  const title = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.14em] text-accent">Onglet 1 · Allocation &amp; Signaux</div>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Répartition portefeuille
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Répartition cible du mois, arbitrages mensuels et synthèse de performance de votre stratégie PEA par profil de risque.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/pea/performance"
          className="rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
        >
          Simuler performance &amp; DCA →
        </Link>
        <Link
          href="/pea/mon-portefeuille"
          className="rounded-lg bg-accent/15 px-3.5 py-2 text-xs font-semibold text-accent ring-1 ring-accent/40 transition-colors hover:bg-accent/25"
        >
          Calculer mes ordres (€) →
        </Link>
      </div>
    </div>
  );

  if (!data) {
    return (
      <section className="space-y-6">
        {title}
        <ApiDown />
      </section>
    );
  }
  const report = data.report;
  if (!report) {
    return (
      <section className="space-y-6">
        {title}
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm">
          Pas encore de calcul disponible : le moteur met à jour les données après la clôture d&apos;Euronext Paris.
        </p>
      </section>
    );
  }

  const wanted = Array.isArray(params.niveau) ? params.niveau[0] : params.niveau;
  const level =
    report.levels.find((l) => l.key === wanted) ??
    report.levels.find((l) => l.key === "moyen") ??
    report.levels[0];
  const label = Object.fromEntries(report.assets.map((a) => [a.key, a.label]));
  const assetByKey = Object.fromEntries(report.assets.map((a) => [a.key, a]));
  const s = level.summary;
  const bench = report.benchmark;
  const worldBench = report.benchmarks?.world;
  const card = "rounded-2xl border border-line bg-surface p-4 sm:p-5";
  const th = "px-2.5 py-2 font-medium";
  const td = "px-2.5 py-2 tabular-nums";

  const final10k = Math.round(10_000 * (1 + s.total_return));

  return (
    <section className="space-y-6">
      {title}

      {/* Risk profile selector cards */}
      <div className="grid gap-3 md:grid-cols-3" role="navigation" aria-label="Niveau de risque">
        {report.levels.map((l) => {
          const active = l.key === level.key;
          const hasRecentChange = l.changes.length > 0 && daysBetween(report.signal_day, report.as_of) <= ALERT_DAYS;
          return (
            <Link
              key={l.key}
              href={`/pea?niveau=${l.key}`}
              aria-current={active ? "page" : undefined}
              className={`group rounded-2xl border p-4 transition-all ${
                active
                  ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                  : "border-line bg-surface hover:border-accent/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`font-display text-base font-bold ${active ? "text-accent" : "text-foreground"}`}>
                    Profil {l.label}
                  </span>
                  {hasRecentChange ? (
                    <span className="rounded bg-warning/20 px-1.5 py-0.5 font-mono text-[10px] text-warning">
                      Arbitrage
                    </span>
                  ) : null}
                </div>
                <span className="font-mono text-sm font-bold text-success tabular-nums">
                  {signedPct(l.summary.cagr)}/an
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">{l.description}</p>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 font-mono text-[11px] text-muted tabular-nums">
                <span>Max DD : {pct(-l.summary.max_drawdown)}</span>
                <span>Volatilité : {pct(l.summary.volatility)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Section 1: Target Allocation & Monthly Adjustments */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className={`${card} lg:col-span-7`}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">
                Répartition cible — Profil {level.label}
              </h2>
              <p className="text-xs text-muted">
                En vigueur depuis le signal du {day(report.signal_day)} · Mis à jour le {dateTime(data.computed_at)}
              </p>
            </div>
            <Link
              href={`/pea/mon-portefeuille?niveau=${level.key}`}
              className="font-mono text-xs text-accent hover:underline"
            >
              Appliquer à mon portefeuille →
            </Link>
          </div>
          <Weights weights={level.target} report={report} />
        </div>

        <div className={`${card} lg:col-span-5 flex flex-col justify-between`}>
          <div>
            <h2 className="mb-1 font-display text-lg font-bold">Exposition moyenne historique</h2>
            <p className="mb-4 text-xs text-muted">
              Poids moyen observé sur le profil {level.label} depuis {s.start.slice(0, 4)} ({Math.round(s.years)} ans).
            </p>
            <Weights weights={s.exposure} report={report} showDetails={false} />
          </div>
          <div className="mt-4 rounded-xl border border-line/70 bg-surface-2/50 p-3 text-xs text-muted">
            <b className="text-foreground">Discipline de repli :</b> Dès qu&apos;un ETF passe sous sa moyenne mobile{" "}
            {report.assumptions.trend_months} mois ou affiche un momentum négatif, sa part est réallouée vers les autres ETF en tendance ou vers le fonds monétaire <span className="font-mono">OBLI</span>.
          </div>
        </div>
      </div>

      {/* Monthly adjustments & provisional signal */}
      <AlertBox level={level} report={report} label={label} />

      {/* Section 2: Performance of the selected allocation */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold">
            Performance de la répartition ({level.label})
          </h2>
          <Link href="/pea/performance" className="font-mono text-xs text-accent hover:underline">
            Ouvrir le simulateur complet &amp; comparateur multi-indices →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Rendement annuel (CAGR)"
            value={signedPct(s.cagr)}
            valueClass={pnlClass(s.cagr)}
            hint={`Depuis ${day(s.start)} (S&P 500 : ${signedPct(bench.cagr)})`}
          />
          <Stat
            label="10 000 € devenus"
            value={eur(final10k)}
            valueClass="text-accent"
            hint={`Gain cumulé : ${signedPct(s.total_return)} hors versements`}
          />
          <Stat
            label="Baisse maximale (Max DD)"
            value={pct(-s.max_drawdown)}
            valueClass="text-danger"
            hint={`S&P 500 seul : ${pct(-bench.max_drawdown)}`}
          />
          <Stat
            label="Rotation & Ajustements"
            value={`${(s.adjustments_per_year ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / an`}
            hint={`${s.adjustments} arbitrages en ${Math.round(s.years)} ans (${s.signal_changes} signaux)`}
          />
        </div>

        <div className={card}>
          <h3 className="mb-3 font-display text-base font-bold">
            Rendement annualisé selon l&apos;horizon de détention
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className={th}>Stratégie / Indice</th>
                  {PERIODS.map((p) => (
                    <th key={p} className={`${th} text-right`}>
                      {p} an{p === "1" ? "" : "s"}
                    </th>
                  ))}
                  <th className={`${th} text-right`}>Depuis {s.start.slice(0, 4)}</th>
                  <th className={`${th} text-right`}>Max Drawdown</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line bg-accent/5">
                  <td className={`${td} font-semibold text-accent`}>Profil {level.label} (sélectionné)</td>
                  {PERIODS.map((p) => (
                    <td key={p} className={`${td} text-right font-medium ${pnlClass(s.periods[p])}`}>
                      {signedPct(s.periods[p])}
                    </td>
                  ))}
                  <td className={`${td} text-right font-bold ${pnlClass(s.cagr)}`}>{signedPct(s.cagr)}</td>
                  <td className={`${td} text-right text-danger`}>{pct(-s.max_drawdown)}</td>
                </tr>
                {report.levels
                  .filter((l) => l.key !== level.key)
                  .map((other) => (
                    <tr key={other.key} className="border-t border-line">
                      <td className={`${td} font-medium`}>Profil {other.label}</td>
                      {PERIODS.map((p) => (
                        <td key={p} className={`${td} text-right ${pnlClass(other.summary.periods[p])}`}>
                          {signedPct(other.summary.periods[p])}
                        </td>
                      ))}
                      <td className={`${td} text-right ${pnlClass(other.summary.cagr)}`}>
                        {signedPct(other.summary.cagr)}
                      </td>
                      <td className={`${td} text-right text-danger`}>{pct(-other.summary.max_drawdown)}</td>
                    </tr>
                  ))}
                <tr className="border-t border-line text-muted">
                  <td className={td}>S&amp;P 500 (PSP5)</td>
                  {PERIODS.map((p) => (
                    <td key={p} className={`${td} text-right`}>
                      {signedPct(bench.periods[p])}
                    </td>
                  ))}
                  <td className={`${td} text-right`}>{signedPct(bench.cagr)}</td>
                  <td className={`${td} text-right text-danger`}>{pct(-bench.max_drawdown)}</td>
                </tr>
                {worldBench ? (
                  <tr className="border-t border-line text-muted">
                    <td className={td}>MSCI World (WPEA)</td>
                    {PERIODS.map((p) => (
                      <td key={p} className={`${td} text-right`}>
                        {signedPct(worldBench.periods[p])}
                      </td>
                    ))}
                    <td className={`${td} text-right`}>{signedPct(worldBench.cagr)}</td>
                    <td className={`${td} text-right text-danger`}>{pct(-worldBench.max_drawdown)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 3: ETF Momentum & Trend Table + Recent Adjustment History */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className={`${card} lg:col-span-7`}>
          <h2 className="mb-1 font-display text-lg font-bold">
            Classement Momentum &amp; Tendance des ETF au {day(report.signal_day)}
          </h2>
          <p className="mb-3 text-xs text-muted">
            Score = moyenne des performances à {report.assumptions.momentum_months.join(", ")} mois. Un ETF est éligible si son score est positif et son cours supérieur à sa moyenne {report.assumptions.trend_months} mois.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className={th}>Rang</th>
                  <th className={th}>ETF PEA</th>
                  <th className={`${th} text-right`}>Cours</th>
                  <th className={`${th} text-right`}>MM {report.assumptions.trend_months}M</th>
                  <th className={`${th} text-right`}>Momentum</th>
                  <th className={`${th} text-right`}>Tendance</th>
                  <th className={`${th} text-right`}>Poids cible</th>
                </tr>
              </thead>
              <tbody>
                {[...report.scores]
                  .sort((a, b) => (b.momentum ?? -9) - (a.momentum ?? -9))
                  .map((sc, idx) => {
                    const assetInfo = assetByKey[sc.asset];
                    const targetW = level.target[sc.asset] ?? 0;
                    return (
                      <tr key={sc.asset} className="border-t border-line">
                        <td className={`${td} font-mono text-xs text-muted`}>#{idx + 1}</td>
                        <td className={td}>
                          <div className="font-medium">{label[sc.asset]}</div>
                          <div className="font-mono text-[11px] text-muted">
                            {assetInfo?.ticker} {assetInfo?.isin ? `· ${assetInfo.isin}` : ""}
                          </div>
                        </td>
                        <td className={`${td} text-right font-mono`}>{sc.price ? eur2(sc.price) : "—"}</td>
                        <td className={`${td} text-right font-mono text-muted`}>
                          {sc.average ? eur2(sc.average) : "—"}
                        </td>
                        <td className={`${td} text-right font-mono font-medium ${pnlClass(sc.momentum)}`}>
                          {signedPct(sc.momentum)}
                        </td>
                        <td className={`${td} text-right`}>
                          <span
                            className={`inline-block rounded px-2 py-0.5 font-mono text-xs ${
                              sc.trend_ok ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                            }`}
                          >
                            {sc.trend_ok ? "Haussière" : "Sous MM10"}
                          </span>
                        </td>
                        <td className={`${td} text-right font-mono font-bold ${targetW > 0 ? "text-accent" : "text-muted"}`}>
                          {targetW > 0 ? pct(targetW) : "0,0 %"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${card} lg:col-span-5`}>
          <h2 className="mb-1 font-display text-lg font-bold">
            Historique des ajustements ({level.label})
          </h2>
          <p className="mb-3 text-xs text-muted">
            Derniers mouvements déclenchés par changement de signal mensuel ou dérive supérieure à{" "}
            {Math.round(report.assumptions.drift * 100)} points.
          </p>
          <ul className="divide-y divide-line">
            {level.history.map((h) => (
              <li key={h.day} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-foreground">{day(h.day)}</span>
                  <span className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted">
                    {h.reason === "signal" ? `Signal du ${day(h.signal_day)}` : "Rééquilibrage (écart > 5 pts)"}
                  </span>
                </div>
                <Changes changes={h.changes} label={label} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
