"""Persisted, user-facing Notification model.

Cross-module system events (Order.Approved, Shipment.Dispatched,
Invoice.Paid, ...) are consumed from the RabbitMQ event bus, mapped to a
target (specific user, role, or name-based match), persisted here, and then
broadcast live over the WebSocket gateway.
"""

from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=1, index=True)

    # Targeting: a role name (primary), a specific user_id, a permission code
    # (legacy), or a display name/email matched against the JWT of connected
    # sockets. At least one should be set. Role targeting follows the IAM role
    # model directly: any user whose JWT role matches receives it, and the
    # Organization Owner sees every role-targeted row (super-role bypass in
    # the store + WS gateway).
    user_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True, index=True)
    role: Mapped[str | None] = mapped_column(sa.String(100), nullable=True, index=True)
    permission: Mapped[str | None] = mapped_column(sa.String(100), nullable=True, index=True)
    target_name: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)

    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    message: Mapped[str] = mapped_column(sa.Text, nullable=False)
    # INFO | SUCCESS | WARNING | ERROR | ACTION
    type: Mapped[str] = mapped_column(sa.String(20), default="INFO", index=True)
    # CRM | BILLING | INVENTORY | SYSTEM
    module_source: Mapped[str] = mapped_column(sa.String(20), default="SYSTEM")
    # Provenance: routing key that produced this notification.
    event: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    # Optional entity reference for deep-linking (e.g. SO-202608-0001).
    entity_ref: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)

    read_status: Mapped[bool] = mapped_column(sa.Boolean, default=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
