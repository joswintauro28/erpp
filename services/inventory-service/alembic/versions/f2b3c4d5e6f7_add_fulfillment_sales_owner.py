"""add_fulfillment_sales_owner

Revision ID: f2b3c4d5e6f7
Revises: e5f6a7b8c9d0
Create Date: 2026-08-07 10:30:00.000000

Adds `sales_owner` to sales_order_fulfillments so the originating CRM sales
rep can be forwarded on the dispatch event for targeted notifications.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2b3c4d5e6f7'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'sales_order_fulfillments',
        sa.Column('sales_owner', sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('sales_order_fulfillments', 'sales_owner')
