"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("account", sa.String()),
        sa.Column("industry", sa.String()),
        sa.Column("tier", sa.String()),
        sa.Column("arr", sa.Integer()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
        sa.Column("updated_at", sa.String()),
    )
    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("name", sa.String()),
        sa.Column("role", sa.String()),
        sa.Column("account", sa.String()),
        sa.Column("email", sa.String()),
        sa.Column("phone", sa.String()),
        sa.Column("type", sa.String()),
        sa.Column("last_contact", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("name", sa.String()),
        sa.Column("type", sa.String()),
        sa.Column("account", sa.String()),
        sa.Column("size", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
        sa.Column("updated_at", sa.String()),
        sa.Column("file_data", sa.String(), nullable=True),
        sa.Column("summary", sa.String(), nullable=True),
        sa.Column("files", sa.String(), nullable=True),
    )
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("name", sa.String()),
        sa.Column("company", sa.String()),
        sa.Column("source", sa.String()),
        sa.Column("est_value", sa.Integer()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
        sa.Column("updated_at", sa.String()),
    )
    op.create_table(
        "opportunities",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("name", sa.String()),
        sa.Column("account", sa.String()),
        sa.Column("value", sa.String()),
        sa.Column("probability", sa.String()),
        sa.Column("close_date", sa.String()),
        sa.Column("stage", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("invoice_no", sa.String()),
        sa.Column("account", sa.String()),
        sa.Column("amount", sa.String()),
        sa.Column("issued_date", sa.String()),
        sa.Column("due_date", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("rep", sa.String()),
    )
    op.create_table(
        "requirements",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("name", sa.String()),
        sa.Column("account", sa.String()),
        sa.Column("category", sa.String()),
        sa.Column("priority", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "quotations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("quote_no", sa.String()),
        sa.Column("account", sa.String()),
        sa.Column("value", sa.String()),
        sa.Column("valid_until", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
        sa.Column("file_data", sa.String(), nullable=True),
        sa.Column("file_name", sa.String(), nullable=True),
    )
    op.create_table(
        "sales_orders",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("so_no", sa.String()),
        sa.Column("account", sa.String()),
        sa.Column("from_quote", sa.String()),
        sa.Column("value", sa.String()),
        sa.Column("eta", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
        sa.Column("file_data", sa.String(), nullable=True),
        sa.Column("file_name", sa.String(), nullable=True),
    )
    op.create_table(
        "enquiries",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("subject", sa.String()),
        sa.Column("customer", sa.String()),
        sa.Column("date", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "site_visits",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("location", sa.String()),
        sa.Column("customer", sa.String()),
        sa.Column("date", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "follow_ups",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("action", sa.String()),
        sa.Column("customer", sa.String()),
        sa.Column("due_date", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("title", sa.String()),
        sa.Column("related_to", sa.String()),
        sa.Column("due_date", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "communications",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("type", sa.String()),
        sa.Column("subject", sa.String()),
        sa.Column("customer", sa.String()),
        sa.Column("date", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "visit_plans",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("title", sa.String()),
        sa.Column("customer", sa.String()),
        sa.Column("date", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "complaints",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("subject", sa.String()),
        sa.Column("customer", sa.String()),
        sa.Column("date_raised", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "feedback",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("score", sa.Integer()),
        sa.Column("comment", sa.String()),
        sa.Column("customer", sa.String()),
        sa.Column("date", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "ai_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("query", sa.String()),
        sa.Column("category", sa.String()),
        sa.Column("date", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "metrics",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(), index=True),
        sa.Column("value", sa.Float()),
        sa.Column("formatted_value", sa.String()),
        sa.Column("trend", sa.String()),
        sa.Column("is_positive", sa.Boolean()),
    )
    op.create_table(
        "pipeline_stages",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(), index=True),
        sa.Column("value", sa.Float()),
        sa.Column("color", sa.String()),
    )
    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("text", sa.String()),
        sa.Column("confidence", sa.Integer()),
        sa.Column("type", sa.String()),
    )
    op.create_table(
        "hot_leads",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String()),
        sa.Column("status", sa.String()),
    )
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("id_str", sa.String(), index=True),
        sa.Column("title", sa.String()),
        sa.Column("category", sa.String()),
        sa.Column("last_run", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("hot_leads")
    op.drop_table("recommendations")
    op.drop_table("pipeline_stages")
    op.drop_table("metrics")
    op.drop_table("ai_logs")
    op.drop_table("feedback")
    op.drop_table("complaints")
    op.drop_table("visit_plans")
    op.drop_table("communications")
    op.drop_table("tasks")
    op.drop_table("follow_ups")
    op.drop_table("site_visits")
    op.drop_table("enquiries")
    op.drop_table("sales_orders")
    op.drop_table("quotations")
    op.drop_table("requirements")
    op.drop_table("sales")
    op.drop_table("opportunities")
    op.drop_table("leads")
    op.drop_table("documents")
    op.drop_table("contacts")
    op.drop_table("customers")
