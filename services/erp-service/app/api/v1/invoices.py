from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.schemas.invoice import InvoiceCreate, InvoiceOut, InvoiceUpdate, PaymentCreate, PaymentOut
from app.services.invoice_service import (
    create_invoice,
    get_invoice,
    list_invoices,
    update_invoice_status,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("/", response_model=list[InvoiceOut])
def get_invoices(
    user_id: int = Depends(require_permission("invoices.view")),
    db: Session = Depends(get_db),
):
    return list_invoices(db, user_id)


@router.post("/", response_model=InvoiceOut, status_code=201)
def create(
    body: InvoiceCreate,
    user_id: int = Depends(require_permission("invoices.create")),
    db: Session = Depends(get_db),
):
    items_data = [item.model_dump() for item in body.items]
    return create_invoice(
        db, user_id,
        body.model_dump(exclude={"items"}),
        items_data,
    )


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get(
    invoice_id: int,
    user_id: int = Depends(require_permission("invoices.view")),
    db: Session = Depends(get_db),
):
    return get_invoice(db, invoice_id, user_id)


@router.put("/{invoice_id}/status", response_model=InvoiceOut)
def update_status(
    invoice_id: int,
    body: InvoiceUpdate,
    user_id: int = Depends(require_permission("invoices.edit")),
    db: Session = Depends(get_db),
):
    return update_invoice_status(db, invoice_id, user_id, body.status)
