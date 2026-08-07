import asyncio
import json
import logging
from datetime import datetime, timezone

import aio_pika

from app.core.amqp import get_exchange

logger = logging.getLogger("app.core.events")

# Canonical routing keys for cross-module upward sync.
EVENT_ORDER_RESERVED = "inventory.order.reserved"
EVENT_ORDER_PICKING = "inventory.order.picking"
EVENT_ORDER_PACKED = "inventory.order.packed"
EVENT_ORDER_FULFILLED = "inventory.order.fulfilled"
EVENT_SHIPMENT_DISPATCHED = "inventory.shipment.dispatched"
EVENT_PO_CREATED = "inventory.po.created"
EVENT_PO_APPROVED = "inventory.po.approved"
EVENT_PO_RECEIVED = "inventory.po.received"
EVENT_STOCK_ADJUSTED = "inventory.stock.adjusted"
EVENT_STOCK_SHORTAGE = "inventory.order.shortage"
EVENT_SERIAL_UPDATED = "inventory.serial.updated"
EVENT_SUPPLIER_STATUS = "inventory.supplier.status_changed"


async def _do_publish(routing_key: str, payload: dict) -> None:
    try:
        exchange = await get_exchange()
        if not exchange:
            logger.warning(f"AMQP exchange unavailable; dropping event {routing_key}")
            return
        message = aio_pika.Message(
            body=json.dumps(payload).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key=routing_key)
        logger.info(f"Published event {routing_key}")
    except Exception as e:
        logger.error(f"Failed to publish event {routing_key}: {str(e)}", exc_info=True)


def publish_event(routing_key: str, **payload: object) -> None:
    """Fire-and-forget publish so the emitting DB transaction is never blocked.

    The task is spawned on the running loop; if no loop is running the publish
    is attempted inline so events are never silently lost in CLI contexts.
    """
    event_payload = {
        "event": routing_key,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    try:
        asyncio.get_running_loop().create_task(_do_publish(routing_key, event_payload))
    except RuntimeError:
        asyncio.run(_do_publish(routing_key, event_payload))
