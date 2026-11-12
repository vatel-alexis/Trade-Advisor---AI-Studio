import type {
  BacktestDetail,
  BacktestRun,
  Backtests,
  Dashboard,
  Health,
  History,
  NoTrade,
  Opportunity,
  OptionPosition,
  Params,
  Pea,
  PeaAlert,
  Positions,
  Profile,
  Profiles,
  Status,
} from "./api";

// In-memory fallback mock state for AI Studio preview or when the external FastAPI backend is not running.
export class MockDataStore {
  private health: Health = {
    status: "ok",
    database: "ok (mode simulation)",
    broker_env: "paper",
  };

  private status: Status = {
    environment: "paper",
    trading_allowed: true,
    gate: {
      allowed: true,
      reasons: [],
      checks: [
        { key: "worker", label: "Worker", ok: true, detail: "Dernière exécution réussie (tâches planifiées actives)" },
        { key: "monitor", label: "Moniteur", ok: true, detail: "Surveillance des ordres et marks active" },
        { key: "data", label: "Données de marché", ok: true, detail: "Flux options et sous-jacents synchronisé" },
        { key: "market_open", label: "Séance US", ok: true, detail: "Marché ouvert (9h30 - 16h00 NY)" },
        { key: "loss_limits", label: "Plafonds de pertes", ok: true, detail: "Pertes du jour et du mois conformes" },
        { key: "risk_clusters", label: "Clusters de risque", ok: true, detail: "Diversification sectorielle respectée" },
      ],
    },
    worker_last_success: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    monitor_last_success: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    monitor_last_error: null,
    data_last_update: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    screener_last_run: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    profile: "Vente de primes défensive",
    profile_version: 4,
    broker_env: "paper",
  };

  private dashboard: Dashboard = {
    starting_capital: 20000,
    capital: 22480,
    cash_available: 16830,
    collateral: 5650,
    open_max_loss: 3100,
    open_max_loss_limit: 6000,
    stress_loss: 1720,
    realized_pnl: 2480,
    unrealized_pnl: 410,
    equity: 22890,
    daily_change: 0.0065,
    monthly_change: 0.034,
    drawdown: 0.018,
    max_engaged_pct: 0.5,
    max_trade_pct: 0.05,
    engaged: 5650,
    available: 16830,
    engagement_capacity: 4350,
    open_positions: 3,
    pending_positions: 0,
    proposed_opportunities: 2,
    last_screener_run: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    clusters: [
      { cluster: "Tech US", risk: 2450 },
      { cluster: "Large Cap Indice", risk: 1800 },
      { cluster: "Consommation", risk: 1400 },
    ],
    cluster_limit: 4000,
    expirations: [
      { expiration: "2026-11-20", risk: 2250 },
      { expiration: "2026-12-18", risk: 3400 },
    ],
    expiration_limit: 5000,
    greeks: { delta: 12, vega: -38, theta: 32, missing: 0, basis: "mid" },
    limits: { daily_loss: 0.03, monthly_loss: 0.06, drawdown: 0.1, trade_risk: 0.02 },
    analytics: {
      trades: 46,
      wins: 39,
      losses: 7,
      win_rate: 0.848,
      realized_pnl: 2480,
      avg_win: 115,
      avg_loss: -285,
      profit_factor: 2.25,
      premium_collected: 5820,
      premium_this_month: 740,
      max_drawdown: 620,
      max_drawdown_pct: 0.029,
      curve: [
        { date: "2026-05-01", pnl: 0, cumulative: 0, equity: 20000 },
        { date: "2026-06-01", pnl: 380, cumulative: 380, equity: 20380 },
        { date: "2026-07-01", pnl: 410, cumulative: 790, equity: 20790 },
        { date: "2026-08-01", pnl: 520, cumulative: 1310, equity: 21310 },
        { date: "2026-09-01", pnl: -180, cumulative: 1130, equity: 21130 },
        { date: "2026-10-01", pnl: 610, cumulative: 1740, equity: 21740 },
        { date: "2026-11-01", pnl: 740, cumulative: 2480, equity: 22480 },
      ],
      months: [
        { month: "2026-06", premium: 720, realized_pnl: 380, trades: 7 },
        { month: "2026-07", premium: 810, realized_pnl: 410, trades: 8 },
        { month: "2026-08", premium: 940, realized_pnl: 520, trades: 9 },
        { month: "2026-09", premium: 890, realized_pnl: -180, trades: 6 },
        { month: "2026-10", premium: 1040, realized_pnl: 610, trades: 10 },
        { month: "2026-11", premium: 740, realized_pnl: 740, trades: 6 },
      ],
      by_strategy: [
        {
          strategy: "put_credit_spread",
          trades: 34,
          wins: 30,
          losses: 4,
          win_rate: 0.882,
          realized_pnl: 1820,
          avg_win: 95,
          avg_loss: -257,
          profit_factor: 2.76,
        },
        {
          strategy: "short_put",
          trades: 12,
          wins: 9,
          losses: 3,
          win_rate: 0.75,
          realized_pnl: 660,
          avg_win: 170,
          avg_loss: -290,
          profit_factor: 1.76,
        },
      ],
      exit_reasons: {
        take_profit: 32,
        time_exit: 7,
        stop_loss: 4,
        assignment: 3,
      },
    },
  };

