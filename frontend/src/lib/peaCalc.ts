import type { PeaPoint, PeaReport, PeaWeights } from "./api";

export type SimStats = {
  pointsEur: PeaPoint[];
  pointsPct: PeaPoint[];
  pointsInvested: PeaPoint[];
  totalInvested: number;
  finalValue: number;
  netGain: number;
  totalReturnPct: number;
  cagr: number;
  maxDrawdown: number;
  years: number;
};

export function filterCurveByHorizon(curve: PeaPoint[], horizon: string): PeaPoint[] {
  if (!curve.length || horizon === "all") return curve;
  const years = Number(horizon);
  if (!Number.isFinite(years) || years <= 0) return curve;
  const lastDate = new Date(`${curve[curve.length - 1].date}T12:00:00`);
  const cutoffYear = lastDate.getFullYear() - years;
  const cutoffStr = `${cutoffYear}-${String(lastDate.getMonth() + 1).padStart(2, "0")}-01`;
  const filtered = curve.filter((p) => p.date >= cutoffStr);
  return filtered.length >= 2 ? filtered : curve;
}

export function simulateDcaCurve(
  rawCurve: PeaPoint[],
  initialCapital: number,
  monthlyDca: number,
  horizon = "all",
): SimStats {
  const curve = filterCurveByHorizon(rawCurve, horizon);
  if (curve.length < 2) {
    return {
      pointsEur: [],
      pointsPct: [],
      pointsInvested: [],
      totalInvested: initialCapital,
      finalValue: initialCapital,
      netGain: 0,
      totalReturnPct: 0,
      cagr: 0,
      maxDrawdown: 0,
      years: 0,
    };
  }

  const pointsEur: PeaPoint[] = [];
  const pointsPct: PeaPoint[] = [];
  const pointsInvested: PeaPoint[] = [];

  let value = Math.max(0, initialCapital);
  let invested = Math.max(0, initialCapital);
  let peak = value > 0 ? value : 1;
  let maxDrawdown = 0;

  pointsEur.push({ date: curve[0].date, value: Math.round(value) });
  pointsPct.push({ date: curve[0].date, value: 0 });
  pointsInvested.push({ date: curve[0].date, value: Math.round(invested) });

  for (let i = 1; i < curve.length; i++) {
    const prevIdx = curve[i - 1].value || 100;
    const currIdx = curve[i].value || prevIdx;
    const stepReturn = currIdx / prevIdx - 1;

    // Apply market return for the month, then add end-of-month DCA contribution
    value = value * (1 + stepReturn) + Math.max(0, monthlyDca);
    invested += Math.max(0, monthlyDca);

    if (value > peak) peak = value;
    if (peak > 0) {
      const dd = (peak - value) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const netPct = invested > 0 ? (value - invested) / invested : 0;
    pointsEur.push({ date: curve[i].date, value: Math.round(value) });
    pointsPct.push({ date: curve[i].date, value: Math.round(netPct * 10000) / 10000 });
    pointsInvested.push({ date: curve[i].date, value: Math.round(invested) });
  }

  const startMs = new Date(`${curve[0].date}T12:00:00`).getTime();
  const endMs = new Date(`${curve[curve.length - 1].date}T12:00:00`).getTime();
  const years = Math.max(0.25, (endMs - startMs) / (365.25 * 86_400_000));

  const netGain = value - invested;
  const totalReturnPct = invested > 0 ? netGain / invested : 0;
  // Time-weighted index CAGR for the underlying strategy over the selected horizon
  const indexMultiple = (curve[curve.length - 1].value || 100) / (curve[0].value || 100);
  const cagr = indexMultiple > 0 ? indexMultiple ** (1 / years) - 1 : 0;

  return {
    pointsEur,
    pointsPct,
    pointsInvested,
    totalInvested: Math.round(invested),
    finalValue: Math.round(value),
    netGain: Math.round(netGain),
    totalReturnPct,
    cagr,
    maxDrawdown,
    years,
  };
}

export function buildCustomPortfolioCurve(report: PeaReport, weights: PeaWeights): PeaPoint[] {
  const assetCurves = report.asset_curves ?? {};
  const baseCurve = report.levels[0]?.curve ?? report.benchmark_curve ?? [];
  if (baseCurve.length < 2) return baseCurve;

  // Normalize weights so they sum to 1 (if non-zero)
  const entries = Object.entries(weights).filter(([, w]) => w > 0.0001);
  const sumW = entries.reduce((acc, [, w]) => acc + w, 0);
  if (sumW <= 0) {
    return baseCurve.map((p) => ({ date: p.date, value: 100 }));
  }

  const normWeights: Record<string, number> = {};
  for (const [k, w] of entries) {
    normWeights[k] = w / sumW;
  }

  const result: PeaPoint[] = [{ date: baseCurve[0].date, value: 100 }];
  let currentVal = 100;

  for (let i = 1; i < baseCurve.length; i++) {
    let weightedRet = 0;
    for (const [assetKey, weight] of Object.entries(normWeights)) {
      const aCurve = assetCurves[assetKey] ?? report.benchmark_curve;
      const prev = aCurve[i - 1]?.value ?? 100;
      const curr = aCurve[i]?.value ?? prev;
      const r = prev > 0 ? curr / prev - 1 : 0;
      weightedRet += weight * r;
    }
    currentVal = currentVal * (1 + weightedRet);
    result.push({
      date: baseCurve[i].date,
      value: Math.round(currentVal * 100) / 100,
    });
  }

  return result;
}

export function computePeriodReturn(curve: PeaPoint[], years: number): number | null {
  if (curve.length < 2) return null;
  const sub = filterCurveByHorizon(curve, String(years));
  if (sub.length < 2) return null;
  const first = sub[0].value;
  const last = sub[sub.length - 1].value;
  if (!first || first <= 0) return null;
  const startMs = new Date(`${sub[0].date}T12:00:00`).getTime();
  const endMs = new Date(`${sub[sub.length - 1].date}T12:00:00`).getTime();
  const elapsedYears = Math.max(0.5, (endMs - startMs) / (365.25 * 86_400_000));
  return (last / first) ** (1 / elapsedYears) - 1;
}
