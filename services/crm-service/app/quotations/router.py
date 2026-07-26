from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.status import HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR

from app.core.deps import get_current_token_payload
from app.core.billing_client import (
    quotations_list,
    quotations_get,
    quotations_create,
    quotations_update,
    quotations_update_status,
    quotations_delete,
    quotations_convert_to_invoice,
)
from app.quotations.schemas import QuotationOut, QuotationListResponse, QuotationSummary

router = APIRouter(prefix="/api/quotations", tags=["quotations"])


def _get_token(payload: dict) -> str:
    raw = payload.get("_raw_token")
    if not raw:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Missing auth token")
    return raw


@router.get("", response_model=QuotationListResponse)
async def list_quotations(token_payload: dict = Depends(get_current_token_payload)):
    token = _get_token(token_payload)
    try:
        items = await quotations_list(token)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")

    total = len(items)
    open_count = sum(1 for q in items if q.get("status") in ("draft", "sent", "under_review"))
    overdue = sum(1 for q in items if q.get("status") == "expired")
    owners = len(set(q.get("client_name", "") for q in items))

    return QuotationListResponse(
        summary=QuotationSummary(
            total_quotations=total,
            open=open_count,
            overdue_at_risk=overdue,
            owners=owners,
        ),
        quotations=[QuotationOut(**q) for q in items],
    )


@router.get("/{id}", response_model=QuotationOut)
async def get_quotation(id: int, token_payload: dict = Depends(get_current_token_payload)):
    token = _get_token(token_payload)
    try:
        return await quotations_get(token, id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")


@router.post("", response_model=QuotationOut, status_code=201)
async def create_quotation(payload: dict, token_payload: dict = Depends(get_current_token_payload)):
    token = _get_token(token_payload)
    try:
        return await quotations_create(token, payload)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")


@router.put("/{id}", response_model=QuotationOut)
async def update_quotation(id: int, payload: dict, token_payload: dict = Depends(get_current_token_payload)):
    token = _get_token(token_payload)
    try:
        return await quotations_update(token, id, payload)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")


@router.put("/{id}/status", response_model=QuotationOut)
async def update_quotation_status(
    id: int,
    status: str = Query(...),
    token_payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(token_payload)
    billing_status = status.lower()
    if billing_status == "converted":
        billing_status = "accepted"
    try:
        return await quotations_update_status(token, id, billing_status)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")


@router.delete("/{id}", status_code=204)
async def delete_quotation(id: int, token_payload: dict = Depends(get_current_token_payload)):
    token = _get_token(token_payload)
    try:
        await quotations_delete(token, id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")


@router.post("/{id}/convert", response_model=dict)
async def convert_quotation_to_invoice(id: int, token_payload: dict = Depends(get_current_token_payload)):
    token = _get_token(token_payload)
    try:
        return await quotations_convert_to_invoice(token, id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")