  private positions: Positions = {
    options: [
      {
        id: 101,
        underlying: "SPY",
        strategy: "put_credit_spread",
        status: "open",
        opened_at: "2026-11-02T15:30:00Z",
        expiration: "2026-12-18",
        dte: 36,
        contracts: 2,
        legs: [
          { symbol: "SPY261218P00580000", type: "put", side: "sell", strike: 580 },
          { symbol: "SPY261218P00570000", type: "put", side: "buy", strike: 570 },
        ],
        entry_credit: 1.85,
        open_limit: 1.85,
        open_step: 1,
        collateral: 2000,
        max_loss: 1630,
        mark: 0.95,
        marked_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        unrealized_pnl: 180,
        profit_pct: 0.486,
        take_profit_price: 0.55,
        exit_order: null,
        execution: {
          entry_mid: 1.85,
          entry_natural: 1.82,
          entry_fill: 1.85,
          entry_slippage: 0.0,
          entry_slippage_estimated: 0.02,
          mid: 0.95,
          natural: 0.98,
          liquidation_spread: 0.06,
          expected_exit: 0.98,
          delta: 0.16,
          underlying_price: 598.4,
          stop_price: 3.7,
          stop_rules: [
            { key: "3x_credit", label: "Plafond 3x", rule: "Rachat si le débit dépasse 5,55 $" },
            { key: "delta_breach", label: "Delta court", rule: "Alerte si delta > 0.40" },
          ],
          limit_steps: 4,
        },
        can_close: true,
      },
      {
        id: 102,
        underlying: "MSFT",
        strategy: "put_credit_spread",
        status: "open",
        opened_at: "2026-11-05T16:15:00Z",
        expiration: "2026-12-18",
        dte: 36,
        contracts: 1,
        legs: [
          { symbol: "MSFT261218P00415000", type: "put", side: "sell", strike: 415 },
          { symbol: "MSFT261218P00405000", type: "put", side: "buy", strike: 405 },
        ],
        entry_credit: 2.1,
        open_limit: 2.1,
        open_step: 1,
        collateral: 1000,
        max_loss: 790,
        mark: 1.45,
        marked_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        unrealized_pnl: 65,
        profit_pct: 0.31,
        take_profit_price: 0.63,
        exit_order: null,
        execution: {
          entry_mid: 2.1,
          entry_natural: 2.08,
          entry_fill: 2.1,
          entry_slippage: 0.0,
          entry_slippage_estimated: 0.03,
          mid: 1.45,
          natural: 1.49,
          liquidation_spread: 0.08,
          expected_exit: 1.49,
          delta: 0.19,
          underlying_price: 432.1,
          stop_price: 4.2,
          stop_rules: [
            { key: "3x_credit", label: "Plafond 3x", rule: "Rachat si le débit dépasse 6,30 $" },
          ],
          limit_steps: 4,
        },
        can_close: true,
      },
      {
        id: 103,
        underlying: "AMZN",
        strategy: "short_put",
        status: "open",
        opened_at: "2026-11-08T15:45:00Z",
        expiration: "2026-11-20",
        dte: 8,
        contracts: 1,
        legs: [{ symbol: "AMZN261120P00195000", type: "put", side: "sell", strike: 195 }],
        entry_credit: 2.45,
        open_limit: 2.45,
        open_step: 1,
        collateral: 2650,
        max_loss: 19255,
        mark: 0.8,
        marked_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        unrealized_pnl: 165,
        profit_pct: 0.673,
        take_profit_price: 0.5,
        exit_order: null,
        execution: {
          entry_mid: 2.45,
          entry_natural: 2.42,
          entry_fill: 2.45,
          entry_slippage: 0.0,
          entry_slippage_estimated: 0.03,
          mid: 0.8,
          natural: 0.83,
          liquidation_spread: 0.05,
          expected_exit: 0.83,
          delta: 0.12,
          underlying_price: 208.7,
          stop_price: 4.9,
          stop_rules: [
            { key: "3x_credit", label: "Plafond 2x", rule: "Rachat si le débit dépasse 4,90 $" },
          ],
          limit_steps: 4,
        },
        can_close: true,
      },
    ],
    share_lots: [
      {
        id: 201,
        underlying: "INTC",
        opened_at: "2026-10-14",
        shares: 100,
        cost_basis: 22.4,
        collateral: 2240,
        covered_shares: 100,
      },
    ],
  };

