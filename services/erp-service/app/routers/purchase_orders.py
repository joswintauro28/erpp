from datetime import date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.permissions import current_actual_user_id, require_permission
from app.database import conn
from app.services.audit import log_action
from app.services.inventory import (
    assert_product_owned,
    assert_warehouse_owned,
    change_warehouse_stock,
    get_main_warehouse,
    record_stock_movement,
    require_positive_quantity,
    add_inbound_stock,
)

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

PO_STATUSES = {"draft", "sent", "partially_received", "received", "cancelled"}


class PurchaseOrderItemPayload(BaseModel):
    product_id: int
    quantity: float = Field(gt=0)
    unit_cost: float = Field(ge=0)


class PurchaseOrderPayload(BaseModel):
    supplier_id: Optional[int] = None
    po_number: Optional[str] = None
    status: str = "draft"
    expected_date: Optional[date] = None
    notes: Optional[str] = None
    items: List[PurchaseOrderItemPayload] = Field(default_factory=list)


class ReceiveItemPayload(BaseModel):
    purchase_order_item_id: int
    quantity: float = Field(gt=0)
    batch_number: Optional[str] = None
    manufacture_date: Optional[date] = None
    expiry_date: Optional[date] = None
    purchase_price: Optional[float] = None
    serial_numbers: List[str] = Field(default_factory=list)


class ReceivePayload(BaseModel):
    warehouse_id: Optional[int] = None
    items: List[ReceiveItemPayload] = Field(default_factory=list)


def _actor(owner_id):
    return current_actual_user_id.get() or owner_id


def _validate_status(status: str):
    status = (status or "draft").lower()
    if status not in PO_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid purchase order status")
    return status


def _po_total(items: List[PurchaseOrderItemPayload]):
    total = Decimal("0")
    for item in items:
        total += Decimal(str(item.quantity)) * Decimal(str(item.unit_cost))
    return total


def _load_po(cursor, po_id: int, owner_id: int, for_update: bool = False):
    suffix = " FOR UPDATE" if for_update else ""
    cursor.execute(
        f"SELECT * FROM purchase_orders WHERE id=%s AND owner_id=%s{suffix}",
        (po_id, owner_id),
    )
    po = cursor.fetchone()
    if po is None:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


def _get_po_items(cursor, po_id: int):
    cursor.execute(
        """
        SELECT poi.*, p.name AS product_name, p.sku
        FROM purchase_order_items poi
        JOIN products p ON p.id = poi.product_id
        WHERE poi.purchase_order_id=%s
        ORDER BY poi.id ASC
        """,
        (po_id,),
    )
    return cursor.fetchall()


def _status_from_items(items):
    if not items:
        return "received"
    total_qty = sum(Decimal(str(item["quantity"] or 0)) for item in items)
    received_qty = sum(Decimal(str(item["received_quantity"] or 0)) for item in items)
    if received_qty <= 0:
        return "sent"
    if received_qty >= total_qty:
        return "received"
    return "partially_received"


