from fastapi import APIRouter, HTTPException, Request
from loguru import logger

router = APIRouter(prefix="/api/events/billing", tags=["events"])

@router.post("/invoice-created")
async def on_invoice_created(request: Request):
    body = await request.json()
    logger.info(f"Event: invoice.created — #{body.get('payload', {}).get('invoiceId')}")
    return {"status": "ok"}

@router.post("/payment-recorded")
async def on_payment_recorded(request: Request):
    body = await request.json()
    logger.info(f"Event: payment.recorded — #{body.get('payload', {}).get('paymentId')}")
    return {"status": "ok"}

@router.post("/note-issued")
async def on_note_issued(request: Request):
    body = await request.json()
    logger.info(f"Event: note.issued — {body.get('event')} #{body.get('payload', {}).get('creditNoteId') or body.get('payload', {}).get('debitNoteId')}")
    return {"status": "ok"}

@router.post("/expense-created")
async def on_expense_created(request: Request):
    body = await request.json()
    logger.info(f"Event: expense.created — #{body.get('payload', {}).get('expenseId')}")
    return {"status": "ok"}
