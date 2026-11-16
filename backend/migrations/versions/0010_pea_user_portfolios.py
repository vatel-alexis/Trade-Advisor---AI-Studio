"""PEA user portfolio persistence

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-16 12:00:00

Stores the user's current PEA ETF holdings (€ and %), target profile preference,
and simulation settings.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pea_user_portfolios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("input_mode", sa.String(length=16), nullable=False, server_default="eur"),
        sa.Column("target_level", sa.String(length=32), nullable=False, server_default="moyen"),
        sa.Column("total_capital", sa.Float(), nullable=False, server_default="25000"),
        sa.Column("cash_available", sa.Float(), nullable=False, server_default="0"),
        sa.Column("holdings_eur", sa.JSON(), nullable=False),
        sa.Column("holdings_pct", sa.JSON(), nullable=False),
        sa.Column("sim_initial_capital", sa.Float(), nullable=False, server_default="10000"),
        sa.Column("sim_monthly_dca", sa.Float(), nullable=False, server_default="200"),
        sa.Column("sim_horizon", sa.String(length=16), nullable=False, server_default="all"),
        sa.Column("sim_benchmarks", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pea_user_portfolios")),
    )


def downgrade() -> None:
    op.drop_table("pea_user_portfolios")
