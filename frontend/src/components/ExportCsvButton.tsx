"use client";

import type { OptionPosition, ShareLot } from "@/lib/api";
import { STRATEGY_LABEL, day, pct, price, signed, strikes } from "@/lib/format";

export function ExportPositionsCsvButton({
  positions,
  shareLots = [],
}: {
  positions: OptionPosition[];
  shareLots?: ShareLot[];
}) {
  function handleExport() {
    if (positions.length === 0 && shareLots.length === 0) return;

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val == null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const lines: string[] = [];

    // Header for Options
    lines.push(
      [
        "Titre",
        "Stratégie",
        "Strikes",
        "Échéance",
        "DTE (jours)",
        "Contrats",
        "Crédit initial",
        "Dernier Mark",
        "P&L latent ($)",
        "% du crédit",
        "Statut",
      ].map(escapeCsv).join(";")
    );

    // Options rows
    for (const p of positions) {
      let stateStr = "En cours";
      if (p.status === "pending") {
        stateStr = `Ordre d'ouverture à ${p.open_limit ?? "—"}`;
      } else if (p.exit_order) {
        stateStr = `${p.exit_order.purpose} à ${p.exit_order.limit ?? "—"}`;
      } else if (p.take_profit_price != null) {
        stateStr = `TP à ${p.take_profit_price}`;
      }

      lines.push(
        [
          p.underlying,
          STRATEGY_LABEL[p.strategy] ?? p.strategy,
          strikes(p.legs.map((l) => l.strike)),
          p.expiration ? day(p.expiration) : "",
          p.dte != null ? String(p.dte) : "",
          p.contracts,
          price(p.entry_credit),
          price(p.mark),
          signed(p.unrealized_pnl),
          pct(p.profit_pct),
          stateStr,
        ].map(escapeCsv).join(";")
      );
    }

    // Share Lots if any
    if (shareLots.length > 0) {
      lines.push("");
      lines.push(["--- Actions détenues (True Wheel) ---"].map(escapeCsv).join(";"));
      lines.push(
        [
          "Titre",
          "Depuis",
          "Actions",
          "Prix de revient",
          "Capital immobilisé",
          "Couvertes par un call",
        ].map(escapeCsv).join(";")
      );

      for (const lot of shareLots) {
        lines.push(
          [
            lot.underlying,
            lot.opened_at ? day(lot.opened_at) : "",
            lot.shares,
            price(lot.cost_basis),
            lot.collateral,
            lot.covered_shares,
          ].map(escapeCsv).join(";")
        );
      }
    }

    // UTF-8 BOM so Excel opens accents properly
    const bom = "\uFEFF";
    const csvContent = bom + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `positions_ouvertes_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      title="Télécharger la liste des positions ouvertes au format CSV"
      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:bg-surface-2 transition-colors cursor-pointer"
    >
      <svg
        className="h-3.5 w-3.5 text-accent"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>Exporter CSV</span>
    </button>
  );
}
