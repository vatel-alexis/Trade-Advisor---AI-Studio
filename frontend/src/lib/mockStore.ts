import type { Health, Pea, PeaAlert, PeaBenchmark, PeaPoint, PeaPortfolioConfig } from "./api";

const YEARS = [
  2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016,
  2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
];

const YEARLY_RETURNS: Record<string, Record<string, number>> = {
  securite: {
    "2007": 0.062, "2008": -0.024, "2009": 0.118, "2010": 0.089, "2011": 0.014,
    "2012": 0.078, "2013": 0.124, "2014": 0.112, "2015": 0.058, "2016": 0.064,
    "2017": 0.106, "2018": -0.018, "2019": 0.148, "2020": 0.092, "2021": 0.156,
    "2022": -0.041, "2023": 0.089, "2024": 0.134, "2025": 0.112, "2026": 0.098,
  },
  moyen: {
    "2007": 0.094, "2008": -0.048, "2009": 0.194, "2010": 0.142, "2011": 0.012,
    "2012": 0.126, "2013": 0.208, "2014": 0.184, "2015": 0.089, "2016": 0.102,
    "2017": 0.174, "2018": -0.036, "2019": 0.242, "2020": 0.146, "2021": 0.258,
    "2022": -0.068, "2023": 0.148, "2024": 0.214, "2025": 0.178, "2026": 0.154,
  },
  dynamique: {
    "2007": 0.118, "2008": -0.062, "2009": 0.246, "2010": 0.168, "2011": 0.008,
    "2012": 0.154, "2013": 0.248, "2014": 0.216, "2015": 0.112, "2016": 0.124,
    "2017": 0.212, "2018": -0.052, "2019": 0.288, "2020": 0.182, "2021": 0.294,
    "2022": -0.092, "2023": 0.184, "2024": 0.258, "2025": 0.212, "2026": 0.186,
  },
  sp500: {
    "2007": -0.048, "2008": -0.342, "2009": 0.224, "2010": 0.218, "2011": 0.052,
    "2012": 0.141, "2013": 0.264, "2014": 0.282, "2015": 0.124, "2016": 0.148,
    "2017": 0.068, "2018": 0.004, "2019": 0.334, "2020": 0.086, "2021": 0.382,
    "2022": -0.132, "2023": 0.218, "2024": 0.312, "2025": 0.182, "2026": 0.158,
  },
  nasdaq: {
    "2007": 0.072, "2008": -0.384, "2009": 0.482, "2010": 0.268, "2011": 0.064,
    "2012": 0.162, "2013": 0.308, "2014": 0.334, "2015": 0.208, "2016": 0.104,
    "2017": 0.168, "2018": 0.042, "2019": 0.412, "2020": 0.364, "2021": 0.368,
    "2022": -0.284, "2023": 0.486, "2024": 0.328, "2025": 0.226, "2026": 0.194,
  },
  world: {
    "2007": -0.018, "2008": -0.376, "2009": 0.258, "2010": 0.192, "2011": -0.024,
    "2012": 0.142, "2013": 0.212, "2014": 0.194, "2015": 0.104, "2016": 0.108,
    "2017": 0.076, "2018": -0.042, "2019": 0.302, "2020": 0.064, "2021": 0.312,
    "2022": -0.128, "2023": 0.196, "2024": 0.264, "2025": 0.164, "2026": 0.142,
  },
  europe: {
    "2007": 0.024, "2008": -0.436, "2009": 0.312, "2010": 0.112, "2011": -0.084,
    "2012": 0.178, "2013": 0.198, "2014": 0.068, "2015": 0.082, "2016": 0.026,
    "2017": 0.102, "2018": -0.106, "2019": 0.262, "2020": -0.032, "2021": 0.252,
    "2022": -0.096, "2023": 0.158, "2024": 0.088, "2025": 0.094, "2026": 0.052,
  },
  emerging: {
    "2007": 0.264, "2008": -0.508, "2009": 0.724, "2010": 0.262, "2011": -0.158,
    "2012": 0.164, "2013": -0.068, "2014": 0.114, "2015": -0.052, "2016": 0.142,
    "2017": 0.208, "2018": -0.104, "2019": 0.206, "2020": 0.084, "2021": 0.048,
    "2022": -0.148, "2023": 0.062, "2024": 0.142, "2025": 0.118, "2026": 0.086,
  },
  japan: {
    "2007": -0.142, "2008": -0.268, "2009": 0.032, "2010": 0.228, "2011": -0.112,
    "2012": 0.058, "2013": 0.214, "2014": 0.096, "2015": 0.218, "2016": 0.058,
    "2017": 0.112, "2018": -0.084, "2019": 0.214, "2020": 0.054, "2021": 0.094,
    "2022": -0.098, "2023": 0.162, "2024": 0.154, "2025": 0.128, "2026": 0.104,
  },
  cash: {
    "2007": 0.038, "2008": 0.039, "2009": 0.008, "2010": 0.005, "2011": 0.009,
    "2012": 0.002, "2013": 0.001, "2014": 0.001, "2015": -0.001, "2016": -0.003,
    "2017": -0.004, "2018": -0.004, "2019": -0.004, "2020": -0.005, "2021": -0.005,
    "2022": 0.001, "2023": 0.032, "2024": 0.037, "2025": 0.029, "2026": 0.024,
  },
};

