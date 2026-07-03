from fastapi import APIRouter, Depends, HTTPException
import uuid

from app.database import cursor, conn
from app.auth.permissions import require_permission
from app.schemas.eway_bill import EWayBill

router = APIRouter(
    prefix="/eway-bills",
    tags=["E-Way Bills"]
)


@router.post("/")
def create_eway_bill(
    eway_bill: EWayBill,
    current_user: int = Depends(require_permission('invoices.create'))
):

    # Check if invoice exists
    cursor.execute(
        """
        SELECT *
        FROM invoices
        WHERE id = %s
        AND owner_id = %s
        """,
        (
            eway_bill.invoice_id,
            current_user
        )
    )

    invoice = cursor.fetchone()

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    eway_number = str(uuid.uuid4())[:12]

    cursor.execute(
        """
        INSERT INTO eway_bills (
            invoice_id,
            vehicle_number,
            transporter_name,
            distance_km,
            eway_bill_number,
            owner_id
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            eway_bill.invoice_id,
            eway_bill.vehicle_number,
            eway_bill.transporter_name,
            eway_bill.distance_km,
            eway_number,
            current_user
        )
    )

    new_eway_bill = cursor.fetchone()

    conn.commit()

    return {"data": new_eway_bill}


@router.get("/")
def get_eway_bills(
    current_user: int = Depends(require_permission('invoices.view'))
):

    cursor.execute(
        """
        SELECT *
        FROM eway_bills
        WHERE owner_id = %s
        """,
        (current_user,)
    )

    eway_bills = cursor.fetchall()

    return {"data": eway_bills}


@router.get("/{id}")
def get_eway_bill(
    id: int,
    current_user: int = Depends(require_permission('invoices.view'))
):

    cursor.execute(
        """
        SELECT *
        FROM eway_bills
        WHERE id = %s
        AND owner_id = %s
        """,
        (
            id,
            current_user
        )
    )

    eway_bill = cursor.fetchone()

    if eway_bill is None:
        raise HTTPException(
            status_code=404,
            detail="E-Way Bill not found"
        )

    return {"data": eway_bill}


@router.delete("/{id}")
def delete_eway_bill(
    id: int,
    current_user: int = Depends(require_permission('invoices.delete'))
):

    cursor.execute(
        """
        DELETE FROM eway_bills
        WHERE id = %s
        AND owner_id = %s
        RETURNING *
        """,
        (
            id,
            current_user
        )
    )

    deleted_eway_bill = cursor.fetchone()

    if deleted_eway_bill is None:
        raise HTTPException(
            status_code=404,
            detail="E-Way Bill not found"
        )

    conn.commit()

    return {"message": "E-Way Bill deleted"}