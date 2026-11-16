"""PEA ETF portfolio: daily refresh by the worker, reads by the API."""

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.domain import pea
from app.models import PeaReport, PeaUserPortfolio

# Reports older than this are deleted (each row holds ~70 kB of curves and history).
KEEP_DAYS = 45
# The banner reminds of a new allocation for this many days after the month-end signal.
ALERT_DAYS = 10

DEFAULT_PORTFOLIO: dict[str, Any] = {
    "input_mode": "eur",
    "target_level": "moyen",
    "total_capital": 25000.0,
    "cash_available": 1500.0,
    "holdings_eur": {
        "sp500": 8500.0,
        "nasdaq": 6500.0,
        "world": 4500.0,
        "europe": 2500.0,
        "emerging": 1500.0,
        "japan": 0.0,
        "cash": 1500.0,
    },
    "holdings_pct": {
        "sp500": 0.34,
        "nasdaq": 0.26,
        "world": 0.18,
        "europe": 0.10,
        "emerging": 0.06,
        "japan": 0.0,
        "cash": 0.06,
    },
    "sim_initial_capital": 10000.0,
    "sim_monthly_dca": 200.0,
    "sim_horizon": "all",
    "sim_benchmarks": ["sp500", "nasdaq", "world"],
}


def fetch_prices(
    client,
) -> tuple[dict[str, dict[date, float]], dict[date, float]]:  # pragma: no cover - network
    """Daily adjusted closes of the PEA ETFs and their proxies, and EUR/USD, from Yahoo."""
    symbols = {a.ticker for a in pea.ASSETS} | {a.proxy for a in pea.ASSETS if a.proxy}
    start = int(datetime(pea.DATA_START.year - 1, 1, 1, tzinfo=UTC).timestamp())
    out: dict[str, dict[date, float]] = {}
    for symbol in sorted(symbols | {pea.FX_TICKER}):
        data = client.json(
            f"/v8/finance/chart/{symbol}",
            period1=start,
            period2=int(datetime.now(UTC).timestamp()),
            interval="1d",
            events="div,split",
            includeAdjustedClose="true",
        )["chart"]["result"][0]
        indicators = data["indicators"]
        closes = (indicators.get("adjclose") or [{}])[0].get("adjclose") or indicators["quote"][0][
            "close"
        ]
        out[symbol] = {
            datetime.fromtimestamp(ts, UTC).date(): float(c)
            for ts, c in zip(data.get("timestamp") or [], closes, strict=False)
            if c
        }
    fx = out.pop(pea.FX_TICKER)
    return out, fx


def build_report(
    prices: dict[str, dict[date, float]], fx: dict[date, float], today: date
) -> dict[str, Any]:
    days, index = pea.euro_indexes(prices, fx)
    return pea.report(days, index, today)


def store(session: Session, payload: dict[str, Any]) -> PeaReport:
    """Save a report and drop the old ones (the caller commits)."""
    row = PeaReport(
        as_of=date.fromisoformat(payload["as_of"]),
        signal_day=date.fromisoformat(payload["signal_day"]),
        payload=payload,
    )
    session.add(row)
    session.flush()
    cutoff = row.as_of - timedelta(days=KEEP_DAYS)
    session.execute(delete(PeaReport).where(PeaReport.as_of < cutoff))
    return row


def latest(session: Session) -> PeaReport | None:
    return session.execute(
        select(PeaReport).order_by(PeaReport.as_of.desc(), PeaReport.id.desc()).limit(1)
    ).scalar_one_or_none()


def last_computed(session: Session) -> datetime | None:
    row = latest(session)
    return row.created_at if row else None


def view(session: Session) -> dict[str, Any]:
    row = latest(session)
    if row is None:
        return {"report": None, "computed_at": None}
    return {"report": row.payload, "computed_at": row.created_at.isoformat()}


def alert(session: Session, today: date) -> dict[str, Any]:
    """The small banner: levels whose allocation changed at the last month-end, for a few days,
    and levels whose provisional signal (today's prices) would change at the coming one."""
    row = latest(session)
    if row is None:
        return {"active": False, "levels": [], "provisional": []}
    payload = row.payload
    signal_day = date.fromisoformat(payload["signal_day"])
    recent = (today - signal_day).days <= ALERT_DAYS
    levels = [lv["label"] for lv in payload["levels"] if lv["changes"]] if recent else []
    provisional = [lv["label"] for lv in payload["levels"] if lv["preview_changes"]]
    return {
        "active": bool(levels),
        "signal_day": payload["signal_day"],
        "levels": levels,
        "provisional": provisional,
        "provisional_day": payload.get("provisional_day"),
    }


def _serialize_portfolio(row: PeaUserPortfolio) -> dict[str, Any]:
    return {
        "input_mode": row.input_mode,
        "target_level": row.target_level,
        "total_capital": float(row.total_capital),
        "cash_available": float(row.cash_available),
        "holdings_eur": {str(k): float(v) for k, v in (row.holdings_eur or {}).items()},
        "holdings_pct": {str(k): float(v) for k, v in (row.holdings_pct or {}).items()},
        "sim_initial_capital": float(row.sim_initial_capital),
        "sim_monthly_dca": float(row.sim_monthly_dca),
        "sim_horizon": row.sim_horizon,
        "sim_benchmarks": list(row.sim_benchmarks or []),
        "updated_at": (row.updated_at or row.created_at).isoformat()
        if (row.updated_at or row.created_at)
        else datetime.now(UTC).isoformat(),
    }


def get_portfolio(session: Session) -> dict[str, Any]:
    row = session.execute(
        select(PeaUserPortfolio).order_by(PeaUserPortfolio.id.desc()).limit(1)
    ).scalar_one_or_none()
    if row is None:
        return {**DEFAULT_PORTFOLIO, "updated_at": None}
    return _serialize_portfolio(row)


def save_portfolio(session: Session, data: dict[str, Any]) -> dict[str, Any]:
    row = session.execute(
        select(PeaUserPortfolio).order_by(PeaUserPortfolio.id.desc()).limit(1)
    ).scalar_one_or_none()
    if row is None:
        row = PeaUserPortfolio()
        session.add(row)

    row.input_mode = "pct" if data.get("input_mode") == "pct" else "eur"
    row.target_level = str(data.get("target_level") or "moyen")
    row.total_capital = max(0.0, float(data.get("total_capital") or 0.0))
    row.cash_available = max(0.0, float(data.get("cash_available") or 0.0))
    row.holdings_eur = {
        str(k): max(0.0, float(v)) for k, v in (data.get("holdings_eur") or {}).items()
    }
    row.holdings_pct = {
        str(k): max(0.0, float(v)) for k, v in (data.get("holdings_pct") or {}).items()
    }
    row.sim_initial_capital = max(100.0, float(data.get("sim_initial_capital") or 10000.0))
    row.sim_monthly_dca = max(0.0, float(data.get("sim_monthly_dca") or 0.0))
    row.sim_horizon = str(data.get("sim_horizon") or "all")
    row.sim_benchmarks = [str(b) for b in (data.get("sim_benchmarks") or ["sp500"])]
    row.updated_at = datetime.now(UTC)

    session.commit()
    session.refresh(row)
    return _serialize_portfolio(row)

