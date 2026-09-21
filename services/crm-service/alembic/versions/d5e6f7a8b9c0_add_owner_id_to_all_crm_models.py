"""add_owner_id_to_all_crm_models

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = [
    'customers',
    'contacts',
    'documents',
    'leads',
    'opportunities',
    'requirements',
    'sales_orders',
    'sales',
    'reports',
    'pinned_leads',
    'ai_logs',
]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column('owner_id', sa.Integer(), nullable=True))
        op.create_index(f'ix_{table}_owner_id', table, ['owner_id'])


def downgrade() -> None:
    for table in TABLES:
        op.drop_index(f'ix_{table}_owner_id', table_name=table)
        op.drop_column(table, 'owner_id')
