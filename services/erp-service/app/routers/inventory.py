from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth.permissions import current_actual_user_id, require_permission
from app.database import conn
from app.services.audit import log_action
from app.services.inventory import assert_product_owned, assert_warehouse_owned, require_positive_quantity

router = APIRouter(prefix="/inventory", tags=["Inventory"])


class BatchPayload(BaseModel):
    product_id: int
    warehouse_id: int
    batch_number: str = Field(min_length=1)
    manufacture_date: Optional[date] = None
    expiry_date: Optional[date] = None
    quantity: float = Field(ge=0)
    purchase_price: Optional[float] = None


class SerialPayload(BaseModel):
    product_id: int
    warehouse_id: int
    serial_number: str = Field(min_length=1)
    status: str = "available"


class SerialStatusPayload(BaseModel):
    status: str


SERIAL_STATUSES = {"available", "reserved", "sold", "returned", "damaged"}


def _actor(owner_id):
    return current_actual_user_id.get() or owner_id


@router.get("/expiring")
def get_expiring_inventory(
    days: int = Query(default=30, ge=0, le=3650),
    current_user: int = Depends(require_permission("stock.view")),
):
    until = date.today() + timedelta(days=days)
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT pb.*, p.name AS product_name, p.sku, w.name AS warehouse_name
                FROM product_batches pb
                JOIN products p ON p.id = pb.product_id
                JOIN warehouses w ON w.id = pb.warehouse_id
                WHERE pb.owner_id=%s
                  AND pb.expiry_date IS NOT NULL
                  AND pb.expiry_date BETWEEN CURRENT_DATE AND %s
                  AND COALESCE(pb.quantity, 0) > 0
                ORDER BY pb.expiry_date ASC, p.name ASC
                """,
                (current_user, until),
            )
            return {"data": cursor.fetchall()}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/batches")
def get_batches(current_user: int = Depends(require_permission("stock.view"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT pb.*, p.name AS product_name, p.sku, w.name AS warehouse_name
                FROM product_batches pb
                JOIN products p ON p.id = pb.product_id
                JOIN warehouses w ON w.id = pb.warehouse_id
                WHERE pb.owner_id=%s
                ORDER BY pb.created_at DESC, pb.id DESC
                """,
                (current_user,),
            )
            return {"data": cursor.fetchall()}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/batches")
def create_batch(payload: BatchPayload, current_user: int = Depends(require_permission("inventory.batch.manage"))):
    require_positive_quantity(payload.quantity)
    try:
        with conn.cursor() as cursor:
            assert_product_owned(cursor, payload.product_id, current_user)
            assert_warehouse_owned(cursor, payload.warehouse_id, current_user)
            cursor.execute(
                """
                INSERT INTO product_batches
                    (owner_id, product_id, warehouse_id, batch_number, manufacture_date, expiry_date, quantity, purchase_price)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    current_user,
                    payload.product_id,
                    payload.warehouse_id,
                    payload.batch_number,
                    payload.manufacture_date,
                    payload.expiry_date,
                    payload.quantity,
                    payload.purchase_price,
                ),
            )
            batch = cursor.fetchone()
        conn.commit()
        log_action(current_user, _actor(current_user), "batch_created", "product_batch", batch["id"], f"Batch created: {batch['batch_number']}")
        return {"data": batch}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/batches/{id}")
def update_batch(id: int, payload: BatchPayload, current_user: int = Depends(require_permission("inventory.batch.manage"))):
    try:
        with conn.cursor() as cursor:
            assert_product_owned(cursor, payload.product_id, current_user)
            assert_warehouse_owned(cursor, payload.warehouse_id, current_user)
            cursor.execute(
                """
                UPDATE product_batches
                SET product_id=%s, warehouse_id=%s, batch_number=%s, manufacture_date=%s,
                    expiry_date=%s, quantity=%s, purchase_price=%s
                WHERE id=%s AND owner_id=%s
                RETURNING *
                """,
                (
                    payload.product_id,
                    payload.warehouse_id,
                    payload.batch_number,
                    payload.manufacture_date,
                    payload.expiry_date,
                    payload.quantity,
                    payload.purchase_price,
                    id,
                    current_user,
                ),
            )
            batch = cursor.fetchone()
            if not batch:
                raise HTTPException(status_code=404, detail="Batch not found")
        conn.commit()
        return {"data": batch}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/batches/{id}")
def delete_batch(id: int, current_user: int = Depends(require_permission("inventory.batch.manage"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM product_batches WHERE id=%s AND owner_id=%s RETURNING id", (id, current_user))
            deleted = cursor.fetchone()
            if not deleted:
                raise HTTPException(status_code=404, detail="Batch not found")
        conn.commit()
        return {"message": "Batch deleted"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/serials")
def get_serials(current_user: int = Depends(require_permission("stock.view"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT ps.*, p.name AS product_name, p.sku, w.name AS warehouse_name
                FROM product_serials ps
                JOIN products p ON p.id = ps.product_id
                JOIN warehouses w ON w.id = ps.warehouse_id
                WHERE ps.owner_id=%s
                ORDER BY ps.created_at DESC, ps.id DESC
                """,
                (current_user,),
            )
            return {"data": cursor.fetchall()}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/serials")
def create_serial(payload: SerialPayload, current_user: int = Depends(require_permission("inventory.serial.manage"))):
    status = payload.status.lower()
    if status not in SERIAL_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid serial status")
    try:
        with conn.cursor() as cursor:
            assert_product_owned(cursor, payload.product_id, current_user)
            assert_warehouse_owned(cursor, payload.warehouse_id, current_user)
            cursor.execute(
                """
                INSERT INTO product_serials (owner_id, product_id, warehouse_id, serial_number, status)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (current_user, payload.product_id, payload.warehouse_id, payload.serial_number, status),
            )
            serial = cursor.fetchone()
        conn.commit()
        log_action(current_user, _actor(current_user), "serial_registered", "product_serial", serial["id"], f"Serial registered: {serial['serial_number']}")
        return {"data": serial}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        if "product_serials_owner_serial_uidx" in str(exc):
            raise HTTPException(status_code=400, detail="Serial number already exists")
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/serials/{id}/status")
def update_serial_status(id: int, payload: SerialStatusPayload, current_user: int = Depends(require_permission("inventory.serial.manage"))):
    status = payload.status.lower()
    if status not in SERIAL_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid serial status")
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE product_serials
                SET status=%s
                WHERE id=%s AND owner_id=%s
                RETURNING *
                """,
                (status, id, current_user),
            )
            serial = cursor.fetchone()
            if not serial:
                raise HTTPException(status_code=404, detail="Serial not found")
        conn.commit()
        return {"data": serial}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/serials/{id}")
def delete_serial(id: int, current_user: int = Depends(require_permission("inventory.serial.manage"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM product_serials WHERE id=%s AND owner_id=%s RETURNING id", (id, current_user))
            deleted = cursor.fetchone()
            if not deleted:
                raise HTTPException(status_code=404, detail="Serial not found")
        conn.commit()
        return {"message": "Serial deleted"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
