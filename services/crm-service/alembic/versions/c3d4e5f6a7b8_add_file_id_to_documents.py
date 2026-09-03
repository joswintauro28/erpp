"""add_file_id_to_documents_and_related_tables

Revision ID: c3d4e5f6a7b8
Revises: a2b3c4d5e6f7
Create Date: 2026-09-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('documents', sa.Column('file_id', sa.Integer(), nullable=True))
    op.add_column('opportunities', sa.Column('file_id', sa.Integer(), nullable=True))
    op.add_column('requirements', sa.Column('file_id', sa.Integer(), nullable=True))
    op.add_column('sales_orders', sa.Column('file_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('sales_orders', 'file_id')
    op.drop_column('requirements', 'file_id')
    op.drop_column('opportunities', 'file_id')
    op.drop_column('documents', 'file_id')
