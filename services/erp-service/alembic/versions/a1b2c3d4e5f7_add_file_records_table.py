"""add_file_records_table

Revision ID: a1b2c3d4e5f7
Revises: d2e3f4a5b6c7
Create Date: 2026-08-21 10:00:00.000000

Creates the `file_records` table for MinIO file registry.
Stores metadata for files uploaded to MinIO; binary content lives in MinIO.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'file_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('bucket', sa.String(length=63), nullable=False),
        sa.Column('object_key', sa.String(length=1024), nullable=False),
        sa.Column('uri', sa.String(length=2048), nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=False),
        sa.Column('mime_type', sa.String(length=127), nullable=False),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=True),
        sa.Column('uploader_id', sa.Integer(), nullable=False),
        sa.Column('owner_type', sa.String(length=50), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_file_records_organization_id', 'file_records', ['organization_id'])
    op.create_index('ix_file_records_owner_type', 'file_records', ['owner_type'])
    op.create_index('ix_file_records_owner_id', 'file_records', ['owner_id'])
    op.create_index('ix_file_records_created_at', 'file_records', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_file_records_created_at', table_name='file_records')
    op.drop_index('ix_file_records_owner_id', table_name='file_records')
    op.drop_index('ix_file_records_owner_type', table_name='file_records')
    op.drop_index('ix_file_records_organization_id', table_name='file_records')
    op.drop_table('file_records')
