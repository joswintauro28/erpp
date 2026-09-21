from fastapi import APIRouter, Depends, HTTPException
from app import database, models
from app.sales_orders import schemas, crud
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_token_payload
from app.core.idgen import next_document_id
from sqlalchemy import select
import logging

from app.sales_orders.pipeline import (
    SO_APPROVED_STATUSES,
    build_so_check_items,
    finalize_approved_sales_order,
    publish_crm_order_approved,
    publish_fulfillment_event,
    publish_sales_order_cancelled,
)

logger = logging.getLogger("app.sales_orders")

router = APIRouter(prefix="/api/sales-orders", tags=["sales-orders"])


@router.get("", response_model=schemas.SalesOrderManagementData)
async def get_sales_orders_data(
    db=Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")
    sales_orders = await crud.get_sales_orders(db, owner_id=owner_id)
    
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

    owner_id = token_payload.get("user_id")
    if owner_id is not None:
        filtered_payload["owner_id"] = owner_id

    so = models.SalesOrder(**filtered_payload)
    db.add(so)
    await db.commit()
    await db.refresh(so)

    if so.status in SO_APPROVED_STATUSES:
        await finalize_approved_sales_order(db, so, token_payload)

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

    # Cancellation lifecycle: tell inventory to cancel the linked fulfillment,
    # release reserved stock and cancel any auto-created POs.
    if new_status == "Cancelled" and old_status != "Cancelled":
        await publish_sales_order_cancelled(token_payload, so)

    # Approval lifecycle: credit check -> stock check -> publish to inventory.
    if (new_status in SO_APPROVED_STATUSES) and (old_status not in SO_APPROVED_STATUSES):
        await finalize_approved_sales_order(db, so, token_payload)

    return so


@router.post("/{id_str}/approve")
async def approve_sales_order(
    id_str: str,
    db: AsyncSession = Depends(database.get_db),
    token_payload: dict = Depends(get_current_token_payload),
):
    """O2/O3/O4: dedicated approval endpoint.

    1. Synchronous REST credit check against billing-service (O2) — on failure
       or timeout the SO is placed on Hold (O3) and NOT published.
    2. If approved, runs the stock check and publishes `crm.order.approved`
       (O4) so inventory performs its ATP check.

    Returns the full audit trail (credit + stock) for the UI toast.
    """
    result = await db.execute(
        select(models.SalesOrder).filter(models.SalesOrder.id_str == id_str)
    )
    so = result.scalars().first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")

    from app.sales_orders.pipeline import finalize_approved_sales_order

    if so.status not in SO_APPROVED_STATUSES:
        so.status = "Confirmed"
        await db.commit()
        await db.refresh(so)

    outcome = await finalize_approved_sales_order(db, so, token_payload)
    await db.refresh(so)

    return {
        "id_str": so.id_str,
        "so_no": so.so_no,
        "status": so.status,
        "approved": outcome.get("approved", False),
        "reason": outcome.get("reason"),
        "credit": outcome.get("credit") or getattr(so, "credit_check_detail", None),
        "approval_status": so.approval_status,
        "credit_check_status": so.credit_check_status,
        "message": (
            f"{so.so_no} approved — fulfillment started."
            if outcome.get("approved")
            else f"{so.so_no} placed on {so.status}: credit check failed or stock unavailable."
        ),
    }


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
    items = build_so_check_items(so)
    try:
        stock_result = await check_stock_availability(token, items)
    except Exception as e:
        logger.warning(f"Stock check unavailable for {so.so_no}: {str(e)}")
        # Fail open BUT still ingest: the durable crm.order.approved event will
        # be consumed once inventory is reachable, and the worker runs its own
        # ATP check anyway.
        stock_result = {"available": True, "overall_available": True, "warehouse_id": None, "items": []}

    available = bool(stock_result.get("overall_available", False))
    if not available:
        so.status = "Stock Hold"
        await db.commit()
        await db.refresh(so)
        await publish_fulfillment_event(token_payload, so, stock_result)

    # ALWAYS ingest into the fulfillment queue: when stock is available the
    # inventory worker auto-reserves it; on shortage it runs the auto-PO flow.
    # Both cases must enter the queue as an approved sales order.
    await publish_crm_order_approved(token_payload, so, stock_result)

    return {
        "available": available,
        "overall_available": stock_result.get("overall_available"),
        "warehouse_id": stock_result.get("warehouse_id"),
        "status": so.status,
        "items": stock_result.get("items", []),
    }
