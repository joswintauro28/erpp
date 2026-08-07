import asyncio
import logging
import json
import os
import aio_pika
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.customers.models import Customer
from app.opportunities.models import Opportunity
from app.sales_orders.models import SalesOrder

logger = logging.getLogger("app.crm_worker")

async def process_invoice_paid(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            logger.info(f"Received billing.invoice.paid message: {body}")
            
            payload = body.get("payload", {})
            client_name = payload.get("clientName") or payload.get("client_name")
            amount = payload.get("amount") or 0
            
            async with AsyncSessionLocal() as db:
                if client_name:
                    # 1. Update Opportunity stage to Won if matching account name
                    opp_stmt = select(Opportunity).where(
                        Opportunity.account == client_name,
                        Opportunity.stage != "Won"
                    )
                    opp_res = await db.execute(opp_stmt)
                    opps = list(opp_res.scalars().all())
                    for opp in opps:
                        opp.stage = "Won"
                        logger.info(f"Updated Opportunity {opp.id_str} stage to 'Won'")
                
                    # 2. Refresh Customer tier based on invoice payment amount
                    cust_stmt = select(Customer).where(Customer.account == client_name)
                    cust_res = await db.execute(cust_stmt)
                    customer = cust_res.scalars().first()
                    if customer:
                        old_tier = customer.tier
                        new_tier = "Silver"
                        try:
                            amt_val = float(amount)
                            if amt_val >= 250000:
                                new_tier = "Platinum"
                            elif amt_val >= 100000:
                                new_tier = "Gold"
                        except Exception:
                            pass
                        
                        if old_tier != new_tier:
                            customer.tier = new_tier
                            logger.info(f"Refreshed Customer {customer.account} tier from {old_tier} to {new_tier}")
                
                await db.commit()
                
        except Exception as e:
            logger.error(f"Error processing billing.invoice.paid: {str(e)}", exc_info=True)

async def process_inventory_shortage(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            logger.info(f"Received inventory.order.shortage message: {body}")

            sales_order_code = body.get("sales_order_code")
            if not sales_order_code:
                return

            async with AsyncSessionLocal() as db:
                so_stmt = select(SalesOrder).where(SalesOrder.so_no == sales_order_code)
                so_res = await db.execute(so_stmt)
                so = so_res.scalars().first()
                if so:
                    so.status = "Stock Hold"
                    await db.commit()
                    logger.info(f"Held sales order {sales_order_code} due to inventory shortage")
        except Exception as e:
            logger.error(f"Error processing inventory.order.shortage: {str(e)}", exc_info=True)


# Event -> SO status mapping for the inventory fulfillment lifecycle. The CRM keeps the
# sales order in sync so the sales team sees stock progress without a manual update.
FULFILLMENT_STATUS_EVENTS = {
    "inventory.order.reserved": "Reserved",
    "inventory.order.picking": "Picking",
    "inventory.order.packed": "Packed",
    "inventory.shipment.dispatched": "Delivered",
    "inventory.order.fulfilled": "Done",
}


async def process_inventory_fulfillment_status(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            event = body.get("event", "")
            sales_order_code = body.get("sales_order_code")
            new_status = FULFILLMENT_STATUS_EVENTS.get(event)
            if not sales_order_code or not new_status:
                return

            logger.info(f"Received {event} for {sales_order_code} -> SO status {new_status}")

            async with AsyncSessionLocal() as db:
                so_stmt = select(SalesOrder).where(SalesOrder.so_no == sales_order_code)
                so_res = await db.execute(so_stmt)
                so = so_res.scalars().first()
                if so:
                    so.status = new_status
                    await db.commit()
                    logger.info(f"Updated sales order {sales_order_code} status to {new_status}")
        except Exception as e:
            logger.error(f"Error processing inventory fulfillment status: {str(e)}", exc_info=True)


async def run_crm_worker():
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    logger.info(f"Starting CRM RabbitMQ worker, connecting to {rabbitmq_url}")
    
    while True:
        try:
            connection = await aio_pika.connect_robust(rabbitmq_url)
            channel = await connection.channel()
            
            # Declare exchange
            exchange = await channel.declare_exchange("erp_events", aio_pika.ExchangeType.TOPIC, durable=True)
            
            # Declare queue
            queue = await channel.declare_queue("invoice_paid_crm_queue", durable=True)
            
            # Bind queue
            await queue.bind(exchange, routing_key="billing.invoice.paid")
            
            # Declare shortage queue
            shortage_queue = await channel.declare_queue("inventory_shortage_crm_queue", durable=True)
            await shortage_queue.bind(exchange, routing_key="inventory.order.shortage")
            
            # Declare fulfillment-status queue (reserved/picking/packed/dispatched/fulfilled)
            fulfillment_queue = await channel.declare_queue("inventory_fulfillment_status_crm_queue", durable=True)
            for routing_key in FULFILLMENT_STATUS_EVENTS:
                await fulfillment_queue.bind(exchange, routing_key=routing_key)
            
            logger.info("Successfully connected to RabbitMQ and bound crm queues.")
            
            async def _consume_invoice_paid():
                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        await process_invoice_paid(message)
            
            async def _consume_shortage():
                async with shortage_queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        await process_inventory_shortage(message)

            async def _consume_fulfillment_status():
                async with fulfillment_queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        await process_inventory_fulfillment_status(message)
            
            await asyncio.gather(_consume_invoice_paid(), _consume_shortage(), _consume_fulfillment_status())
            
        except asyncio.CancelledError:
            logger.info("CRM worker task cancelled, shutting down.")
            break
        except Exception as e:
            logger.error(f"CRM worker connection error: {str(e)}. Retrying in 5 seconds...", exc_info=True)
            await asyncio.sleep(5)
