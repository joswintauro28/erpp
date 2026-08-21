import asyncio
import logging
import json
import os
import aio_pika
from app.core.database import async_session_factory
from app.fulfillment.services import FulfillmentService
from app.fulfillment.schemas import FulfillmentCreate, FulfillmentItemCreate
from app.stock.services import StockService
from app.core.events import publish_event, EVENT_STOCK_SHORTAGE

logger = logging.getLogger("app.worker")

async def process_crm_order_approved(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            logger.info(f"Received crm.order.approved message: {body}")
            
            organization_id = body.get("organization_id", 1)
            sales_order_code = body.get("sales_order_code")
            customer_name = body.get("customer_name")
            value_str = body.get("value", "0")
            
            try:
                value = float(str(value_str).replace(",", "").strip())
            except ValueError:
                value = 0.0

            # Get items from the message, or create a default item if not present
            items_payload = body.get("items")
            if not items_payload:
                items_payload = [
                    {
                        "product_name": "Standard Consulting Package",
                        "sku": "SCP-CRM",
                        "ordered_quantity": 1,
                        "unit_price": value
                    }
                ]
            
            # Prepare data structure for create_fulfillment
            items = []
            for item in items_payload:
                items.append(
                    FulfillmentItemCreate(
                        product_id=item.get("product_id"),
                        product_name=item.get("product_name") or "Product",
                        sku=item.get("sku"),
                        ordered_quantity=item.get("ordered_quantity", 1),
                        unit_price=item.get("unit_price", 0.0)
                    )
                )
            
            fulfillment_create = FulfillmentCreate(
                sales_order_code=sales_order_code,
                customer_name=customer_name,
                sales_owner=body.get("sales_owner"),
                warehouse_id=body.get("warehouse_id"),
                items=items
            )
            
            # Use async_session_factory to perform DB actions
            async with async_session_factory() as db:
                from sqlalchemy import select
                from app.fulfillment.models import SalesOrderFulfillment

                existing_stmt = select(SalesOrderFulfillment).where(
                    SalesOrderFulfillment.organization_id == organization_id,
                    SalesOrderFulfillment.sales_order_code == sales_order_code,
                )
                existing = await db.execute(existing_stmt)
                if existing.scalar_one_or_none():
                    logger.info(f"Fulfillment already exists for sales order {sales_order_code}; skipping duplicate ingest")
                    return

                fulfillment_service = FulfillmentService(db)
                # Create the draft fulfillment
                fulfillment = await fulfillment_service.create_fulfillment(organization_id, fulfillment_create)
                logger.info(f"Draft fulfillment created with ID {fulfillment.id}")
                
                # Trigger stock check & ATP logic
                stock_service = StockService(db)
                # Check ATP stock for each item in the fulfillment
                for item in fulfillment.items:
                    atp_available = await stock_service.check_atp(organization_id, item.product_id, fulfillment.warehouse_id)
                    logger.info(
                        f"ATP Check for Product ID {item.product_id} ({item.product_name}): "
                        f"Ordered = {item.ordered_quantity}, ATP Available = {atp_available}. "
                        f"Sufficient = {atp_available >= item.ordered_quantity}"
                    )
                
                # Check overall stock via FulfillmentService
                stock_check_result = await fulfillment_service.check_stock(organization_id, fulfillment.id)
                logger.info(f"Overall stock check result: {stock_check_result}")

                # Auto-pick: when stock is fully available, reserve immediately.
                overall_available = getattr(stock_check_result, "overall_available", False)
                if overall_available and fulfillment.status in ("QUEUED", "SHORTAGE", "PO_CREATED"):
                    await fulfillment_service.reserve_stock(organization_id, fulfillment.id)
                    logger.info(f"Auto-reserved stock for sales order {sales_order_code}")
                elif not overall_available:
                    fulfillment.status = "SHORTAGE"
                    await db.commit()
                    # Publish shortage event back to CRM if stock is insufficient
                    shortage_items = []
                    for item in getattr(stock_check_result, "items", []) or []:
                        shortage_items.append({
                            "product_id": item.product_id,
                            "product_name": item.product_name,
                            "requested_quantity": item.ordered_quantity,
                            "available_quantity": item.available_stock,
                            "is_available": item.is_available,
                        })
                    publish_event(
                        EVENT_STOCK_SHORTAGE,
                        organization_id=organization_id,
                        sales_order_code=sales_order_code,
                        customer_name=customer_name,
                        status="Stock Hold",
                        warehouse_id=getattr(stock_check_result, "warehouse_id", None),
                        overall_available=False,
                        items=shortage_items,
                    )
                    logger.info(f"Published inventory.order.shortage event for sales order {sales_order_code}")

                    # Auto-create a PO so procurement can fulfill the shortage. Once the PO is
                    # received, stock arrivals auto-reserve this fulfillment.
                    try:
                        po_fulfillment = await fulfillment_service.trigger_po_for_shortage(organization_id, fulfillment.id)
                        logger.info(f"Auto-created PO {po_fulfillment.purchase_order_id} for shortage on sales order {sales_order_code}")
                    except Exception as po_exc:
                        logger.error(
                            f"Failed to auto-create PO for sales order {sales_order_code}: {str(po_exc)}",
                            exc_info=True,
                        )
                
        except Exception as e:
            logger.error(f"Error processing crm.order.approved: {str(e)}", exc_info=True)

async def process_crm_order_cancelled(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            logger.info(f"Received crm.order.cancelled message: {body}")

            organization_id = body.get("organization_id", 1)
            sales_order_code = body.get("sales_order_code")
            if not sales_order_code:
                return

            async with async_session_factory() as db:
                fulfillment_service = FulfillmentService(db)
                cancelled = await fulfillment_service.cancel_fulfillment(organization_id, sales_order_code)
                if cancelled:
                    logger.info(f"Cancelled fulfillment {cancelled.id} for sales order {sales_order_code}")
                else:
                    logger.info(f"No fulfillment found for cancelled sales order {sales_order_code}")
        except Exception as e:
            logger.error(f"Error processing crm.order.cancelled: {str(e)}", exc_info=True)


async def run_worker():
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    logger.info(f"Starting RabbitMQ worker, connecting to {rabbitmq_url}")
    
    while True:
        try:
            connection = await aio_pika.connect_robust(rabbitmq_url)
            channel = await connection.channel()
            
            # Declare exchange
            exchange = await channel.declare_exchange("erp_events", aio_pika.ExchangeType.TOPIC, durable=True)
            
            # Declare queue
            queue = await channel.declare_queue("crm_order_approved_queue", durable=True)
            
            # Bind queue
            await queue.bind(exchange, routing_key="crm.order.approved")
            
            # Declare cancellation queue (SO cancelled in CRM -> release stock, cancel PO)
            cancel_queue = await channel.declare_queue("crm_order_cancelled_queue", durable=True)
            await cancel_queue.bind(exchange, routing_key="crm.order.cancelled")
            
            logger.info("Successfully connected to RabbitMQ and bound crm_order_approved_queue + crm_order_cancelled_queue.")
            
            async def _consume_approved():
                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        await process_crm_order_approved(message)

            async def _consume_cancelled():
                async with cancel_queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        await process_crm_order_cancelled(message)

            await asyncio.gather(_consume_approved(), _consume_cancelled())
                    
        except asyncio.CancelledError:
            logger.info("Worker task cancelled, shutting down.")
            break
        except Exception as e:
            logger.error(f"Worker connection lost or error occurred: {str(e)}. Retrying in 5 seconds...", exc_info=True)
            await asyncio.sleep(5)
