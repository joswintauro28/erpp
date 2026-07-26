from datetime import datetime, timezone
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SalesOrderFulfillment(Base):
    __tablename__ = "sales_order_fulfillments"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    sales_order_code: Mapped[str] = mapped_column(sa.String(100), nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    warehouse_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("warehouses.id"), nullable=True)
    
    # Workflow Stage Status:
    # QUEUED -> CHECK_STOCK -> RESERVED / SHORTAGE -> PICKING -> PACKED -> DISPATCHED -> COMPLETED
    status: Mapped[str] = mapped_column(sa.String(50), default="QUEUED", index=True)
    
    shipping_carrier: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    tracking_number: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    dispatched_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    
    purchase_order_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("purchase_orders.id"), nullable=True)
    invoice_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    items: Mapped[list["FulfillmentItem"]] = relationship(
        "FulfillmentItem", back_populates="fulfillment", cascade="all, delete-orphan", lazy="selectin"
    )


class FulfillmentItem(Base):
    __tablename__ = "fulfillment_items"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    fulfillment_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("sales_order_fulfillments.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("products.id"), nullable=False)
    product_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    
    ordered_quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=1)
    reserved_quantity: Mapped[int] = mapped_column(sa.Integer, default=0)
    picked_quantity: Mapped[int] = mapped_column(sa.Integer, default=0)
    packed_quantity: Mapped[int] = mapped_column(sa.Integer, default=0)
    unit_price: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)

    fulfillment: Mapped["SalesOrderFulfillment"] = relationship(
        "SalesOrderFulfillment", back_populates="items"
    )