  private opportunities: Opportunity[] = [
    {
      id: 301,
      underlying: "AAPL",
      sector: "Technology",
      strategy: "put_credit_spread",
      status: "proposed",
      proposed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      expiration: "2026-12-18",
      dte: 36,
      underlying_price: 234.5,
      short_strike: 220,
      legs: [
        { symbol: "AAPL261218P00220000", type: "put", side: "sell", strike: 220, bid: 2.4, ask: 2.46, delta: -0.18 },
        { symbol: "AAPL261218P00210000", type: "put", side: "buy", strike: 210, bid: 0.92, ask: 0.98, delta: -0.08 },
      ],
      quantity: 1,
      credit: 1.48,
      credit_total: 148,
      max_loss: 852,
      collateral: 1000,
      stress_loss: 420,
      risk_pct: 0.042,
      sizing: {
        quantity: 1,
        risk_budget: 1000,
        risk_per_contract: 852,
        caps: { portfolio_limit: 2, cluster_cap: 1, capital_cap: 1 },
        binding: "cluster_cap",
        no_trade: null,
      },
      cluster: "Tech US",
      weight: 0.85,
      breakeven: 218.52,
      delta: 0.1,
      pop: 0.84,
      ror: 0.174,
      aroc: 1.76,
      iv_rank: 42.5,
      iv_rank_method: "1y",
      put_call: { volume_ratio: 0.88, oi_ratio: 0.92, put_volume: 45000, call_volume: 51000, put_oi: 210000, call_oi: 228000 },
      score: 84,
      next_earnings: "2027-01-29",
      take_profit_price: 0.44,
      take_profit_gain: 104,
      stop_price: 2.96,
      time_exit_date: "2026-12-08",
      assignment_accepted: false,
      holding_window: 21,
      distance_pct: 0.062,
      distance_sd: 1.82,
      quality: {
        eligible: true,
        absolute: 86,
        execution: 88,
        portfolio: 78,
        final: 78,
        weighted: 84,
        components: { liquidity: 92, spread: 88, iv_rank: 75, distance: 82 },
        missing: [],
        weaknesses: [],
        blocking: [],
        rank: 1,
        rank_of: 4,
      },
      return_on_risk: 0.174,
      greeks: { delta: 10, vega: -18, theta: 12 },
      max_gain: 148,
      impact: {
        open_max_loss_after: 3952,
        open_max_loss_limit: 6000,
        cluster: "Tech US",
        cluster_risk_after: 3302,
        cluster_limit: 4000,
        expiration_risk_after: 4252,
        expiration_limit: 5000,
        stress_loss_after: 2140,
        collateral_after: 6650,
      },
    },
    {
      id: 302,
      underlying: "GOOGL",
      sector: "Communication",
      strategy: "short_put",
      status: "proposed",
      proposed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      expiration: "2026-12-18",
      dte: 36,
      underlying_price: 182.2,
      short_strike: 170,
      legs: [
        { symbol: "GOOGL261218P00170000", type: "put", side: "sell", strike: 170, bid: 2.15, ask: 2.22, delta: -0.19 },
      ],
      quantity: 1,
      credit: 2.18,
      credit_total: 218,
      max_loss: 16782,
      collateral: 2500,
      stress_loss: 950,
      risk_pct: 0.047,
      sizing: {
        quantity: 1,
        risk_budget: 2500,
        risk_per_contract: 2500,
        caps: { portfolio_limit: 1, cluster_cap: 1, capital_cap: 1 },
        binding: "capital_cap",
        no_trade: null,
      },
      cluster: "Tech US",
      weight: 0.8,
      breakeven: 167.82,
      delta: 0.19,
      pop: 0.82,
      ror: 0.087,
      aroc: 0.88,
      iv_rank: 48.0,
      iv_rank_method: "1y",
      put_call: { volume_ratio: 0.95, oi_ratio: 1.05, put_volume: 38000, call_volume: 40000, put_oi: 180000, call_oi: 171000 },
      score: 80,
      next_earnings: "2027-02-03",
      take_profit_price: 0.65,
      take_profit_gain: 153,
      stop_price: 4.36,
      time_exit_date: "2026-12-08",
      assignment_accepted: true,
      holding_window: 21,
      distance_pct: 0.067,
      distance_sd: 1.9,
      quality: {
        eligible: true,
        absolute: 82,
        execution: 85,
        portfolio: 74,
        final: 74,
        weighted: 80,
        components: { liquidity: 90, spread: 86, iv_rank: 82, distance: 80 },
        missing: [],
        weaknesses: [],
        blocking: [],
        rank: 2,
        rank_of: 4,
      },
      return_on_risk: 0.087,
      greeks: { delta: 19, vega: -24, theta: 16 },
      max_gain: 218,
      impact: {
        open_max_loss_after: 5600,
        open_max_loss_limit: 6000,
        cluster: "Tech US",
        cluster_risk_after: 3400,
        cluster_limit: 4000,
        expiration_risk_after: 4350,
        expiration_limit: 5000,
        stress_loss_after: 2670,
        collateral_after: 8150,
      },
    },
  ];

  private noTrade: NoTrade = {
    run_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    rows: [
      {
        underlying: "TSLA",
        strategy: "put_credit_spread",
        reasons: ["IV Rank trop faible (< 25)", "Écart bid/ask supérieur à 10 %"],
        quality: null,
      },
      {
        underlying: "NVDA",
        strategy: "put_credit_spread",
        reasons: ["Annonce de résultats (earnings) dans les 21 jours"],
        quality: null,
      },
    ],
  };

  private history: History = {
    underlyings: ["SPY", "MSFT", "AAPL", "AMZN", "GOOGL", "META", "AMD"],
    rows: [
      {
        id: "hist-01",
        kind: "closed",
        date: "2026-11-04",
        opened_at: "2026-10-06",
        underlying: "META",
        strategy: "put_credit_spread",
        expiration: "2026-11-14",
        strikes: [570, 560],
        quantity: 2,
        credit: 1.95,
        debit: 0.45,
        pnl: 300,
        reason: "take_profit",
        note: "Objectif 75 % atteint",
        entry_slippage: 0.01,
        exit_slippage: 0.0,
      },
      {
        id: "hist-02",
        kind: "expired",
        date: "2026-10-31",
        opened_at: "2026-09-22",
        underlying: "SPY",
        strategy: "put_credit_spread",
        expiration: "2026-10-31",
        strikes: [565, 555],
        quantity: 2,
        credit: 1.7,
        debit: 0,
        pnl: 340,
        reason: "expired_worthless",
        note: "Expiré sans valeur hors de la monnaie",
        entry_slippage: 0.0,
        exit_slippage: 0.0,
      },
      {
        id: "hist-03",
        kind: "closed",
        date: "2026-10-25",
        opened_at: "2026-10-02",
        underlying: "AMD",
        strategy: "put_credit_spread",
        expiration: "2026-11-07",
        strikes: [160, 150],
        quantity: 1,
        credit: 2.2,
        debit: 4.8,
        pnl: -260,
        reason: "stop_loss",
        note: "Stop perte déclenché sur baisse sous-jacent",
        entry_slippage: 0.02,
        exit_slippage: 0.04,
      },
      {
        id: "hist-04",
        kind: "closed",
        date: "2026-10-18",
        opened_at: "2026-09-15",
        underlying: "AAPL",
        strategy: "short_put",
        expiration: "2026-10-24",
        strikes: [215],
        quantity: 1,
        credit: 2.6,
        debit: 0.65,
        pnl: 195,
        reason: "take_profit",
        note: "Objectif 75 % atteint",
        entry_slippage: 0.01,
        exit_slippage: 0.01,
      },
    ],
  };

