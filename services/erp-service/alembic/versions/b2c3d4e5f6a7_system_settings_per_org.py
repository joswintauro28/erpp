"""system_settings_per_org

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f7
Create Date: 2026-09-26 12:00:00.000000

Migrates SystemSettings from owner_id to organization_id with unique index.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if 'system_settings' in insp.get_table_names():
        columns = [c['name'] for c in insp.get_columns('system_settings')]
        if 'owner_id' in columns and 'organization_id' not in columns:
            op.drop_index('ix_system_settings_owner_id', table_name='system_settings')
            op.alter_column('system_settings', 'owner_id', new_column_name='organization_id')
            op.create_index('ix_system_settings_organization_id', 'system_settings', ['organization_id'], unique=True)
        elif 'organization_id' not in columns:
            op.add_column('system_settings', sa.Column('organization_id', sa.Integer(), nullable=False, server_default='1'))
            op.create_index('ix_system_settings_organization_id', 'system_settings', ['organization_id'], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if 'system_settings' in insp.get_table_names():
        columns = [c['name'] for c in insp.get_columns('system_settings')]
        if 'organization_id' in columns and 'owner_id' not in columns:
            op.drop_index('ix_system_settings_organization_id', table_name='system_settings')
            op.alter_column('system_settings', 'organization_id', new_column_name='owner_id')
            op.create_index('ix_system_settings_owner_id', 'system_settings', ['owner_id'], unique=True)
