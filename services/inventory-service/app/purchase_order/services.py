from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.purchase_order.models import PurchaseOrder, PurchaseOrderItem
from app.core.database import BaseRepository


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

    async def list_purchase_orders(self, owner_id: int) -> list[PurchaseOrder]:
        stmt = sa.select(PurchaseOrder).where(PurchaseOrder.owner_id == owner_id).order_by(PurchaseOrder.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_purchase_order(self, po_id: int, owner_id: int) -> PurchaseOrder | None:
        stmt = sa.select(PurchaseOrder).where(PurchaseOrder.id == po_id, PurchaseOrder.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_purchase_order_with_items(self, po_id: int, owner_id: int) -> PurchaseOrder | None:
        po = await self.get_purchase_order(po_id, owner_id)
        if not po:
            return None
        items_stmt = sa.select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po_id)
        items_result = await self.db.execute(items_stmt)
        po.items = list(items_result.scalars().all())
        return po

    async def create_purchase_order(self, owner_id: int, order_number: str, items: list[dict], **data) -> PurchaseOrder:
        subtotal = sum(item["quantity"] * item["unit_price"] for item in items)
        po = await self.repo.create(
            owner_id=owner_id,
            order_number=order_number,
            subtotal=subtotal,
            total=subtotal,
            **data,
        )
        for item in items:
            await self.item_repo.create(
                purchase_order_id=po.id,
                product_id=item["product_id"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                subtotal=item["quantity"] * item["unit_price"],
            )
        await self.db.flush()
        items_stmt = sa.select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po.id)
        items_result = await self.db.execute(items_stmt)
        po.items = list(items_result.scalars().all())
        return po

    async def update_purchase_order_status(self, po_id: int, owner_id: int, status: str) -> PurchaseOrder | None:
        po = await self.get_purchase_order(po_id, owner_id)
        if not po:
            return None
        po.status = status
        now = datetime.now(timezone.utc)
        if status == "ordered" and not po.ordered_at:
            po.ordered_at = now
        elif status == "received" and not po.received_at:
            po.received_at = now
        await self.db.flush()
        return po

    async def delete_purchase_order(self, po_id: int, owner_id: int) -> bool:
        po = await self.get_purchase_order(po_id, owner_id)
        if not po:
            return False
        del_stmt = sa.delete(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po_id)
        await self.db.execute(del_stmt)
        return await self.repo.delete(po_id)

    async def count_purchase_orders(self, owner_id: int, status: str | None = None) -> int:
        stmt = sa.select(sa.func.count()).select_from(PurchaseOrder).where(PurchaseOrder.owner_id == owner_id)
        if status:
            stmt = stmt.where(PurchaseOrder.status == status)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
