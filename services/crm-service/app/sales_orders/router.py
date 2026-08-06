from fastapi import APIRouter, Depends, HTTPException
from app import database, models
from app.sales_orders import schemas, crud
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_token_payload
from app.core.idgen import next_document_id
from sqlalchemy import select
import logging
import json
import aio_pika
from datetime import datetime

logger = logging.getLogger("app.sales_orders")

router = APIRouter(prefix="/api/sales-orders", tags=["sales-orders"])


def _build_so_check_items(so):
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


async def _publish_crm_order_approved(token_payload: dict, so, stock_result: dict):
    from app.core.amqp import get_exchange
    exchange = await get_exchange()
    if not exchange:
        return
    try:
        product_ids = {}
        for r in stock_result.get("items") or []:
            if r.get("sku"):
                product_ids[r["sku"]] = r.get("product_id")
            if r.get("product_name"):
                product_ids[r["product_name"]] = r.get("product_id")

        event_data = {
            "event": "crm.order.approved",
            "organization_id": token_payload.get("organization_id", 1),
            "sales_order_code": so.so_no,
            "customer_name": so.account,
            "value": so.value,
            "status": so.status,
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
            for item in _build_so_check_items(so)
        ]

        message = aio_pika.Message(
            body=json.dumps(event_data).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        )
        await exchange.publish(message, routing_key="crm.order.approved")
        logger.info(f"Published crm.order.approved for sales order {so.so_no}")
    except Exception as e:
        logger.error(f"Failed to publish crm.order.approved: {str(e)}", exc_info=True)


async def _publish_fulfillment_event(token_payload: dict, so, stock_result: dict):
    from app.core.amqp import get_exchange
    exchange = await get_exchange()
    if not exchange:
        return
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
        event_data = {
            "event": "inventory.order.fulfillment",
            "organization_id": token_payload.get("organization_id", 1),
            "sales_order_code": so.so_no,
            "customer_name": so.account,
            "value": so.value,
            "status": so.status,
            "warehouse_id": stock_result.get("warehouse_id"),
            "overall_available": stock_result.get("overall_available"),
            "items": items_payload,
            "timestamp": datetime.utcnow().isoformat(),
        }
        message = aio_pika.Message(
            body=json.dumps(event_data).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key="inventory.order.fulfillment")
        logger.info(f"Published inventory.order.fulfillment event for sales order {so.so_no}")
    except Exception as e:
        logger.error(f"Failed to publish inventory.order.fulfillment: {str(e)}", exc_info=True)


async def _check_stock_and_hold(token_payload: dict, so, db: AsyncSession) -> dict:
    from app.core.inventory_client import check_stock_availability
    token = token_payload.get("_raw_token", "")
    items = _build_so_check_items(so)
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
        await _publish_fulfillment_event(token_payload, so, stock_result)
    return {
        "available": available,
        "overall_available": stock_result.get("overall_available"),
        "warehouse_id": stock_result.get("warehouse_id"),
        "items": stock_result.get("items", []),
    }

@router.get("", response_model=schemas.SalesOrderManagementData)
async def get_sales_orders_data(db=Depends(database.get_db)):
    sales_orders = await crud.get_sales_orders(db)
    
    total = len(sales_orders)
    open_count = len([so for so in sales_orders if so.status in ['Pending', 'Confirmed']])
    at_risk = len([so for so in sales_orders if so.status == 'Cancelled'])
    owners_count = len(set(so.owner for so in sales_orders if so.owner)) or 1
    
    summary = {
        "total_orders": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "sales_orders": sales_orders
    }

@router.post("", response_model=schemas.SalesOrder)
async def create_sales_order(
    payload: dict,
    db: AsyncSession = Depends(database.get_db),
    token_payload: dict = Depends(get_current_token_payload)
):
    id_str = await next_document_id(db, models.SalesOrder, "SO")
    from sqlalchemy.inspection import inspect
    from sqlalchemy import String, Integer, Float, Boolean
    mapper = inspect(models.SalesOrder)

    filtered_payload = {}
    for k, v in payload.items():
        if k in mapper.columns and k not in ["id", "id_str"]:
            col_type = mapper.columns[k].type
            if v is None:
                filtered_payload[k] = None
            elif isinstance(col_type, String):
                filtered_payload[k] = str(v)
            elif isinstance(col_type, Integer):
                try:
                    filtered_payload[k] = int(v) if v != "" else None
                except (ValueError, TypeError):
                    filtered_payload[k] = v
            elif isinstance(col_type, Float):
                try:
                    filtered_payload[k] = float(v) if v != "" else None
                except (ValueError, TypeError):
                    filtered_payload[k] = v
            elif isinstance(col_type, Boolean):
                if isinstance(v, str):
                    filtered_payload[k] = v.lower() in ("true", "1", "yes")
                else:
                    filtered_payload[k] = bool(v)
            else:
                filtered_payload[k] = v

    filtered_payload["id_str"] = id_str
    if not filtered_payload.get("so_no"):
        filtered_payload["so_no"] = id_str
    if "line_items" in payload:
        filtered_payload["line_items"] = payload["line_items"]

    so = models.SalesOrder(**filtered_payload)
    db.add(so)
    await db.commit()
    await db.refresh(so)

    new_status = so.status
    approved_statuses = ("Confirmed", "Approved", "Paid", "Invoiced", "Delivered", "Done")
    if new_status in approved_statuses:
        # Immediate stock check against inventory-service before final approval.
        # On shortage the SO is placed on Stock Hold but is STILL ingested into inventory
        # fulfillment (SHORTAGE) so the auto-PO flow can procure the missing items.
        stock_result = await _check_stock_and_hold(token_payload, so, db)
        await _publish_crm_order_approved(token_payload, so, stock_result)

    return so

