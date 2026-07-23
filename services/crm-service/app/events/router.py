from fastapi import APIRouter, Request
from loguru import logger

router = APIRouter(prefix="/api/events/billing", tags=["events"])

@router.post("/invoice-paid")
async def on_invoice_paid(request: Request):
    body = await request.json()
    payload = body.get("payload", {})
    logger.info(f"Event: invoice.paid — INV #{payload.get('invoiceNumber')} ₹{payload.get('amount')}")
    return {"status": "ok"}