  private pea: Pea = {
    computed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    report: {
      as_of: "2026-11-01",
      signal_day: "2026-10-31",
      provisional_day: null,
      scores: [
        { asset: "cw8", momentum: 0.142, trend_ok: true, price: 542.8, average: 512.3 },
        { asset: "ese", momentum: 0.178, trend_ok: true, price: 28.4, average: 26.2 },
        { asset: "paasi", momentum: 0.084, trend_ok: true, price: 24.1, average: 23.3 },
        { asset: "c50", momentum: 0.052, trend_ok: false, price: 168.2, average: 171.0 },
        { asset: "xeon", momentum: 0.038, trend_ok: true, price: 145.2, average: 144.1 },
      ],
      assets: [
        { key: "cw8", label: "MSCI World", name: "Amundi MSCI World UCITS ETF", ticker: "CW8", isin: "LU1681043599", proxy: "URTH", since: "2009-04" },
        { key: "ese", label: "S&P 500", name: "BNP Paribas Easy S&P 500 UCITS ETF", ticker: "ESE", isin: "FR0011550185", proxy: "SPY", since: "2013-05" },
        { key: "paasi", label: "Marchés Émergents Asie", name: "Amundi MSCI Emerging Asia UCITS ETF", ticker: "PAASI", isin: "LU1681044480", proxy: "EEMA", since: "2011-02" },
        { key: "c50", label: "Euro Stoxx 50", name: "Amundi Euro Stoxx 50 UCITS ETF", ticker: "C50", isin: "LU1681047236", proxy: "FEZ", since: "2008-01" },
        { key: "xeon", label: "Monétaire € (Overnight)", name: "Xtrackers II EUR Overnight Rate Swap", ticker: "XEON", isin: "LU0290358497", proxy: "EURON", since: "2007-06" },
      ],
      levels: [
        {
          key: "prudent",
          label: "Prudent",
          description: "Priorité à la préservation du capital : forte part monétaire en repli et diversification prudente.",
          target: { cw8: 0.3, ese: 0.2, paasi: 0.1, xeon: 0.4 },
          previous: { cw8: 0.3, ese: 0.2, paasi: 0.1, xeon: 0.4 },
          changes: [],
          preview: null,
          preview_changes: [],
          summary: {
            start: "2015-01-01",
            end: "2026-10-31",
            years: 11.8,
            cagr: 0.076,
            total_return: 1.38,
            periods: { "1": 0.082, "3": 0.24, "5": 0.42, "10": 1.08, "15": null },
            max_drawdown: 0.095,
            volatility: 0.068,
            yearly: { "2026": 0.071, "2025": 0.088, "2024": 0.092, "2023": 0.078, "2022": -0.038, "2021": 0.114 },
            worst_year: [2022, -0.038],
            adjustments: 24,
            adjustments_per_year: 2.0,
            signal_changes: 24,
            exposure: { cw8: 0.3, ese: 0.2, paasi: 0.1, xeon: 0.4 },
          },
          curve: [
            { date: "2024-01-01", value: 100 },
            { date: "2024-06-01", value: 104.5 },
            { date: "2025-01-01", value: 109.2 },
            { date: "2025-06-01", value: 113.8 },
            { date: "2026-01-01", value: 118.8 },
            { date: "2026-10-31", value: 127.2 },
          ],
          history: [],
        },
        {
          key: "moyen",
          label: "Équilibré (Moyen)",
          description: "Suivi de tendance actif sur les 3 grands pôles mondiaux avec couverture monétaire systématique en cas de cassure de moyenne mobile.",
          target: { cw8: 0.45, ese: 0.35, paasi: 0.2, xeon: 0.0 },
          previous: { cw8: 0.4, ese: 0.35, paasi: 0.15, xeon: 0.1 },
          changes: [
            { asset: "cw8", from: 0.4, to: 0.45, action: "acheter" },
            { asset: "paasi", from: 0.15, to: 0.2, action: "acheter" },
            { asset: "xeon", from: 0.1, to: 0.0, action: "vendre" },
          ],
          preview: null,
          preview_changes: [],
          summary: {
            start: "2015-01-01",
            end: "2026-10-31",
            years: 11.8,
            cagr: 0.118,
            total_return: 2.76,
            periods: { "1": 0.142, "3": 0.41, "5": 0.74, "10": 2.05, "15": null },
            max_drawdown: 0.138,
            volatility: 0.112,
            yearly: { "2026": 0.134, "2025": 0.152, "2024": 0.168, "2023": 0.142, "2022": -0.062, "2021": 0.215 },
            worst_year: [2022, -0.062],
            adjustments: 32,
            adjustments_per_year: 2.7,
            signal_changes: 32,
            exposure: { cw8: 0.45, ese: 0.35, paasi: 0.2, xeon: 0.0 },
          },
          curve: [
            { date: "2024-01-01", value: 100 },
            { date: "2024-06-01", value: 108.2 },
            { date: "2025-01-01", value: 116.8 },
            { date: "2025-06-01", value: 125.4 },
            { date: "2026-01-01", value: 134.5 },
            { date: "2026-10-31", value: 152.6 },
          ],
          history: [],
        },
        {
          key: "offensif",
          label: "Offensif",
          description: "Allocation dynamique concentrée sur les deux indices les plus porteurs (Momentum fort), réduction du cash au strict minimum.",
          target: { ese: 0.6, cw8: 0.4, paasi: 0.0, xeon: 0.0 },
          previous: { ese: 0.6, cw8: 0.4, paasi: 0.0, xeon: 0.0 },
          changes: [],
          preview: null,
          preview_changes: [],
          summary: {
            start: "2015-01-01",
            end: "2026-10-31",
            years: 11.8,
            cagr: 0.139,
            total_return: 3.65,
            periods: { "1": 0.175, "3": 0.49, "5": 0.92, "10": 2.68, "15": null },
            max_drawdown: 0.182,
            volatility: 0.145,
            yearly: { "2026": 0.168, "2025": 0.194, "2024": 0.221, "2023": 0.185, "2022": -0.114, "2021": 0.282 },
            worst_year: [2022, -0.114],
            adjustments: 38,
            adjustments_per_year: 3.2,
            signal_changes: 38,
            exposure: { ese: 0.6, cw8: 0.4, paasi: 0.0, xeon: 0.0 },
          },
          curve: [
            { date: "2024-01-01", value: 100 },
            { date: "2024-06-01", value: 111.4 },
            { date: "2025-01-01", value: 122.1 },
            { date: "2025-06-01", value: 133.8 },
            { date: "2026-01-01", value: 146.2 },
            { date: "2026-10-31", value: 171.0 },
          ],
          history: [],
        },
      ],
      benchmark: {
        label: "S&P 500 (EUR)",
        start: "2015-01-01",
        end: "2026-10-31",
        years: 11.8,
        cagr: 0.126,
        total_return: 3.08,
        periods: { "1": 0.165, "3": 0.45, "5": 0.88, "10": 2.25, "15": null },
        max_drawdown: 0.224,
        volatility: 0.162,
        yearly: { "2026": 0.158, "2025": 0.182, "2024": 0.245, "2023": 0.192, "2022": -0.132, "2021": 0.312 },
        worst_year: [2022, -0.132],
        adjustments: 0,
        adjustments_per_year: 0,
        signal_changes: 0,
        exposure: { ese: 1.0 },
      },
      benchmark_curve: [
        { date: "2024-01-01", value: 100 },
        { date: "2024-06-01", value: 109.8 },
        { date: "2025-01-01", value: 120.4 },
        { date: "2025-06-01", value: 130.6 },
        { date: "2026-01-01", value: 142.1 },
        { date: "2026-10-31", value: 164.5 },
      ],
      assumptions: {
        cost: 0.001,
        drift: 0.05,
        momentum_months: [3, 6, 12],
        trend_months: 10,
        min_uptrends: 1,
        start: "2015-01-01",
      },
    },
  };

