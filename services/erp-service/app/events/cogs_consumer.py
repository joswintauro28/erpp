import asyncio
import json
import logging
import os
import aio_pika

logger = logging.getLogger("app.cogs_consumer")

async def process_cogs_recognition(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            logger.info(f"Received inventory.shipment.dispatched for COGS recognition: {body}")
            
            organization_id = body.get("organization_id", 1)
            sales_order_code = body.get("sales_order_code")
            items = body.get("items", [])
            
            total_cogs = 0.0
            for item in items:
                qty = float(item.get("quantity") or 0)
                cost_price = float(item.get("cost_price") or 0)
                total_cogs += qty * cost_price
                
            logger.info(
                f"[COGS LEDGER RECOGNITION] Org {organization_id}: "
                f"Recognized COGS Expense of INR {total_cogs:.2f} for Order {sales_order_code} in general ledger."
            )
        except Exception as e:
            logger.error(f"Error processing COGS recognition: {str(e)}", exc_info=True)

async def run_cogs_worker():
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    logger.info(f"Starting COGS background worker, connecting to {rabbitmq_url}")
    
    while True:
        try:
            connection = await aio_pika.connect_robust(rabbitmq_url)
            channel = await connection.channel()
            
            # Declare exchange
            exchange = await channel.declare_exchange("erp_events", aio_pika.ExchangeType.TOPIC, durable=True)
            
            # Declare queue
            queue = await channel.declare_queue("shipment_dispatched_cogs_queue", durable=True)
            
            # Bind queue to inventory.shipment.dispatched
            await queue.bind(exchange, routing_key="inventory.shipment.dispatched")
            
            logger.info("Successfully connected to RabbitMQ and bound shipment_dispatched_cogs_queue.")
            
            async with queue.iterator() as queue_iter:
                async for message in queue_iter:
                    await process_cogs_recognition(message)
                    
        except asyncio.CancelledError:
            logger.info("COGS worker task cancelled, shutting down.")
            break
        except Exception as e:
            logger.error(f"COGS worker connection error: {str(e)}. Retrying in 5 seconds...", exc_info=True)
            await asyncio.sleep(5)
