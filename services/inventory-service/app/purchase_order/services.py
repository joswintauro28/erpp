from datetime import datetime, timezone
import logging

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.purchase_order.models import PurchaseOrder, PurchaseOrderItem
from app.core.database import BaseRepository
from app.core.events import publish_event, EVENT_PO_CREATED, EVENT_PO_APPROVED, EVENT_PO_RECEIVED

logger = logging.getLogger("app.purchase_order")

# Canonical PO lifecycle transitions.
PO_STATUS_FLOW: dict[str, set[str]] = {
    "DRAFT": {"SUBMITTED", "CANCELLED"},
    "SUBMITTED": {"APPROVED", "CANCELLED"},
    "APPROVED": {"PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED"},
    "PARTIALLY_RECEIVED": {"COMPLETED", "CANCELLED"},
    "COMPLETED": set(),
    "CANCELLED": set(),
}


class PurchaseOrderRepository(BaseRepository[PurchaseOrder]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, PurchaseOrder)


class PurchaseOrderItemRepository(BaseRepository[PurchaseOrderItem]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, PurchaseOrderItem)


class PurchaseOrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PurchaseOrderRepository(db)
        self.item_repo = PurchaseOrderItemRepository(db)

    async def list_purchase_orders(self, organization_id: int) -> list[PurchaseOrder]:
        stmt = (
            sa.select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.items))
            .where(PurchaseOrder.organization_id == organization_id)
            .order_by(PurchaseOrder.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_purchase_order(self, po_id: int, organization_id: int) -> PurchaseOrder | None:
        stmt = sa.select(PurchaseOrder).where(PurchaseOrder.id == po_id, PurchaseOrder.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_purchase_order_with_items(self, po_id: int, organization_id: int) -> PurchaseOrder | None:
        stmt = (
            sa.select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.items))
            .where(PurchaseOrder.id == po_id, PurchaseOrder.organization_id == organization_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_purchase_order(self, organization_id: int, order_number: str, items: list[dict], **data) -> PurchaseOrder:
        from app.product.models import Product

        resolved_items = []
        for item in items:
            pid = item.get("product_id")
            if not pid:
                pname = item.get("product_name") or "Purchased Product Item"
                prod_stmt = sa.select(Product).where(Product.name == pname, Product.organization_id == organization_id)
                prod_res = await self.db.execute(prod_stmt)
                product = prod_res.scalar_one_or_none()
                if not product:
                    import random
                    product = Product(
                        organization_id=organization_id,
                        name=pname,
                        sku=f"SKU-{random.randint(1000, 9999)}",
                        price=float(item["unit_price"]) * 1.4,
                        cost_price=float(item["unit_price"]),
                        track_inventory=True,
                        is_active=True
                    )
                    self.db.add(product)
                    await self.db.flush()
                pid = product.id

            resolved_items.append({
                "product_id": pid,
                "quantity": item["quantity"],
                "unit_price": item["unit_price"]
            })

        subtotal = sum(item["quantity"] * item["unit_price"] for item in resolved_items)
        po = await self.repo.create(
            organization_id=organization_id,
            order_number=order_number,
            status="DRAFT",
            subtotal=subtotal,
            total=subtotal,
            **data,
        )
        for item in resolved_items:
            await self.item_repo.create(
                purchase_order_id=po.id,
                product_id=item["product_id"],
                quantity=item["quantity"],
                received_quantity=0,
                unit_price=item["unit_price"],
                subtotal=item["quantity"] * item["unit_price"],
            )
        await self.db.flush()
        items_stmt = sa.select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po.id)
        items_result = await self.db.execute(items_stmt)
        po_items = list(items_result.scalars().all())

        publish_event(
            EVENT_PO_CREATED,
            organization_id=organization_id,
            po_id=po.id,
            order_number=po.order_number,
            supplier_id=po.supplier_id,
            subtotal=float(po.subtotal or 0.0),
            total=float(po.total or 0.0),
            items=[
                {
                    "product_id": item.product_id,
                    "product_name": f"Product {item.product_id}",
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price or 0.0),
                }
                for item in po_items
            ],
        )

        return po

    async def update_purchase_order_status(
        self,
        po_id: int,
        organization_id: int,
        new_status: str,
        received_items: list[dict] | None = None,
    ) -> PurchaseOrder | None:
        po = await self.get_purchase_order_with_items(po_id, organization_id)
        if not po:
            return None

        new_status = new_status.upper()
        self._validate_transition(po.status, new_status)

        old_status = po.status
        po.status = new_status
        now = datetime.now(timezone.utc)

        if new_status == "SUBMITTED":
            po.ordered_at = po.ordered_at or now
            po.submitted_at = po.submitted_at or now
        elif new_status == "APPROVED":
            po.approved_at = po.approved_at or now
        elif new_status == "CANCELLED":
            po.cancelled_at = po.cancelled_at or now
        elif new_status in ("PARTIALLY_RECEIVED", "COMPLETED"):
            await self._receive_items(po, organization_id, received_items or [], full_receipt=(new_status == "COMPLETED"))
            po.status = "COMPLETED" if self._fully_received(po) else "PARTIALLY_RECEIVED"
            if po.status == "COMPLETED":
                po.received_at = po.received_at or now

        await self.db.flush()

        if new_status == "APPROVED":
            publish_event(
                EVENT_PO_APPROVED,
                organization_id=organization_id,
                po_id=po.id,
                order_number=po.order_number,
                supplier_id=po.supplier_id,
                total=float(po.total or 0.0),
            )
        if new_status in ("PARTIALLY_RECEIVED", "COMPLETED"):
            publish_event(
                EVENT_PO_RECEIVED,
                organization_id=organization_id,
                po_id=po.id,
                order_number=po.order_number,
                status=po.status,
            )

        return po

    async def _receive_items(self, po: PurchaseOrder, organization_id: int, received_items: list[dict], full_receipt: bool) -> None:
        from app.stock.models import Stock, StockMovement

        items_stmt = sa.select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po.id)
        items_res = await self.db.execute(items_stmt)
        po_items = list(items_res.scalars().all())
        if not po_items:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Purchase order has no line items to receive")

        receipts = {}
        for r in received_items or []:
            receipts[r.get("product_id")] = int(r.get("quantity") or 0)

        for item in po_items:
            if full_receipt:
                qty_to_receive = item.quantity - item.received_quantity
            else:
                qty_to_receive = receipts.get(item.product_id, 0)

            remaining = item.quantity - item.received_quantity
            if qty_to_receive < 0 or qty_to_receive > remaining:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Receipt quantity for product {item.product_id} exceeds remaining {remaining}",
                )
            if qty_to_receive == 0:
                continue

            stock_stmt = sa.select(Stock).where(
                Stock.organization_id == organization_id,
                Stock.product_id == item.product_id,
                Stock.warehouse_id == po.warehouse_id
            )
            stock_res = await self.db.execute(stock_stmt)
            stock_rec = stock_res.scalar_one_or_none()

            if stock_rec:
                stock_rec.quantity += qty_to_receive
            else:
                stock_rec = Stock(
                    organization_id=organization_id,
                    product_id=item.product_id,
                    warehouse_id=po.warehouse_id,
                    quantity=qty_to_receive
                )
                self.db.add(stock_rec)

            item.received_quantity += qty_to_receive

            movement = StockMovement(
                organization_id=organization_id,
                product_id=item.product_id,
                warehouse_id=po.warehouse_id,
                type="in",
                quantity=qty_to_receive,
                reference_type="PURCHASE_RECEIPT",
                reference_id=po.id,
                notes=f"Goods received from Purchase Order {po.order_number}"
            )
            self.db.add(movement)

        # Auto-check associated fulfillments so queued/shortage orders can resume.
        await self._recheck_linked_fulfillments(po, organization_id)

    async def _recheck_linked_fulfillments(self, po: PurchaseOrder, organization_id: int) -> None:
        from app.fulfillment.services import FulfillmentService

        # Resume every pending fulfillment that consumes a product received on this PO,
        # not just the one directly linked to the PO.
        product_ids = [item.product_id for item in (po.items or []) if item.product_id]
        try:
            resumed = await FulfillmentService(self.db).resume_pending_fulfillments(
                organization_id, product_ids=product_ids or None, warehouse_id=po.warehouse_id
            )
            for f in resumed:
                logger.info(f"Auto-reserved fulfillment {f.id} ({f.sales_order_code}) after stock arrived from PO {po.order_number}")
        except Exception:
            pass

    def _fully_received(self, po: PurchaseOrder) -> bool:
        return all(
            item.received_quantity >= item.quantity
            for item in getattr(po, "items", [])
        ) if getattr(po, "items", None) else False

    def _validate_transition(self, old_status: str, new_status: str) -> None:
        allowed = PO_STATUS_FLOW.get(old_status, set())
        if new_status not in PO_STATUS_FLOW:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid PO status '{new_status}'. Allowed: {', '.join(PO_STATUS_FLOW.keys())}",
            )
        if new_status != old_status and new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid PO status transition '{old_status}' → '{new_status}'",
            )

    async def delete_purchase_order(self, po_id: int, organization_id: int) -> bool:
        po = await self.get_purchase_order(po_id, organization_id)
        if not po:
            return False
        if po.status in ("COMPLETED", "CANCELLED"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot delete a {po.status} purchase order")
        del_stmt = sa.delete(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po_id)
        await self.db.execute(del_stmt)
        return await self.repo.delete(po_id)

    async def count_purchase_orders(self, organization_id: int, status: str | None = None) -> int:
        stmt = sa.select(sa.func.count()).select_from(PurchaseOrder).where(PurchaseOrder.organization_id == organization_id)
        if status:
            stmt = stmt.where(PurchaseOrder.status == status)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
