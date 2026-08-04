import asyncio
import json
import logging
import os
import aio_pika

logger = logging.getLogger("app.notifications_consumer")

# Global list to store recent alerts in memory
recent_alerts = []

async def process_notification(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            event = body.get("event")
            payload = body.get("payload", {})
            timestamp = body.get("timestamp")
            
            logger.info(f"Received notification event: {event} with payload: {payload}")
            
            # Format alert message for dialog output
            alert_message = ""
            if event == "billing.invoice.sent":
                invoice_number = payload.get("invoiceNumber") or payload.get("invoice_number")
                client = payload.get("clientName") or payload.get("client_name") or "Client"
                total = payload.get("total")
                alert_message = f"Invoice {invoice_number} sent to {client} (Amount: {total})."
            elif event == "billing.invoice.overdue":
                invoice_number = payload.get("invoiceNumber") or payload.get("invoice_number")
                alert_message = f"Invoice {invoice_number} is OVERDUE! Please send a reminder."
            elif event == "billing.invoice.paid":
                invoice_number = payload.get("invoiceNumber") or payload.get("invoice_number")
                client = payload.get("clientName") or payload.get("client_name") or "Client"
                amount = payload.get("amount")
                alert_message = f"Payment received for invoice {invoice_number} from {client} (Amount: {amount})."
            elif event == "crm.quotation.sent":
                quote_number = payload.get("quotationNumber") or payload.get("quotation_number")
                client = payload.get("clientName") or payload.get("client_name") or "Client"
                alert_message = f"Quotation {quote_number} sent to {client}."
            elif event == "inventory.order.fulfillment":
                sales_order_code = payload.get("sales_order_code") or payload.get("sales_order_code")
                customer = payload.get("customer_name") or "Customer"
                shortage = [i for i in (payload.get("items") or []) if not i.get("is_available", True)]
                missing_count = len(shortage)
                alert_message = (
                    f"Sales order {sales_order_code} for {customer} has insufficient stock "
                    f"({missing_count} item(s) short) — inventory action required."
                )
            else:
                alert_message = f"Notification Event: {event} - {payload}"
            
            logger.info(f"Formatted Alert: {alert_message}")
            
            # Add to memory cache
            alert_data = {
                "event": event,
                "payload": payload,
                "message": alert_message,
                "timestamp": timestamp or str(asyncio.get_event_loop().time())
            }
            recent_alerts.append(alert_data)
            # Keep only the 100 most recent alerts
            if len(recent_alerts) > 100:
                recent_alerts.pop(0)
                
        except Exception as e:
            logger.error(f"Error parsing notification event: {str(e)}", exc_info=True)

async def run_notifications_worker():
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    logger.info(f"Starting Notifications background worker, connecting to {rabbitmq_url}")
    
    while True:
        try:
            connection = await aio_pika.connect_robust(rabbitmq_url)
            channel = await connection.channel()
            
            # Declare exchange
            exchange = await channel.declare_exchange("erp_events", aio_pika.ExchangeType.TOPIC, durable=True)
            
            # Declare queue
            queue = await channel.declare_queue("unified_notifications_queue", durable=True)
            
            # Bind routing keys
            await queue.bind(exchange, routing_key="billing.invoice.sent")
            await queue.bind(exchange, routing_key="billing.invoice.overdue")
            await queue.bind(exchange, routing_key="billing.invoice.paid")
            await queue.bind(exchange, routing_key="crm.quotation.sent")
            await queue.bind(exchange, routing_key="inventory.order.fulfillment")
            
            logger.info("Successfully connected to RabbitMQ and bound unified_notifications_queue routing keys.")
            
            async with queue.iterator() as queue_iter:
                async for message in queue_iter:
                    await process_notification(message)
                    
        except asyncio.CancelledError:
            logger.info("Notifications worker task cancelled, shutting down.")
            break
        except Exception as e:
            logger.error(f"Notifications worker error occurred: {str(e)}. Retrying in 5 seconds...", exc_info=True)
            await asyncio.sleep(5)