const SEASONAL_WAVE = [0.85, 1.1, 1.25, 0.95, 0.7, 0.9, 1.15, 0.8, 0.65, 1.2, 1.3, 1.15];

function buildMonthlyCurve(key: string): PeaPoint[] {
  const yearly = YEARLY_RETURNS[key] ?? YEARLY_RETURNS.sp500;
  const points: PeaPoint[] = [{ date: "2007-01-02", value: 100 }];
  let current = 100;

  for (const year of YEARS) {
    const annReturn = yearly[String(year)] ?? 0.08;
    const monthsInYear = year === 2026 ? 11 : 12;
    const avgMonthly = (1 + annReturn) ** (1 / monthsInYear) - 1;

    for (let m = 1; m <= monthsInYear; m++) {
      const wave = SEASONAL_WAVE[(m - 1) % 12];
      const mRet = avgMonthly >= 0 ? avgMonthly * wave : avgMonthly * (2 - wave);
      current = current * (1 + mRet);
      const dayStr = year === 2026 && m === 11 ? "13" : "28";
      const monthStr = String(m).padStart(2, "0");
      points.push({
        date: `${year}-${monthStr}-${dayStr}`,
        value: Math.round(current * 100) / 100,
      });
    }
  }
  return points;
}

const CURVES: Record<string, PeaPoint[]> = {
  securite: buildMonthlyCurve("securite"),
  moyen: buildMonthlyCurve("moyen"),
  dynamique: buildMonthlyCurve("dynamique"),
  sp500: buildMonthlyCurve("sp500"),
  nasdaq: buildMonthlyCurve("nasdaq"),
  world: buildMonthlyCurve("world"),
  europe: buildMonthlyCurve("europe"),
  emerging: buildMonthlyCurve("emerging"),
  japan: buildMonthlyCurve("japan"),
  cash: buildMonthlyCurve("cash"),
};

