from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    category: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    price: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    cost_price: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    stock: Mapped[int] = mapped_column(sa.Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(sa.Integer, default=10)
    track_inventory: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    uses_batch_tracking: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    uses_serial_tracking: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    costing_method: Mapped[str] = mapped_column(sa.String(50), default="standard")
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
