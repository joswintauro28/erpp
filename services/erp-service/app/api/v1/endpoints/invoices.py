from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.core.exceptions import NotFoundException
from app.schemas.invoice import InvoiceCreate, InvoiceOut, InvoiceUpdate, CreditNoteOut, DebitNoteOut, QuotationCreate, QuotationUpdate, QuotationOut
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


# Credit Notes API
@router.get("/credit-notes", response_model=list[CreditNoteOut])
async def list_credit_notes(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select
    from app.models.invoice import CreditNote, Invoice
    from app.models.client import Client

    stmt = (
        select(
            CreditNote.id,
            CreditNote.credit_note_number.label("note_number"),
            CreditNote.invoice_id,
            CreditNote.amount,
            CreditNote.status,
            CreditNote.issue_date.label("date"),
            Invoice.invoice_number.label("invoice_number"),
            Client.name.label("client_name"),
        )
        .join(Invoice, CreditNote.invoice_id == Invoice.id)
        .join(Client, Invoice.client_id == Client.id)
        .where(CreditNote.owner_id == user_id)
        .order_by(CreditNote.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.mappings().all()


@router.delete("/credit-notes/{note_id}", status_code=204)
async def delete_credit_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select
    from app.models.invoice import CreditNote

    # Verify ownership
    verify_stmt = select(CreditNote).where(CreditNote.id == note_id, CreditNote.owner_id == user_id)
    verify_res = await db.execute(verify_stmt)
    note = verify_res.scalar_one_or_none()
    if not note:
        raise NotFoundException("Credit note not found")

    await db.delete(note)
    await db.commit()
    return


# Debit Notes API
@router.get("/debit-notes", response_model=list[DebitNoteOut])
async def list_debit_notes(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select
    from app.models.invoice import DebitNote, Invoice
    from app.models.client import Client

    stmt = (
        select(
            DebitNote.id,
            DebitNote.debit_note_number.label("note_number"),
            DebitNote.invoice_id,
            DebitNote.amount,
            DebitNote.status,
            DebitNote.issue_date.label("date"),
            Invoice.invoice_number.label("invoice_number"),
            Client.name.label("client_name"),
        )
        .join(Invoice, DebitNote.invoice_id == Invoice.id)
        .join(Client, Invoice.client_id == Client.id)
        .where(DebitNote.owner_id == user_id)
        .order_by(DebitNote.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.mappings().all()


@router.delete("/debit-notes/{note_id}", status_code=204)
async def delete_debit_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select
    from app.models.invoice import DebitNote

    # Verify ownership
    verify_stmt = select(DebitNote).where(DebitNote.id == note_id, DebitNote.owner_id == user_id)
    verify_res = await db.execute(verify_stmt)
    note = verify_res.scalar_one_or_none()
    if not note:
        raise NotFoundException("Debit note not found")

    await db.delete(note)
    await db.commit()
    return


# Quotations API
@router.get("/quotations", response_model=list[QuotationOut])
async def list_quotations(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select
    from app.models.invoice import Quotation
    from app.models.client import Client

    stmt = (
        select(
            Quotation.id,
            Quotation.owner_id,
            Quotation.client_id,
            Quotation.quote_number,
            Quotation.total,
            Quotation.status,
            Quotation.issue_date,
            Quotation.valid_until,
            Quotation.notes,
            Quotation.converted_invoice_id,
            Client.name.label("client_name"),
        )
        .join(Client, Quotation.client_id == Client.id)
        .where(Quotation.owner_id == user_id)
        .order_by(Quotation.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.mappings().all()


@router.post("/quotations", response_model=QuotationOut, status_code=201)
async def create_quotation(
    req: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select, func
    from datetime import date, timedelta
    from app.models.invoice import Quotation
    from app.models.client import Client

    # Check client exists
    client_stmt = select(Client).where(Client.id == req.client_id, Client.owner_id == user_id)
    client_res = await db.execute(client_stmt)
    client = client_res.scalar_one_or_none()
    if not client:
        raise NotFoundException("Client not found")

    # Generate a quote number (e.g. QTN-2026-0001)
    count_stmt = select(func.count(Quotation.id)).where(Quotation.owner_id == user_id)
    count_res = await db.execute(count_stmt)
    count = count_res.scalar() or 0
    quote_number = f"QTN-2026-{count + 1:04d}"

    today = date.today()
    q = Quotation(
        owner_id=user_id,
        client_id=req.client_id,
        quote_number=quote_number,
        total=req.total,
        status="draft",
        issue_date=today,
        valid_until=today + timedelta(days=30),
        notes=req.notes,
    )
    db.add(q)
    await db.flush()
    await db.commit()
    
    return {
        "id": q.id,
        "owner_id": q.owner_id,
        "client_id": q.client_id,
        "client_name": client.name,
        "quote_number": q.quote_number,
        "total": q.total,
        "status": q.status,
        "issue_date": q.issue_date,
        "valid_until": q.valid_until,
        "notes": q.notes,
        "converted_invoice_id": q.converted_invoice_id,
    }


@router.put("/quotations/{quote_id}", response_model=QuotationOut)
async def update_quotation(
    quote_id: int,
    req: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select
    from app.models.invoice import Quotation
    from app.models.client import Client

    stmt = select(Quotation).where(Quotation.id == quote_id, Quotation.owner_id == user_id)
    res = await db.execute(stmt)
    q = res.scalar_one_or_none()
    if not q:
        raise NotFoundException("Quotation not found")

    if req.client_id is not None:
        client_stmt = select(Client).where(Client.id == req.client_id, Client.owner_id == user_id)
        client_res = await db.execute(client_stmt)
        if not client_res.scalar_one_or_none():
            raise NotFoundException("Client not found")
        q.client_id = req.client_id
    if req.total is not None:
        q.total = req.total
    if req.status is not None:
        q.status = req.status
    if req.notes is not None:
        q.notes = req.notes

    await db.flush()
    await db.commit()

    client_name_stmt = select(Client.name).where(Client.id == q.client_id)
    client_name_res = await db.execute(client_name_stmt)
    client_name = client_name_res.scalar()

    return {
        "id": q.id,
        "owner_id": q.owner_id,
        "client_id": q.client_id,
        "client_name": client_name,
        "quote_number": q.quote_number,
        "total": q.total,
        "status": q.status,
        "issue_date": q.issue_date,
        "valid_until": q.valid_until,
        "notes": q.notes,
        "converted_invoice_id": q.converted_invoice_id,
    }


@router.put("/quotations/{quote_id}/status", response_model=QuotationOut)
async def update_quotation_status(
    quote_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select
    from app.models.invoice import Quotation
    from app.models.client import Client

    stmt = select(Quotation).where(Quotation.id == quote_id, Quotation.owner_id == user_id)
    res = await db.execute(stmt)
    q = res.scalar_one_or_none()
    if not q:
        raise NotFoundException("Quotation not found")

    q.status = status
    await db.flush()
    await db.commit()

    client_name_stmt = select(Client.name).where(Client.id == q.client_id)
    client_name_res = await db.execute(client_name_stmt)
    client_name = client_name_res.scalar()

    return {
        "id": q.id,
        "owner_id": q.owner_id,
        "client_id": q.client_id,
        "client_name": client_name,
        "quote_number": q.quote_number,
        "total": q.total,
        "status": q.status,
        "issue_date": q.issue_date,
        "valid_until": q.valid_until,
        "notes": q.notes,
        "converted_invoice_id": q.converted_invoice_id,
    }


@router.post("/quotations/{quote_id}/convert", response_model=InvoiceOut)
async def convert_quotation_to_invoice(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select
    from app.core.exceptions import ConflictException
    from app.models.invoice import Quotation
    from app.services.invoice import InvoiceService

    stmt = select(Quotation).where(Quotation.id == quote_id, Quotation.owner_id == user_id)
    res = await db.execute(stmt)
    q = res.scalar_one_or_none()
    if not q:
        raise NotFoundException("Quotation not found")

    if q.converted_invoice_id:
        raise ConflictException("Quotation already converted to an invoice")

    # Create invoice via InvoiceService
    service = InvoiceService(db)
    invoice = await service.create_invoice(
        owner_id=user_id,
        client_id=q.client_id,
        items_data=[{
            "description": f"Converted from Quotation {q.quote_number}",
            "quantity": 1.0,
            "unit_price": q.total,
            "gst_rate": 18.0,
        }],
        notes=q.notes or f"Converted from Quote {q.quote_number}",
    )
    
    q.status = "accepted"
    q.converted_invoice_id = invoice.id
    
    await db.flush()
    await db.commit()
    await db.refresh(invoice, ["items", "payments"])
    return invoice


@router.delete("/quotations/{quote_id}", status_code=204)
async def delete_quotation(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from sqlalchemy import select
    from app.models.invoice import Quotation

    stmt = select(Quotation).where(Quotation.id == quote_id, Quotation.owner_id == user_id)
    res = await db.execute(stmt)
    q = res.scalar_one_or_none()
    if not q:
        raise NotFoundException("Quotation not found")

    await db.delete(q)
    await db.commit()
    return


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
