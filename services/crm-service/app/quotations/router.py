from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.status import HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import json

from app.database import get_db
from app.customers.models import Customer
from app.core.deps import get_current_token_payload
from app.core.idgen import is_valid_document_id
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


def _build_quotation_out(q: dict) -> QuotationOut:
    q_out = QuotationOut(**q)
    q_out.account = q.get("client_name")
    
    notes_raw = q.get("notes") or ""
    file_data = None
    file_name = None
    
    if notes_raw.strip().startswith("{") and notes_raw.strip().endswith("}"):
        try:
            notes_dict = json.loads(notes_raw)
            q_out.notes = notes_dict.get("notes", "")
            file_data = notes_dict.get("file_data")
            file_name = notes_dict.get("file_name")
        except Exception:
            pass
            
    q_out.file_data = file_data
    q_out.file_name = file_name
    return q_out


async def _map_crm_payload_to_billing(payload: dict, db: AsyncSession) -> dict:
    account_name = payload.get("account") or payload.get("clientName") or payload.get("client_name")
    client_id = payload.get("clientId") or 999
    client_name = account_name or "Unknown Client"

    if account_name and not payload.get("clientId"):
        result = await db.execute(select(Customer).filter(Customer.account == account_name))
        customer = result.scalars().first()
        if customer:
            client_id = customer.id
            client_name = customer.account

    billing_items = payload.get("items") or []
    try:
        val = float(str(payload.get("value", "0")).replace(",", "").strip())
    except (ValueError, TypeError):
        val = 0.0
    if not val and billing_items:
        val = sum(
            float(item.get("unitPrice") or item.get("unit_price") or 0)
            * float(item.get("quantity") or 1)
            for item in billing_items
        )

    valid_until = payload.get("valid_until") or payload.get("validUntil")

    notes_dict = {
        "owner": payload.get('owner', 'Unassigned'),
        "notes": payload.get("notes", ""),
        "file_data": payload.get("file_data"),
        "file_name": payload.get("file_name")
    }
    notes_json = json.dumps(notes_dict)

    billing_payload = {
        "clientId": client_id,
        "clientName": client_name,
        "quotationDate": datetime.now().strftime("%Y-%m-%d"),
        "notes": notes_json,
        "items": billing_items or [{
            "description": f"Quotation for {client_name}",
            "quantity": 1.0,
            "unitPrice": val,
            "gstRate": 0.0
        }]
    }

    supplied_number = payload.get("quote_no") or payload.get("id_str") or payload.get("quotationNumber")
    if is_valid_document_id(supplied_number):
        billing_payload["quotationNumber"] = supplied_number

    if valid_until:
        billing_payload["validUntil"] = valid_until

    return billing_payload


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

    mapped_quotations = []
    for q in items:
        mapped_quotations.append(_build_quotation_out(q))

    return QuotationListResponse(
        summary=QuotationSummary(
            total_quotations=total,
            open=open_count,
            overdue_at_risk=overdue,
            owners=owners,
        ),
        quotations=mapped_quotations,
    )


@router.get("/{id}", response_model=QuotationOut)
async def get_quotation(id: int, token_payload: dict = Depends(get_current_token_payload)):
    token = _get_token(token_payload)
    try:
        data = await quotations_get(token, id)
        return _build_quotation_out(data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")


@router.post("", response_model=QuotationOut, status_code=201)
async def create_quotation(payload: dict, db: AsyncSession = Depends(get_db), token_payload: dict = Depends(get_current_token_payload)):
    token = _get_token(token_payload)
    billing_payload = await _map_crm_payload_to_billing(payload, db)
    try:
        data = await quotations_create(token, billing_payload)
        return _build_quotation_out(data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")


@router.put("/{id}", response_model=QuotationOut)
async def update_quotation(id: int, payload: dict, db: AsyncSession = Depends(get_db), token_payload: dict = Depends(get_current_token_payload)):
    token = _get_token(token_payload)
    billing_payload = await _map_crm_payload_to_billing(payload, db)
    try:
        data = await quotations_update(token, id, billing_payload)
        return _build_quotation_out(data)
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
        data = await quotations_update_status(token, id, billing_status)
        
        if billing_status == "sent":
            from app.core.amqp import get_exchange
            import aio_pika
            import json
            exchange = await get_exchange()
            if exchange:
                try:
                    # CRM publishes events in the shared envelope the notifications
                    # consumer expects: {event, organization_id, payload, timestamp}.
                    payload = {
                        "quotationNumber": data.get("quote_number") or data.get("quotationNumber") or "",
                        "clientName": data.get("clientName") or data.get("client_name") or "Client",
                        "total": data.get("total"),
                    }
                    event_data = {
                        "event": "crm.quotation.sent",
                        "organization_id": token_payload.get("organization_id", 1),
                        "payload": payload,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    message = aio_pika.Message(
                        body=json.dumps(event_data).encode(),
                        delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                    )
                    await exchange.publish(
                        message,
                        routing_key="crm.quotation.sent"
                    )
                except Exception as e:
                    pass

        return _build_quotation_out(data)
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


@router.post("/{id}/convert-to-sales-order", response_model=dict)
async def convert_quotation_to_sales_order(
    id: int,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(token_payload)
    try:
        quote = await quotations_get(token, id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")

    if quote is None:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Quotation not found")

    from app.sales_orders.models import SalesOrder
    from app.core.idgen import next_document_id

    value = quote.get("total") or quote.get("amount") or 0
    account = quote.get("client_name") or quote.get("clientName") or "Unknown Client"
    quote_no = quote.get("quote_number") or quote.get("quotationNumber") or ""

    so_id_str = await next_document_id(db, SalesOrder, "SO")

    so = SalesOrder(
        id_str=so_id_str,
        so_no=so_id_str,
        account=account,
        from_quote=quote_no,
        value=str(value),
        eta="",
        date_ordered=datetime.now().strftime("%Y-%m-%d"),
        status="Confirmed",
        owner=token_payload.get("user_id", "Unassigned"),
    )
    db.add(so)
    await db.commit()
    await db.refresh(so)

    try:
        await quotations_update_status(token, id, "accepted")
    except Exception:
        pass

    return {
        "id": so.id,
        "id_str": so.id_str,
        "so_no": so.so_no,
        "account": so.account,
        "from_quote": so.from_quote,
        "value": so.value,
        "status": so.status,
        "date_ordered": so.date_ordered,
    }