  private profiles: Profiles = {
    active_profile_id: 1,
    active_version: 4,
    groups: [
      { key: "selection", label: "Sélection des sous-jacents" },
      { key: "strategy", label: "Construction du trade" },
      { key: "risk", label: "Gestion du risque" },
      { key: "exit", label: "Règles de sortie" },
    ],
    fields: [
      { key: "min_iv_rank", label: "IV Rank minimum", group: "selection", kind: "pct", help: "IV Rank minimum du titre", toggle: null, min: 0, max: 1, step: 0.05 },
      { key: "min_dte", label: "DTE minimum", group: "strategy", kind: "int", help: "Jours avant expiration", toggle: null, min: 20, max: 60, step: 1 },
      { key: "max_dte", label: "DTE maximum", group: "strategy", kind: "int", help: "Jours avant expiration max", toggle: null, min: 30, max: 90, step: 1 },
      { key: "target_delta", label: "Delta court cible", group: "strategy", kind: "float", help: "Delta de la patte vendue", toggle: null, min: 0.1, max: 0.35, step: 0.01 },
      { key: "take_profit_pct", label: "Prise de bénéfice (% du crédit)", group: "exit", kind: "pct", help: "Rachat anticipé", toggle: null, min: 0.3, max: 0.9, step: 0.05 },
      { key: "stop_loss_mult", label: "Stop loss (multiple du crédit)", group: "exit", kind: "float", help: "Multiplicateur de perte", toggle: null, min: 1.5, max: 5.0, step: 0.25 },
      { key: "max_engaged_pct", label: "Capital engagé max", group: "risk", kind: "pct", help: "Collatéral total maximum", toggle: null, min: 0.2, max: 0.8, step: 0.05 },
    ],
    defaults: {
      min_iv_rank: 0.3,
      min_dte: 30,
      max_dte: 50,
      target_delta: 0.18,
      take_profit_pct: 0.7,
      stop_loss_mult: 3.0,
      max_engaged_pct: 0.5,
    },
    simple_groups: [
      { key: "horizon", label: "Horizon temporel", description: "Durée moyenne des positions", fields: ["min_dte", "max_dte"] },
      { key: "targets", label: "Objectifs & Risque", description: "Seuils d'entrée et de sortie", fields: ["target_delta", "take_profit_pct", "stop_loss_mult"] },
    ],
    risk_levels: [
      { key: "prudent", label: "Défensif", description: "Delta 0.15, max 35% de capital engagé", values: { target_delta: 0.15, max_engaged_pct: 0.35, stop_loss_mult: 2.5 } },
      { key: "modere", label: "Équilibré", description: "Delta 0.18, max 50% de capital engagé", values: { target_delta: 0.18, max_engaged_pct: 0.5, stop_loss_mult: 3.0 } },
      { key: "offensif", label: "Dynamique", description: "Delta 0.24, max 65% de capital engagé", values: { target_delta: 0.24, max_engaged_pct: 0.65, stop_loss_mult: 3.5 } },
    ],
    profiles: [
      {
        id: 1,
        name: "Vente de primes défensive",
        description: "Profil principal par défaut orienté Put Credit Spread 30-45 DTE, delta ~0.18, TP 70 %.",
        params: { min_iv_rank: 0.3, min_dte: 30, max_dte: 50, target_delta: 0.18, take_profit_pct: 0.7, stop_loss_mult: 3.0, max_engaged_pct: 0.5 },
        changed: [],
        is_active: true,
        created_at: "2026-09-01T10:00:00Z",
        updated_at: "2026-11-01T14:00:00Z",
        risk: { status: "ok", blocking: false, source: "backtest n° 1", cagr: 0.124, max_drawdown: 0.078, reasons: [] },
      },
      {
        id: 2,
        name: "Prudent (Delta 0.15)",
        description: "Probabilité de gain accrue (PoP > 85 %), collatéral réduit à 35 % du compte.",
        params: { min_iv_rank: 0.35, min_dte: 35, max_dte: 55, target_delta: 0.15, take_profit_pct: 0.6, stop_loss_mult: 2.5, max_engaged_pct: 0.35 },
        changed: ["target_delta", "max_engaged_pct", "stop_loss_mult", "take_profit_pct"],
        is_active: false,
        created_at: "2026-09-15T11:00:00Z",
        updated_at: "2026-10-20T16:00:00Z",
        risk: { status: "ok", blocking: false, source: "backtest n° 2", cagr: 0.086, max_drawdown: 0.042, reasons: [] },
      },
    ],
  };

