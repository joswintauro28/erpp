import asyncio
import json
import logging
import os
import aio_pika

from app.notification.schemas import NotificationCreate
from app.notification.websocket import push_live_notification

logger = logging.getLogger("app.notifications_consumer")

# Global list to store recent alerts in memory (legacy alert feed)
recent_alerts = []

# Map routing key -> notification template. Audience is permission-driven:
#   permissions    -> one row per permission code; anyone whose JWT holds any of
#                     the codes receives it (e.g. stock.view reaches Inventory
#                     Manager + Organization Owner/admin, exactly the IAM model)
#   name_field     -> a row private to the specific user (matched by name/email)
#   fallback_permission -> shared visibility row on top of the private row
# Each entry yields (type, module_source, title_template, message_template).
EVENT_TEMPLATES: dict[str, dict] = {
    # O1/O4: SO approved in CRM -> inventory must allocate stock.
    "crm.order.approved": {
        "type": "INFO",
        "module_source": "CRM",
        "title": "New Sales Order Approved",
        "message": "New Sales Order {code} requires stock allocation.",
        "permissions": ["stock.view"],  # Inventory Manager + admin
    },
    # O4 -> I1/I5: stock reserved for the approved SO (order fulfilment pipeline).
    "inventory.order.reserved": {
        "type": "SUCCESS",
        "module_source": "INVENTORY",
        "title": "Stock Reserved",
        "message": "Stock reserved for Sales Order {code} ({count} item(s)) — ready for picking.",
        "permissions": ["stock.view"],  # Inventory Manager + admin
    },
    # I2 -> No: ATP shortage triggered -> procurement action required.
    "inventory.order.shortage": {
        "type": "WARNING",
        "module_source": "INVENTORY",
        "title": "Stock Shortage",
        "message": "Sales Order {code} is short {count} item(s) — procurement action required.",
        "permissions": ["stock.manage"],  # Inventory/procurement managers + admin
    },
    # I10 -> A1: order completed, billing invoice auto-generated.
    "inventory.order.fulfilled": {
        "type": "SUCCESS",
        "module_source": "INVENTORY",
        "title": "Order Completed & Invoiced",
        "message": "Sales Order {code} fulfilled — invoice auto-generated for billing.",
        "permissions": ["invoices.view"],  # Accountant + Auditor + admin
    },
    # I10 dispatch: notify the specific sales rep, plus everyone with stock
    # visibility (the team that picked/packed/dispatched it).
    "inventory.shipment.dispatched": {
        "type": "SUCCESS",
        "module_source": "INVENTORY",
        "title": "Order Dispatched",
        "message": "Order {code} has been dispatched.",
        "name_field": "sales_owner",  # specific sales rep from the CRM order
        "fallback_permission": "stock.view",
    },
    # A1/A3: invoice issued -> billing stakeholders.
    "billing.invoice.sent": {
        "type": "INFO",
        "module_source": "BILLING",
        "title": "Invoice Issued",
        "message": "Invoice {code} sent to customer.",
        "permissions": ["invoices.view"],  # Accountant + Auditor + admin
    },
    # A5/A7: payment clears -> accounting stakeholders.
    "billing.invoice.paid": {
        "type": "SUCCESS",
        "module_source": "BILLING",
        "title": "Payment Received",
        "message": "Payment received for Invoice {code}.",
        "permissions": ["payments.view"],  # Accountant + Auditor + admin
    },
}


def _get(body: dict, *keys, default=None):
    """Read a field tolerating both flat payloads and {payload:{...}} envelopes."""
    for key in keys:
        for candidate in (body, body.get("payload") or {}):
            if isinstance(candidate, dict) and candidate.get(key) is not None:
                return candidate[key]
    return default


