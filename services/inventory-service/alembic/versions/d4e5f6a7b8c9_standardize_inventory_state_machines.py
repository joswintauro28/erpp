"""standardize_inventory_state_machines

Revision ID: d4e5f6a7b8c9
Revises: c7e2f1a9b4d8
Create Date: 2026-08-05 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c7e2f1a9b4d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Suppliers: enum-style status with backfill from is_active ──────────
    op.add_column(
        'suppliers',
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
    )
    op.execute("UPDATE suppliers SET status = 'INACTIVE' WHERE is_active = false")
    op.execute("UPDATE suppliers SET status = 'ACTIVE' WHERE is_active = true OR is_active IS NULL")

    # ── Purchase Orders: lifecycle timestamps ──────────────────────────────
    op.add_column('purchase_orders', sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('purchase_orders', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('purchase_orders', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))

    # ── Purchase Order Items: partial receipt tracking ─────────────────────
    op.add_column(
        'purchase_order_items',
        sa.Column('received_quantity', sa.Integer(), nullable=False, server_default='0'),
    )

    # ── Normalize legacy PO status values to the canonical uppercase set ───
    op.execute("UPDATE purchase_orders SET status = 'DRAFT' WHERE lower(status) = 'draft'")
    op.execute("UPDATE purchase_orders SET status = 'SUBMITTED' WHERE lower(status) = 'ordered'")
    op.execute("UPDATE purchase_orders SET status = 'COMPLETED' WHERE lower(status) = 'received'")
    op.execute("UPDATE purchase_orders SET status = 'CANCELLED' WHERE lower(status) = 'cancelled'")
    op.execute("UPDATE purchase_orders SET status = 'APPROVED' WHERE lower(status) = 'approved'")
    op.execute("UPDATE purchase_orders SET status = 'PARTIALLY_RECEIVED' WHERE lower(status) = 'partially_received'")
    op.execute("UPDATE purchase_orders SET status = 'SUBMITTED' WHERE lower(status) = 'po_created'")
    op.execute("UPDATE purchase_orders SET status = 'DRAFT' WHERE status IS NULL OR status = ''")

    # ── Serial Numbers: unique serial tag per organization ─────────────────
    op.create_index(
        'uq_serial_numbers_org_serial',
        'serial_numbers',
        ['organization_id', 'serial_number'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index('uq_serial_numbers_org_serial', table_name='serial_numbers')
    op.drop_column('purchase_order_items', 'received_quantity')
    op.drop_column('purchase_orders', 'cancelled_at')
    op.drop_column('purchase_orders', 'approved_at')
    op.drop_column('purchase_orders', 'submitted_at')
    op.drop_column('suppliers', 'status')
