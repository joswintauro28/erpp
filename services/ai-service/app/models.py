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
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    session: Mapped["AISession"] = relationship(back_populates="messages")