async def _persist_and_broadcast(event: str, body: dict, alert_message: str) -> None:
    """Persist Notification rows and push them live to matching sockets.

    One row is created per audience (permission code / specific user) so each
    keeps its own read state. A user holding any of the targeted permission
    codes — e.g. the admin (Organization Owner holds all codes), the Inventory
    Manager (stock.view), or the Accountant (invoices.view) — receives it.
    """
    template = EVENT_TEMPLATES.get(event)
    if not template:
        return

    organization_id = int(_get(body, "organization_id", "organizationId", default=1) or 1)
    code = str(
        _get(body, "sales_order_code", "salesOrderCode", "invoice_number", "invoiceNumber", "quotation_number", default="") or ""
    )
    items = _get(body, "items", default=[])
    count = len(items) if isinstance(items, list) else 0

    base_kwargs: dict = {
        "organization_id": organization_id,
        "type": template["type"],
        "module_source": template["module_source"],
        "title": template["title"],
        "message": template["message"].format(code=code, count=count),
        "event": event,
        "entity_ref": code or None,
    }

    from app.core.database import async_session_factory
    from app.notification.services import NotificationStore

    created = []

    # Permission-targeted audience: one row per code so read state stays
    # per-audience. Everyone whose JWT permissions contain the code matches.
    for perm in template.get("permissions") or []:
        async with async_session_factory() as db:
            store = NotificationStore(db)
            n = await store.create(NotificationCreate(**{**base_kwargs, "permission": perm}))
            await db.commit()
            created.append(n)

    # Name-targeted row(s): e.g. dispatched -> the specific sales rep, plus a
    # fallback permission row so the whole inventory team stays in the loop.
    if template.get("name_field"):
        owner = _get(body, template["name_field"], default="")
        if owner:
            async with async_session_factory() as db:
                store = NotificationStore(db)
                n = await store.create(NotificationCreate(**{**base_kwargs, "target_name": str(owner)}))
                await db.commit()
                created.append(n)
        fallback = template.get("fallback_permission")
        if fallback and fallback not in (template.get("permissions") or []):
            async with async_session_factory() as db:
                store = NotificationStore(db)
                n = await store.create(NotificationCreate(**{**base_kwargs, "permission": fallback}))
                await db.commit()
                created.append(n)

    if not created:
        logger.warning(f"No targets for {event} — skipping persistence")
        return

    delivered = 0
    for n in created:
        notification = {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "module_source": n.module_source,
            "entity_ref": n.entity_ref,
            "user_id": n.user_id,
            "role": n.role,
            "permission": n.permission,
            "target_name": n.target_name,
            "read_status": False,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        delivered += await push_live_notification(notification)
    targets = [n.permission or n.target_name or n.role or n.user_id for n in created]
    logger.info(
        f"Persisted + broadcast {event} → {len(created)} row(s) {targets} "
        f"(delivered={delivered}) — {alert_message}"
    )


async def process_notification(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            event = body.get("event")
            payload = body.get("payload", {})
            timestamp = body.get("timestamp")

            logger.info(f"Received notification event: {event} with payload: {payload}")

            # Format alert message for legacy dialog output
            alert_message = ""
            if event == "billing.invoice.sent":
                invoice_number = _get(body, "invoiceNumber", "invoice_number")
                client = _get(body, "clientName", "client_name", default="Client")
                total = _get(body, "total")
                alert_message = f"Invoice {invoice_number} sent to {client} (Amount: {total})."
            elif event == "billing.invoice.overdue":
                invoice_number = _get(body, "invoiceNumber", "invoice_number")
                alert_message = f"Invoice {invoice_number} is OVERDUE! Please send a reminder."
            elif event == "billing.invoice.paid":
                invoice_number = _get(body, "invoiceNumber", "invoice_number")
                client = _get(body, "clientName", "client_name", default="Client")
                amount = _get(body, "amount")
                alert_message = f"Payment received for invoice {invoice_number} from {client} (Amount: {amount})."
            elif event == "crm.quotation.sent":
                quote_number = _get(body, "quotationNumber", "quotation_number")
                client = _get(body, "clientName", "client_name", default="Client")
                alert_message = f"Quotation {quote_number} sent to {client}."
            elif event == "inventory.order.fulfillment":
                sales_order_code = _get(body, "sales_order_code", default="")
                customer = _get(body, "customer_name", default="Customer")
                shortage = [i for i in (payload.get("items") or []) if not i.get("is_available", True)]
                missing_count = len(shortage)
                alert_message = (
                    f"Sales order {sales_order_code} for {customer} has insufficient stock "
                    f"({missing_count} item(s) short) — inventory action required."
                )
            else:
                alert_message = f"Notification Event: {event} - {payload}"

            logger.info(f"Formatted Alert: {alert_message}")

            # Add to memory cache (legacy alert feed)
            alert_data = {
                "event": event,
                "payload": payload,
                "message": alert_message,
                "timestamp": timestamp or str(asyncio.get_event_loop().time()),
            }
            recent_alerts.append(alert_data)
            if len(recent_alerts) > 100:
                recent_alerts.pop(0)

            # Persist + live-broadcast any event with a notification template.
            if event in EVENT_TEMPLATES:
                await _persist_and_broadcast(event, body, alert_message)

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
            # Live notification triggers — order fulfilment pipeline
            # (O1: approved -> I5: stock reserved -> I2: shortage -> I10: dispatched -> A1: invoiced)
            await queue.bind(exchange, routing_key="crm.order.approved")
            await queue.bind(exchange, routing_key="inventory.order.reserved")
            await queue.bind(exchange, routing_key="inventory.order.shortage")
            await queue.bind(exchange, routing_key="inventory.order.fulfilled")
            await queue.bind(exchange, routing_key="inventory.shipment.dispatched")

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
