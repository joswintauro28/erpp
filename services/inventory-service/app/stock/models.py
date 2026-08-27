from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Stock(Base):
    __tablename__ = "stock"
    __table_args__ = (
        sa.UniqueConstraint("organization_id", "product_id", "warehouse_id", name="uq_stock_org_product_warehouse"),
    )

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    warehouse_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(sa.Integer, default=0)
    reserved_quantity: Mapped[int] = mapped_column(sa.Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    warehouse_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    type: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    reference_type: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