  private backtests: Backtests = {
    runs: [
      {
        id: 1,
        profile_id: 1,
        profile_name: "Vente de primes défensive",
        status: "done",
        progress: 1.0,
        step: "Terminé",
        error: null,
        start: "2021-01-04",
        end: "2026-10-31",
        capital: 20000,
        model: {},
        created_at: "2026-11-01T10:00:00Z",
        started_at: "2026-11-01T10:00:02Z",
        finished_at: "2026-11-01T10:00:45Z",
        params: { min_iv_rank: 0.3, min_dte: 30, max_dte: 50, target_delta: 0.18, take_profit_pct: 0.7, stop_loss_mult: 3.0, max_engaged_pct: 0.5 },
        summary: {
          start: "2021-01-04",
          end: "2026-10-31",
          capital: 20000,
          final: 34520,
          cagr: 0.124,
          net_return: 0.726,
          max_drawdown: -0.078,
          worst_year: { year: 2022, return: 0.042 },
          max_consecutive_losses: 3,
          recovery_days: 34,
          recovered: true,
          robustness: { label: "robuste", positive_windows: 22, windows: 24, out_of_sample_positive: true },
          sharpe: 1.62,
          trades: 142,
          win_rate: 0.845,
          avg_win: 145,
          avg_loss: -320,
          profit_factor: 2.14,
          avg_days_held: 22.4,
          avg_engaged_pct: 0.38,
          days_with_deal_pct: 0.72,
          open_at_end: 2,
          benchmark_final: 31200,
          benchmark_cagr: 0.098,
          benchmark_drawdown: -0.239,
          engine_version: 2,
          wheel_complete: true,
          note: "Simulation sur prix répliqués avec scénarios de stress",
        },
      },
      {
        id: 2,
        profile_id: 2,
        profile_name: "Prudent (Delta 0.15)",
        status: "done",
        progress: 1.0,
        step: "Terminé",
        error: null,
        start: "2021-01-04",
        end: "2026-10-31",
        capital: 20000,
        model: {},
        created_at: "2026-10-20T16:00:00Z",
        started_at: "2026-10-20T16:00:02Z",
        finished_at: "2026-10-20T16:00:40Z",
        params: { min_iv_rank: 0.35, min_dte: 35, max_dte: 55, target_delta: 0.15, take_profit_pct: 0.6, stop_loss_mult: 2.5, max_engaged_pct: 0.35 },
        summary: {
          start: "2021-01-04",
          end: "2026-10-31",
          capital: 20000,
          final: 28940,
          cagr: 0.086,
          net_return: 0.447,
          max_drawdown: -0.042,
          worst_year: { year: 2022, return: 0.028 },
          max_consecutive_losses: 2,
          recovery_days: 18,
          recovered: true,
          robustness: { label: "robuste", positive_windows: 24, windows: 24, out_of_sample_positive: true },
          sharpe: 1.78,
          trades: 118,
          win_rate: 0.898,
          avg_win: 110,
          avg_loss: -240,
          profit_factor: 2.74,
          avg_days_held: 19.8,
          avg_engaged_pct: 0.28,
          days_with_deal_pct: 0.64,
          open_at_end: 1,
          benchmark_final: 31200,
          benchmark_cagr: 0.098,
          benchmark_drawdown: -0.239,
          engine_version: 2,
          wheel_complete: true,
          note: "Volatilité et drawdown fortement amortis",
        },
      },
    ],
    cache: {
      fetched_at: "2026-11-01T08:00:00Z",
      first_day: "2019-01-02",
      last_day: "2026-10-31",
      symbols: ["SPY", "QQQ", "IWM", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "NVDA", "AMD"],
      size: 14500000,
    },
    model_fields: [
      { key: "slippage_pts", label: "Glissement à l'exécution (pts de bid/ask)" },
      { key: "commission_per_contract", label: "Commission par contrat ($)" },
    ],
    model_defaults: { slippage_pts: 0.5, commission_per_contract: 0.65 },
    defaults: { start: "2021-01-04", end: "2026-10-31", capital: 20000 },
  };

  // Getters
  getHealth(): Health {
    return this.health;
  }

  getStatus(): Status {
    return this.status;
  }

  getDashboard(): Dashboard {
    return this.dashboard;
  }

  getOpportunities(): Opportunity[] {
    return this.opportunities;
  }

  getNoTrade(): NoTrade {
    return this.noTrade;
  }

  getPositions(): Positions {
    return this.positions;
  }

  getHistory(query?: URLSearchParams): History {
    let rows = [...this.history.rows];
    if (query) {
      const kinds = query.getAll("kind");
      if (kinds.length > 0) {
        rows = rows.filter((r) => kinds.includes(r.kind));
      }
      const underlying = query.get("underlying");
      if (underlying) {
        rows = rows.filter((r) => r.underlying === underlying);
      }
      const strategy = query.get("strategy");
      if (strategy) {
        rows = rows.filter((r) => r.strategy === strategy);
      }
    }
    return { rows, underlyings: this.history.underlyings };
  }

  getPea(): Pea {
    return this.pea;
  }

  getPeaAlert(): PeaAlert {
    const report = this.pea.report;
    const active = !!(report && report.levels.some((l) => l.changes.length > 0));
    return {
      active,
      signal_day: report?.signal_day,
      levels: report ? report.levels.filter((l) => l.changes.length > 0).map((l) => l.label) : [],
      provisional: [],
      provisional_day: null,
    };
  }

  getProfiles(): Profiles {
    return this.profiles;
  }

  getBacktests(): Backtests {
    return this.backtests;
  }

