"""drop_base64_add_file_uri

Revision ID: a2b3c4d5e6f7
Revises: f5a6b7c8d9e0
Create Date: 2026-08-21

Drops base64 file_data/file_name columns from documents, sales, and
sales_orders after migration to MinIO. Adds file_uri column to store
the S3 URI reference instead.

IMPORTANT: Run scripts/migrate_files_to_minio.py BEFORE applying this
migration to preserve existing file data.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # documents: drop file_data + files, add file_uri
    op.drop_column("documents", "file_data")
    op.drop_column("documents", "files")
    op.add_column("documents", sa.Column("file_uri", sa.String(), nullable=True))

    # sales: drop file_data + file_name, add file_uri
    op.drop_column("sales", "file_data")
    op.drop_column("sales", "file_name")
    op.add_column("sales", sa.Column("file_uri", sa.String(), nullable=True))

    # sales_orders: drop file_data + file_name, add file_uri
    op.drop_column("sales_orders", "file_data")
    op.drop_column("sales_orders", "file_name")
    op.add_column("sales_orders", sa.Column("file_uri", sa.String(), nullable=True))


def downgrade() -> None:
    # sales_orders
    op.drop_column("sales_orders", "file_uri")
    op.add_column("sales_orders", sa.Column("file_name", sa.String(), nullable=True))
    op.add_column("sales_orders", sa.Column("file_data", sa.String(), nullable=True))

    # sales
    op.drop_column("sales", "file_uri")
    op.add_column("sales", sa.Column("file_name", sa.String(), nullable=True))
    op.add_column("sales", sa.Column("file_data", sa.String(), nullable=True))

    # documents
    op.drop_column("documents", "file_uri")
    op.add_column("documents", sa.Column("files", sa.String(), nullable=True))
    op.add_column("documents", sa.Column("file_data", sa.String(), nullable=True))
