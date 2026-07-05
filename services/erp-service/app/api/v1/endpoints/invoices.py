from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.core.exceptions import NotFoundException
from app.schemas.invoice import InvoiceCreate, InvoiceOut, InvoiceUpdate
from app.services.invoice import InvoiceService

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceOut])
async def list_invoices(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InvoiceService(db)
    invoices = await service.list_invoices(user_id)
    result = []
    for inv in invoices:
        await db.refresh(inv, ["items", "payments"])
        result.append(inv)
    return result


@router.post("", response_model=InvoiceOut, status_code=201)
async def create_invoice(
    req: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InvoiceService(db)
    invoice = await service.create_invoice(
        owner_id=user_id,
        client_id=req.client_id,
        items_data=[i.model_dump() for i in req.items],
        invoice_number=req.invoice_number,
        status=req.status,
        issue_date=req.issue_date,
        due_date=req.due_date,
        gst_treatment=req.gst_treatment,
        place_of_supply=req.place_of_supply,
        notes=req.notes,
    )
    await db.refresh(invoice, ["items", "payments"])
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InvoiceService(db)
    invoice = await service.get_invoice(invoice_id, user_id)
    if not invoice:
        raise NotFoundException("Invoice not found")
    await db.refresh(invoice, ["items", "payments"])
    return invoice


@router.put("/{invoice_id}/status", response_model=InvoiceOut)
async def update_invoice_status(
    invoice_id: int,
    req: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InvoiceService(db)
    invoice = await service.update_invoice_status(invoice_id, user_id, req.status)
    if not invoice:
        raise NotFoundException("Invoice not found")
    await db.refresh(invoice, ["items", "payments"])
    return invoice
