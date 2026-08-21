"""add_procurement_manufacturing_quality

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-07 09:00:00.000000

Adds:
- products: make_or_buy + qc_required (I3/I4 + P4)
- purchase_order_items: putaway_quantity / putaway_at / location (P5)
- sales_order_fulfillments: batch_no (I7) + work_order_id (I4)
- purchase_requisitions + items (P1)
- quality_checks (P4)
- work_orders + operations + materials (M1_Prod..M4_Prod)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Products: supply-chain policy ──────────────────────────────────────
    op.add_column(
        'products',
        sa.Column('make_or_buy', sa.String(length=20), nullable=False, server_default='buy'),
    )
    op.add_column(
        'products',
        sa.Column('qc_required', sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    # ── Purchase Order Items: putaway (P5) ─────────────────────────────────
    op.add_column(
        'purchase_order_items',
        sa.Column('putaway_quantity', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column('purchase_order_items', sa.Column('putaway_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('purchase_order_items', sa.Column('location', sa.String(length=100), nullable=True))

    # ── Fulfillments: picking waves (I7) + manufacturing linkage (I4) ──────
    op.add_column('sales_order_fulfillments', sa.Column('batch_no', sa.String(length=100), nullable=True))
    op.add_column('sales_order_fulfillments', sa.Column('work_order_id', sa.Integer(), nullable=True))
    op.create_index('ix_sales_order_fulfillments_batch_no', 'sales_order_fulfillments', ['batch_no'])

    # ── Purchase Requisitions (P1) ─────────────────────────────────────────
    op.create_table(
        'purchase_requisitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('pr_number', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('requested_by', sa.String(length=255), nullable=True),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='MEDIUM'),
        sa.Column('need_by_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),
        sa.Column('approved_by', sa.String(length=255), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_reason', sa.Text(), nullable=True),
        sa.Column('purchase_order_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('pr_number'),
    )
    op.create_index('ix_purchase_requisitions_organization_id', 'purchase_requisitions', ['organization_id'])
    op.create_index('ix_purchase_requisitions_status', 'purchase_requisitions', ['status'])

    op.create_table(
        'purchase_requisition_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('requisition_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('estimated_price', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['requisition_id'], ['purchase_requisitions.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_purchase_requisition_items_requisition_id', 'purchase_requisition_items', ['requisition_id'])

    # ── Quality Checks (P4) ────────────────────────────────────────────────
    op.create_table(
        'quality_checks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('po_id', sa.Integer(), nullable=True),
        sa.Column('po_item_id', sa.Integer(), nullable=True),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('inspected_by', sa.String(length=255), nullable=True),
        sa.Column('inspected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quality_checks_organization_id', 'quality_checks', ['organization_id'])
    op.create_index('ix_quality_checks_product_id', 'quality_checks', ['product_id'])
    op.create_index('ix_quality_checks_po_id', 'quality_checks', ['po_id'])
    op.create_index('ix_quality_checks_status', 'quality_checks', ['status'])

    # ── Work Orders: manufacturing (M1_Prod..M4_Prod) ──────────────────────
    op.create_table(
        'work_orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('work_order_no', sa.String(length=100), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('warehouse_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='MEDIUM'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(length=255), nullable=True),
        sa.Column('released_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('work_order_no'),
    )
    op.create_index('ix_work_orders_organization_id', 'work_orders', ['organization_id'])
    op.create_index('ix_work_orders_product_id', 'work_orders', ['product_id'])
    op.create_index('ix_work_orders_status', 'work_orders', ['status'])

    op.create_table(
        'work_order_operations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('work_order_id', sa.Integer(), nullable=False),
        sa.Column('sequence', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('operation_name', sa.String(length=255), nullable=False),
        sa.Column('workcenter', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_work_order_operations_work_order_id', 'work_order_operations', ['work_order_id'])

    op.create_table(
        'work_order_materials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('work_order_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('quantity_required', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('quantity_issued', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_work_order_materials_work_order_id', 'work_order_materials', ['work_order_id'])


def downgrade() -> None:
    op.drop_table('work_order_materials')
    op.drop_table('work_order_operations')
    op.drop_table('work_orders')
    op.drop_table('quality_checks')
    op.drop_table('purchase_requisition_items')
    op.drop_table('purchase_requisitions')
    op.drop_index('ix_sales_order_fulfillments_batch_no', table_name='sales_order_fulfillments')
    op.drop_column('sales_order_fulfillments', 'work_order_id')
    op.drop_column('sales_order_fulfillments', 'batch_no')
    op.drop_column('purchase_order_items', 'location')
    op.drop_column('purchase_order_items', 'putaway_at')
    op.drop_column('purchase_order_items', 'putaway_quantity')
    op.drop_column('products', 'qc_required')
    op.drop_column('products', 'make_or_buy')
