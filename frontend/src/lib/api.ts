import { mockStore } from "./mockStore";

// Server-side base URL of the FastAPI backend.
export const API_URL = process.env.API_URL ?? "http://localhost:8000";

// Shared secret the hosted API requires (API_TOKEN on both sides); unset on the local stack.
const AUTH: Record<string, string> = process.env.API_TOKEN ? { "X-API-Token": process.env.API_TOKEN } : {};

export type Health = { status: string; database: string };

// --- PEA ETF portfolio ------------------------------------------------------------------------

export type PeaWeights = Record<string, number>;
export type PeaChange = { asset: string; from: number; to: number; action: "acheter" | "vendre" };
export type PeaSummary = {
  start: string;
  end: string;
  years: number;
  cagr: number | null;
  total_return: number;
  periods: Record<string, number | null>;
  max_drawdown: number;
  volatility: number | null;
  yearly: Record<string, number>;
  worst_year: [number, number] | null;
  adjustments: number;
  adjustments_per_year: number | null;
  signal_changes: number;
  exposure: PeaWeights;
};
export type PeaPoint = { date: string; value: number };
export type PeaLevel = {
  key: string;
  label: string;
  description: string;
  target: PeaWeights;
  previous: PeaWeights;
  changes: PeaChange[];
  preview: PeaWeights | null;
  preview_changes: PeaChange[];
  summary: PeaSummary;
  curve: PeaPoint[];
  history: { day: string; signal_day: string; reason: "signal" | "drift"; changes: PeaChange[] }[];
};
export type PeaAsset = {
  key: string;
  label: string;
  name: string;
  ticker: string;
  isin: string | null;
  proxy: string | null;
  since: string;
};
export type PeaBenchmark = PeaSummary & { key: string; label: string };

export type PeaReport = {
  as_of: string;
  signal_day: string;
  provisional_day: string | null;
  scores: { asset: string; momentum: number | null; trend_ok: boolean; price: number | null; average: number | null }[];
  assets: PeaAsset[];
  levels: PeaLevel[];
  benchmark: PeaSummary & { label: string };
  benchmark_curve: PeaPoint[];
  benchmarks?: Record<string, PeaBenchmark>;
  asset_curves?: Record<string, PeaPoint[]>;
  assumptions: {
    cost: number;
    drift: number;
    momentum_months: number[];
    trend_months: number;
    min_uptrends?: number;
    start: string;
  };
};
export type Pea = { report: PeaReport | null; computed_at: string | null };
export type PeaAlert = {
  active: boolean;
  signal_day?: string;
  levels: string[];
  provisional: string[];
  provisional_day?: string | null;
};

export type PeaPortfolioConfig = {
  input_mode: "eur" | "pct";
  target_level: string;
  total_capital: number;
  cash_available: number;
  holdings_eur: Record<string, number>;
  holdings_pct: Record<string, number>;
  sim_initial_capital: number;
  sim_monthly_dca: number;
  sim_horizon: string;
  sim_benchmarks: string[];
  updated_at: string | null;
};

function getMockFallback<T>(path: string): T | null {
  if (path === "/health") return mockStore.getHealth() as unknown as T;
  if (path === "/pea/alert") return mockStore.getPeaAlert() as unknown as T;
  if (path === "/pea/portfolio") return mockStore.getPortfolio() as unknown as T;
  if (path === "/pea") return mockStore.getPea() as unknown as T;
  return null;
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: AUTH, cache: "no-store" });
    if (!res.ok) {
      const fallback = getMockFallback<T>(path);
      return fallback !== null ? fallback : null;
    }
    return (await res.json()) as T;
  } catch {
    const fallback = getMockFallback<T>(path);
    return fallback !== null ? fallback : null;
  }
}

export const getHealth = () => get<Health>("/health");
export const getPea = () => get<Pea>("/pea");
export const getPeaAlert = () => get<PeaAlert>("/pea/alert");
export const getPeaPortfolio = () => get<PeaPortfolioConfig>("/pea/portfolio");

export async function savePeaPortfolio(payload: Partial<PeaPortfolioConfig>): Promise<PeaPortfolioConfig> {
  try {
    const res = await fetch(`${API_URL}/pea/portfolio`, {
      method: "PUT",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (res.ok) {
      const saved = (await res.json()) as PeaPortfolioConfig;
      mockStore.savePortfolio(saved);
      return saved;
    }
  } catch {
    // Fallback to mockStore when FastAPI backend is unreachable
  }
  return mockStore.savePortfolio(payload);
}

