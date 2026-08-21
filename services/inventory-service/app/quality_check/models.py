from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class QualityCheck(Base):
    """Quality check gate on received goods (blueprint P4).

    Auto-created as PENDING when a GRN arrives for a product flagged
    `qc_required`; a QC operator records PASS / FAIL / HOLD against it.
    """

    __tablename__ = "quality_checks"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    po_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True, index=True)
    po_item_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    product_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)

    # PENDING | PASS | FAIL | HOLD
    status: Mapped[str] = mapped_column(sa.String(20), default="PENDING", index=True)
    inspected_by: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    inspected_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
