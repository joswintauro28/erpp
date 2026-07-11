from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SerialNumber(Base):
    __tablename__ = "serial_numbers"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    warehouse_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    serial_number: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), default="in_stock")
    purchase_order_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
