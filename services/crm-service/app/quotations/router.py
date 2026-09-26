from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.status import HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import json

from app.database import get_db
from app.customers.models import Customer
from app.core.deps import get_current_token_payload, get_current_org_id
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

# S5/S6: quotes whose discount exceeds this % of the subtotal are locked and
# require a manager approval via PUT /api/quotations/{id}/approval.
DISCOUNT_APPROVAL_THRESHOLD = 15.0
APPROVAL_REQUIRED_PERMISSION = "quotations.approve"


def _get_token(payload: dict) -> str:
    raw = payload.get("_raw_token")
    if not raw:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Missing auth token")
    return raw


def _build_quotation_out(q: dict) -> QuotationOut:
    q_out = QuotationOut(**q)
    q_out.account = q.get("client_name")
    
    notes_raw = q.get("notes") or ""
    file_uri = None
    
    if notes_raw.strip().startswith("{") and notes_raw.strip().endswith("}"):
        try:
            notes_dict = json.loads(notes_raw)
            q_out.notes = notes_dict.get("notes", "")
            file_uri = notes_dict.get("file_uri")
            owner = notes_dict.get("owner")
            if owner:
                q_out.owner = owner
        except Exception:
            pass

    q_out.file_uri = file_uri
    return q_out


async def _get_approval_overlay(db: AsyncSession, quote_id: int, organization_id: int | None = None) -> dict:
    """Fetch the CPQ approval overlay for a billing quotation, or defaults."""
    from sqlalchemy import select as sa_select
    from app.quotation_approvals.models import QuotationApproval

    stmt = sa_select(QuotationApproval).filter(QuotationApproval.quote_id == quote_id)
    if organization_id is not None:
        stmt = stmt.filter(QuotationApproval.organization_id == organization_id)
    result = await db.execute(stmt.order_by(QuotationApproval.id.desc()))
    row = result.scalars().first()
    if not row:
        return {
            "approval_status": "Draft",
            "approval_required": False,
            "discount_pct": 0.0,
            "discount_amount": 0.0,
            "approval_threshold": DISCOUNT_APPROVAL_THRESHOLD,
            "approved_by": None,
            "decided_at": None,
        }
    return {
        "approval_status": row.approval_status,
        "approval_required": row.approval_status == "Pending Approval",
        "discount_pct": row.discount_pct,
        "discount_amount": row.discount_amount,
        "approval_threshold": row.approval_threshold,
        "approved_by": row.approved_by,
        "decided_at": row.decided_at,
    }


async def _upsert_approval_overlay(
    db: AsyncSession,
    *,
    quote_id: int,
    quote_number: str,
    account: str,
    subtotal: float,
    discount_amount: float,
    discount_pct: float,
    status: str,
    requested_by: str,
    organization_id: int = 1,
) -> None:
    from app.quotation_approvals.models import QuotationApproval

    row = QuotationApproval(
        organization_id=organization_id,
        quote_id=quote_id,
        quote_number=quote_number,
        account=account,
        subtotal=subtotal,
        discount_amount=discount_amount,
        discount_pct=round(discount_pct, 2),
        approval_threshold=DISCOUNT_APPROVAL_THRESHOLD,
        approval_status=status,
        requested_by=requested_by,
        created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
    )
    db.add(row)
    await db.commit()


async def _map_crm_payload_to_billing(payload: dict, db: AsyncSession, organization_id: int | None = None) -> dict:
    account_name = payload.get("account") or payload.get("clientName") or payload.get("client_name")
    client_id = payload.get("clientId") or 999
    client_name = account_name or "Unknown Client"

    if account_name and not payload.get("clientId"):
        stmt = select(Customer).filter(Customer.account == account_name)
        if organization_id is not None:
            stmt = stmt.filter(Customer.organization_id == organization_id)
        result = await db.execute(stmt)
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

    # CPQ: carry discount through to the billing quotation.
    discount = payload.get("discount")
    if discount is not None:
        try:
            billing_payload["discount"] = float(discount)
        except (TypeError, ValueError):
            pass
    if payload.get("discountType") or payload.get("discount_type"):
        billing_payload["discountType"] = payload.get("discountType") or payload.get("discount_type")

    return billing_payload


