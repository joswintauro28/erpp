from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SerialNumber(Base):
    __tablename__ = "serial_numbers"
    __table_args__ = (
        sa.UniqueConstraint("organization_id", "serial_number", name="uq_serial_org_number"),
    )

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("warehouses.id"), nullable=False, index=True)
    serial_number: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(sa.String(100), nullable=True, index=True)
    # Lifecycle status: in_stock | reserved | sold | returned | repair | damaged | retired | in_transit
    status: Mapped[str] = mapped_column(sa.String(50), default="in_stock")
    purchase_order_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    sales_order_code: Mapped[str | None] = mapped_column(sa.String(100), nullable=True, index=True)
    warranty_until: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    activated_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    sold_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
