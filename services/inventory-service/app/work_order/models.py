from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WorkOrder(Base):
    """Manufacturing work order (blueprint M1_Prod -> M4_Prod).

    Lifecycle: DRAFT -> RELEASED -> IN_PROGRESS -> COMPLETED | CANCELLED
    """

    __tablename__ = "work_orders"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    work_order_no: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False)

    # Finished good being produced
    product_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=1)
    warehouse_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True, index=True)

    status: Mapped[str] = mapped_column(sa.String(50), default="DRAFT", index=True)
    priority: Mapped[str] = mapped_column(sa.String(20), default="MEDIUM")
    due_date: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)

    released_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    operations: Mapped[list["WorkOrderOperation"]] = relationship(
        "WorkOrderOperation", back_populates="work_order", cascade="all, delete-orphan"
    )
    materials: Mapped[list["WorkOrderMaterial"]] = relationship(
        "WorkOrderMaterial", back_populates="work_order", cascade="all, delete-orphan"
    )


class WorkOrderOperation(Base):
    """Production routing step (blueprint M3_Prod)."""

    __tablename__ = "work_order_operations"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    work_order_id: Mapped[int] = mapped_column(
        sa.Integer, sa.ForeignKey("work_orders.id"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=1)
    operation_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    workcenter: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    status: Mapped[str] = mapped_column(sa.String(50), default="PENDING")  # PENDING | IN_PROGRESS | COMPLETED
    completed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="operations")


class WorkOrderMaterial(Base):
    """Raw material consumed by a work order (blueprint M2_Prod - issue to production)."""

    __tablename__ = "work_order_materials"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    work_order_id: Mapped[int] = mapped_column(
        sa.Integer, sa.ForeignKey("work_orders.id"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    product_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    quantity_required: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=1)
    quantity_issued: Mapped[int] = mapped_column(sa.Integer, default=0)

    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="materials")
