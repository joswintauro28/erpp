"""add crm qualification and cpq approval fields

Revision ID: e9f4a1c2d3b4
Revises: d4e6a2c8f1b0
Create Date: 2026-08-07

Adds:
- leads: score / tier / nurture_status / is_mql / mql_qualified_at (M3/M4/S1)
- opportunities: discovery_notes / lead_id_str / stage_history (S2/S3)
- requirements: description / source / lead_id_str / opportunity_id_str / submitted_date
- sales_orders: credit_check_status / credit_check_detail / approval_status / approved_at (O2/O3)
- new table: quotation_approvals (CPQ internal approval overlay, S5/S6)
"""
import sqlalchemy as sa
from alembic import op

revision = "e9f4a1c2d3b4"
down_revision = "d4e6a2c8f1b0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---- leads: scoring + MQL ----
    op.add_column(
        "leads",
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "leads",
        sa.Column("tier", sa.String(), nullable=False, server_default="Cold"),
    )
    op.add_column(
        "leads",
        sa.Column(
            "nurture_status", sa.String(), nullable=False, server_default="New"
        ),
    )
    op.add_column(
        "leads",
        sa.Column(
            "is_mql", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.add_column(
        "leads", sa.Column("mql_qualified_at", sa.String(), nullable=True)
    )

    # ---- opportunities: discovery notes + stage trail ----
    op.add_column(
        "opportunities", sa.Column("discovery_notes", sa.Text(), nullable=True)
    )
    op.add_column(
        "opportunities", sa.Column("lead_id_str", sa.String(), nullable=True)
    )
    op.add_column(
        "opportunities", sa.Column("stage_history", sa.JSON(), nullable=True)
    )

    # ---- requirements: blueprint alignment ----
    op.add_column(
        "requirements", sa.Column("description", sa.Text(), nullable=True)
    )
    op.add_column(
        "requirements", sa.Column("source", sa.String(), nullable=True)
    )
    op.add_column(
        "requirements", sa.Column("lead_id_str", sa.String(), nullable=True)
    )
    op.add_column(
        "requirements",
        sa.Column("opportunity_id_str", sa.String(), nullable=True),
    )
    op.add_column(
        "requirements", sa.Column("submitted_date", sa.String(), nullable=True)
    )

    # ---- sales_orders: credit check + approval lifecycle ----
    op.add_column(
        "sales_orders",
        sa.Column(
            "credit_check_status",
            sa.String(),
            nullable=False,
            server_default="Not Checked",
        ),
    )
    op.add_column(
        "sales_orders",
        sa.Column("credit_check_detail", sa.JSON(), nullable=True),
    )
    op.add_column(
        "sales_orders",
        sa.Column(
            "approval_status", sa.String(), nullable=False, server_default="Pending"
        ),
    )
    op.add_column(
        "sales_orders", sa.Column("approved_at", sa.String(), nullable=True)
    )

    # ---- CPQ internal approval overlay ----
    op.create_table(
        "quotation_approvals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "organization_id", sa.Integer(), nullable=False, server_default="1"
        ),
        sa.Column("quote_id", sa.Integer(), nullable=False),
        sa.Column("quote_number", sa.String(), nullable=True),
        sa.Column("account", sa.String(), nullable=True),
        sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "discount_amount", sa.Float(), nullable=False, server_default="0"
        ),
        sa.Column("discount_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "approval_threshold", sa.Float(), nullable=False, server_default="15"
        ),
        sa.Column(
            "approval_status",
            sa.String(),
            nullable=False,
            server_default="Draft",
        ),
        sa.Column("requested_by", sa.String(), nullable=True),
        sa.Column("approved_by", sa.String(), nullable=True),
        sa.Column("decided_at", sa.String(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_quotation_approvals_quote_id",
        "quotation_approvals",
        ["quote_id"],
    )
    op.create_index(
        "ix_quotation_approvals_organization_id",
        "quotation_approvals",
        ["organization_id"],
    )


def downgrade() -> None:
    op.drop_table("quotation_approvals")
    for col in [
        "credit_check_status",
        "credit_check_detail",
        "approval_status",
        "approved_at",
    ]:
        op.drop_column("sales_orders", col)
    for col in [
        "submitted_date",
        "opportunity_id_str",
        "lead_id_str",
        "source",
        "description",
    ]:
        op.drop_column("requirements", col)
    for col in ["stage_history", "lead_id_str", "discovery_notes"]:
        op.drop_column("opportunities", col)
    for col in [
        "mql_qualified_at",
        "is_mql",
        "nurture_status",
        "tier",
        "score",
    ]:
        op.drop_column("leads", col)