@router.get("/")
def get_purchase_orders(current_user: int = Depends(require_permission("purchase_orders.view"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT po.*,
                       COALESCE(COUNT(poi.id), 0) AS item_count,
                       COALESCE(SUM(poi.received_quantity), 0) AS received_quantity
                FROM purchase_orders po
                LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
                WHERE po.owner_id=%s
                GROUP BY po.id
                ORDER BY po.created_at DESC, po.id DESC
                """,
                (current_user,),
            )
            return {"data": cursor.fetchall()}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/")
def create_purchase_order(payload: PurchaseOrderPayload, current_user: int = Depends(require_permission("purchase_orders.create"))):
    status = _validate_status(payload.status)
    total = _po_total(payload.items)
    try:
        with conn.cursor() as cursor:
            # Validate supplier belongs to org (if provided)
            if payload.supplier_id:
                cursor.execute("SELECT id FROM suppliers WHERE id=%s AND owner_id=%s AND status <> 'deleted'",
                               (payload.supplier_id, current_user))
                if cursor.fetchone() is None:
                    raise HTTPException(status_code=400, detail="Supplier not found")
            for item in payload.items:
                assert_product_owned(cursor, item.product_id, current_user)
            cursor.execute(
                """
                INSERT INTO purchase_orders (owner_id, supplier_id, po_number, status, expected_date, notes, total)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (current_user, payload.supplier_id, payload.po_number, status, payload.expected_date, payload.notes, total),
            )
            po = cursor.fetchone()
            if not po.get("po_number"):
                cursor.execute(
                    "UPDATE purchase_orders SET po_number=%s WHERE id=%s RETURNING *",
                    (f"PO-{po['id']:05d}", po["id"]),
                )
                po = cursor.fetchone()
            for item in payload.items:
                line_total = Decimal(str(item.quantity)) * Decimal(str(item.unit_cost))
                cursor.execute(
                    """
                    INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, total)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (po["id"], item.product_id, item.quantity, item.unit_cost, line_total),
                )
        conn.commit()
        log_action(current_user, _actor(current_user), "purchase_order_created", "purchase_order", po["id"], f"Purchase order created: {po['po_number']}")
        return {"data": po}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))



@router.get("/{id}")
def get_purchase_order(id: int, current_user: int = Depends(require_permission("purchase_orders.view"))):
    try:
        with conn.cursor() as cursor:
            po = _load_po(cursor, id, current_user)
            items = _get_po_items(cursor, id)
        return {"data": {**po, "items": items}}
    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/{id}")
def update_purchase_order(id: int, payload: PurchaseOrderPayload, current_user: int = Depends(require_permission("purchase_orders.manage"))):
    status = _validate_status(payload.status)
    total = _po_total(payload.items)
    try:
        with conn.cursor() as cursor:
            existing = _load_po(cursor, id, current_user, for_update=True)
            if existing.get("status") in ("partially_received", "received") and payload.items:
                raise HTTPException(status_code=400, detail="Received purchase orders cannot replace items")
            for item in payload.items:
                assert_product_owned(cursor, item.product_id, current_user)
            cursor.execute(
                """
                UPDATE purchase_orders
                SET supplier_id=%s, po_number=%s, status=%s, expected_date=%s, notes=%s, total=%s
                WHERE id=%s AND owner_id=%s
                RETURNING *
                """,
                (payload.supplier_id, payload.po_number or existing["po_number"], status, payload.expected_date, payload.notes, total, id, current_user),
            )
            po = cursor.fetchone()
            if payload.items:
                cursor.execute("DELETE FROM purchase_order_items WHERE purchase_order_id=%s", (id,))
                for item in payload.items:
                    line_total = Decimal(str(item.quantity)) * Decimal(str(item.unit_cost))
                    cursor.execute(
                        """
                        INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, total)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (id, item.product_id, item.quantity, item.unit_cost, line_total),
                    )
        conn.commit()
        return {"data": po}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{id}")
def delete_purchase_order(id: int, current_user: int = Depends(require_permission("purchase_orders.manage"))):
    try:
        with conn.cursor() as cursor:
            po = _load_po(cursor, id, current_user)
            if po.get("status") in ("partially_received", "received"):
                raise HTTPException(status_code=400, detail="Received purchase orders cannot be deleted")
            cursor.execute("DELETE FROM purchase_orders WHERE id=%s AND owner_id=%s", (id, current_user))
        conn.commit()
        return {"message": "Purchase order deleted"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{id}/receive")
def receive_purchase_order(
    id: int,
    payload: Optional[ReceivePayload] = Body(default=None),
    current_user: int = Depends(require_permission("purchase_orders.manage")),
):
    payload = payload or ReceivePayload()
    try:
        with conn.cursor() as cursor:
            po = _load_po(cursor, id, current_user, for_update=True)
            if po.get("status") == "cancelled":
                raise HTTPException(status_code=400, detail="Cancelled purchase orders cannot be received")
            warehouse = assert_warehouse_owned(cursor, payload.warehouse_id, current_user) if payload.warehouse_id else get_main_warehouse(cursor, current_user)
            db_items = _get_po_items(cursor, id)
            db_items_by_id = {item["id"]: item for item in db_items}

            receive_items = payload.items
            if not receive_items:
                receive_items = [
                    ReceiveItemPayload(
                        purchase_order_item_id=item["id"],
                        quantity=float(Decimal(str(item["quantity"] or 0)) - Decimal(str(item["received_quantity"] or 0))),
                    )
                    for item in db_items
                    if Decimal(str(item["quantity"] or 0)) > Decimal(str(item["received_quantity"] or 0))
                ]

            if not receive_items:
                raise HTTPException(status_code=400, detail="No receivable items found")

            movement_ids = []
            audit_events = []
            for item in receive_items:
                quantity = require_positive_quantity(item.quantity)
                db_item = db_items_by_id.get(item.purchase_order_item_id)
                if not db_item:
                    raise HTTPException(status_code=404, detail=f"Purchase order item {item.purchase_order_item_id} not found")
                product = assert_product_owned(cursor, db_item["product_id"], current_user, for_update=True)
                ordered = Decimal(str(db_item["quantity"] or 0))
                already_received = Decimal(str(db_item["received_quantity"] or 0))
                if already_received + quantity > ordered:
                    raise HTTPException(status_code=400, detail=f"Receive quantity exceeds ordered quantity for {product['name']}")

                # Skip stock updates for service (non-inventory) products
                from app.services.inventory import is_inventory_tracked as _is_tracked
                if _is_tracked(cursor, product["id"], current_user):
                    cursor.execute(
                        "UPDATE products SET stock = stock + %s WHERE id=%s AND owner_id=%s",
                        (quantity, product["id"], current_user),
                    )
                    change_warehouse_stock(cursor, warehouse["id"], product["id"], quantity, prevent_negative=False)
                    add_inbound_stock(
                        cursor, 
                        current_user, 
                        product["id"], 
                        warehouse["id"], 
                        quantity, 
                        db_item["unit_cost"], 
                        purchase_order_id=id
                    )
                    movement = record_stock_movement(
                        cursor,
                        current_user,
                        product["id"],
                        "In",
                        quantity,
                        warehouse["name"],
                        f"PO {po['po_number']}",
                        warehouse_id=warehouse["id"],
                    )
                    movement_ids.append(movement["id"])

                # Always update received_quantity (even for service products)
                cursor.execute(
                    """
                    UPDATE purchase_order_items
                    SET received_quantity = COALESCE(received_quantity, 0) + %s
                    WHERE id=%s
                    """,
                    (quantity, item.purchase_order_item_id),
                )

                if item.batch_number:
                    cursor.execute(
                        """
                        INSERT INTO product_batches
                            (owner_id, product_id, warehouse_id, batch_number, manufacture_date, expiry_date, quantity, purchase_price)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (
                            current_user,
                            product["id"],
                            warehouse["id"],
                            item.batch_number,
                            item.manufacture_date,
                            item.expiry_date,
                            quantity,
                            item.purchase_price if item.purchase_price is not None else db_item["unit_cost"],
                        ),
                    )
                    batch = cursor.fetchone()
                    audit_events.append(("batch_created", "product_batch", batch["id"], f"Batch created: {item.batch_number}"))

                if item.serial_numbers:
                    if quantity != quantity.to_integral_value():
                        raise HTTPException(status_code=400, detail="Serial number count must match a whole received quantity")
                    if len(set(item.serial_numbers)) != len(item.serial_numbers):
                        raise HTTPException(status_code=400, detail="Duplicate serial numbers in request")
                    if len(item.serial_numbers) != int(quantity):
                        raise HTTPException(status_code=400, detail="Serial number count must match received quantity")
                    for serial_number in item.serial_numbers:
                        cursor.execute(
                            """
                            INSERT INTO product_serials (owner_id, product_id, warehouse_id, serial_number, status)
                            VALUES (%s, %s, %s, %s, 'available')
                            RETURNING id
                            """,
                            (current_user, product["id"], warehouse["id"], serial_number),
                        )
                        serial = cursor.fetchone()
                        audit_events.append(("serial_registered", "product_serial", serial["id"], f"Serial registered: {serial_number}"))

            items_after = _get_po_items(cursor, id)
            new_status = _status_from_items(items_after)
            cursor.execute(
                "UPDATE purchase_orders SET status=%s WHERE id=%s AND owner_id=%s RETURNING *",
                (new_status, id, current_user),
            )
            updated_po = cursor.fetchone()
        conn.commit()
        for action, entity_type, entity_id, description in audit_events:
            log_action(current_user, _actor(current_user), action, entity_type, entity_id, description)
        log_action(
            current_user,
            _actor(current_user),
            "purchase_order_received",
            "purchase_order",
            id,
            f"Purchase order received: {updated_po['po_number']}",
            {"warehouse_id": warehouse["id"], "movement_ids": movement_ids, "status": new_status},
        )
        return {"data": {**updated_po, "items": items_after}}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
