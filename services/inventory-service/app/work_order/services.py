from datetime import datetime, timezone
import logging

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.core.database import BaseRepository
from app.core.events import (
    publish_event,
    EVENT_WORK_ORDER_CREATED,
    EVENT_WORK_ORDER_RELEASED,
    EVENT_WORK_ORDER_COMPLETED,
    EVENT_WORK_ORDER_CANCELLED,
)
from app.work_order.models import WorkOrder, WorkOrderOperation, WorkOrderMaterial

logger = logging.getLogger("app.work_order")

WORK_ORDER_STATUS_FLOW: dict[str, set[str]] = {
    "DRAFT": {"RELEASED", "CANCELLED"},
    "RELEASED": {"IN_PROGRESS", "CANCELLED"},
    "IN_PROGRESS": {"COMPLETED", "CANCELLED"},
    "COMPLETED": set(),
    "CANCELLED": set(),
}

DEFAULT_OPERATIONS = [
    ("Prepare Materials", "Kitting"),
    ("Assembly / Production", "Production Floor"),
    ("Quality Assurance", "Inspection"),
]


class WorkOrderRepository(BaseRepository[WorkOrder]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, WorkOrder)


class WorkOrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WorkOrderRepository(db)

    async def get_work_order(self, wo_id: int, organization_id: int) -> WorkOrder | None:
        stmt = (
            sa.select(WorkOrder)
            .options(
                selectinload(WorkOrder.operations),
                selectinload(WorkOrder.materials),
            )
            .where(WorkOrder.id == wo_id, WorkOrder.organization_id == organization_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_work_orders(self, organization_id: int, status_filter: str | None = None) -> list[WorkOrder]:
        stmt = (
            sa.select(WorkOrder)
            .options(selectinload(WorkOrder.operations), selectinload(WorkOrder.materials))
            .where(WorkOrder.organization_id == organization_id)
        )
        if status_filter and status_filter.upper() != "ALL":
            stmt = stmt.where(WorkOrder.status == status_filter.upper())
        stmt = stmt.order_by(WorkOrder.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_work_order(
        self,
        organization_id: int,
        work_order_no: str,
        product_id: int,
        quantity: int,
        priority: str = "MEDIUM",
        due_date=None,
        notes: str | None = None,
        operations: list[dict] | None = None,
        materials: list[dict] | None = None,
        created_by: str | None = None,
    ) -> WorkOrder:
        from app.product.models import Product

        prod_stmt = sa.select(Product).where(
            Product.id == product_id, Product.organization_id == organization_id
        )
        prod_res = await self.db.execute(prod_stmt)
        product = prod_res.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        wo = WorkOrder(
            organization_id=organization_id,
            work_order_no=work_order_no,
            product_id=product_id,
            product_name=product.name,
            sku=product.sku,
            quantity=quantity,
            status="DRAFT",
            priority=priority,
            due_date=due_date,
            notes=notes,
            created_by=created_by,
        )
        self.db.add(wo)
        await self.db.flush()

        op_specs = operations or [
            {"sequence": i + 1, "operation_name": name, "workcenter": wc}
            for i, (name, wc) in enumerate(DEFAULT_OPERATIONS)
        ]
        for op in op_specs:
            self.db.add(
                WorkOrderOperation(
                    work_order_id=wo.id,
                    sequence=int(op.get("sequence", 1)),
                    operation_name=op["operation_name"],
                    workcenter=op.get("workcenter"),
                )
            )

        for mat in materials or []:
            pid = mat.get("product_id")
            if not pid and mat.get("product_name"):
                mat_stmt = sa.select(Product).where(
                    Product.name == mat["product_name"],
                    Product.organization_id == organization_id,
                )
                mat_res = await self.db.execute(mat_stmt)
                prod = mat_res.scalar_one_or_none()
                if prod:
                    pid = prod.id
            if not pid:
                continue
            self.db.add(
                WorkOrderMaterial(
                    work_order_id=wo.id,
                    product_id=pid,
                    product_name=mat.get("product_name") or f"Product {pid}",
                    quantity_required=int(mat.get("quantity_required", 1)),
                )
            )

        await self.db.commit()
        await self.db.refresh(wo)

        publish_event(
            EVENT_WORK_ORDER_CREATED,
            organization_id=organization_id,
            work_order_id=wo.id,
            work_order_no=wo.work_order_no,
            product_id=wo.product_id,
            product_name=wo.product_name,
            quantity=wo.quantity,
        )
        return await self.get_work_order(wo.id, organization_id) or wo

    async def release_work_order(self, wo_id: int, organization_id: int) -> WorkOrder:
        wo = await self.get_work_order(wo_id, organization_id)
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        if wo.status not in ("DRAFT",):
            raise HTTPException(
                status_code=409, detail=f"Cannot release a {wo.status} work order"
            )

        # Material availability check (ATP for the BOM) before release.
        shortages = []
        for mat in wo.materials:
            available = await self._material_available(organization_id, mat.product_id, mat.quantity_required)
            if not available:
                shortages.append(f"{mat.product_name} (need {mat.quantity_required})")
        if shortages:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient raw material to release: {', '.join(shortages)}",
            )

        wo.status = "RELEASED"
        wo.released_at = wo.released_at or datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(wo)

        publish_event(
            EVENT_WORK_ORDER_RELEASED,
            organization_id=organization_id,
            work_order_id=wo.id,
            work_order_no=wo.work_order_no,
        )
        return wo

    async def start_work_order(self, wo_id: int, organization_id: int) -> WorkOrder:
        wo = await self.get_work_order(wo_id, organization_id)
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        if wo.status != "RELEASED":
            raise HTTPException(status_code=409, detail="Work order must be RELEASED first")
        wo.status = "IN_PROGRESS"
        wo.started_at = wo.started_at or datetime.now(timezone.utc)
        first_op = next((o for o in sorted(wo.operations, key=lambda o: o.sequence) if o.status == "PENDING"), None)
        if first_op:
            first_op.status = "IN_PROGRESS"
        await self.db.commit()
        await self.db.refresh(wo)
        return wo

    async def issue_material(
        self,
        wo_id: int,
        organization_id: int,
        product_id: int,
        quantity: int,
    ) -> WorkOrder:
        """M2_Prod: issue raw material from stock to the production floor."""
        wo = await self.get_work_order(wo_id, organization_id)
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        if wo.status not in ("RELEASED", "IN_PROGRESS"):
            raise HTTPException(status_code=409, detail="Issue materials only after release")

        mat = next((m for m in wo.materials if m.product_id == product_id), None)
        if not mat:
            raise HTTPException(status_code=404, detail="Product is not a material on this work order")
        remaining = mat.quantity_required - mat.quantity_issued
        if quantity > remaining:
            raise HTTPException(
                status_code=422,
                detail=f"Issue quantity {quantity} exceeds remaining {remaining} for {mat.product_name}",
            )

        from app.stock.models import Stock, StockMovement

        stock_stmt = sa.select(Stock).where(
            Stock.organization_id == organization_id,
            Stock.product_id == product_id,
        )
        if wo.warehouse_id:
            stock_stmt = stock_stmt.where(Stock.warehouse_id == wo.warehouse_id)
        stock_res = await self.db.execute(stock_stmt)
        stock_rec = stock_res.scalars().first()
        if not stock_rec or stock_rec.quantity - stock_rec.reserved_quantity < quantity:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient available stock for {mat.product_name} ({quantity} needed)",
            )

        stock_rec.quantity -= quantity
        mat.quantity_issued += quantity
        self.db.add(
            StockMovement(
                organization_id=organization_id,
                product_id=product_id,
                warehouse_id=stock_rec.warehouse_id,
                type="out",
                quantity=quantity,
                reference_type="PRODUCTION_ISSUE",
                reference_id=wo.id,
                notes=f"Material issued to work order {wo.work_order_no}",
            )
        )
        await self.db.commit()
        await self.db.refresh(wo)
        return wo

    async def start_operation(self, wo_id: int, organization_id: int, operation_id: int) -> WorkOrder:
        wo = await self.get_work_order(wo_id, organization_id)
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        op = next((o for o in wo.operations if o.id == operation_id), None)
        if not op:
            raise HTTPException(status_code=404, detail="Operation not found")
        if wo.status != "IN_PROGRESS":
            raise HTTPException(status_code=409, detail="Start the work order before running operations")
        op.status = "IN_PROGRESS"
        await self.db.commit()
        await self.db.refresh(wo)
        return wo

    async def complete_operation(self, wo_id: int, organization_id: int, operation_id: int) -> WorkOrder:
        wo = await self.get_work_order(wo_id, organization_id)
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        op = next((o for o in wo.operations if o.id == operation_id), None)
        if not op:
            raise HTTPException(status_code=404, detail="Operation not found")
        op.status = "COMPLETED"
        op.completed_at = op.completed_at or datetime.now(timezone.utc)
        # Advance to the next pending operation.
        pending = [o for o in sorted(wo.operations, key=lambda o: o.sequence) if o.status == "PENDING"]
        if pending:
            pending[0].status = "IN_PROGRESS"
        await self.db.commit()
        await self.db.refresh(wo)
        return wo

    async def complete_work_order(self, wo_id: int, organization_id: int) -> WorkOrder:
        """M4_Prod: finished goods to warehouse. Credits finished-product stock."""
        wo = await self.get_work_order(wo_id, organization_id)
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        if wo.status != "IN_PROGRESS":
            raise HTTPException(status_code=409, detail="Work order must be IN_PROGRESS")

        uncompleted = [o for o in wo.operations if o.status != "COMPLETED"]
        if uncompleted:
            raise HTTPException(
                status_code=409,
                detail=f"All routing operations must complete first: {', '.join(o.operation_name for o in uncompleted)}",
            )
        unissued = [m for m in wo.materials if m.quantity_issued < m.quantity_required]
        if unissued:
            raise HTTPException(
                status_code=409,
                detail=f"All materials must be issued first: {', '.join(m.product_name for m in unissued)}",
            )

        warehouse_id = wo.warehouse_id
        from app.stock.models import Stock, StockMovement

        stock_stmt = sa.select(Stock).where(
            Stock.organization_id == organization_id,
            Stock.product_id == wo.product_id,
        )
        if warehouse_id:
            stock_stmt = stock_stmt.where(Stock.warehouse_id == warehouse_id)
        stock_res = await self.db.execute(stock_stmt)
        stock_rec = stock_res.scalars().first()
        if stock_rec:
            stock_rec.quantity += wo.quantity
        else:
            self.db.add(
                Stock(
                    organization_id=organization_id,
                    product_id=wo.product_id,
                    warehouse_id=warehouse_id,
                    quantity=wo.quantity,
                )
            )
        self.db.add(
            StockMovement(
                organization_id=organization_id,
                product_id=wo.product_id,
                warehouse_id=warehouse_id,
                type="in",
                quantity=wo.quantity,
                reference_type="PRODUCTION_COMPLETION",
                reference_id=wo.id,
                notes=f"Finished goods from work order {wo.work_order_no}",
            )
        )

        wo.status = "COMPLETED"
        wo.completed_at = wo.completed_at or datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(wo)

        publish_event(
            EVENT_WORK_ORDER_COMPLETED,
            organization_id=organization_id,
            work_order_id=wo.id,
            work_order_no=wo.work_order_no,
            product_id=wo.product_id,
            product_name=wo.product_name,
            quantity=wo.quantity,
        )

        # I4: finished goods are now on the shelf — resume any fulfillment that
        # was waiting on this product in WO_CREATED/SHORTAGE/PO_CREATED state.
        try:
            from app.fulfillment.services import FulfillmentService
            await FulfillmentService(self.db).resume_pending_fulfillments(
                organization_id,
                product_ids=[wo.product_id],
                warehouse_id=wo.warehouse_id,
            )
        except Exception as exc:
            logger.warning(f"Failed to resume pending fulfillments after WO {wo.work_order_no}: {exc}")
        return wo

    async def cancel_work_order(self, wo_id: int, organization_id: int) -> WorkOrder:
        wo = await self.get_work_order(wo_id, organization_id)
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        if wo.status in ("COMPLETED", "CANCELLED"):
            raise HTTPException(status_code=409, detail=f"Cannot cancel a {wo.status} work order")
        wo.status = "CANCELLED"
        wo.cancelled_at = wo.cancelled_at or datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(wo)
        publish_event(
            EVENT_WORK_ORDER_CANCELLED,
            organization_id=organization_id,
            work_order_id=wo.id,
            work_order_no=wo.work_order_no,
        )
        return wo

    async def create_for_shortage(
        self,
        organization_id: int,
        *,
        product_id: int,
        quantity: int,
        notes: str,
        created_by: str | None = None,
    ) -> WorkOrder | None:
        """I3/I4: when a product is `make` and stock is short, create a work order."""
        from app.product.models import Product
        from app.core.idgen import next_document_id

        prod_stmt = sa.select(Product).where(Product.id == product_id, Product.organization_id == organization_id)
        prod_res = await self.db.execute(prod_stmt)
        product = prod_res.scalar_one_or_none()
        if not product:
            return None

        wo_no = await next_document_id(self.db, WorkOrder, "WO", "work_order_no", organization_id)
        return await self.create_work_order(
            organization_id,
            wo_no,
            product_id=product_id,
            quantity=quantity,
            priority="HIGH",
            notes=notes,
            created_by=created_by,
        )

    async def _material_available(self, organization_id: int, product_id: int, quantity: int) -> bool:
        from app.stock.models import Stock

        stmt = sa.select(sa.func.coalesce(sa.func.sum(Stock.quantity - Stock.reserved_quantity), 0)).where(
            Stock.organization_id == organization_id,
            Stock.product_id == product_id,
        )
        result = await self.db.execute(stmt)
        return (result.scalar() or 0) >= quantity

    async def count_work_orders(self, organization_id: int, status_filter: str | None = None) -> int:
        stmt = sa.select(sa.func.count()).select_from(WorkOrder).where(WorkOrder.organization_id == organization_id)
        if status_filter:
            stmt = stmt.where(WorkOrder.status == status_filter)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
