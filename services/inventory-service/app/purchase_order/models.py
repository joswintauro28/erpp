from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    supplier_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    warehouse_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    order_number: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), default="draft")
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    subtotal: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    tax_amount: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    total: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    ordered_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    expected_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
