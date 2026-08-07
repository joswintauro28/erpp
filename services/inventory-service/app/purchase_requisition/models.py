from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PurchaseRequisition(Base):
    """Internal purchase requisition (blueprint P1).

    Lifecycle: DRAFT -> SUBMITTED -> APPROVED | REJECTED -> CONVERTED | CANCELLED
    Approving a requisition turns it into a Purchase Order (P2) via the
    convert-to-PO endpoint.
    """

    __tablename__ = "purchase_requisitions"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    pr_number: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    requested_by: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    priority: Mapped[str] = mapped_column(sa.String(20), default="MEDIUM")
    need_by_date: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    # Lifecycle: DRAFT | SUBMITTED | APPROVED | REJECTED | CONVERTED | CANCELLED
    status: Mapped[str] = mapped_column(sa.String(50), default="DRAFT", index=True)
    approved_by: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    rejected_reason: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    purchase_order_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    items: Mapped[list["PurchaseRequisitionItem"]] = relationship(
        "PurchaseRequisitionItem",
        back_populates="requisition",
        order_by="PurchaseRequisitionItem.id",
        cascade="all, delete-orphan",
    )


class PurchaseRequisitionItem(Base):
    __tablename__ = "purchase_requisition_items"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    requisition_id: Mapped[int] = mapped_column(
        sa.Integer, sa.ForeignKey("purchase_requisitions.id"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    product_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    estimated_price: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)

    requisition: Mapped["PurchaseRequisition"] = relationship(
        "PurchaseRequisition", back_populates="items"
    )
