"use client";

import { useState } from "react";

import { day, eur, signedPct, usd } from "@/lib/format";

const W = 760;
const H = 280;
const PAD = { top: 14, right: 18, bottom: 30, left: 78 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

export type Line = {
  label: string;
  color: string;
  dashed?: boolean;
  points: { date: string; value: number }[];
};

const time = (iso: string) => new Date(`${iso}T12:00:00`).getTime();
const axisFormats = {
  USD: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
  PCT: new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 }),
};

function ticks(min: number, max: number, count = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const first = Math.floor(min / step) * step;
  const values = [];
  for (let v = first; v <= max + step * 0.5; v += step) values.push(Math.round(v * 10000) / 10000);
  return values;
}

export function EquityLines({
  lines,
  capital,
  currency = "USD",
}: {
  lines: Line[];
  capital: number;
  currency?: "USD" | "EUR" | "PCT";
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const axisLabel = axisFormats[currency];
  const all = lines.flatMap((l) => l.points);
  if (all.length < 2) {
    return <p className="flex h-40 items-center justify-center text-sm opacity-60">Pas de courbe disponible.</p>;
  }
  const values = all.map((p) => p.value);
  const yTicks = ticks(Math.min(capital, ...values), Math.max(capital, ...values));
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const times = all.map((p) => time(p.date));
  const tMin = Math.min(...times);
  const tMax = Math.max(...times, tMin + 1);
  const x = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin)) * PLOT_W;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * PLOT_H;

  const years: number[] = [];
  for (let year = new Date(tMin).getFullYear() + 1; year <= new Date(tMax).getFullYear(); year++) {
    years.push(year);
  }
  const step = Math.ceil(years.length / 8) || 1;

  const primaryPoints = lines[0]?.points ?? [];
  const hoveredDate = hoverIdx !== null && primaryPoints[hoverIdx] ? primaryPoints[hoverIdx].date : null;
  const hoverX = hoveredDate ? x(time(hoveredDate)) : null;

  const formatVal = (v: number | undefined) => {
    if (v == null) return "—";
    if (currency === "PCT") return signedPct(v);
    if (currency === "EUR") return eur(v);
    return usd(v);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full select-none"
          role="img"
          aria-label="Évolution de la valeur du portefeuille au fil du temps"
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            if (primaryPoints.length < 2) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * W;
            const ratio = Math.max(0, Math.min(1, (relX - PAD.left) / PLOT_W));
            const idx = Math.round(ratio * (primaryPoints.length - 1));
            setHoverIdx(idx);
          }}
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
              <text
                x={PAD.left - 8}
                y={y(v)}
                dy="0.32em"
                textAnchor="end"
                className="fill-current font-mono text-[11px] opacity-60"
              >
                {axisLabel.format(v)}
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(capital)}
            y2={y(capital)}
            stroke="var(--chart-axis)"
            strokeDasharray="4 4"
          />
          {years
            .filter((_, i) => i % step === 0)
            .map((year) => {
              const t = new Date(`${year}-01-01T12:00:00`).getTime();
              return (
                <text
                  key={year}
                  x={x(t)}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-current font-mono text-[11px] opacity-60"
                >
                  {year}
                </text>
              );
            })}
          {lines.map((l) => (
            <path
              key={l.label}
              d={l.points
                .map((p, i) => `${i ? "L" : "M"}${x(time(p.date)).toFixed(1)},${y(p.value).toFixed(1)}`)
                .join("")}
              fill="none"
              stroke={l.color}
              strokeWidth={l.dashed ? 1.6 : 2.25}
              strokeDasharray={l.dashed ? "5 4" : undefined}
              strokeLinejoin="round"
            >
              <title>
                {`${l.label} : ${formatVal(l.points[l.points.length - 1]?.value)} au ${day(l.points[l.points.length - 1]?.date)}`}
              </title>
            </path>
          ))}
          {hoverX !== null && hoveredDate ? (
            <g>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--accent)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {lines.map((l) => {
                const pt =
                  (hoverIdx !== null ? l.points[hoverIdx] : undefined) ??
                  l.points.find((p) => p.date === hoveredDate);
                if (!pt) return null;
                return (
                  <circle
                    key={l.label}
                    cx={x(time(pt.date))}
                    cy={y(pt.value)}
                    r="3.5"
                    fill={l.color}
                    stroke="var(--surface)"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          ) : null}
        </svg>

        {hoveredDate && hoverIdx !== null ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/80 px-3 py-2 text-xs">
            <span className="font-mono font-medium text-accent">{day(hoveredDate)}</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {lines.map((l) => {
                const pt = l.points[hoverIdx] ?? l.points.find((p) => p.date === hoveredDate);
                return (
                  <span key={l.label} className="inline-flex items-center gap-1.5 tabular-nums">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-muted">{l.label} :</span>
                    <b className="font-mono">{formatVal(pt?.value)}</b>
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {lines.map((l) => {
          const lastVal = l.points[l.points.length - 1]?.value;
          return (
            <li key={l.label} className="flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden>
                <line
                  x1="0"
                  x2="18"
                  y1="3"
                  y2="3"
                  stroke={l.color}
                  strokeWidth="2.2"
                  strokeDasharray={l.dashed ? "4 3" : undefined}
                />
              </svg>
              <span>{l.label}</span>
              <span className="font-mono font-semibold tabular-nums opacity-85">({formatVal(lastVal)})</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
