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

# Map routing key -> notification template. Targets:
#   role        -> broadcast to every socket whose JWT role matches
#   target_name -> broadcast to the socket whose email/full_name matches
# Each entry yields (type, module_source, title_template, message_template).
EVENT_TEMPLATES: dict[str, dict] = {
    "crm.order.approved": {
        "type": "INFO",
        "module_source": "CRM",
        "title": "New Sales Order Approved",
        "message": "New Sales Order {code} requires stock allocation.",
        "role": "Inventory Manager",
    },
    "inventory.shipment.dispatched": {
        "type": "SUCCESS",
        "module_source": "INVENTORY",
        "title": "Order Dispatched",
        "message": "Order {code} has been dispatched.",
        "name_field": "sales_owner",  # specific sales rep from the CRM order
        "fallback_role": "Sales Executive",
    },
    "billing.invoice.paid": {
        "type": "SUCCESS",
        "module_source": "BILLING",
        "title": "Payment Received",
        "message": "Payment received for Invoice {code}.",
        "roles": ["Accountant", "Sales Executive", "Organization Owner"],
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
    """Persist a Notification row and push it live to matching sockets."""
    template = EVENT_TEMPLATES.get(event)
    if not template:
        return

    organization_id = int(_get(body, "organization_id", "organizationId", default=1) or 1)
    code = str(
        _get(body, "sales_order_code", "salesOrderCode", "invoice_number", "invoiceNumber", "quotation_number", default="") or ""
    )

    # Pick the single target field used by this template.
    create_kwargs: dict = {
        "organization_id": organization_id,
        "type": template["type"],
        "module_source": template["module_source"],
        "title": template["title"],
        "message": template["message"].format(code=code),
        "event": event,
        "entity_ref": code or None,
    }

    if template.get("role"):
        create_kwargs["role"] = template["role"]
    elif template.get("roles"):
        # One row per stakeholder role so each keeps its own read state.
        from app.core.database import async_session_factory
        from app.notification.services import NotificationStore

        created = []
        for role in template["roles"]:
            async with async_session_factory() as db:
                store = NotificationStore(db)
                n = await store.create(NotificationCreate(**{**create_kwargs, "role": role}))
                await db.commit()
                created.append(n)
        # Broadcast once per role (dedupe: a user with multiple roles gets one push).
        from app.notification.websocket import manager
        for n in created:
            await manager.broadcast_payload(
                {
                    "event": "notification.created",
                    "notification": {
                        "id": n.id,
                        "title": n.title,
                        "message": n.message,
                        "type": n.type,
                        "module_source": n.module_source,
                        "entity_ref": n.entity_ref,
                        "role": n.role,
                        "read_status": False,
                        "created_at": n.created_at.isoformat() if n.created_at else None,
                    },
                },
                role=n.role,
            )
        logger.info(f"Persisted + broadcast {event} → roles {template['roles']} ({alert_message})")
        return

    # Name-targeted template (e.g. dispatched → specific sales rep).
    # Always attach the fallback role too: JWTs carry the user's email, not
    # their display name, so the rep is reached via the role even when the
    # name match misses. The name is kept for precise targeting on top.
    if template.get("name_field"):
        owner = _get(body, template["name_field"], default="")
        if owner:
            create_kwargs["target_name"] = str(owner)
        create_kwargs["role"] = template.get("fallback_role", "Sales Executive")

    from app.core.database import async_session_factory
    from app.notification.services import NotificationStore

    async with async_session_factory() as db:
        store = NotificationStore(db)
        n = await store.create(NotificationCreate(**create_kwargs))
        await db.commit()
        notification = {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "module_source": n.module_source,
            "entity_ref": n.entity_ref,
            "user_id": n.user_id,
            "role": n.role,
            "target_name": n.target_name,
            "read_status": False,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
    delivered = await push_live_notification(notification)
    logger.info(
        f"Persisted + broadcast {event} → "
        f"{n.role or n.target_name or n.user_id} (delivered={delivered}) — {alert_message}"
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

            # Persist + live-broadcast the three cross-module trigger events.
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
            # Live notification triggers
            await queue.bind(exchange, routing_key="crm.order.approved")
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
