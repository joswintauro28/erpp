"""add audit log and token count

Revision ID: c2d3e4f5a6b7
Revises: b1a2c3d4e5f6
Create Date: 2026-08-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1a2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add token_count to ai_messages
    op.add_column(
        "ai_messages",
        sa.Column("token_count", sa.Integer(), nullable=True),
    )

    # Create ai_audit_log table
    op.create_table(
        "ai_audit_log",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column(
            "session_id",
            sa.String(36),
            sa.ForeignKey("ai_sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("module", sa.String(20), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("response_time_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("success", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("user_message_preview", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ai_audit_log_user_id", "ai_audit_log", ["user_id"])
    op.create_index("ix_ai_audit_log_organization_id", "ai_audit_log", ["organization_id"])
    op.create_index("ix_ai_audit_log_session_id", "ai_audit_log", ["session_id"])
    op.create_index("ix_ai_audit_log_module", "ai_audit_log", ["module"])
    op.create_index("ix_ai_audit_log_action", "ai_audit_log", ["action"])
    op.create_index("ix_ai_audit_user_module", "ai_audit_log", ["user_id", "module"])
    op.create_index("ix_ai_audit_created", "ai_audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_table("ai_audit_log")
    op.drop_column("ai_messages", "token_count")
