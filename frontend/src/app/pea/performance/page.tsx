import Link from "next/link";

import { PeaPerformanceSimulator } from "@/components/PeaPerformanceSimulator";
import { ApiDown } from "@/components/Stat";
import { getPea, getPeaPortfolio } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PeaPerformancePage() {
  const [data, portfolio] = await Promise.all([getPea(), getPeaPortfolio()]);

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          Onglet 2 · Simulation &amp; Benchmarks
        </div>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Suivi de la performance
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Comparez les profils Sécurité, Moyen et Dynamique avec versements mensuels programmés (DCA) face aux grands indices mondiaux (S&amp;P 500, Nasdaq-100, MSCI World, Europe, Émergents, Japon).
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/pea"
          className="rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
        >
          ← Voir la répartition cible
        </Link>
        <Link
          href="/pea/mon-portefeuille"
          className="rounded-lg bg-accent/15 px-3.5 py-2 text-xs font-semibold text-accent ring-1 ring-accent/40 transition-colors hover:bg-accent/25"
        >
          Comparer avec mon portefeuille →
        </Link>
      </div>
    </div>
  );

  if (!data || !portfolio) {
    return (
      <section className="space-y-6">
        {header}
        <ApiDown />
      </section>
    );
  }

  if (!data.report) {
    return (
      <section className="space-y-6">
        {header}
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm">
          Rapport PEA en attente de calcul.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {header}
      <PeaPerformanceSimulator report={data.report} initialConfig={portfolio} />
    </section>
  );
}
