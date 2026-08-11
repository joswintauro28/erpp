"""Shared Sales Order lifecycle pipeline.

Centralizes the cross-service steps that run whenever a sales order enters an
approved status (credit check -> stock check -> publish `crm.order.approved`)
or is cancelled (publish `crm.order.cancelled` so inventory releases stock and
cancels auto-POs). Used by the dedicated sales-orders router, the quotation
-> sales-order conversion, and the generic entity CRUD in main.py.
"""
import json
import logging
from datetime import datetime

import aio_pika
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.amqp import get_exchange

logger = logging.getLogger("app.sales_orders.pipeline")

# Statuses that trigger the inventory fulfillment pipeline.
SO_APPROVED_STATUSES = ("Confirmed", "Approved", "Paid", "Invoiced", "Delivered", "Done")

# Statuses that require a fresh credit check before final approval.
SO_CREDIT_CHECK_STATUSES = ("Confirmed", "Approved")

EVENT_ORDER_APPROVED = "crm.order.approved"
EVENT_ORDER_CANCELLED = "crm.order.cancelled"
EVENT_FULFILLMENT_STATUS = "inventory.order.fulfillment"


def build_so_check_items(so) -> list[dict]:
    """Build the [{product_name, sku, quantity, unit_price}] payload used for
    the inventory ATP check and for the items shipped with crm.order.approved."""
    line_items = so.line_items
    if isinstance(line_items, str):
        try:
            line_items = json.loads(line_items)
        except Exception:
            line_items = None
    line_items = line_items or []
    if line_items:
        return [
            {
                "product_name": item.get("product_name") or "Standard Consulting Package",
                "sku": item.get("sku") or "SCP-CRM",
                "quantity": int(item.get("quantity") or item.get("ordered_quantity") or 1),
                "unit_price": float(item.get("unit_price") or 0.0),
            }
            for item in line_items
            if item.get("product_name") or item.get("sku")
        ]
    try:
        val_float = float(str(so.value).replace(",", "").strip())
    except Exception:
        val_float = 0.0
    return [
        {
            "product_name": "Standard Consulting Package",
            "sku": "SCP-CRM",
            "quantity": 1,
            "unit_price": val_float,
        }
    ]


async def _publish(routing_key: str, event_data: dict) -> None:
    exchange = await get_exchange()
    if not exchange:
        return
    try:
        message = aio_pika.Message(
            body=json.dumps(event_data).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key=routing_key)
        logger.info(f"Published {routing_key} for sales order {event_data.get('sales_order_code')}")
    except Exception as e:
        logger.error(f"Failed to publish {routing_key}: {str(e)}", exc_info=True)


async def publish_crm_order_approved(token_payload: dict, so, stock_result: dict) -> None:
    try:
        product_ids = {}
        for r in stock_result.get("items") or []:
            if r.get("sku"):
                product_ids[r["sku"]] = r.get("product_id")
            if r.get("product_name"):
                product_ids[r["product_name"]] = r.get("product_id")

        event_data = {
            "event": EVENT_ORDER_APPROVED,
            "organization_id": token_payload.get("organization_id", 1),
            "sales_order_code": so.so_no,
            "so_id": so.id,
            "customer_name": so.account,
            # Sales rep that owns this order — forwarded to inventory and used
            # by the notification channel to target the dispatch notification.
            "sales_owner": getattr(so, "owner", None) or None,
            "value": so.value,
            "status": so.status,
            "warehouse_id": stock_result.get("warehouse_id"),
            "timestamp": datetime.utcnow().isoformat(),
        }
        event_data["items"] = [
            {
                "product_id": product_ids.get(item.get("sku")) or product_ids.get(item.get("product_name")),
                "product_name": item["product_name"],
                "sku": item["sku"],
                "ordered_quantity": item["quantity"],
                "unit_price": item["unit_price"],
            }
            for item in build_so_check_items(so)
        ]
        await _publish(EVENT_ORDER_APPROVED, event_data)
    except Exception as e:
        logger.error(f"Failed to publish crm.order.approved: {str(e)}", exc_info=True)


async def publish_fulfillment_event(token_payload: dict, so, stock_result: dict) -> None:
    """Publish the shortage summary in the shared envelope the notifications
    consumer expects: {event, organization_id, payload, timestamp}."""
    try:
        items_payload = []
        for item in stock_result.get("items", []):
            items_payload.append({
                "product_id": item.get("product_id"),
                "product_name": item.get("product_name"),
                "sku": item.get("sku"),
                "requested_quantity": item.get("requested_quantity"),
                "available_quantity": item.get("available_quantity"),
                "is_available": item.get("is_available"),
            })
        payload = {
            "sales_order_code": so.so_no,
            "customer_name": so.account,
            "value": so.value,
            "status": so.status,
            "warehouse_id": stock_result.get("warehouse_id"),
            "overall_available": stock_result.get("overall_available"),
            "items": items_payload,
        }
        event_data = {
            "event": EVENT_FULFILLMENT_STATUS,
            "organization_id": token_payload.get("organization_id", 1),
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat(),
        }
        await _publish(EVENT_FULFILLMENT_STATUS, event_data)
    except Exception as e:
        logger.error(f"Failed to publish inventory.order.fulfillment: {str(e)}", exc_info=True)


