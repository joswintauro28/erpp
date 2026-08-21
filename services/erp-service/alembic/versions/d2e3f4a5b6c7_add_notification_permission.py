"""add_notification_permission

Revision ID: d2e3f4a5b6c7
Revises: f1a2b3c4d5e6
Create Date: 2026-08-10 12:00:00.000000

Adds the `permission` targeting column to `notifications`. Notifications can
now be addressed to every user whose JWT permission set contains a code (e.g.
stock.view reaches Inventory Manager + Organization Owner), so the audience
follows the IAM role model instead of hardcoded role names.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'notifications',
        sa.Column('permission', sa.String(length=100), nullable=True),
    )
    op.create_index('ix_notifications_permission', 'notifications', ['permission'])


def downgrade() -> None:
    op.drop_index('ix_notifications_permission', table_name='notifications')
    op.drop_column('notifications', 'permission')