@router.get("", response_model=QuotationListResponse)
async def list_quotations(
    account: Optional[str] = Query(None),
    token_payload: dict = Depends(get_current_token_payload),
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
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
        out = _build_quotation_out(q)
        approval = await _get_approval_overlay(db, q.get("id") or 0, organization_id=org_id)
        out_dict = out.model_dump()
        out_dict.update(approval)
        mapped_quotations.append(out_dict)

    if account:
        mapped_quotations = [
            q for q in mapped_quotations if (q.get("account") or "") == account
        ]

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
async def get_quotation(
    id: int,
    token_payload: dict = Depends(get_current_token_payload),
    org_id: int = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    token = _get_token(token_payload)
    try:
        data = await quotations_get(token, id)
        out = _build_quotation_out(data)
        approval = await _get_approval_overlay(db, id, organization_id=org_id)
        out_dict = out.model_dump()
        out_dict.update(approval)
        return QuotationOut(**out_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")


@router.post("/cpq", response_model=dict, status_code=201)
async def create_cpq_quotation(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    org_id: int = Depends(get_current_org_id),
):
    """CPQ (Configure, Price, Quote) endpoint.

    Builds a quote from line items + discount. Quotes whose discount exceeds
    DISCOUNT_APPROVAL_THRESHOLD are created in billing as draft but LOCKED
    (approval_required=True) until a manager approves via
    PUT /api/quotations/{id}/approval (S5/S6).
    """
    token = _get_token(token_payload)

    items = payload.get("items") or []
    if not items:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    subtotal = 0.0
    for item in items:
        try:
            qty = float(item.get("quantity") or 0)
            price = float(item.get("unitPrice") or item.get("unit_price") or 0)
        except (TypeError, ValueError):
            qty, price = 0.0, 0.0
        subtotal += qty * price

    discount_type = (payload.get("discountType") or payload.get("discount_type") or "fixed").lower()
    try:
        discount_raw = float(payload.get("discount") or 0)
    except (TypeError, ValueError):
        discount_raw = 0.0
    if discount_type == "percent":
        discount_amount = subtotal * (discount_raw / 100.0)
        discount_pct = discount_raw
    else:
        discount_amount = min(discount_raw, subtotal)
        discount_pct = (discount_amount / subtotal * 100.0) if subtotal else 0.0

    account = payload.get("account") or payload.get("clientName") or payload.get("client_name") or "Unknown Client"

    billing_payload = await _map_crm_payload_to_billing(payload, db, organization_id=org_id)
    try:
        data = await quotations_create(token, billing_payload)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")

    quote_id = data.get("id")
    quote_number = data.get("quote_number") or data.get("quotationNumber") or ""

    approval_required = discount_pct > DISCOUNT_APPROVAL_THRESHOLD
    approval_status = "Pending Approval" if approval_required else "Approved"
    await _upsert_approval_overlay(
        db,
        quote_id=quote_id,
        quote_number=quote_number,
        account=account,
        subtotal=subtotal,
        discount_amount=discount_amount,
        discount_pct=discount_pct,
        status=approval_status,
        requested_by=str(token_payload.get("user_id") or "user"),
        organization_id=org_id,
    )

    # S5: quote over the discount threshold -> notify the manager (Organization
    # Owner per the IAM role matrix) that approval is required.
    if approval_required and quote_number:
        try:
            from app.core.amqp import get_exchange
            import aio_pika
            payload = {
                "quotationNumber": quote_number,
                "clientName": account,
                "discount_pct": round(discount_pct, 2),
                "subtotal": round(subtotal, 2),
                "requested_by": str(token_payload.get("full_name") or token_payload.get("email") or ""),
            }
            event_data = {
                "event": "crm.quotation.pending_approval",
                "organization_id": token_payload.get("organization_id", 1) or 1,
                "payload": payload,
                "timestamp": datetime.utcnow().isoformat(),
            }
            exchange = await get_exchange()
            if exchange:
                message = aio_pika.Message(
                    body=json.dumps(event_data).encode(),
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                )
                await exchange.publish(message, routing_key="crm.quotation.pending_approval")
        except Exception:
            pass

    return {
        "quotation": _build_quotation_out(data),
        "approval": {
            "approval_status": approval_status,
            "approval_required": approval_required,
            "discount_pct": round(discount_pct, 2),
            "discount_amount": round(discount_amount, 2),
            "subtotal": round(subtotal, 2),
            "approval_threshold": DISCOUNT_APPROVAL_THRESHOLD,
        },
    }


@router.put("/{id}/approval")
async def decide_quotation_approval(
    id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    org_id: int = Depends(get_current_org_id),
):
    """S6: dedicated manager approval endpoint for locked (over-threshold) quotes."""
    role = token_payload.get("role") or ""
    permissions = token_payload.get("permissions", []) or []
    if role != "Organization Owner" and APPROVAL_REQUIRED_PERMISSION not in permissions:
        raise HTTPException(
            status_code=403,
            detail=f"Only a manager (permission '{APPROVAL_REQUIRED_PERMISSION}') can approve quotations",
        )

    approve = bool(payload.get("approve", False))
    note = payload.get("note") or ""

    from app.quotation_approvals.models import QuotationApproval
    result = await db.execute(
        select(QuotationApproval)
        .filter(
            QuotationApproval.quote_id == id,
            QuotationApproval.organization_id == org_id,
        )
        .order_by(QuotationApproval.id.desc())
    )
    row = result.scalars().first()
    if not row:
        # Auto-create a draft overlay so the decision is always recorded.
        row = QuotationApproval(
            organization_id=org_id,
            quote_id=id,
            quote_number="",
            account="",
            subtotal=0.0,
            discount_amount=0.0,
            discount_pct=0.0,
            approval_threshold=DISCOUNT_APPROVAL_THRESHOLD,
            approval_status="Draft",
            created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        )
        db.add(row)
        await db.flush()

    if row.approval_status == "Approved":
        return {"status": "ok", "approval_status": row.approval_status, "already_decided": True}

    row.approval_status = "Approved" if approve else "Rejected"
    row.approved_by = str(token_payload.get("user_id") or token_payload.get("sub") or "manager")
    row.decided_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    if note:
        row.decided_at = f"{row.decided_at} — {note}"
    await db.commit()

    return {
        "status": "ok",
        "approval_status": row.approval_status,
        "approved_by": row.approved_by,
        "decided_at": row.decided_at,
    }


@router.get("/{id}/approval")
async def get_quotation_approval(
    id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    return await _get_approval_overlay(db, id, organization_id=org_id)


@router.post("", response_model=QuotationOut, status_code=201)
async def create_quotation(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    org_id: int = Depends(get_current_org_id),
):
    token = _get_token(token_payload)
    billing_payload = await _map_crm_payload_to_billing(payload, db, organization_id=org_id)
    try:
        data = await quotations_create(token, billing_payload)
        return _build_quotation_out(data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Billing service error: {str(e)}")


@router.put("/{id}", response_model=QuotationOut)
async def update_quotation(
    id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    org_id: int = Depends(get_current_org_id),
):
    token = _get_token(token_payload)
    billing_payload = await _map_crm_payload_to_billing(payload, db, organization_id=org_id)
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
    org_id: int = Depends(get_current_org_id),
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

    # Carry the quotation line items into the sales order so the inventory
    # fulfillment gets real products instead of a generic consulting package.
    line_items = []
    for item in (quote.get("items") or []):
        line_items.append({
            "product_name": item.get("description") or item.get("product_name") or "Product",
            "sku": item.get("sku") or "",
            "quantity": int(item.get("quantity") or 1),
            "unit_price": float(item.get("unitPrice") or item.get("unit_price") or 0),
        })

    so_id_str = await next_document_id(db, SalesOrder, "SO")

    so = SalesOrder(
        id_str=so_id_str,
        so_no=so_id_str,
        organization_id=org_id,
        owner_id=token_payload.get("user_id"),
        account=account,
        from_quote=quote_no,
        value=str(value),
        eta="",
        date_ordered=datetime.now().strftime("%Y-%m-%d"),
        status="Confirmed",
        owner=token_payload.get("user_id", "Unassigned"),
        line_items=line_items or None,
    )
    db.add(so)
    await db.commit()
    await db.refresh(so)

    # Run the full approval pipeline (credit check -> stock check -> publish
    # crm.order.approved) so the inventory fulfillment starts immediately.
    from app.sales_orders.pipeline import finalize_approved_sales_order
    await finalize_approved_sales_order(db, so, token_payload)

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



