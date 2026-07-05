from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    failed_login_attempts: Mapped[int] = mapped_column(sa.Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    password_changed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    organizations = relationship("OrganizationMember", back_populates="user", lazy="selectin")
    clients = relationship("Client", back_populates="owner", lazy="selectin")
    products = relationship("Product", back_populates="owner", lazy="selectin")
    invoices = relationship("Invoice", back_populates="owner", lazy="selectin")
    payments = relationship("Payment", back_populates="owner", lazy="selectin")
    refresh_tokens = relationship("RefreshToken", back_populates="user", lazy="selectin")
