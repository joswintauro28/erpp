from datetime import datetime, timezone
import logging
import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fulfillment.models import SalesOrderFulfillment, FulfillmentItem
from app.fulfillment.schemas import FulfillmentCreate, FulfillmentDispatchAction, StockCheckResult, StockCheckResultItem
from app.core.idgen import next_document_id
from app.stock.models import Stock, StockMovement
from app.purchase_order.models import PurchaseOrder, PurchaseOrderItem
from app.supplier.models import Supplier

logger = logging.getLogger("app.fulfillment")


class FulfillmentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_fulfillments(self, org_id: int, status_filter: str | None = None) -> list[SalesOrderFulfillment]:
        stmt = select(SalesOrderFulfillment).where(SalesOrderFulfillment.organization_id == org_id)
        if status_filter and status_filter.upper() != "ALL":
            stmt = stmt.where(SalesOrderFulfillment.status == status_filter.upper())
        stmt = stmt.order_by(SalesOrderFulfillment.created_at.desc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_fulfillment(self, org_id: int, fulfillment_id: int) -> SalesOrderFulfillment:
        stmt = select(SalesOrderFulfillment).where(
            SalesOrderFulfillment.id == fulfillment_id,
            SalesOrderFulfillment.organization_id == org_id
        )
        res = await self.db.execute(stmt)
        order = res.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fulfillment order not found")
        return order

    async def create_fulfillment(self, org_id: int, data: FulfillmentCreate) -> SalesOrderFulfillment:
        # Check if a fulfillment for this sales order already exists
        existing_stmt = select(SalesOrderFulfillment).where(
            SalesOrderFulfillment.sales_order_code == data.sales_order_code,
            SalesOrderFulfillment.organization_id == org_id
        )
        existing_res = await self.db.execute(existing_stmt)
        existing_order = existing_res.scalar_one_or_none()
        if existing_order:
            import logging
            logging.getLogger("app.fulfillment").info(
                f"Fulfillment for Sales Order {data.sales_order_code} already exists. Returning existing record."
            )
            return existing_order

        order = SalesOrderFulfillment(
            organization_id=org_id,
            sales_order_code=data.sales_order_code,
            customer_name=data.customer_name,
            sales_owner=data.sales_owner,
            warehouse_id=data.warehouse_id,
            status="QUEUED"
        )
        self.db.add(order)
        await self.db.flush()

        from app.product.models import Product

        for item_in in data.items:
            product = None
            if item_in.product_id:
                prod_stmt = select(Product).where(Product.id == item_in.product_id, Product.organization_id == org_id)
                prod_res = await self.db.execute(prod_stmt)
                product = prod_res.scalar_one_or_none()

            if not product and item_in.sku:
                prod_stmt = select(Product).where(Product.sku == item_in.sku, Product.organization_id == org_id)
                prod_res = await self.db.execute(prod_stmt)
                product = prod_res.scalar_one_or_none()

            if not product:
                prod_stmt = select(Product).where(Product.name == item_in.product_name, Product.organization_id == org_id)
                prod_res = await self.db.execute(prod_stmt)
                product = prod_res.scalar_one_or_none()

            if not product:
                # Auto-create product in catalog if not existing yet
                import random
                generated_sku = item_in.sku or f"SKU-{random.randint(1000, 9999)}"
                product = Product(
                    organization_id=org_id,
                    name=item_in.product_name,
                    sku=generated_sku,
                    price=item_in.unit_price,
                    cost_price=item_in.unit_price * 0.7 if item_in.unit_price else 0.0,
                    track_inventory=True,
                    is_active=True
                )
                self.db.add(product)
                await self.db.flush()

            item = FulfillmentItem(
                fulfillment_id=order.id,
                product_id=product.id,
                product_name=item_in.product_name,
                sku=product.sku,
                ordered_quantity=item_in.ordered_quantity,
                unit_price=item_in.unit_price
            )
            self.db.add(item)

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def check_stock(self, org_id: int, fulfillment_id: int) -> StockCheckResult:
        order = await self.get_fulfillment(org_id, fulfillment_id)
        results = []
        overall_available = True

        for item in order.items:
            # Query stock level in selected warehouse or globally across org
            stmt = select(Stock).where(
                Stock.organization_id == org_id,
                Stock.product_id == item.product_id
            )
            if order.warehouse_id:
                stmt = stmt.where(Stock.warehouse_id == order.warehouse_id)

            res = await self.db.execute(stmt)
            stock_records = res.scalars().all()
            # ATP = physical quantity minus already-reserved units, so concurrent
            # fulfillments cannot over-promise the same stock.
            total_avail = sum(max(0, s.quantity - s.reserved_quantity) for s in stock_records)

            is_avail = total_avail >= item.ordered_quantity
            if not is_avail:
                overall_available = False

            results.append(StockCheckResultItem(
                product_id=item.product_id,
                product_name=item.product_name,
                ordered_quantity=item.ordered_quantity,
                available_stock=total_avail,
                is_available=is_avail
            ))

        if overall_available and order.status in ("SHORTAGE", "PO_CREATED", "WO_CREATED"):
            order.status = "QUEUED"
            await self.db.commit()
            await self.db.refresh(order)

        return StockCheckResult(
            fulfillment_id=order.id,
            overall_available=overall_available,
            warehouse_id=order.warehouse_id,
            items=results
        )

    async def resume_pending_fulfillments(
        self, org_id: int, product_ids: list[int] | None = None, warehouse_id: int | None = None
    ) -> list[SalesOrderFulfillment]:
        """Re-check every unfulfilled order (QUEUED/SHORTAGE/PO_CREATED) and
        auto-reserve any that now have enough available stock.

        Called whenever stock increases (PO receipt, manual adjustment, stock-in)
        so waiting orders resume without a manual click.
        """
        pending_statuses = ("QUEUED", "SHORTAGE", "PO_CREATED", "WO_CREATED")
        stmt = select(SalesOrderFulfillment).where(
            SalesOrderFulfillment.organization_id == org_id,
            SalesOrderFulfillment.status.in_(pending_statuses),
        )
        if product_ids:
            stmt = stmt.join(FulfillmentItem).where(FulfillmentItem.product_id.in_(product_ids))
        if warehouse_id:
            stmt = stmt.where(
                or_(
                    SalesOrderFulfillment.warehouse_id == warehouse_id,
                    SalesOrderFulfillment.warehouse_id.is_(None),
                )
            )
        stmt = stmt.distinct()

        res = await self.db.execute(stmt)
        pending = list(res.scalars().all())

        resumed: list[SalesOrderFulfillment] = []
        for order in pending:
            try:
                result = await self.check_stock(org_id, order.id)
                if result.overall_available and order.status in ("QUEUED", "SHORTAGE", "PO_CREATED", "WO_CREATED"):
                    await self.reserve_stock(org_id, order.id)
                    resumed.append(order)
            except Exception:
                continue
        return resumed

    async def reserve_stock(self, org_id: int, fulfillment_id: int) -> SalesOrderFulfillment:
        order = await self.get_fulfillment(org_id, fulfillment_id)
        for item in order.items:
            item.reserved_quantity = item.ordered_quantity
            
            # Update Stock reserved count
            stmt = select(Stock).where(
                Stock.organization_id == org_id,
                Stock.product_id == item.product_id
            )
            if order.warehouse_id:
                stmt = stmt.where(Stock.warehouse_id == order.warehouse_id)
            
            res = await self.db.execute(stmt)
            stock_rec = res.scalars().first()
            if stock_rec:
                stock_rec.reserved_quantity += item.ordered_quantity
                
        order.status = "RESERVED"
        await self.db.commit()
        await self.db.refresh(order)

        from app.core.events import publish_event, EVENT_ORDER_RESERVED
        publish_event(
            EVENT_ORDER_RESERVED,
            organization_id=org_id,
            fulfillment_id=order.id,
            sales_order_code=order.sales_order_code,
            customer_name=order.customer_name,
            warehouse_id=order.warehouse_id,
            items=[
                {
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "sku": item.sku,
                    "quantity": item.ordered_quantity,
                }
                for item in order.items
            ],
        )
        return order

    async def pick_items(self, org_id: int, fulfillment_id: int) -> SalesOrderFulfillment:
        order = await self.get_fulfillment(org_id, fulfillment_id)
        if order.status != "RESERVED":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pick list requires stock to be reserved first")
        for item in order.items:
            item.picked_quantity = item.ordered_quantity
        order.status = "PICKING"
        await self.db.commit()
        await self.db.refresh(order)

        from app.core.events import publish_event, EVENT_ORDER_PICKING
        publish_event(
            EVENT_ORDER_PICKING,
            organization_id=org_id,
            fulfillment_id=order.id,
            sales_order_code=order.sales_order_code,
            customer_name=order.customer_name,
            warehouse_id=order.warehouse_id,
        )
        return order

    async def pack_items(self, org_id: int, fulfillment_id: int) -> SalesOrderFulfillment:
        order = await self.get_fulfillment(org_id, fulfillment_id)
        if order.status != "PICKING":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Packing requires the pick list to be generated")
        for item in order.items:
            item.packed_quantity = item.ordered_quantity
        order.status = "PACKED"
        await self.db.commit()
        await self.db.refresh(order)

        from app.core.events import publish_event, EVENT_ORDER_PACKED
        publish_event(
            EVENT_ORDER_PACKED,
            organization_id=org_id,
            fulfillment_id=order.id,
            sales_order_code=order.sales_order_code,
            customer_name=order.customer_name,
            warehouse_id=order.warehouse_id,
        )
        return order

    async def dispatch_order(self, org_id: int, fulfillment_id: int, data: FulfillmentDispatchAction) -> SalesOrderFulfillment:
        order = await self.get_fulfillment(org_id, fulfillment_id)
        if order.status != "PACKED":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dispatch requires the order to be packed first")
        
        # 1. Update shipping details & status
        order.status = "DISPATCHED"
        order.shipping_carrier = data.shipping_carrier
        order.tracking_number = data.tracking_number
        order.dispatched_at = datetime.now(timezone.utc)

        # 2. Update physical stock levels & log stock movement
        for item in order.items:
            stmt = select(Stock).where(
                Stock.organization_id == org_id,
                Stock.product_id == item.product_id
            )
            if order.warehouse_id:
                stmt = stmt.where(Stock.warehouse_id == order.warehouse_id)
            
            res = await self.db.execute(stmt)
            stock_rec = res.scalars().first()

            if stock_rec:
                stock_rec.quantity = max(0, stock_rec.quantity - item.ordered_quantity)
                stock_rec.reserved_quantity = max(0, stock_rec.reserved_quantity - item.ordered_quantity)
                
                # Log stock movement OUT
                movement = StockMovement(
                    organization_id=org_id,
                    product_id=item.product_id,
                    warehouse_id=stock_rec.warehouse_id,
                    type="out",
                    quantity=-item.ordered_quantity,
                    reference_type="DISPATCH",
                    reference_id=order.id,
                    notes=f"Dispatched via {data.shipping_carrier} (#{data.tracking_number})"
                )
                self.db.add(movement)

        await self.db.commit()
        await self.db.refresh(order)

        # Publish RabbitMQ event (fire-and-forget, non-blocking)
        from app.core.events import publish_event, EVENT_SHIPMENT_DISPATCHED
        publish_event(
            EVENT_SHIPMENT_DISPATCHED,
            organization_id=org_id,
            fulfillment_id=order.id,
            sales_order_code=order.sales_order_code,
            customer_name=order.customer_name,
            sales_owner=order.sales_owner,
            warehouse_id=order.warehouse_id,
            shipping_carrier=order.shipping_carrier,
            tracking_number=order.tracking_number,
            items=[
                {
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "sku": item.sku,
                    "quantity": item.ordered_quantity,
                    "unit_price": float(item.unit_price or 0.0),
                    "cost_price": float(item.unit_price or 0.0) * 0.7,
                }
                for item in order.items
            ],
        )

        return order

    async def resolve_shortage(
        self, org_id: int, fulfillment_id: int
    ) -> SalesOrderFulfillment:
        """I3/I4: dispatch a shortage to the right supply path.

        For each short line item, check the product's `make_or_buy` policy:
        - make  -> create a Work Order (M1_Prod)
        - buy   -> include in the auto Purchase Order (P1/P2)
        - both  -> default to buy (quickest path)

        If any work orders were created the fulfillment is marked WO_CREATED
        (it auto-resumes when PRODUCTION_COMPLETION credits finished goods).
        """
        order = await self.get_fulfillment(org_id, fulfillment_id)

        from app.product.models import Product

        product_ids = [item.product_id for item in order.items if item.product_id]
        make_ids: set[int] = set()
        if product_ids:
            prod_stmt = select(Product).where(Product.id.in_(product_ids), Product.organization_id == org_id)
            prod_res = await self.db.execute(prod_stmt)
            for p in prod_res.scalars().all():
                if p.make_or_buy == "make":
                    make_ids.add(p.id)

        created_wo: list[int] = []
        if make_ids:
            from app.work_order.services import WorkOrderService

            wo_service = WorkOrderService(self.db)
            for item in order.items:
                if item.product_id in make_ids and item.ordered_quantity > 0:
                    try:
                        wo = await wo_service.create_for_shortage(
                            org_id,
                            product_id=item.product_id,
                            quantity=item.ordered_quantity,
                            notes=(
                                f"Auto-created from shortage on sales order "
                                f"{order.sales_order_code}"
                            ),
                            created_by="system:shortage",
                        )
                        if wo:
                            created_wo.append(wo.id)
                    except Exception as wo_exc:
                        logger.error(f"Failed to auto-create work order for product {item.product_id}: {wo_exc}")

        # Buy/both items still go through the purchase order path (mixed orders
        # can therefore be served by both a work order and a PO simultaneously).
        po = None
        buy_items = [i for i in order.items if i.product_id not in make_ids]
        if buy_items:
            try:
                po = await self._create_po_for_items(org_id, order, buy_items)
            except Exception as po_exc:
                logger.error(f"Failed to auto-create PO for shortage on {order.sales_order_code}: {po_exc}")

        if created_wo:
            order.status = "WO_CREATED"
            order.work_order_id = created_wo[0]
        elif po:
            order.status = "PO_CREATED"
        else:
            order.status = "SHORTAGE"

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def _create_po_for_items(
        self, org_id: int, order: SalesOrderFulfillment, items: list
    ) -> PurchaseOrder | None:
        """Shared PO creation used by the shortage path (buy items only)."""
        from app.supplier.models import Supplier
        from app.warehouse.models import Warehouse

        sup_stmt = select(Supplier).where(Supplier.organization_id == org_id)
        sup_res = await self.db.execute(sup_stmt)
        supplier = sup_res.scalars().first()
        if not supplier:
            supplier = Supplier(
                organization_id=org_id,
                name="Primary Industrial Supplier",
                contact_person="Procurement Desk",
                email="supplier@vendor.com",
                phone="+91 9876543210",
            )
            self.db.add(supplier)
            await self.db.flush()

        wh_id = order.warehouse_id
        warehouse = None
        if wh_id:
            wh_stmt = select(Warehouse).where(Warehouse.id == wh_id, Warehouse.organization_id == org_id)
            wh_res = await self.db.execute(wh_stmt)
            warehouse = wh_res.scalars().first()
        if not warehouse:
            wh_stmt = select(Warehouse).where(Warehouse.organization_id == org_id)
            wh_res = await self.db.execute(wh_stmt)
            warehouse = wh_res.scalars().first()
        if not warehouse:
            warehouse = Warehouse(
                organization_id=org_id,
                name="Main Distribution Center",
                code="WH-MAIN",
                city="Bangalore",
                state="Karnataka",
                country="India",
            )
            self.db.add(warehouse)
            await self.db.flush()

        po_number = await next_document_id(self.db, PurchaseOrder, "PO", "order_number", org_id)
        po = PurchaseOrder(
            organization_id=org_id,
            supplier_id=supplier.id,
            warehouse_id=warehouse.id,
            order_number=po_number,
            status="SUBMITTED",
            submitted_at=datetime.now(timezone.utc),
            notes=f"Auto-generated PO for fulfillment shortage on order {order.sales_order_code}",
        )
        self.db.add(po)
        await self.db.flush()

        total_val = 0.0
        for item in items:
            item_subtotal = float(item.ordered_quantity) * float(item.unit_price)
            total_val += item_subtotal
            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=item.product_id,
                quantity=item.ordered_quantity,
                received_quantity=0,
                unit_price=item.unit_price,
                subtotal=item_subtotal,
            )
            self.db.add(po_item)

        po.subtotal = total_val
        po.total = total_val
        await self.db.flush()

        order.purchase_order_id = po.id

        from app.core.events import publish_event, EVENT_PO_CREATED
        publish_event(
            EVENT_PO_CREATED,
            organization_id=org_id,
            po_id=po.id,
            order_number=po.order_number,
            supplier_id=po.supplier_id,
            subtotal=float(po.subtotal or 0.0),
            total=float(po.total or 0.0),
            items=[
                {
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "quantity": item.ordered_quantity,
                    "unit_price": float(item.unit_price or 0.0),
                }
                for item in items
            ],
        )
        return po

    async def trigger_po_for_shortage(self, org_id: int, fulfillment_id: int) -> SalesOrderFulfillment:
        """Backwards-compatible: run the full make/buy shortage resolution."""
        return await self.resolve_shortage(org_id, fulfillment_id)

    async def create_picking_batch(
        self, org_id: int, fulfillment_ids: list[int]
    ) -> dict:
        """I7: group reserved fulfillments into a single picking wave/batch."""
        from app.core.idgen import next_document_id
        from app.fulfillment.models import SalesOrderFulfillment

        if not fulfillment_ids:
            raise HTTPException(status_code=422, detail="Select at least one fulfillment")

        stmt = select(SalesOrderFulfillment).where(
            SalesOrderFulfillment.id.in_(fulfillment_ids),
            SalesOrderFulfillment.organization_id == org_id,
        )
        res = await self.db.execute(stmt)
        orders = list(res.scalars().all())
        if len(orders) != len(set(fulfillment_ids)):
            raise HTTPException(status_code=404, detail="One or more fulfillments not found")

        for o in orders:
            if o.status != "RESERVED":
                raise HTTPException(
                    status_code=409,
                    detail=f"Fulfillment {o.id} ({o.sales_order_code}) is {o.status}; only RESERVED orders can be batched",
                )

        batch_no = await next_document_id(self.db, SalesOrderFulfillment, "WAVE", "batch_no", org_id)
        now = datetime.now(timezone.utc)
        for o in orders:
            o.batch_no = batch_no
            o.status = "PICKING"
            for item in o.items:
                item.picked_quantity = item.ordered_quantity
        await self.db.commit()

        return {
            "batch_no": batch_no,
            "status": "PICKING",
            "created_at": now.isoformat(),
            "items": [
                {
                    "fulfillment_id": o.id,
                    "sales_order_code": o.sales_order_code,
                    "customer_name": o.customer_name,
                    "warehouse_id": o.warehouse_id,
                }
                for o in orders
            ],
        }

    async def list_picking_batches(self, org_id: int) -> list[dict]:
        """I7: distinct picking batches with their member fulfillments."""
        stmt = select(SalesOrderFulfillment).where(
            SalesOrderFulfillment.organization_id == org_id,
            SalesOrderFulfillment.batch_no.is_not(None),
        ).order_by(SalesOrderFulfillment.batch_no.desc())
        res = await self.db.execute(stmt)
        rows = list(res.scalars().all())

        batches: dict[str, dict] = {}
        for o in rows:
            b = batches.setdefault(
                o.batch_no,
                {
                    "batch_no": o.batch_no,
                    "status": o.status,
                    "items": [],
                },
            )
            b["items"].append(
                {
                    "fulfillment_id": o.id,
                    "sales_order_code": o.sales_order_code,
                    "customer_name": o.customer_name,
                    "warehouse_id": o.warehouse_id,
                }
            )
        return list(batches.values())

    async def generate_invoice_link(self, org_id: int, fulfillment_id: int, raw_token: str | None = None) -> SalesOrderFulfillment:
        order = await self.get_fulfillment(org_id, fulfillment_id)
        
        # Try calling billing-service if token is provided
        if raw_token:
            try:
                headers = {"Authorization": f"Bearer {raw_token}", "Content-Type": "application/json"}
                # camelCase payload to match billing CreateInvoiceDto (whitelist
                # validation forbids unknown/snake_case keys). gstRate is required.
                items_payload = [
                    {
                        "productId": item.product_id,
                        "description": item.product_name,
                        "quantity": item.ordered_quantity,
                        "unitPrice": float(item.unit_price),
                        "gstRate": 0,
                    }
                    for item in order.items
                ]
                invoice_payload = {
                    "clientName": order.customer_name,
                    "items": items_payload,
                    "notes": f"Generated from fulfilled Sales Order {order.sales_order_code}",
                    # Links the invoice back to the sales order so the CRM worker
                    # can advance the SO to Invoiced/Paid via billing events.
                    "salesOrderCode": order.sales_order_code,
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(f"{settings.BILLING_SERVICE_URL}/api/invoices", headers=headers, json=invoice_payload)
                    if resp.status_code in (200, 201):
                        inv_data = resp.json()
                        order.invoice_id = inv_data.get("id")
                    else:
                        logger.warning(
                            f"Billing rejected auto-invoice for {order.sales_order_code}: "
                            f"HTTP {resp.status_code} {resp.text[:200]}"
                        )
            except Exception as e:
                print(f"[FulfillmentService] Failed to auto-generate billing invoice: {e}")

        order.status = "COMPLETED"
        await self.db.commit()
        await self.db.refresh(order)

        from app.core.events import publish_event, EVENT_ORDER_FULFILLED
        publish_event(
            EVENT_ORDER_FULFILLED,
            organization_id=org_id,
            fulfillment_id=order.id,
            sales_order_code=order.sales_order_code,
            customer_name=order.customer_name,
            warehouse_id=order.warehouse_id,
            invoice_id=order.invoice_id,
            items=[
                {
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "sku": item.sku,
                    "quantity": item.ordered_quantity,
                    "unit_price": float(item.unit_price or 0.0),
                }
                for item in order.items
            ],
        )
        return order

    async def generate_shipping_label(self, org_id: int, fulfillment_id: int) -> dict:
        order = await self.get_fulfillment(org_id, fulfillment_id)

        carrier = order.shipping_carrier or "UNASSIGNED"
        tracking = order.tracking_number or f"SHIP-{order.id:06d}"
        barcode_text = f"{carrier}|{tracking}|{order.sales_order_code}"

        items_payload = []
        for item in order.items:
            items_payload.append({
                "product_id": item.product_id,
                "product_name": item.product_name,
                "sku": item.sku,
                "quantity": item.ordered_quantity,
            })

        return {
            "fulfillment_id": order.id,
            "sales_order_code": order.sales_order_code,
            "customer_name": order.customer_name,
            "shipping_carrier": order.shipping_carrier,
            "tracking_number": order.tracking_number,
            "barcode_text": barcode_text,
            "items": items_payload,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "url": f"/fulfillment/orders/{order.id}/shipping-label",
        }

    async def delete_fulfillment(self, org_id: int, fulfillment_id: int) -> bool:
        order = await self.get_fulfillment(org_id, fulfillment_id)
        
        # Release Stock reserved count if it was reserved
        if order.status in ("RESERVED", "PICKING", "PACKED"):
            for item in order.items:
                stmt = select(Stock).where(
                    Stock.organization_id == org_id,
                    Stock.product_id == item.product_id
                )
                if order.warehouse_id:
                    stmt = stmt.where(Stock.warehouse_id == order.warehouse_id)
                res = await self.db.execute(stmt)
                stock_rec = res.scalars().first()
                if stock_rec:
                    stock_rec.reserved_quantity = max(0, stock_rec.reserved_quantity - item.ordered_quantity)

        from sqlalchemy import delete
        stmt_items = delete(FulfillmentItem).where(FulfillmentItem.fulfillment_id == fulfillment_id)
        await self.db.execute(stmt_items)
        stmt_order = delete(SalesOrderFulfillment).where(
            SalesOrderFulfillment.id == fulfillment_id,
            SalesOrderFulfillment.organization_id == org_id
        )
        await self.db.execute(stmt_order)
        await self.db.commit()
        return True

    async def cancel_fulfillment(self, org_id: int, sales_order_code: str) -> SalesOrderFulfillment | None:
        """Cancel a fulfillment because its sales order was cancelled in CRM.

        Releases any reserved stock back to the pool and cancels the auto-created
        purchase order if it has not yet been approved.
        """
        stmt = select(SalesOrderFulfillment).where(
            SalesOrderFulfillment.organization_id == org_id,
            SalesOrderFulfillment.sales_order_code == sales_order_code,
        )
        res = await self.db.execute(stmt)
        order = res.scalars().first()
        if not order:
            # Tombstone: the approval event may still be in flight on the other
            # queue. Recording a cancelled row means the duplicate-guard in
            # process_crm_order_approved (skip if any fulfillment exists) will
            # swallow the late approval for this sales order.
            tombstone = SalesOrderFulfillment(
                organization_id=org_id,
                sales_order_code=sales_order_code,
                customer_name="Cancelled Order",
                status="CANCELLED",
            )
            self.db.add(tombstone)
            await self.db.commit()
            logger.info(f"Recorded cancellation tombstone for sales order {sales_order_code}")
            return tombstone

        if order.status in ("COMPLETED", "CANCELLED"):
            logger.info(f"Fulfillment {order.id} for {sales_order_code} already terminal ({order.status}); skip cancel")
            return order
        if order.status == "DISPATCHED":
            logger.warning(
                f"Fulfillment {order.id} for {sales_order_code} already dispatched; "
                "cannot cancel. Manage via returns/credit note."
            )
            return order

        # Release reserved stock back to the pool.
        if order.status in ("RESERVED", "PICKING", "PACKED"):
            for item in order.items:
                stock_stmt = select(Stock).where(
                    Stock.organization_id == org_id,
                    Stock.product_id == item.product_id,
                )
                if order.warehouse_id:
                    stock_stmt = stock_stmt.where(Stock.warehouse_id == order.warehouse_id)
                stock_res = await self.db.execute(stock_stmt)
                stock_rec = stock_res.scalars().first()
                if stock_rec:
                    stock_rec.reserved_quantity = max(0, stock_rec.reserved_quantity - item.ordered_quantity)

        # Cancel the linked auto-PO if it is still cancellable.
        if order.purchase_order_id:
            po_stmt = select(PurchaseOrder).where(
                PurchaseOrder.id == order.purchase_order_id,
                PurchaseOrder.organization_id == org_id,
            )
            po_res = await self.db.execute(po_stmt)
            po = po_res.scalars().first()
            if po and po.status in ("DRAFT", "SUBMITTED"):
                po.status = "CANCELLED"
                po.cancelled_at = datetime.now(timezone.utc)
                logger.info(
                    f"Cancelled purchase order {po.order_number} linked to fulfilment {order.id}"
                )

        order.status = "CANCELLED"
        await self.db.commit()
        await self.db.refresh(order)

        from app.core.events import publish_event, EVENT_ORDER_CANCELLED
        publish_event(
            EVENT_ORDER_CANCELLED,
            organization_id=org_id,
            fulfillment_id=order.id,
            sales_order_code=order.sales_order_code,
            customer_name=order.customer_name,
            warehouse_id=order.warehouse_id,
        )
        logger.info(f"Cancelled fulfillment {order.id} for sales order {sales_order_code}")
        return order

    async def step_back(self, org_id: int, fulfillment_id: int) -> SalesOrderFulfillment:
        order = await self.get_fulfillment(org_id, fulfillment_id)
        
        if order.status == "RESERVED":
            for item in order.items:
                stmt = select(Stock).where(
                    Stock.organization_id == org_id,
                    Stock.product_id == item.product_id
                )
                if order.warehouse_id:
                    stmt = stmt.where(Stock.warehouse_id == order.warehouse_id)
                res = await self.db.execute(stmt)
                stock_rec = res.scalars().first()
                if stock_rec:
                    stock_rec.reserved_quantity = max(0, stock_rec.reserved_quantity - item.ordered_quantity)
            order.status = "QUEUED"
        elif order.status == "PICKING":
            order.status = "RESERVED"
        elif order.status == "PACKED":
            order.status = "PICKING"
        elif order.status == "DISPATCHED":
            order.status = "PACKED"
            
        await self.db.commit()
        await self.db.refresh(order)
        return order
