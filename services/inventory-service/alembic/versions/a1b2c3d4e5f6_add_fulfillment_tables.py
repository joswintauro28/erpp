"""add_fulfillment_tables

Revision ID: a1b2c3d4e5f6
Revises: 92c1e6ee5159
Create Date: 2026-07-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '92c1e6ee5159'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('sales_order_fulfillments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('sales_order_code', sa.String(length=100), nullable=False),
        sa.Column('customer_name', sa.String(length=255), nullable=False),
        sa.Column('warehouse_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='QUEUED'),
        sa.Column('shipping_carrier', sa.String(length=100), nullable=True),
        sa.Column('tracking_number', sa.String(length=100), nullable=True),
        sa.Column('dispatched_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('purchase_order_id', sa.Integer(), nullable=True),
        sa.Column('invoice_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ),
        sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_sales_order_fulfillments_organization_id'), 'sales_order_fulfillments', ['organization_id'], unique=False)
    op.create_index(op.f('ix_sales_order_fulfillments_sales_order_code'), 'sales_order_fulfillments', ['sales_order_code'], unique=False)
    op.create_index(op.f('ix_sales_order_fulfillments_status'), 'sales_order_fulfillments', ['status'], unique=False)

    op.create_table('fulfillment_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('fulfillment_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('ordered_quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('reserved_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('picked_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('packed_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.ForeignKeyConstraint(['fulfillment_id'], ['sales_order_fulfillments.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_fulfillment_items_fulfillment_id'), 'fulfillment_items', ['fulfillment_id'], unique=False)
    op.create_index(op.f('ix_fulfillment_items_product_id'), 'fulfillment_items', ['product_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_fulfillment_items_product_id'), table_name='fulfillment_items')
    op.drop_index(op.f('ix_fulfillment_items_fulfillment_id'), table_name='fulfillment_items')
    op.drop_table('fulfillment_items')
    op.drop_index(op.f('ix_sales_order_fulfillments_status'), table_name='sales_order_fulfillments')
    op.drop_index(op.f('ix_sales_order_fulfillments_sales_order_code'), table_name='sales_order_fulfillments')
    op.drop_index(op.f('ix_sales_order_fulfillments_organization_id'), table_name='sales_order_fulfillments')
    op.drop_table('sales_order_fulfillments')
