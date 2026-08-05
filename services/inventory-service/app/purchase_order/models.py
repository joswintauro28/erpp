from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    supplier_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    warehouse_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    order_number: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False)
    # Lifecycle status: DRAFT | SUBMITTED | APPROVED | PARTIALLY_RECEIVED | COMPLETED | CANCELLED
    status: Mapped[str] = mapped_column(sa.String(50), default="DRAFT")
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    subtotal: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    tax_amount: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    total: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    ordered_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    expected_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    items: Mapped[list["PurchaseOrderItem"]] = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
        order_by="PurchaseOrderItem.id",
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("purchase_orders.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    received_quantity: Mapped[int] = mapped_column(sa.Integer, default=0)
    unit_price: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)

    purchase_order: Mapped["PurchaseOrder"] = relationship(
        "PurchaseOrder",
        back_populates="items",
    )

