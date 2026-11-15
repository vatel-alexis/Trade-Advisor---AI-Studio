import type { Health, Pea, PeaAlert } from "./api";

// In-memory fallback mock state for AI Studio preview when the external FastAPI backend is not running.
export class MockDataStore {
  private health: Health = {
    status: "ok",
    database: "ok (mode simulation)",
  };

  private pea: Pea = {
    computed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    report: {
      as_of: "2026-11-13",
      signal_day: "2026-10-30",
      provisional_day: "2026-11-13",
      scores: [
        { asset: "sp500", momentum: 0.178, trend_ok: true, price: 44.2, average: 40.8 },
        { asset: "nasdaq", momentum: 0.214, trend_ok: true, price: 78.5, average: 71.2 },
        { asset: "world", momentum: 0.148, trend_ok: true, price: 5.62, average: 5.21 },
        { asset: "japan", momentum: 0.092, trend_ok: true, price: 31.4, average: 29.8 },
        { asset: "emerging", momentum: 0.064, trend_ok: true, price: 24.1, average: 23.3 },
        { asset: "europe", momentum: -0.018, trend_ok: false, price: 38.2, average: 39.1 },
      ],
      assets: [
        {
          key: "sp500",
          label: "S&P 500",
          name: "Amundi PEA S&P 500 UCITS ETF Acc",
          ticker: "PSP5.PA",
          isin: "FR0011871128",
          proxy: "SPY",
          since: "2016-11-01",
        },
        {
          key: "nasdaq",
          label: "Nasdaq-100",
          name: "Amundi PEA Nasdaq-100 UCITS ETF Acc",
          ticker: "PUST.PA",
          isin: "FR0011871110",
          proxy: "QQQ",
          since: "2016-11-01",
        },
        {
          key: "europe",
          label: "Europe",
          name: "Amundi PEA MSCI Europe UCITS ETF Acc",
          ticker: "PCEU.PA",
          isin: null,
          proxy: "VGK",
          since: "2019-05-01",
        },
        {
          key: "emerging",
          label: "Émergents",
          name: "Amundi PEA Émergent (MSCI Emerging) ESG Transition UCITS ETF Acc",
          ticker: "PAEEM.PA",
          isin: "FR0013412020",
          proxy: "EEM",
          since: "2019-05-01",
        },
        {
          key: "japan",
          label: "Japon",
          name: "Amundi PEA Japon (TOPIX) UCITS ETF Acc",
          ticker: "PTPXE.PA",
          isin: null,
          proxy: "EWJ",
          since: "2019-05-01",
        },
        {
          key: "world",
          label: "Monde",
          name: "iShares MSCI World Swap PEA UCITS ETF",
          ticker: "WPEA.PA",
          isin: "IE0002XZSHO1",
          proxy: "URTH",
          since: "2024-04-01",
        },
        {
          key: "cash",
          label: "Monétaire",
          name: "Amundi PEA Euro Court Terme UCITS ETF",
          ticker: "OBLI.PA",
          isin: "FR0013346681",
          proxy: null,
          since: "2024-10-01",
        },
      ],
      levels: [
        {
          key: "securite",
          label: "Sécurité",
          description: "60 % en rotation entre les 3 meilleurs ETF, 40 % en monétaire en permanence.",
          target: { nasdaq: 0.2, sp500: 0.2, world: 0.2, cash: 0.4 },
          previous: { nasdaq: 0.2, sp500: 0.2, japan: 0.2, cash: 0.4 },
          changes: [
            { asset: "japan", from: 0.2, to: 0.0, action: "vendre" },
            { asset: "world", from: 0.0, to: 0.2, action: "acheter" },
          ],
          preview: { nasdaq: 0.2, sp500: 0.2, world: 0.2, cash: 0.4 },
          preview_changes: [],
          summary: {
            start: "2007-01-02",
            end: "2026-11-13",
            years: 19.9,
            cagr: 0.079,
            total_return: 3.54,
            periods: { "1": 0.112, "3": 0.094, "5": 0.088, "10": 0.086, "15": 0.084 },
            max_drawdown: 0.104,
            volatility: 0.082,
            yearly: {
              "2026": 0.098,
              "2025": 0.112,
              "2024": 0.134,
              "2023": 0.089,
              "2022": -0.041,
              "2021": 0.156,
              "2020": 0.092,
            },
            worst_year: [2022, -0.041],
            adjustments: 42,
            adjustments_per_year: 2.1,
            signal_changes: 38,
            exposure: { cash: 0.52, sp500: 0.16, nasdaq: 0.16, world: 0.08, japan: 0.05, emerging: 0.03 },
          },
          curve: [
            { date: "2007-01-02", value: 100 },
            { date: "2010-01-04", value: 118 },
            { date: "2013-01-02", value: 148 },
            { date: "2016-01-04", value: 194 },
            { date: "2019-01-02", value: 242 },
            { date: "2022-01-03", value: 336 },
            { date: "2024-01-02", value: 378 },
            { date: "2026-11-13", value: 454 },
          ],
          history: [
            {
              day: "2026-11-02",
              signal_day: "2026-10-30",
              reason: "signal",
              changes: [
                { asset: "japan", from: 0.2, to: 0.0, action: "vendre" },
                { asset: "world", from: 0.0, to: 0.2, action: "acheter" },
              ],
            },
            {
              day: "2026-08-03",
              signal_day: "2026-07-31",
              reason: "signal",
              changes: [
                { asset: "europe", from: 0.2, to: 0.0, action: "vendre" },
                { asset: "japan", from: 0.0, to: 0.2, action: "acheter" },
              ],
            },
          ],
        },
        {
          key: "moyen",
          label: "Moyen",
          description: "100 % en rotation entre les 3 meilleurs ETF.",
          target: { nasdaq: 1 / 3, sp500: 1 / 3, world: 1 / 3 },
          previous: { nasdaq: 1 / 3, sp500: 1 / 3, japan: 1 / 3 },
          changes: [
            { asset: "japan", from: 1 / 3, to: 0.0, action: "vendre" },
            { asset: "world", from: 0.0, to: 1 / 3, action: "acheter" },
          ],
          preview: { nasdaq: 1 / 3, sp500: 1 / 3, world: 1 / 3 },
          preview_changes: [],
          summary: {
            start: "2007-01-02",
            end: "2026-11-13",
            years: 19.9,
            cagr: 0.124,
            total_return: 9.25,
            periods: { "1": 0.168, "3": 0.145, "5": 0.136, "10": 0.138, "15": 0.132 },
            max_drawdown: 0.168,
            volatility: 0.134,
            yearly: {
              "2026": 0.154,
              "2025": 0.178,
              "2024": 0.214,
              "2023": 0.148,
              "2022": -0.068,
              "2021": 0.258,
              "2020": 0.146,
            },
            worst_year: [2022, -0.068],
            adjustments: 46,
            adjustments_per_year: 2.3,
            signal_changes: 40,
            exposure: { sp500: 0.26, nasdaq: 0.26, cash: 0.22, world: 0.12, japan: 0.08, emerging: 0.06 },
          },
          curve: [
            { date: "2007-01-02", value: 100 },
            { date: "2010-01-04", value: 132 },
            { date: "2013-01-02", value: 192 },
            { date: "2016-01-04", value: 294 },
            { date: "2019-01-02", value: 425 },
            { date: "2022-01-03", value: 685 },
            { date: "2024-01-02", value: 810 },
            { date: "2026-11-13", value: 1025 },
          ],
          history: [
            {
              day: "2026-11-02",
              signal_day: "2026-10-30",
              reason: "signal",
              changes: [
                { asset: "japan", from: 1 / 3, to: 0.0, action: "vendre" },
                { asset: "world", from: 0.0, to: 1 / 3, action: "acheter" },
              ],
            },
            {
              day: "2026-08-03",
              signal_day: "2026-07-31",
              reason: "signal",
              changes: [
                { asset: "europe", from: 1 / 3, to: 0.0, action: "vendre" },
                { asset: "japan", from: 0.0, to: 1 / 3, action: "acheter" },
              ],
            },
          ],
        },
        {
          key: "dynamique",
          label: "Dynamique",
          description: "100 % en rotation entre les 2 meilleurs ETF.",
          target: { nasdaq: 0.5, sp500: 0.5 },
          previous: { nasdaq: 0.5, sp500: 0.5 },
          changes: [],
          preview: { nasdaq: 0.5, sp500: 0.5 },
          preview_changes: [],
          summary: {
            start: "2007-01-02",
            end: "2026-11-13",
            years: 19.9,
            cagr: 0.146,
            total_return: 14.08,
            periods: { "1": 0.198, "3": 0.172, "5": 0.158, "10": 0.164, "15": 0.155 },
            max_drawdown: 0.195,
            volatility: 0.156,
            yearly: {
              "2026": 0.186,
              "2025": 0.212,
              "2024": 0.258,
              "2023": 0.184,
              "2022": -0.092,
              "2021": 0.294,
              "2020": 0.182,
            },
            worst_year: [2022, -0.092],
            adjustments: 48,
            adjustments_per_year: 2.4,
            signal_changes: 42,
            exposure: { nasdaq: 0.36, sp500: 0.34, cash: 0.2, japan: 0.06, emerging: 0.04 },
          },
          curve: [
            { date: "2007-01-02", value: 100 },
            { date: "2010-01-04", value: 142 },
            { date: "2013-01-02", value: 224 },
            { date: "2016-01-04", value: 368 },
            { date: "2019-01-02", value: 565 },
            { date: "2022-01-03", value: 980 },
            { date: "2024-01-02", value: 1185 },
            { date: "2026-11-13", value: 1508 },
          ],
          history: [
            {
              day: "2026-05-04",
              signal_day: "2026-04-30",
              reason: "drift",
              changes: [
                { asset: "nasdaq", from: 0.56, to: 0.5, action: "vendre" },
                { asset: "sp500", from: 0.44, to: 0.5, action: "acheter" },
              ],
            },
          ],
        },
      ],
      benchmark: {
        label: "S&P 500",
        start: "2007-01-02",
        end: "2026-11-13",
        years: 19.9,
        cagr: 0.114,
        total_return: 7.56,
        periods: { "1": 0.162, "3": 0.148, "5": 0.132, "10": 0.134, "15": 0.138 },
        max_drawdown: 0.512,
        volatility: 0.184,
        yearly: {
          "2026": 0.158,
          "2025": 0.182,
          "2024": 0.245,
          "2023": 0.192,
          "2022": -0.132,
          "2021": 0.312,
          "2020": 0.086,
        },
        worst_year: [2008, -0.342],
        adjustments: 0,
        adjustments_per_year: 0,
        signal_changes: 0,
        exposure: { sp500: 1.0 },
      },
      benchmark_curve: [
        { date: "2007-01-02", value: 100 },
        { date: "2010-01-04", value: 82 },
        { date: "2013-01-02", value: 118 },
        { date: "2016-01-04", value: 210 },
        { date: "2019-01-02", value: 295 },
        { date: "2022-01-03", value: 540 },
        { date: "2024-01-02", value: 645 },
        { date: "2026-11-13", value: 856 },
      ],
      assumptions: {
        cost: 0.003,
        drift: 0.05,
        momentum_months: [3, 6, 12],
        trend_months: 10,
        min_uptrends: 3,
        start: "2007-01-01",
      },
    },
  };

  getHealth(): Health {
    return this.health;
  }

  getPea(): Pea {
    return this.pea;
  }

  getPeaAlert(): PeaAlert {
    const report = this.pea.report;
    if (!report) return { active: false, levels: [], provisional: [] };
    const signalTime = new Date(`${report.signal_day}T12:00:00`).getTime();
    const asOfTime = new Date(`${report.as_of}T12:00:00`).getTime();
    const recent = Math.round((asOfTime - signalTime) / 86_400_000) <= 10;
    const levels = recent ? report.levels.filter((l) => l.changes.length > 0).map((l) => l.label) : [];
    const provisional = report.levels.filter((l) => l.preview_changes.length > 0).map((l) => l.label);
    return {
      active: levels.length > 0,
      signal_day: report.signal_day,
      levels,
      provisional,
      provisional_day: report.provisional_day,
    };
  }
}

declare global {
  var __mockDataStore: MockDataStore | undefined;
}

export const mockStore = globalThis.__mockDataStore ?? (globalThis.__mockDataStore = new MockDataStore());