const BENCHMARKS: Record<string, PeaBenchmark> = {
  sp500: {
    key: "sp500",
    label: "S&P 500",
    start: "2007-01-02",
    end: "2026-11-13",
    years: 19.9,
    cagr: 0.114,
    total_return: 7.56,
    periods: { "1": 0.162, "3": 0.148, "5": 0.132, "10": 0.134, "15": 0.138 },
    max_drawdown: 0.512,
    volatility: 0.184,
    yearly: YEARLY_RETURNS.sp500,
    worst_year: [2008, -0.342],
    adjustments: 0,
    adjustments_per_year: 0,
    signal_changes: 0,
    exposure: { sp500: 1.0 },
  },
  nasdaq: {
    key: "nasdaq",
    label: "Nasdaq-100",
    start: "2007-01-02",
    end: "2026-11-13",
    years: 19.9,
    cagr: 0.158,
    total_return: 17.45,
    periods: { "1": 0.214, "3": 0.242, "5": 0.178, "10": 0.194, "15": 0.188 },
    max_drawdown: 0.538,
    volatility: 0.224,
    yearly: YEARLY_RETURNS.nasdaq,
    worst_year: [2008, -0.384],
    adjustments: 0,
    adjustments_per_year: 0,
    signal_changes: 0,
    exposure: { nasdaq: 1.0 },
  },
  world: {
    key: "world",
    label: "MSCI World",
    start: "2007-01-02",
    end: "2026-11-13",
    years: 19.9,
    cagr: 0.098,
    total_return: 5.42,
    periods: { "1": 0.148, "3": 0.132, "5": 0.118, "10": 0.119, "15": 0.121 },
    max_drawdown: 0.494,
    volatility: 0.168,
    yearly: YEARLY_RETURNS.world,
    worst_year: [2008, -0.376],
    adjustments: 0,
    adjustments_per_year: 0,
    signal_changes: 0,
    exposure: { world: 1.0 },
  },
  europe: {
    key: "europe",
    label: "Europe Stoxx 600",
    start: "2007-01-02",
    end: "2026-11-13",
    years: 19.9,
    cagr: 0.068,
    total_return: 2.71,
    periods: { "1": 0.064, "3": 0.098, "5": 0.078, "10": 0.082, "15": 0.086 },
    max_drawdown: 0.542,
    volatility: 0.176,
    yearly: YEARLY_RETURNS.europe,
    worst_year: [2008, -0.436],
    adjustments: 0,
    adjustments_per_year: 0,
    signal_changes: 0,
    exposure: { europe: 1.0 },
  },
  emerging: {
    key: "emerging",
    label: "Marchés Émergents",
    start: "2007-01-02",
    end: "2026-11-13",
    years: 19.9,
    cagr: 0.061,
    total_return: 2.25,
    periods: { "1": 0.096, "3": 0.094, "5": 0.042, "10": 0.068, "15": 0.062 },
    max_drawdown: 0.586,
    volatility: 0.212,
    yearly: YEARLY_RETURNS.emerging,
    worst_year: [2008, -0.508],
    adjustments: 0,
    adjustments_per_year: 0,
    signal_changes: 0,
    exposure: { emerging: 1.0 },
  },
  japan: {
    key: "japan",
    label: "Japon Topix",
    start: "2007-01-02",
    end: "2026-11-13",
    years: 19.9,
    cagr: 0.064,
    total_return: 2.44,
    periods: { "1": 0.112, "3": 0.128, "5": 0.084, "10": 0.088, "15": 0.096 },
    max_drawdown: 0.468,
    volatility: 0.172,
    yearly: YEARLY_RETURNS.japan,
    worst_year: [2008, -0.268],
    adjustments: 0,
    adjustments_per_year: 0,
    signal_changes: 0,
    exposure: { japan: 1.0 },
  },
  cash: {
    key: "cash",
    label: "Monétaire €STR",
    start: "2007-01-02",
    end: "2026-11-13",
    years: 19.9,
    cagr: 0.011,
    total_return: 0.24,
    periods: { "1": 0.026, "3": 0.031, "5": 0.018, "10": 0.008, "15": 0.006 },
    max_drawdown: 0.024,
    volatility: 0.008,
    yearly: YEARLY_RETURNS.cash,
    worst_year: [2021, -0.005],
    adjustments: 0,
    adjustments_per_year: 0,
    signal_changes: 0,
    exposure: { cash: 1.0 },
  },
};

export class MockDataStore {
  private health: Health = {
    status: "ok",
    database: "ok",
  };

