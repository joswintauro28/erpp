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

    async def list_purchase_orders(self, organization_id: int) -> list[PurchaseOrder]:
        stmt = sa.select(PurchaseOrder).where(PurchaseOrder.organization_id == organization_id).order_by(PurchaseOrder.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_purchase_order(self, po_id: int, organization_id: int) -> PurchaseOrder | None:
        stmt = sa.select(PurchaseOrder).where(PurchaseOrder.id == po_id, PurchaseOrder.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_purchase_order_with_items(self, po_id: int, organization_id: int) -> PurchaseOrder | None:
        po = await self.get_purchase_order(po_id, organization_id)
        if not po:
            return None
        items_stmt = sa.select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po_id)
        items_result = await self.db.execute(items_stmt)
        po.items = list(items_result.scalars().all())
        return po

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
            subtotal=subtotal,
            total=subtotal,
            **data,
        )
        for item in resolved_items:
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

        # Publish RabbitMQ event
        from app.core.amqp import get_exchange
        import aio_pika
        import json
        from datetime import datetime, timezone
        
        exchange = await get_exchange()
        if exchange:
            try:
                from app.supplier.models import Supplier
                from app.product.models import Product

                supplier_name = None
                if po.supplier_id:
                    sup_stmt = sa.select(Supplier).where(
                        Supplier.id == po.supplier_id,
                        Supplier.organization_id == organization_id,
                    )
                    sup_res = await self.db.execute(sup_stmt)
                    supplier = sup_res.scalar_one_or_none()
                    supplier_name = supplier.name if supplier else None

                items_payload = []
                for item in po.items:
                    product_name = None
                    gst_rate = 0.0
                    prod_stmt = sa.select(Product).where(
                        Product.id == item.product_id,
                        Product.organization_id == organization_id,
                    )
                    prod_res = await self.db.execute(prod_stmt)
                    product = prod_res.scalar_one_or_none()
                    if product:
                        product_name = product.name
                        gst_rate = float(product.tax_rate or 0.0)
                    items_payload.append({
                        "product_id": item.product_id,
                        "product_name": product_name or f"Product {item.product_id}",
                        "quantity": item.quantity,
                        "unit_price": float(item.unit_price or 0.0),
                        "gst_rate": gst_rate,
                    })

                event_data = {
                    "event": "inventory.po.created",
                    "organization_id": organization_id,
                    "po_id": po.id,
                    "order_number": po.order_number,
                    "supplier_id": po.supplier_id,
                    "supplier_name": supplier_name,
                    "subtotal": float(po.subtotal or 0.0),
                    "total": float(po.total or 0.0),
                    "items": items_payload,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                message = aio_pika.Message(
                    body=json.dumps(event_data).encode(),
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                )
                await exchange.publish(message, routing_key="inventory.po.created")
            except Exception:
                pass

        return po

    async def update_purchase_order_status(self, po_id: int, organization_id: int, status: str) -> PurchaseOrder | None:
        po = await self.get_purchase_order(po_id, organization_id)
        if not po:
            return None
        
        old_status = po.status
        po.status = status
        now = datetime.now(timezone.utc)
        if status == "ordered" and not po.ordered_at:
            po.ordered_at = now
        elif status == "received" and not po.received_at:
            po.received_at = now
            
            # Automatically update stock levels and log IN movement
            from app.stock.models import Stock, StockMovement
            items_stmt = sa.select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po_id)
            items_res = await self.db.execute(items_stmt)
            po_items = list(items_res.scalars().all())

            for item in po_items:
                stock_stmt = sa.select(Stock).where(
                    Stock.organization_id == organization_id,
                    Stock.product_id == item.product_id,
                    Stock.warehouse_id == po.warehouse_id
                )
                stock_res = await self.db.execute(stock_stmt)
                stock_rec = stock_res.scalar_one_or_none()

                if stock_rec:
                    stock_rec.quantity += item.quantity
                else:
                    stock_rec = Stock(
                        organization_id=organization_id,
                        product_id=item.product_id,
                        warehouse_id=po.warehouse_id,
                        quantity=item.quantity
                    )
                    self.db.add(stock_rec)

                # Log stock movement IN
                movement = StockMovement(
                    organization_id=organization_id,
                    product_id=item.product_id,
                    warehouse_id=po.warehouse_id,
                    type="in",
                    quantity=item.quantity,
                    reference_type="PURCHASE_RECEIPT",
                    reference_id=po.id,
                    notes=f"Goods received from Purchase Order {po.order_number}"
                )
                self.db.add(movement)

            # Auto-check associated fulfillments
            from app.fulfillment.models import SalesOrderFulfillment
            from app.fulfillment.services import FulfillmentService
            ful_stmt = sa.select(SalesOrderFulfillment).where(
                SalesOrderFulfillment.purchase_order_id == po_id,
                SalesOrderFulfillment.organization_id == organization_id
            )
            ful_res = await self.db.execute(ful_stmt)
            fulfillments = list(ful_res.scalars().all())
            
            ful_service = FulfillmentService(self.db)
            for f in fulfillments:
                await ful_service.check_stock(organization_id, f.id)

        await self.db.flush()
        return po

    async def delete_purchase_order(self, po_id: int, organization_id: int) -> bool:
        po = await self.get_purchase_order(po_id, organization_id)
        if not po:
            return False
        del_stmt = sa.delete(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po_id)
        await self.db.execute(del_stmt)
        return await self.repo.delete(po_id)

    async def count_purchase_orders(self, organization_id: int, status: str | None = None) -> int:
        stmt = sa.select(sa.func.count()).select_from(PurchaseOrder).where(PurchaseOrder.organization_id == organization_id)
        if status:
            stmt = stmt.where(PurchaseOrder.status == status)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
