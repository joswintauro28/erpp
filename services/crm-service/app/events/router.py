from fastapi import APIRouter, Depends, Request
from loguru import logger

from app.core.deps import get_current_token_payload

router = APIRouter(prefix="/api/events/billing", tags=["events"])

@router.post("/invoice-paid")
async def on_invoice_paid(
    request: Request,
    _auth: dict = Depends(get_current_token_payload),
):
    body = await request.json()
    payload = body.get("payload", {})
    logger.info(f"Event: invoice.paid — INV #{payload.get('invoiceNumber')} ₹{payload.get('amount')}")
    return {"status": "ok"}
