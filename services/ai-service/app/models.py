import uuid
import enum
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ModuleEnum(str, enum.Enum):
    admin = "admin"
    crm = "crm"
    billing = "billing"
    inventory = "inventory"


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class AISession(Base):
    __tablename__ = "ai_sessions"

    id: Mapped[str] = mapped_column(
        sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    module: Mapped[str] = mapped_column(sa.String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(sa.String(200), nullable=False, default="New Chat")
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    messages: Mapped[list["AIMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="AIMessage.created_at"
    )

    audit_logs: Mapped[list["AIAuditLog"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        sa.Index("ix_ai_sessions_user_module", "user_id", "module"),
    )


class AIMessage(Base):
    __tablename__ = "ai_messages"

    id: Mapped[str] = mapped_column(
        sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("ai_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    content: Mapped[str] = mapped_column(sa.Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    session: Mapped["AISession"] = relationship(back_populates="messages")


class AIAuditLog(Base):
    """Audit trail for all AI interactions — compliance, analytics, abuse detection."""
    __tablename__ = "ai_audit_log"

    id: Mapped[int] = mapped_column(sa.BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    session_id: Mapped[str | None] = mapped_column(
        sa.String(36), sa.ForeignKey("ai_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    module: Mapped[str] = mapped_column(sa.String(20), nullable=False, index=True)
    action: Mapped[str] = mapped_column(sa.String(50), nullable=False, index=True)
    # action = "chat" | "stream" | "suggestions" | "history" | "delete_session"
    input_tokens: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    response_time_ms: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    success: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=True)
    error_message: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    user_message_preview: Mapped[str | None] = mapped_column(sa.String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    session: Mapped["AISession | None"] = relationship(back_populates="audit_logs")

    __table_args__ = (
        sa.Index("ix_ai_audit_user_module", "user_id", "module"),
        sa.Index("ix_ai_audit_created", "created_at"),
    )
