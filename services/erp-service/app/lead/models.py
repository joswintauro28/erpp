from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    lead_score: Mapped[int] = mapped_column(sa.Integer, default=0)
    assigned_to: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    source: Mapped[str] = mapped_column(sa.String(100), default="Website")
    expected_value: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    status: Mapped[str] = mapped_column(sa.String(50), default="New")
    gst_number: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    website: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    industry: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    converted_client_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    converted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
