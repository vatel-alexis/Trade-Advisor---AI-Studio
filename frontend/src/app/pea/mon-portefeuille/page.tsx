import Link from "next/link";

import { PeaUserPortfolioManager } from "@/components/PeaUserPortfolioManager";
import { ApiDown } from "@/components/Stat";
import { getPea, getPeaPortfolio } from "@/lib/api";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

export default async function MonPortefeuillePage({ searchParams }: { searchParams: Promise<Search> }) {
  const [params, data, portfolio] = await Promise.all([searchParams, getPea(), getPeaPortfolio()]);
  const wantedLevel = Array.isArray(params.niveau) ? params.niveau[0] : params.niveau;

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          Onglet 3 · Arbitrages &amp; Comparatif Personnel
        </div>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Mon portefeuille
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Saisissez la répartition actuelle de votre PEA en euros (€) ou en pourcentages (%), obtenez le plan d&apos;ordres exact pour rejoindre la cible et comparez la performance de votre portefeuille.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/pea"
          className="rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
        >
          ← Répartition cible
        </Link>
        <Link
          href="/pea/performance"
          className="rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
        >
          Simulateur DCA &amp; Indices →
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
      <PeaUserPortfolioManager
        report={data.report}
        initialConfig={portfolio}
        initialLevelKey={wantedLevel}
      />
    </section>
  );
}
