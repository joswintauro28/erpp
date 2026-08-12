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

# ---------------------------------------------------------------------------
# Role-based notification matrix (source of truth for the notification
# channel). Audience is expressed in terms of IAM ROLE NAMES (as seeded in
# core-iam) plus optional ENTITY-OWNERSHIP targeting:
#
#   targets[].roles  -> one row per role; any user whose JWT role matches
#                       receives it. The Organization Owner sees EVERY
#                       role-targeted row (super-role bypass, mirrored in the
#                       store + WS gateway).
#   targets[].owner  -> a payload field name (e.g. "sales_owner") holding the
#                       display name/email of the specific user who owns the
#                       entity; a private row is created for them.
#
# Each target may carry its own type/title/message so the same event can say
# "ATP allocation required" to Inventory and "approved, sent to fulfillment"
# to the owning sales rep.
#
# Role names MUST match core-iam seed: Organization Owner, Accountant, Sales
# Executive, Inventory Manager, Auditor, Employee.
# ---------------------------------------------------------------------------
ROLE_MATRIX: dict[str, dict] = {
    # O1/O4: SO approved in CRM -> inventory must allocate stock; the owning
    # sales rep gets a FYI that the order moved to fulfillment.
    "crm.order.approved": {
        "module_source": "CRM",
        "targets": [
            {
                "roles": ["Inventory Manager"],
                "type": "ACTION",
                "title": "New Sales Order Approved",
                "message": "New Sales Order {code} approved — ATP allocation required.",
            },
            {
                "owner": "sales_owner",
                "type": "SUCCESS",
                "title": "Sales Order Approved",
                "message": "Sales Order {code} approved and sent to fulfillment.",
            },
        ],
    },
    # O3: order placed on Hold (credit check failed / stock unavailable). The
    # owning sales rep must contact the client; accounting tracks exposure.
    "crm.order.held": {
        "module_source": "CRM",
        "targets": [
            {
                "roles": ["Accountant"],
                "type": "WARNING",
                "title": "Sales Order On Hold",
                "message": "Sales Order {code} placed on {reason} — credit exposure or stock review required.",
            },
            {
                "owner": "sales_owner",
                "type": "ERROR",
                "title": "Sales Order On Hold",
                "message": "Sales Order {code} placed on {reason}. Contact the client for prepayment or renegotiation.",
            },
        ],
    },
    # S5/S6: CPQ quote over discount threshold -> manager approval required.
    "crm.quotation.pending_approval": {
        "module_source": "CRM",
        "targets": [
            {
                "roles": ["Organization Owner"],
                "type": "ACTION",
                "title": "Quotation Requires Approval",
                "message": "Quote {code} requires approval ({reason} discount).",
            },
        ],
    },
    # O4 -> I1/I5: stock reserved for the approved SO (order fulfilment pipeline).
    "inventory.order.reserved": {
        "module_source": "INVENTORY",
        "targets": [
            {
                "roles": ["Inventory Manager"],
                "type": "SUCCESS",
                "title": "Stock Reserved",
                "message": "Stock reserved for Sales Order {code} ({count} item(s)) — ready for picking.",
            },
        ],
    },
    # I2 -> No: ATP shortage triggered -> procurement action required.
    "inventory.order.shortage": {
        "module_source": "INVENTORY",
        "targets": [
            {
                "roles": ["Inventory Manager"],
                "type": "WARNING",
                "title": "Stock Shortage",
                "message": "Sales Order {code} is short {count} item(s) — procurement action required.",
            },
        ],
    },
    # I10 -> A1: order completed, billing invoice auto-generated -> accounting.
    "inventory.order.fulfilled": {
        "module_source": "INVENTORY",
        "targets": [
            {
                "roles": ["Accountant"],
                "type": "SUCCESS",
                "title": "Order Completed & Invoiced",
                "message": "Sales Order {code} fulfilled — invoice auto-generated for billing.",
            },
        ],
    },
    # I10 dispatch: notify the owning sales rep (client follow-up) + the
    # inventory team that shipped it.
    "inventory.shipment.dispatched": {
        "module_source": "INVENTORY",
        "targets": [
            {
                "roles": ["Inventory Manager"],
                "type": "SUCCESS",
                "title": "Order Dispatched",
                "message": "Order {code} has been dispatched.",
            },
            {
                "owner": "sales_owner",
                "type": "SUCCESS",
                "title": "Order Dispatched",
                "message": "Order {code} has been dispatched to the client — notify them of delivery.",
            },
        ],
    },
    # A1/A3: invoice issued -> accounting stakeholders.
    "billing.invoice.sent": {
        "module_source": "BILLING",
        "targets": [
            {
                "roles": ["Accountant"],
                "type": "INFO",
                "title": "Invoice Issued",
                "message": "Invoice {code} sent to customer.",
            },
        ],
    },
    # A5/A7: payment clears -> accounting reconciles.
    "billing.invoice.paid": {
        "module_source": "BILLING",
        "targets": [
            {
                "roles": ["Accountant"],
                "type": "SUCCESS",
                "title": "Payment Received",
                "message": "Payment received for Invoice {code} — reconcile the bank statement.",
            },
        ],
    },
    # A6: invoice overdue -> accounting triggers dunning; sales follows up.
    "billing.invoice.overdue": {
        "module_source": "BILLING",
        "targets": [
            {
                "roles": ["Accountant", "Auditor"],
                "type": "WARNING",
                "title": "Invoice Overdue",
                "message": "Invoice {code} is overdue — trigger dunning / follow up with the client.",
            },
        ],
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

    One row is created per audience: one per role (any user whose JWT role
    matches receives it — the Organization Owner sees every role row via the
    super-role bypass) plus one private row per owner-target (e.g. the
    specific sales rep named in `sales_owner`).
    """
    entry = ROLE_MATRIX.get(event)
    if not entry:
        return

    organization_id = int(_get(body, "organization_id", "organizationId", default=1) or 1)
    code = str(
        _get(
            body,
            "sales_order_code",
            "salesOrderCode",
            "invoice_number",
            "invoiceNumber",
            "quotation_number",
            "quotationNumber",
            default="",
        )
        or ""
    )
    items = _get(body, "items", default=[])
    count = len(items) if isinstance(items, list) else 0
    reason = str(_get(body, "reason", default="hold") or "hold")
    discount_pct = _get(body, "discount_pct", default=None)
    if discount_pct is not None:
        reason = f"{discount_pct}%"

    from app.core.database import async_session_factory
    from app.notification.services import NotificationStore

    created = []
    for target in entry.get("targets") or []:
        base_kwargs: dict = {
            "organization_id": organization_id,
            "type": target.get("type", "INFO"),
            "module_source": entry.get("module_source", "SYSTEM"),
            "title": target["title"],
            "message": target["message"].format(code=code, count=count, reason=reason),
            "event": event,
            "entity_ref": code or None,
        }

        # Role-targeted row(s): one per role so read state stays per-audience.
        for role in target.get("roles") or []:
            async with async_session_factory() as db:
                store = NotificationStore(db)
                n = await store.create(NotificationCreate(**{**base_kwargs, "role": role}))
                await db.commit()
                created.append(n)

        # Owner-targeted row: private to the specific user named in the payload
        # field (e.g. sales_owner = "Maya Patel" -> matched by JWT name/email).
        owner_field = target.get("owner")
        if owner_field:
            owner = _get(body, owner_field, default="")
            if owner:
                async with async_session_factory() as db:
                    store = NotificationStore(db)
                    n = await store.create(NotificationCreate(**{**base_kwargs, "target_name": str(owner)}))
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
    targets = [n.role or n.target_name or n.permission or n.user_id for n in created]
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

            # Persist + live-broadcast any event with a matrix entry.
            if event in ROLE_MATRIX:
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
            await queue.bind(exchange, routing_key="crm.order.held")
            await queue.bind(exchange, routing_key="crm.quotation.pending_approval")
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
