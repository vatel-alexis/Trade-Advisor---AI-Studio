"""Daily report of the PEA ETF portfolio (targets, alerts, backtests), computed by the worker."""

from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, Timestamped


class PeaReport(Timestamped, Base):
    """One computation of app.domain.pea.report(); the newest row is the one shown."""

    __tablename__ = "pea_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Last trading day in the prices, and the month-end whose signal sets the targets.
    as_of: Mapped[date] = mapped_column(Date, index=True)
    signal_day: Mapped[date] = mapped_column(Date)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)


class PeaUserPortfolio(Timestamped, Base):
    """Saved user PEA holdings and simulation preferences."""

    __tablename__ = "pea_user_portfolios"

    id: Mapped[int] = mapped_column(primary_key=True)
    input_mode: Mapped[str] = mapped_column(String(16), default="eur")
    target_level: Mapped[str] = mapped_column(String(32), default="moyen")
    total_capital: Mapped[float] = mapped_column(Float, default=25000.0)
    cash_available: Mapped[float] = mapped_column(Float, default=0.0)
    holdings_eur: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    holdings_pct: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    sim_initial_capital: Mapped[float] = mapped_column(Float, default=10000.0)
    sim_monthly_dca: Mapped[float] = mapped_column(Float, default=200.0)
    sim_horizon: Mapped[str] = mapped_column(String(16), default="all")
    sim_benchmarks: Mapped[list[str]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