  getBacktest(id: number | string): BacktestDetail | null {
    const numId = Number(id);
    const run = this.backtests.runs.find((r) => r.id === numId);
    if (!run) return null;

    return {
      ...run,
      result: {
        equity: [
          { date: "2021-01-04", equity: 20000, engaged: 6000, benchmark: 20000 },
          { date: "2022-01-03", equity: 23200, engaged: 7200, benchmark: 25400 },
          { date: "2023-01-03", equity: 24180, engaged: 7500, benchmark: 20800 },
          { date: "2024-01-02", equity: 27400, engaged: 8200, benchmark: 26200 },
          { date: "2025-01-02", equity: 30800, engaged: 9000, benchmark: 31800 },
          { date: "2026-10-31", equity: 34520, engaged: 8600, benchmark: 35100 },
        ],
        yearly: [
          { year: 2021, return: 0.16 },
          { year: 2022, return: 0.042 },
          { year: 2023, return: 0.133 },
          { year: 2024, return: 0.124 },
          { year: 2025, return: 0.121 },
          { year: 2026, return: 0.085 },
        ],
        breakdowns: {
          exit_reason: [
            { key: "take_profit", trades: 118, win_rate: 1.0, pnl: 17110, avg: 145 },
            { key: "stop_loss", trades: 18, win_rate: 0.0, pnl: -4320, avg: -240 },
            { key: "time_exit", trades: 6, win_rate: 0.67, pnl: 230, avg: 38 },
          ],
          strategy: [
            { key: "put_credit_spread", trades: 120, win_rate: 0.86, pnl: 11200, avg: 93 },
            { key: "short_put", trades: 22, win_rate: 0.77, pnl: 1820, avg: 82 },
          ],
          group: [
            { key: "Tech", trades: 78, win_rate: 0.85, pnl: 7800, avg: 100 },
            { key: "Indices", trades: 64, win_rate: 0.84, pnl: 5220, avg: 81 },
          ],
          underlying: [
            { key: "SPY", trades: 42, win_rate: 0.88, pnl: 3900, avg: 92 },
            { key: "AAPL", trades: 30, win_rate: 0.83, pnl: 2750, avg: 91 },
            { key: "MSFT", trades: 28, win_rate: 0.86, pnl: 2820, avg: 100 },
            { key: "AMZN", trades: 24, win_rate: 0.79, pnl: 1850, avg: 77 },
            { key: "GOOGL", trades: 18, win_rate: 0.83, pnl: 1700, avg: 94 },
          ],
          year: [
            { key: "2021", trades: 28, win_rate: 0.89, pnl: 3200, avg: 114 },
            { key: "2022", trades: 26, win_rate: 0.77, pnl: 980, avg: 37 },
            { key: "2023", trades: 27, win_rate: 0.85, pnl: 3220, avg: 119 },
            { key: "2024", trades: 29, win_rate: 0.86, pnl: 3400, avg: 117 },
            { key: "2025", trades: 22, win_rate: 0.86, pnl: 2420, avg: 110 },
            { key: "2026", trades: 10, win_rate: 0.9, pnl: 1300, avg: 130 },
          ],
          entry_dte: [
            { key: "30-40", trades: 84, win_rate: 0.86, pnl: 8100, avg: 96 },
            { key: "40-50", trades: 58, win_rate: 0.83, pnl: 4920, avg: 84 },
          ],
        },
        funnel: {
          contracts: 125000,
          iv_rank: 42000,
          trend: 28000,
          dte: 18500,
          delta: 9400,
          spread: 4200,
          earnings: 2800,
          selected: 142,
        },
        model: { slippage: 0.5, commission: 0.65 },
        trades: [],
        wheel: {
          complete: true,
          puts: 142,
          assignments: 6,
          covered_calls: 8,
          called_away: 6,
          lots_open_at_end: 0,
          puts_pnl: 12400,
          calls_pnl: 1120,
          shares_pnl: -500,
          total_pnl: 13020,
        },
      },
    };
  }

  // Mutations
  acceptOpportunity(id: number, limitPrice?: number | null) {
    const opp = this.opportunities.find((o) => o.id === id);
    if (!opp) return { ok: false, message: "Deal introuvable." };

    this.opportunities = this.opportunities.filter((o) => o.id !== id);

    const newPos: OptionPosition = {
      id: 1000 + id,
      underlying: opp.underlying,
      strategy: opp.strategy,
      status: "open",
      opened_at: new Date().toISOString(),
      expiration: opp.expiration,
      dte: opp.dte,
      contracts: opp.quantity,
      legs: opp.legs.map((l) => ({ symbol: l.symbol, type: l.type, side: l.side, strike: l.strike })),
      entry_credit: limitPrice ?? opp.credit,
      open_limit: limitPrice ?? opp.credit,
      open_step: 1,
      collateral: opp.collateral,
      max_loss: opp.max_loss,
      mark: limitPrice ?? opp.credit,
      marked_at: new Date().toISOString(),
      unrealized_pnl: 0,
      profit_pct: 0,
      take_profit_price: opp.take_profit_price,
      exit_order: null,
      execution: {
        entry_mid: opp.credit,
        entry_natural: opp.credit,
        entry_fill: limitPrice ?? opp.credit,
        entry_slippage: 0,
        entry_slippage_estimated: 0.02,
        mid: opp.credit,
        natural: opp.credit,
        liquidation_spread: 0.06,
        expected_exit: opp.take_profit_price,
        delta: opp.delta,
        underlying_price: opp.underlying_price,
        stop_price: opp.stop_price,
        stop_rules: [{ key: "tp", label: "Objectif", rule: `TP à ${opp.take_profit_price}` }],
        limit_steps: 4,
      },
      can_close: true,
    };

    this.positions.options.unshift(newPos);
    this.dashboard.open_positions += 1;
    this.dashboard.proposed_opportunities = this.opportunities.length;

    return {
      ok: true,
      message: `Ordre envoyé à ${limitPrice ?? opp.credit} (filled).`,
      data: { limit_price: limitPrice ?? opp.credit, order_status: "filled" },
    };
  }

