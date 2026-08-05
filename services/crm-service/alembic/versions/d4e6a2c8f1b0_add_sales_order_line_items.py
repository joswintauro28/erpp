"""add_sales_order_line_items

Revision ID: d4e6a2c8f1b0
Revises: bb8d730a2ab2
Create Date: 2026-08-04 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = 'd4e6a2c8f1b0'
down_revision: Union[str, None] = 'bb8d730a2ab2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sales_orders', sa.Column('line_items', JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('sales_orders', 'line_items')