"""add customer credit limit

Revision ID: f5a6b7c8d9e0
Revises: e9f4a1c2d3b4
Create Date: 2026-08-11

Adds `customers.credit_limit` (INR). NULL/0 means "no limit configured",
which the credit check treats as unlimited credit (ERP convention).
"""
import sqlalchemy as sa
from alembic import op

revision = "f5a6b7c8d9e0"
down_revision = "e9f4a1c2d3b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("credit_limit", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("customers", "credit_limit")
