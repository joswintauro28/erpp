from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
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
)

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])


class WarehousePayload(BaseModel):
    name: str = Field(min_length=1)
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    status: str = "active"


class TransferPayload(BaseModel):
    source_warehouse_id: int
    destination_warehouse_id: int
    product_id: int
    quantity: float = Field(gt=0)


def _actor(owner_id):
    return current_actual_user_id.get() or owner_id


@router.get("/")
def get_warehouses(current_user: int = Depends(require_permission("inventory.warehouses.view"))):
    try:
        with conn.cursor() as cursor:
            get_main_warehouse(cursor, current_user)
            cursor.execute(
                """
                SELECT w.*,
                       COALESCE(SUM(ws.quantity), 0) AS total_quantity
                FROM warehouses w
                LEFT JOIN warehouse_stock ws ON ws.warehouse_id = w.id
                WHERE w.owner_id=%s
                GROUP BY w.id
                ORDER BY CASE WHEN w.code='MAIN' THEN 0 ELSE 1 END, w.name ASC
                """,
                (current_user,),
            )
            rows = cursor.fetchall()
        conn.commit()
        return {"data": rows}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/")
def create_warehouse(payload: WarehousePayload, current_user: int = Depends(require_permission("inventory.warehouses.manage"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO warehouses (owner_id, name, code, address, city, state, country, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    current_user,
                    payload.name,
                    payload.code,
                    payload.address,
                    payload.city,
                    payload.state,
                    payload.country,
                    payload.status,
                ),
            )
            warehouse = cursor.fetchone()
        conn.commit()
        log_action(current_user, _actor(current_user), "warehouse_created", "warehouse", warehouse["id"], f"Warehouse created: {warehouse['name']}")
        return {"data": warehouse}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/{id}")
def update_warehouse(id: int, payload: WarehousePayload, current_user: int = Depends(require_permission("inventory.warehouses.manage"))):
    try:
        with conn.cursor() as cursor:
            assert_warehouse_owned(cursor, id, current_user)
            cursor.execute(
                """
                UPDATE warehouses
                SET name=%s, code=%s, address=%s, city=%s, state=%s, country=%s, status=%s
                WHERE id=%s AND owner_id=%s
                RETURNING *
                """,
                (
                    payload.name,
                    payload.code,
                    payload.address,
                    payload.city,
                    payload.state,
                    payload.country,
                    payload.status,
                    id,
                    current_user,
                ),
            )
            warehouse = cursor.fetchone()
        conn.commit()
        log_action(current_user, _actor(current_user), "warehouse_updated", "warehouse", id, f"Warehouse updated: {warehouse['name']}")
        return {"data": warehouse}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{id}")
def delete_warehouse(id: int, current_user: int = Depends(require_permission("inventory.warehouses.manage"))):
    try:
        with conn.cursor() as cursor:
            warehouse = assert_warehouse_owned(cursor, id, current_user)
            if warehouse.get("code") == "MAIN":
                raise HTTPException(status_code=400, detail="Main Warehouse cannot be deleted")
            cursor.execute(
                "DELETE FROM warehouses WHERE id=%s AND owner_id=%s RETURNING *",
                (id, current_user),
            )
            deleted = cursor.fetchone()
        conn.commit()
        log_action(current_user, _actor(current_user), "warehouse_deleted", "warehouse", id, f"Warehouse deleted: {deleted['name']}")
        return {"message": "Warehouse deleted"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{id}/stock")
def get_warehouse_stock(id: int, current_user: int = Depends(require_permission("inventory.warehouses.view"))):
    try:
        with conn.cursor() as cursor:
            warehouse = assert_warehouse_owned(cursor, id, current_user)
            cursor.execute(
                """
                SELECT ws.*, p.name AS product_name, p.sku, p.category, p.price, p.stock AS total_stock
                FROM warehouse_stock ws
                JOIN products p ON p.id = ws.product_id
                WHERE ws.warehouse_id=%s AND p.owner_id=%s
                ORDER BY p.name ASC
                """,
                (id, current_user),
            )
            rows = cursor.fetchall()
        return {"data": rows, "warehouse": warehouse}
    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/transfer")
def transfer_stock(payload: TransferPayload, current_user: int = Depends(require_permission("inventory.warehouses.manage"))):
    quantity = require_positive_quantity(payload.quantity)
    if payload.source_warehouse_id == payload.destination_warehouse_id:
        raise HTTPException(status_code=400, detail="Source and destination warehouses must differ")

    try:
        with conn.cursor() as cursor:
            source = assert_warehouse_owned(cursor, payload.source_warehouse_id, current_user)
            destination = assert_warehouse_owned(cursor, payload.destination_warehouse_id, current_user)
            product = assert_product_owned(cursor, payload.product_id, current_user)
            change_warehouse_stock(cursor, source["id"], product["id"], -quantity, prevent_negative=True)
            change_warehouse_stock(cursor, destination["id"], product["id"], quantity, prevent_negative=False)
            movement = record_stock_movement(
                cursor,
                current_user,
                product["id"],
                "Transfer",
                quantity,
                f"{source['name']} -> {destination['name']}",
                f"Warehouse transfer {source['id']} to {destination['id']}",
                source_warehouse_id=source["id"],
                destination_warehouse_id=destination["id"],
            )
        conn.commit()
        log_action(
            current_user,
            _actor(current_user),
            "stock_transferred",
            "stock_movement",
            movement["id"],
            f"Transferred {quantity} {product['name']} from {source['name']} to {destination['name']}",
            {
                "product_id": product["id"],
                "source_warehouse_id": source["id"],
                "destination_warehouse_id": destination["id"],
                "quantity": quantity,
            },
        )
        return {"data": movement}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
