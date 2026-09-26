"""add_organization_id_to_all_crm_models

Revision ID: f6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-09-26 00:00:00.000000

Adds organization_id INTEGER NOT NULL DEFAULT 1 to all CRM models and dashboard tables.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f6b7c8d9e0f1'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
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
    'metrics',
    'pipeline_stages',
    'recommendations',
    'hot_leads',
]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column('organization_id', sa.Integer(), nullable=False, server_default='1'))
        op.create_index(f'ix_{table}_organization_id', table, ['organization_id'])


def downgrade() -> None:
    for table in TABLES:
        op.drop_index(f'ix_{table}_organization_id', table_name=table)
        op.drop_column(table, 'organization_id')
