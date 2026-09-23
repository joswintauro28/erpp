"""add lead contact fields

Revision ID: c1d2e3f4a5b6
Revises: d5e6f7a8b9c0
Create Date: 2026-09-23

Adds leads: email / phone / probability / created_at (detail modal + create form).
"""
import sqlalchemy as sa
from alembic import op

revision = "c1d2e3f4a5b6"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("created_at", sa.String(), nullable=True))
    op.add_column("leads", sa.Column("email", sa.String(), nullable=True))
    op.add_column("leads", sa.Column("phone", sa.String(), nullable=True))
    op.add_column("leads", sa.Column("probability", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("leads", "probability")
    op.drop_column("leads", "phone")
    op.drop_column("leads", "email")
    op.drop_column("leads", "created_at")
