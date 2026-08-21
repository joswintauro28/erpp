"""enrich_serial_numbers_registry

Revision ID: c7e2f1a9b4d8
Revises: a1b2c3d4e5f6
Create Date: 2026-08-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7e2f1a9b4d8'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('serial_numbers', sa.Column('sku', sa.String(length=100), nullable=True))
    op.add_column('serial_numbers', sa.Column('sales_order_code', sa.String(length=100), nullable=True))
    op.add_column('serial_numbers', sa.Column('warranty_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('serial_numbers', sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('serial_numbers', sa.Column('sold_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('serial_numbers', sa.Column('notes', sa.Text(), nullable=True))
    op.create_index(op.f('ix_serial_numbers_sku'), 'serial_numbers', ['sku'], unique=False)
    op.create_index(op.f('ix_serial_numbers_sales_order_code'), 'serial_numbers', ['sales_order_code'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_serial_numbers_sales_order_code'), table_name='serial_numbers')
    op.drop_index(op.f('ix_serial_numbers_sku'), table_name='serial_numbers')
    op.drop_column('serial_numbers', 'notes')
    op.drop_column('serial_numbers', 'sold_at')
    op.drop_column('serial_numbers', 'activated_at')
    op.drop_column('serial_numbers', 'warranty_until')
    op.drop_column('serial_numbers', 'sales_order_code')
    op.drop_column('serial_numbers', 'sku')