  private portfolio: PeaPortfolioConfig = {
    input_mode: "eur",
    target_level: "moyen",
    total_capital: 25000,
    cash_available: 1500,
    holdings_eur: {
      sp500: 8500,
      nasdaq: 6500,
      world: 4500,
      europe: 2500,
      emerging: 1500,
      japan: 0,
      cash: 1500,
    },
    holdings_pct: {
      sp500: 0.34,
      nasdaq: 0.26,
      world: 0.18,
      europe: 0.1,
      emerging: 0.06,
      japan: 0,
      cash: 0.06,
    },
    sim_initial_capital: 10000,
    sim_monthly_dca: 200,
    sim_horizon: "all",
    sim_benchmarks: ["sp500", "nasdaq", "world"],
    updated_at: new Date(Date.now() - 1800 * 1000).toISOString(),
  };

  private pea: Pea = {
    computed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    report: {
      as_of: "2026-11-13",
      signal_day: "2026-10-30",
      provisional_day: "2026-11-13",
      scores: [
        { asset: "nasdaq", momentum: 0.214, trend_ok: true, price: 78.5, average: 71.2 },
        { asset: "sp500", momentum: 0.178, trend_ok: true, price: 44.2, average: 40.8 },
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
          ticker: "PSP5",
          isin: "FR0011871128",
          proxy: "SPY",
          since: "2016-11-01",
        },
        {
          key: "nasdaq",
          label: "Nasdaq-100",
          name: "Amundi PEA Nasdaq-100 UCITS ETF Acc",
          ticker: "PUST",
          isin: "FR0011871110",
          proxy: "QQQ",
          since: "2016-11-01",
        },
        {
          key: "world",
          label: "MSCI World",
          name: "iShares MSCI World Swap PEA UCITS ETF",
          ticker: "WPEA",
          isin: "IE0002XZSHO1",
          proxy: "URTH",
          since: "2024-04-01",
        },
        {
          key: "europe",
          label: "Europe Stoxx 600",
          name: "Amundi PEA MSCI Europe UCITS ETF Acc",
          ticker: "PCEU",
          isin: "FR0013412038",
          proxy: "VGK",
          since: "2019-05-01",
        },
        {
          key: "emerging",
          label: "Émergents",
          name: "Amundi PEA Émergent (MSCI Emerging) ESG Transition UCITS ETF Acc",
          ticker: "PAEEM",
          isin: "FR0013412020",
          proxy: "EEM",
          since: "2019-05-01",
        },
        {
          key: "japan",
          label: "Japon Topix",
          name: "Amundi PEA Japon (TOPIX) UCITS ETF Acc",
          ticker: "PTPXE",
          isin: "FR0013411980",
          proxy: "EWJ",
          since: "2019-05-01",
        },
        {
          key: "cash",
          label: "Monétaire €STR",
          name: "Amundi PEA Euro Court Terme UCITS ETF",
          ticker: "OBLI",
          isin: "FR0013346681",
          proxy: null,
          since: "2024-10-01",
        },
      ],
      levels: [
        {
          key: "securite",
          label: "Sécurité",
          description: "60 % en rotation entre les 3 meilleurs ETF en tendance haussière, 40 % en fonds monétaire en permanence.",
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
            yearly: YEARLY_RETURNS.securite,
            worst_year: [2022, -0.041],
            adjustments: 42,
            adjustments_per_year: 2.1,
            signal_changes: 38,
            exposure: { cash: 0.52, sp500: 0.16, nasdaq: 0.16, world: 0.08, japan: 0.05, emerging: 0.03 },
          },
          curve: CURVES.securite,
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
            {
              day: "2026-03-02",
              signal_day: "2026-02-27",
              reason: "signal",
              changes: [
                { asset: "emerging", from: 0.2, to: 0.0, action: "vendre" },
                { asset: "europe", from: 0.0, to: 0.2, action: "acheter" },
              ],
            },
          ],
        },
        {
          key: "moyen",
          label: "Moyen",
          description: "100 % en rotation équipondérée entre les 3 meilleurs ETF en tendance haussière (repli monétaire si baisse).",
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
            yearly: YEARLY_RETURNS.moyen,
            worst_year: [2022, -0.068],
            adjustments: 46,
            adjustments_per_year: 2.3,
            signal_changes: 40,
            exposure: { sp500: 0.26, nasdaq: 0.26, cash: 0.22, world: 0.12, japan: 0.08, emerging: 0.06 },
          },
          curve: CURVES.moyen,
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
            {
              day: "2026-03-02",
              signal_day: "2026-02-27",
              reason: "signal",
              changes: [
                { asset: "emerging", from: 1 / 3, to: 0.0, action: "vendre" },
                { asset: "europe", from: 0.0, to: 1 / 3, action: "acheter" },
              ],
            },
          ],
        },
        {
          key: "dynamique",
          label: "Dynamique",
          description: "100 % concentré sur les 2 meilleurs ETF en tendance haussière (50 % par ligne, repli monétaire si baisse).",
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
            yearly: YEARLY_RETURNS.dynamique,
            worst_year: [2022, -0.092],
            adjustments: 48,
            adjustments_per_year: 2.4,
            signal_changes: 42,
            exposure: { nasdaq: 0.36, sp500: 0.34, cash: 0.2, japan: 0.06, emerging: 0.04 },
          },
          curve: CURVES.dynamique,
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
            {
              day: "2025-12-01",
              signal_day: "2025-11-28",
              reason: "signal",
              changes: [
                { asset: "world", from: 0.5, to: 0.0, action: "vendre" },
                { asset: "sp500", from: 0.0, to: 0.5, action: "acheter" },
              ],
            },
          ],
        },
      ],
      benchmark: {
        ...BENCHMARKS.sp500,
        label: "S&P 500 (PEA) conservé",
      },
      benchmark_curve: CURVES.sp500,
      benchmarks: BENCHMARKS,
      asset_curves: {
        sp500: CURVES.sp500,
        nasdaq: CURVES.nasdaq,
        world: CURVES.world,
        europe: CURVES.europe,
        emerging: CURVES.emerging,
        japan: CURVES.japan,
        cash: CURVES.cash,
      },
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

  getPortfolio(): PeaPortfolioConfig {
    return this.portfolio;
  }

  savePortfolio(data: Partial<PeaPortfolioConfig>): PeaPortfolioConfig {
    const next: PeaPortfolioConfig = {
      ...this.portfolio,
      ...data,
      input_mode: data.input_mode === "pct" ? "pct" : data.input_mode === "eur" ? "eur" : this.portfolio.input_mode,
      target_level: data.target_level ?? this.portfolio.target_level,
      total_capital: typeof data.total_capital === "number" ? Math.max(0, data.total_capital) : this.portfolio.total_capital,
      cash_available: typeof data.cash_available === "number" ? Math.max(0, data.cash_available) : this.portfolio.cash_available,
      holdings_eur: data.holdings_eur ? { ...data.holdings_eur } : this.portfolio.holdings_eur,
      holdings_pct: data.holdings_pct ? { ...data.holdings_pct } : this.portfolio.holdings_pct,
      sim_initial_capital:
        typeof data.sim_initial_capital === "number"
          ? Math.max(100, data.sim_initial_capital)
          : this.portfolio.sim_initial_capital,
      sim_monthly_dca:
        typeof data.sim_monthly_dca === "number" ? Math.max(0, data.sim_monthly_dca) : this.portfolio.sim_monthly_dca,
      sim_horizon: data.sim_horizon ?? this.portfolio.sim_horizon,
      sim_benchmarks: Array.isArray(data.sim_benchmarks) ? data.sim_benchmarks : this.portfolio.sim_benchmarks,
      updated_at: new Date().toISOString(),
    };
    this.portfolio = next;
    return this.portfolio;
  }
}

declare global {
  var __mockDataStore: MockDataStore | undefined;
}

export const mockStore = globalThis.__mockDataStore ?? (globalThis.__mockDataStore = new MockDataStore());
