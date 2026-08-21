"""add_notifications_table

Revision ID: f1a2b3c4d5e6
Revises: c7d8e9f0a1b2
Create Date: 2026-08-07 10:00:00.000000

Creates the persisted `notifications` table backing the live notification
channel (event-bus consumer -> DB -> WebSocket broadcast).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('role', sa.String(length=100), nullable=True),
        sa.Column('target_name', sa.String(length=255), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False, server_default='INFO'),
        sa.Column('module_source', sa.String(length=20), nullable=False, server_default='SYSTEM'),
        sa.Column('event', sa.String(length=100), nullable=True),
        sa.Column('entity_ref', sa.String(length=100), nullable=True),
        sa.Column('read_status', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_organization_id', 'notifications', ['organization_id'])
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_role', 'notifications', ['role'])
    op.create_index('ix_notifications_type', 'notifications', ['type'])
    op.create_index('ix_notifications_read_status', 'notifications', ['read_status'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_read_status', table_name='notifications')
    op.drop_index('ix_notifications_type', table_name='notifications')
    op.drop_index('ix_notifications_role', table_name='notifications')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_index('ix_notifications_organization_id', table_name='notifications')
    op.drop_table('notifications')
