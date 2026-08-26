"""create_sales_table

Revision ID: b1c2d3e4f5a6
Revises: f5a6b7c8d9e0
Create Date: 2026-08-26

Creates the sales table that the Sale model expects but was never
created in the initial migration. Must run before a2b3c4d5e6f7
which drops file_data/file_name columns from this table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sales",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("id_str", sa.String, index=True),
        sa.Column("invoice_no", sa.String),
        sa.Column("account", sa.String),
        sa.Column("amount", sa.String),
        sa.Column("issued_date", sa.String, nullable=True),
        sa.Column("due_date", sa.String, nullable=True),
        sa.Column("status", sa.String),
        sa.Column("rep", sa.String, nullable=True),
        # Include legacy columns so a2b3c4d5e6f7 can drop them
        sa.Column("file_data", sa.String, nullable=True),
        sa.Column("file_name", sa.String, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("sales")