  rejectOpportunity(id: number, reason: string, note?: string | null) {
    const opp = this.opportunities.find((o) => o.id === id);
    if (!opp) return { ok: false, message: "Deal introuvable." };

    this.opportunities = this.opportunities.filter((o) => o.id !== id);
    this.history.rows.unshift({
      id: `rej-${id}`,
      kind: "rejected",
      date: new Date().toISOString().slice(0, 10),
      opened_at: null,
      underlying: opp.underlying,
      strategy: opp.strategy,
      expiration: opp.expiration,
      strikes: opp.legs.map((l) => l.strike),
      quantity: opp.quantity,
      credit: opp.credit,
      debit: null,
      pnl: 0,
      reason,
      note: note || null,
      entry_slippage: null,
      exit_slippage: null,
    });
    this.dashboard.proposed_opportunities = this.opportunities.length;
    return { ok: true, message: "Deal rejeté." };
  }

  closePosition(id: number) {
    const pos = this.positions.options.find((p) => p.id === id);
    if (!pos) return { ok: false, message: "Position introuvable." };

    const debit = pos.mark ?? pos.take_profit_price ?? 0.5;
    const pnl = Math.round(((pos.entry_credit ?? 1) - debit) * 100 * pos.contracts);

    this.positions.options = this.positions.options.filter((p) => p.id !== id);
    this.history.rows.unshift({
      id: `close-${pos.id}`,
      kind: "closed",
      date: new Date().toISOString().slice(0, 10),
      opened_at: pos.opened_at,
      underlying: pos.underlying,
      strategy: pos.strategy,
      expiration: pos.expiration,
      strikes: pos.legs.map((l) => l.strike ?? 0),
      quantity: pos.contracts,
      credit: pos.entry_credit,
      debit,
      pnl,
      reason: "manual_close",
      note: "Rachat manuel exécuté",
      entry_slippage: pos.execution.entry_slippage,
      exit_slippage: 0.01,
    });

    this.dashboard.open_positions = Math.max(0, this.dashboard.open_positions - 1);
    this.dashboard.realized_pnl += pnl;
    this.dashboard.capital += pnl;

    return {
      ok: true,
      message: `Rachat envoyé à ${debit}.`,
      data: { limit_price: debit },
    };
  }

  saveProfile(id: number, name: string, description: string, params: Record<string, unknown>) {
    const p = this.profiles.profiles.find((x) => x.id === id);
    if (!p) return { ok: false, message: "Profil introuvable." };

    p.name = name;
    p.description = description;
    p.params = { ...p.params, ...(params as Params) };
    p.updated_at = new Date().toISOString();
    return { ok: true, message: "Profil enregistré." };
  }

  createProfile(name: string, description: string, params: Record<string, unknown>) {
    const newId = this.profiles.profiles.length + 1;
    const newProfile: Profile = {
      id: newId,
      name,
      description,
      params: { ...this.profiles.defaults, ...(params as Params) },
      changed: Object.keys(params),
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      risk: { status: "untested", blocking: false, source: null, cagr: null, max_drawdown: null, reasons: [] },
    };
    this.profiles.profiles.push(newProfile);
    return { ok: true, message: "Profil créé.", id: newId, data: { id: newId } };
  }

  activateProfile(id: number) {
    for (const p of this.profiles.profiles) {
      p.is_active = p.id === id;
    }
    this.profiles.active_profile_id = id;
    this.profiles.active_version += 1;
    this.status.profile_version = this.profiles.active_version;
    const act = this.profiles.profiles.find((p) => p.id === id);
    if (act) this.status.profile = act.name;

    return { ok: true, message: `Profil actif (version ${this.profiles.active_version}).`, data: { version: this.profiles.active_version } };
  }

  deleteProfile(id: number) {
    this.profiles.profiles = this.profiles.profiles.filter((p) => p.id !== id);
    return { ok: true, message: "Profil supprimé." };
  }

  launchBacktest(body: { profile_id: number | null; start: string; end: string; capital: number; name?: string }) {
    const newId = this.backtests.runs.length + 1;
    const profile = this.profiles.profiles.find((p) => p.id === body.profile_id);
    const profileName = body.name || profile?.name || `Test n° ${newId}`;

    const newRun: BacktestRun = {
      id: newId,
      profile_id: body.profile_id,
      profile_name: profileName,
      status: "done",
      progress: 1.0,
      step: "Terminé",
      error: null,
      start: body.start,
      end: body.end,
      capital: body.capital,
      model: {},
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      params: profile ? profile.params : this.profiles.defaults,
      summary: {
        start: body.start,
        end: body.end,
        capital: body.capital,
        final: Math.round(body.capital * 1.58),
        cagr: 0.112,
        net_return: 0.58,
        max_drawdown: -0.065,
        worst_year: { year: 2022, return: 0.035 },
        max_consecutive_losses: 2,
        recovery_days: 22,
        recovered: true,
        robustness: { label: "robuste", positive_windows: 20, windows: 22, out_of_sample_positive: true },
        sharpe: 1.68,
        trades: 110,
        win_rate: 0.86,
        avg_win: 130,
        avg_loss: -260,
        profit_factor: 2.38,
        avg_days_held: 21,
        avg_engaged_pct: 0.35,
        days_with_deal_pct: 0.68,
        open_at_end: 2,
        benchmark_final: Math.round(body.capital * 1.48),
        benchmark_cagr: 0.098,
        benchmark_drawdown: -0.239,
        engine_version: 2,
        wheel_complete: true,
      },
    };

    this.backtests.runs.unshift(newRun);
    return { ok: true, message: `Backtest n° ${newId} terminé.`, id: newId, data: { id: newId } };
  }

  deleteBacktest(id: number) {
    this.backtests.runs = this.backtests.runs.filter((r) => r.id !== id);
    return { ok: true, message: "Backtest supprimé." };
  }
}

// Global singleton for the process
declare global {
  var __mockDataStore: MockDataStore | undefined;
}

export const mockStore = globalThis.__mockDataStore ?? (globalThis.__mockDataStore = new MockDataStore());