@router.put("/{id_str}")
async def update_sales_order(
    id_str: str,
    payload: dict,
    db: AsyncSession = Depends(database.get_db),
    token_payload: dict = Depends(get_current_token_payload)
):
    result = await db.execute(
        select(models.SalesOrder).filter(models.SalesOrder.id_str == id_str)
    )
    so = result.scalars().first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")

    old_status = so.status

    from sqlalchemy.inspection import inspect
    from sqlalchemy import String, Integer, Float, Boolean
    mapper = inspect(models.SalesOrder)

    for key, value in payload.items():
        if key in mapper.columns and key not in ["id", "id_str"]:
            col_type = mapper.columns[key].type
            if value is None:
                setattr(so, key, None)
            elif isinstance(col_type, String):
                setattr(so, key, str(value))
            elif isinstance(col_type, Integer):
                try:
                    setattr(so, key, int(value) if value != "" else None)
                except (ValueError, TypeError):
                    setattr(so, key, value)
            elif isinstance(col_type, Float):
                try:
                    setattr(so, key, float(value) if value != "" else None)
                except (ValueError, TypeError):
                    setattr(so, key, value)
            elif isinstance(col_type, Boolean):
                if isinstance(value, str):
                    setattr(so, key, value.lower() in ("true", "1", "yes"))
                else:
                    setattr(so, key, bool(value))
            else:
                setattr(so, key, value)

    await db.commit()
    await db.refresh(so)

    new_status = so.status
    approved_statuses = ("Confirmed", "Approved", "Paid", "Invoiced", "Delivered", "Done")
    if (new_status in approved_statuses) and (old_status not in approved_statuses):
        # Credit check only applies to credit-relevant approvals; paid/final orders are already settled.
        if new_status in ("Confirmed", "Approved"):
            # Synchronous credit check against billing-service before approving the SO
            from app.core.billing_client import credit_check
            try:
                try:
                    credit_amount = float(str(so.value).replace(",", "").strip())
                except Exception:
                    credit_amount = 0.0
                credit_result = await credit_check(
                    token_payload.get("_raw_token", ""),
                    client_name=so.account,
                    amount=credit_amount,
                )
            except Exception as e:
                logger.warning(f"Credit check unavailable, defaulting to approved: {str(e)}")
                credit_result = {"approved": True}

            if not credit_result.get("approved", False):
                so.status = "Hold"
                await db.commit()
                await db.refresh(so)
                logger.info(
                    f"Sales order {so.so_no} placed on Financial Hold: "
                    f"outstanding {credit_result.get('outstanding')} exceeds available credit "
                    f"({credit_result.get('available_credit')})."
                )
                return so

        # Immediate stock check against inventory-service before final approval.
        # On shortage the SO is placed on Stock Hold but is STILL ingested into inventory
        # fulfillment (SHORTAGE) so the auto-PO flow can procure the missing items.
        stock_result = await _check_stock_and_hold(token_payload, so, db)
        if not stock_result.get("available", True):
            logger.info(
                f"Sales order {so.so_no} placed on Stock Hold — inventory shortage detected; "
                f"ingesting into fulfillment for auto-procurement."
            )
        await _publish_crm_order_approved(token_payload, so, stock_result)

    return so


@router.post("/{id_str}/check-stock")
async def check_sales_order_stock(
    id_str: str,
    db: AsyncSession = Depends(database.get_db),
    token_payload: dict = Depends(get_current_token_payload),
):
    result = await db.execute(
        select(models.SalesOrder).filter(models.SalesOrder.id_str == id_str)
    )
    so = result.scalars().first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")

    from app.core.inventory_client import check_stock_availability
    token = token_payload.get("_raw_token", "")
    items = _build_so_check_items(so)
    try:
        stock_result = await check_stock_availability(token, items)
    except Exception as e:
        logger.warning(f"Stock check unavailable for {so.so_no}: {str(e)}")
        return {"available": True, "overall_available": True, "status": so.status, "items": []}

    available = bool(stock_result.get("overall_available", False))
    if not available:
        so.status = "Stock Hold"
        await db.commit()
        await db.refresh(so)
        await _publish_fulfillment_event(token_payload, so, stock_result)
        # Ingest into inventory fulfillment (SHORTAGE -> auto-PO) so procurement can begin.
        await _publish_crm_order_approved(token_payload, so, stock_result)

    return {
        "available": available,
        "overall_available": stock_result.get("overall_available"),
        "warehouse_id": stock_result.get("warehouse_id"),
        "status": so.status,
        "items": stock_result.get("items", []),
    }
