from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.auth.permissions import require_permission
from app.database import conn
from app.services.audit import log_action

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


class SupplierPayload(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    status: str = "active"


@router.get("/")
def get_suppliers(current_user: int = Depends(require_permission("suppliers.view"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM suppliers WHERE owner_id=%s AND status <> 'deleted' ORDER BY name ASC",
                (current_user,),
            )
            return {"data": cursor.fetchall()}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
def create_supplier(payload: SupplierPayload, current_user: int = Depends(require_permission("suppliers.create"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO suppliers (owner_id, name, email, phone, gst_number, address, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (current_user, payload.name, payload.email, payload.phone,
                 payload.gst_number, payload.address, payload.status),
            )
            supplier = cursor.fetchone()
        conn.commit()
        log_action(current_user, current_user, "supplier_created", "supplier", supplier["id"],
                   f"Supplier created: {supplier['name']}")
        return {"data": supplier}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}")
def get_supplier(id: int, current_user: int = Depends(require_permission("suppliers.view"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM suppliers WHERE id=%s AND owner_id=%s", (id, current_user))
            supplier = cursor.fetchone()
        if supplier is None:
            raise HTTPException(status_code=404, detail="Supplier not found")
        return {"data": supplier}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}")
def update_supplier(id: int, payload: SupplierPayload, current_user: int = Depends(require_permission("suppliers.manage"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE suppliers
                SET name=%s, email=%s, phone=%s, gst_number=%s, address=%s, status=%s
                WHERE id=%s AND owner_id=%s
                RETURNING *
                """,
                (payload.name, payload.email, payload.phone, payload.gst_number,
                 payload.address, payload.status, id, current_user),
            )
            supplier = cursor.fetchone()
        if supplier is None:
            raise HTTPException(status_code=404, detail="Supplier not found")
        conn.commit()
        log_action(current_user, current_user, "supplier_updated", "supplier", id,
                   f"Supplier updated: {supplier['name']}")
        return {"data": supplier}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def delete_supplier(id: int, current_user: int = Depends(require_permission("suppliers.manage"))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE suppliers SET status='deleted' WHERE id=%s AND owner_id=%s RETURNING *",
                (id, current_user),
            )
            supplier = cursor.fetchone()
        if supplier is None:
            raise HTTPException(status_code=404, detail="Supplier not found")
        conn.commit()
        log_action(current_user, current_user, "supplier_deleted", "supplier", id,
                   f"Supplier deleted: {supplier['name']}")
        return {"message": "Supplier deleted"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