async def check_stock_and_hold(token_payload: dict, so, db: AsyncSession) -> dict:
    """Run the inventory ATP check synchronously. On shortage the SO is placed
    on Stock Hold but is STILL ingested into fulfillment (SHORTAGE) so the
    auto-PO flow can procure the missing items."""
    from app.core.inventory_client import check_stock_availability
    token = token_payload.get("_raw_token", "")
    items = build_so_check_items(so)
    try:
        stock_result = await check_stock_availability(token, items)
    except Exception as e:
        logger.warning(f"Stock check unavailable, defaulting to available: {str(e)}")
        return {"available": True, "overall_available": True, "warehouse_id": None, "items": []}

    available = bool(stock_result.get("overall_available", False))
    if not available:
        so.status = "Stock Hold"
        await db.commit()
        await db.refresh(so)
        await publish_fulfillment_event(token_payload, so, stock_result)
    return {
        "available": available,
        "overall_available": stock_result.get("overall_available"),
        "warehouse_id": stock_result.get("warehouse_id"),
        "items": stock_result.get("items", []),
    }


async def finalize_approved_sales_order(db: AsyncSession, so, token_payload: dict) -> dict:
    """Run the full approval lifecycle for an SO that entered an approved status:

    1. Credit check against billing-service (Confirmed/Approved only). On failure
       the SO is placed on Financial Hold and NOT published to inventory.
    2. Stock check against inventory-service. On shortage the SO is placed on
       Stock Hold but still ingested (SHORTAGE -> auto-PO).
    3. Publish crm.order.approved so inventory creates the fulfillment.
    """
    from datetime import datetime

    if so.status in SO_CREDIT_CHECK_STATUSES:
        from app.core.billing_client import credit_check
        from app.customers.models import Customer
        from sqlalchemy import select as sa_select

        # ERP convention: resolve the customer's configured credit limit. A
        # missing/zero limit means unlimited credit — we pass nothing and
        # billing fail-opens instead of applying an arbitrary default.
        credit_limit = None
        try:
            cust_res = await db.execute(
                sa_select(Customer).filter(Customer.account == so.account)
            )
            customer = cust_res.scalars().first()
            if customer is not None and customer.credit_limit is not None:
                credit_limit = float(customer.credit_limit)
                if credit_limit <= 0:
                    credit_limit = None
        except Exception as e:
            logger.warning(f"Could not resolve credit limit for {so.account}: {str(e)}")

        credit_detail = {"status": "Not Checked"}
        try:
            try:
                credit_amount = float(str(so.value).replace(",", "").strip())
            except Exception:
                credit_amount = 0.0
            credit_result = await credit_check(
                token_payload.get("_raw_token", ""),
                client_name=so.account,
                amount=credit_amount,
                credit_limit=credit_limit,
            )
            credit_detail = {
                "status": "approved" if credit_result.get("approved") else "rejected",
                "approved": credit_result.get("approved"),
                "outstanding": credit_result.get("outstanding"),
                "credit_limit": credit_result.get("credit_limit"),
                "available_credit": credit_result.get("available_credit"),
                "over_limit_amount": credit_result.get("over_limit_amount"),
                "unlimited": credit_result.get("unlimited"),
                "amount": credit_amount,
                "checked_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
            }
        except Exception as e:
            logger.warning(f"Credit check unavailable, defaulting to approved: {str(e)}")
            credit_result = {"approved": True}
            credit_detail = {
                "status": "unavailable-fail-open",
                "approved": True,
                "error": str(e),
                "checked_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
            }

        if not credit_result.get("approved", False):
            so.status = "Hold"
            so.credit_check_status = "Rejected"
            so.credit_check_detail = credit_detail
            so.approval_status = "Pending"
            await db.commit()
            await db.refresh(so)
            logger.info(
                f"Sales order {so.so_no} placed on Financial Hold: "
                f"outstanding {credit_result.get('outstanding')} exceeds available credit "
                f"({credit_result.get('available_credit')})."
            )
            return {
                "approved": False,
                "reason": "credit",
                "credit": credit_detail,
            }

        so.credit_check_status = "Approved"
        so.credit_check_detail = credit_detail

    stock_result = await check_stock_and_hold(token_payload, so, db)
    so.approval_status = "Approved"
    so.approved_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    if so.credit_check_status in (None, "Not Checked"):
        so.credit_check_status = "Not Checked"
    await db.commit()
    await db.refresh(so)
    await publish_crm_order_approved(token_payload, so, stock_result)
    return {"approved": True, "credit": getattr(so, "credit_check_detail", None)}



async def publish_sales_order_cancelled(token_payload: dict, so) -> None:
    """Notify inventory that the SO was cancelled so it can cancel the linked
    fulfillment, release reserved stock, and cancel any auto-created POs."""
    event_data = {
        "event": EVENT_ORDER_CANCELLED,
        "organization_id": token_payload.get("organization_id", 1),
        "sales_order_code": so.so_no,
        "customer_name": so.account,
        "status": so.status,
        "timestamp": datetime.utcnow().isoformat(),
        "items": build_so_check_items(so),
    }
    await _publish(EVENT_ORDER_CANCELLED, event_data)
