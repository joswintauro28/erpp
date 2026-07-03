import base64
import hashlib
import hmac
import json
import os
import uuid
from datetime import date
from decimal import Decimal
import time
from urllib import request as urlrequest
from urllib.error import HTTPError


from fastapi import APIRouter, Depends, HTTPException, Request

from app.database import conn
from app.auth.permissions import require_permission
from app.schemas.payment import Payment, PaymentLinkCreate, PaymentRefundCreate
from app.routers.invoices import recompute_invoice_settlement
from app.security import decrypt_password
from app.services.audit import log_action
from app.email_utils.email_utils import send_email, EmailNotConfigured

router = APIRouter(prefix="/payments", tags=["Payments"])
ACTIVE_PAYMENT_LINK_STATUSES = ("created", "issued", "partially_paid")


def _razorpay_config(owner_id: int):
    """
    Load this company's Razorpay credentials from company_settings.
    Falls back to environment variables for backward-compatibility
    (useful if a super-admin has not yet configured per-company keys).
    Returns (key_id, key_secret, webhook_secret, configured: bool).
    """
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret "
                "FROM company_settings WHERE owner_id = %s",
                (owner_id,),
            )
            row = cursor.fetchone()
    except Exception:
        conn.rollback()
        row = None

    if row and row.get("razorpay_key_id") and row.get("razorpay_key_secret"):
        key_id     = row["razorpay_key_id"]
        key_secret = decrypt_password(row["razorpay_key_secret"])
        webhook_secret = decrypt_password(row["razorpay_webhook_secret"]) if row.get("razorpay_webhook_secret") else None
        return key_id, key_secret, webhook_secret, bool(key_id and key_secret)

    # Fallback: system-level env vars (shared account — legacy mode)
    key_id     = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    return key_id, key_secret, webhook_secret, bool(key_id and key_secret)


def _money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def _payment_link_response(link: dict, provider_configured: bool, reused: bool = False) -> dict:
    if not provider_configured:
        return {"data": {"message": "Payment link recorded locally. Configure Razorpay to generate actual payment URLs.", "reused": reused}}
    return {"data": {"id": link["razorpay_link_id"], "short_url": link["short_url"], "status": link["status"], "reused": reused}}


def _razorpay_request_with_retry(req: urlrequest.Request, max_retries: int = 3):
    last_exc = None
    for attempt in range(max_retries):
        try:
            with urlrequest.urlopen(req, timeout=20) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            # Don't retry on 4xx client errors
            if 400 <= exc.code < 500:
                detail = exc.read().decode("utf-8")
                raise HTTPException(status_code=502, detail=f"Razorpay error: {detail}")
            last_exc = exc
        except Exception as exc:
            last_exc = exc
        time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s
    
    if isinstance(last_exc, HTTPError):
        detail = last_exc.read().decode("utf-8")
        raise HTTPException(status_code=502, detail=f"Razorpay error after retries: {detail}")
    raise HTTPException(status_code=502, detail=f"Razorpay request failed after retries: {last_exc}")


def _invoice_for_payment(invoice_id: int, owner_id: int):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT invoices.*, clients.name AS client_name, clients.email AS client_email, clients.phone AS client_phone
            FROM invoices
            JOIN clients ON invoices.client_id = clients.id
            WHERE invoices.id=%s AND invoices.owner_id=%s
            """,
            (invoice_id, owner_id),
        )
        invoice = cursor.fetchone()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


def _active_payment_link(invoice_id: int, owner_id: int):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT *
            FROM payment_links
            WHERE invoice_id=%s
              AND owner_id=%s
              AND LOWER(COALESCE(status, 'created')) = ANY(%s)
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (invoice_id, owner_id, list(ACTIVE_PAYMENT_LINK_STATUSES)),
        )
        return cursor.fetchone()


def _record_payment(
    invoice_id,
    owner_id,
    amount,
    method,
    provider="manual",
    provider_payment_id=None,
    reference_id=None,
    notes=None,
    payment_date=None,
    audit_action="create",
    audit_description=None,
):
    invoice = _invoice_for_payment(invoice_id, owner_id)
    outstanding = _money(invoice.get("balance_due") or invoice.get("total") or invoice.get("amount"))
    amount = _money(amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
    if amount > outstanding:
        raise HTTPException(status_code=400, detail="Payment exceeds outstanding balance")

    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_id, provider,
                                  provider_payment_id, notes, owner_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (invoice_id, amount, method, payment_date or date.today(), reference_id, provider, provider_payment_id, notes, owner_id),
        )
        payment = cursor.fetchone()
    conn.commit()
    recompute_invoice_settlement(invoice_id, owner_id)
    log_action(
        owner_id,
        owner_id,
        audit_action,
        "payment",
        payment["id"],
        audit_description or f"Payment created for invoice {invoice.get('invoice_number') or invoice_id}",
        {
            "invoice_id": invoice_id,
            "invoice_number": invoice.get("invoice_number"),
            "amount": payment.get("amount"),
            "method": payment.get("payment_method"),
            "provider": payment.get("provider"),
            "reference_id": payment.get("reference_id"),
        },
    )
    return payment


@router.post("/")
def create_payment(payment: Payment, current_user: int = Depends(require_permission('payments.create'))):
    new_payment = _record_payment(
        payment.invoice_id,
        current_user,
        payment.amount,
        payment.payment_method,
        reference_id=payment.reference_id,
        notes=payment.notes,
        payment_date=payment.payment_date,
    )
    
    # Phase 4: Email Receipts for manual payments
    try:
        invoice = _invoice_for_payment(payment.invoice_id, current_user)
        if invoice and invoice.get("client_email"):
            subject = f"Payment Receipt for Invoice {invoice.get('invoice_number') or payment.invoice_id}"
            body = f"Hello {invoice.get('client_name') or 'Customer'},\n\nWe have successfully received your manual payment of Rs.{payment.amount} for Invoice {invoice.get('invoice_number') or payment.invoice_id}.\n\nThank you for your business!"
            send_email(current_user, invoice["client_email"], subject, body)
    except EmailNotConfigured:
        pass
    except Exception as e:
        print(f"Failed to send email receipt: {e}")
        
    return {"data": new_payment}


@router.get("/")
def get_payments(current_user: int = Depends(require_permission('payments.view'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT p.*, i.invoice_number, c.name AS client_name
            FROM payments p
            JOIN invoices i ON p.invoice_id = i.id
            JOIN clients c ON i.client_id = c.id
            WHERE p.owner_id=%s
            ORDER BY p.created_at DESC
            """,
            (current_user,),
        )
        payments = cursor.fetchall()
    return {"data": payments}


@router.get("/outstanding-invoices")
def outstanding_invoices(current_user: int = Depends(require_permission('payments.view'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT i.id, i.invoice_number, i.total, i.paid_amount, i.balance_due, i.due_date,
                   i.status, c.name AS client_name
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            WHERE i.owner_id=%s AND COALESCE(i.balance_due, i.amount) > 0 AND i.status <> 'cancelled'
            ORDER BY i.due_date ASC NULLS LAST
            """,
            (current_user,),
        )
        invoices = cursor.fetchall()
    return {"data": invoices}


@router.get("/reports/summary")
def payment_report(current_user: int = Depends(require_permission('payments.view'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT 
                COALESCE(SUM(amount), 0) AS total_collected,
                COUNT(*) AS payment_count,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN amount ELSE 0 END), 0) AS collected_today,
                COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) AS collected_this_month,
                COALESCE(SUM(CASE WHEN date_trunc('year', created_at) = date_trunc('year', CURRENT_DATE) THEN amount ELSE 0 END), 0) AS collected_this_year,
                COALESCE(SUM(refunded_amount), 0) AS total_refunded
            FROM payments
            WHERE owner_id=%s AND COALESCE(status, 'completed') NOT IN ('failed')
            """,
            (current_user,),
        )
        collected = cursor.fetchone()
        
        cursor.execute(
            """
            SELECT COUNT(*) AS failed_count
            FROM payment_links
            WHERE owner_id=%s AND status = 'failed'
            """,
            (current_user,),
        )
        failed_links = cursor.fetchone()

        cursor.execute(
            """
            SELECT COALESCE(SUM(balance_due),0) AS outstanding,
                   COUNT(*) FILTER (WHERE balance_due > 0) AS outstanding_count
            FROM invoices
            WHERE owner_id=%s AND status <> 'cancelled'
            """,
            (current_user,),
        )
        outstanding = cursor.fetchone()
        
        cursor.execute(
            """
            SELECT provider, COUNT(*) as count, SUM(amount) as total
            FROM payments
            WHERE owner_id=%s
            GROUP BY provider
            """,
            (current_user,),
        )
        by_gateway = cursor.fetchall()
        
        cursor.execute(
            """
            SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(amount) as total
            FROM payments
            WHERE owner_id=%s
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
            """,
            (current_user,),
        )
        by_month = cursor.fetchall()

    return {
        "data": {
            **collected, 
            **outstanding, 
            "failed_count": failed_links["failed_count"],
            "by_gateway": by_gateway,
            "by_month": by_month
        }
    }


@router.post("/links")
def create_payment_link(payload: PaymentLinkCreate, current_user: int = Depends(require_permission('payments.create'))):
    invoice = _invoice_for_payment(payload.invoice_id, current_user)
    outstanding = _money(invoice.get("balance_due") or invoice.get("total") or invoice.get("amount"))
    amount = _money(payload.amount or outstanding)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invoice has no outstanding balance")
    if amount > outstanding:
        raise HTTPException(status_code=400, detail="Payment link amount exceeds outstanding balance")

    key_id, key_secret, _, provider_configured = _razorpay_config(current_user)
    existing_link = _active_payment_link(payload.invoice_id, current_user)
    if existing_link and existing_link.get("short_url"):
        log_action(
            current_user,
            current_user,
            "payment_link_generated",
            "invoice",
            payload.invoice_id,
            f"Existing payment link opened for invoice {invoice.get('invoice_number') or payload.invoice_id}",
            {"invoice_id": payload.invoice_id, "amount": existing_link.get("amount"), "status": existing_link.get("status"), "reused": True},
        )
        return _payment_link_response(existing_link, provider_configured, reused=True)
    if existing_link and not provider_configured:
        log_action(
            current_user,
            current_user,
            "payment_link_generated",
            "invoice",
            payload.invoice_id,
            f"Existing payment link opened for invoice {invoice.get('invoice_number') or payload.invoice_id}",
            {"invoice_id": payload.invoice_id, "amount": existing_link.get("amount"), "status": existing_link.get("status"), "reused": True},
        )
        return _payment_link_response(existing_link, provider_configured, reused=True)

    reference_id = f"vexbill-invoice-{payload.invoice_id}-{uuid.uuid4().hex[:8]}"
    provider_payload = None
    razorpay_link_id = None
    short_url = None
    status = "created"

    if provider_configured:
        body = {
            "amount": int(amount * 100),
            "currency": "INR",
            "accept_partial": True,
            "reference_id": reference_id,
            "description": f"Payment for {invoice.get('invoice_number') or payload.invoice_id}",
            "customer": {
                "name": invoice.get("client_name") or "Customer",
                "email": invoice.get("client_email") or "",
                "contact": invoice.get("client_phone") or "",
            },
            "notify": {"sms": False, "email": True},
        }
        if payload.callback_url:
            body["callback_url"] = payload.callback_url
            body["callback_method"] = "get"
        request_body = json.dumps(body).encode("utf-8")
        req = urlrequest.Request(
            "https://api.razorpay.com/v1/payment_links/",
            data=request_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        token = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
        req.add_header("Authorization", f"Basic {token}")
        
        provider_payload = _razorpay_request_with_retry(req)
        razorpay_link_id = provider_payload.get("id")
        short_url = provider_payload.get("short_url")
        status = provider_payload.get("status") or status

    provider_payload_json = json.dumps(provider_payload) if provider_payload else None
    with conn.cursor() as cursor:
        if existing_link:
            cursor.execute(
                """
                UPDATE payment_links
                SET razorpay_link_id=%s, short_url=%s, amount=%s, status=%s, reference_id=%s,
                    provider_payload=%s, updated_at=CURRENT_TIMESTAMP
                WHERE id=%s AND owner_id=%s
                RETURNING *
                """,
                (razorpay_link_id, short_url, amount, status, reference_id, provider_payload_json, existing_link["id"], current_user),
            )
        else:
            cursor.execute(
                """
                INSERT INTO payment_links (invoice_id, razorpay_link_id, short_url, amount, status, reference_id, provider_payload, owner_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (payload.invoice_id, razorpay_link_id, short_url, amount, status, reference_id, provider_payload_json, current_user),
            )
        link = cursor.fetchone()
    conn.commit()
    log_action(
        current_user,
        current_user,
        "payment_link_generated",
        "invoice",
        payload.invoice_id,
        f"Payment link generated for invoice {invoice.get('invoice_number') or payload.invoice_id}",
        {
            "payment_link_id": link.get("id"),
            "invoice_id": payload.invoice_id,
            "amount": link.get("amount"),
            "status": link.get("status"),
            "provider_configured": provider_configured,
            "reused": False,
        },
    )
    return _payment_link_response(link, provider_configured)


@router.get("/links")
def get_payment_links(current_user: int = Depends(require_permission('payments.view'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT pl.*, i.invoice_number, c.name AS client_name
            FROM payment_links pl
            JOIN invoices i ON pl.invoice_id = i.id
            JOIN clients c ON i.client_id = c.id
            WHERE pl.owner_id=%s
            ORDER BY pl.created_at DESC
            """,
            (current_user,),
        )
        links = cursor.fetchall()
    return {"data": links}


@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request):
    body = await request.body()
    event = json.loads(body.decode("utf-8") or "{}")
    payload_data = event.get("payload", {})
    payment_link_entity = payload_data.get("payment_link", {}).get("entity", {})
    payment_entity      = payload_data.get("payment", {}).get("entity", {})
    link_id             = payment_link_entity.get("id")
    reference_id        = payment_link_entity.get("reference_id")
    provider_payment_id = payment_entity.get("id")
    amount_paid         = payment_entity.get("amount") or payment_link_entity.get("amount_paid")

    if not (link_id or reference_id):
        return {"message": "ignored"}

    # Identify which payment link (and therefore which company) this webhook belongs to
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT pl.*, i.owner_id
            FROM payment_links pl
            JOIN invoices i ON pl.invoice_id = i.id
            WHERE pl.razorpay_link_id=%s OR pl.reference_id=%s
            ORDER BY CASE WHEN pl.razorpay_link_id=%s THEN 0 ELSE 1 END, pl.id DESC
            LIMIT 1
            """,
            (link_id, reference_id, link_id),
        )
        link = cursor.fetchone()

    if not link:
        return {"message": "payment link not found"}

    # Validate signature using THIS company's webhook secret
    _, _, webhook_secret, _ = _razorpay_config(link["owner_id"])
    signature = request.headers.get("x-razorpay-signature")
    if webhook_secret:
        expected = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=400, detail="Invalid Razorpay signature")

    event_type = event.get("event")
    
    if event_type == "payment.failed":
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE payment_links SET status='failed', updated_at=CURRENT_TIMESTAMP WHERE id=%s",
                (link["id"],),
            )
        conn.commit()
        log_action(
            link["owner_id"],
            link["owner_id"],
            "payment_failed",
            "payment_link",
            link["id"],
            f"Payment failed for invoice {link['invoice_id']}",
            {"provider_payment_id": provider_payment_id, "amount": amount_paid},
        )
        return {"message": "processed failure"}

    # Update payment link status
    with conn.cursor() as cursor:
        cursor.execute(
            "UPDATE payment_links SET status=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s",
            (payment_link_entity.get("status") or "paid", link["id"]),
        )
    conn.commit()

    if amount_paid and provider_payment_id and event_type in ("payment.captured", "payment_link.paid"):
        amount = _money(Decimal(str(amount_paid)) / Decimal("100"))
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM payments WHERE provider='razorpay' AND provider_payment_id=%s AND owner_id=%s",
                (provider_payment_id, link["owner_id"]),
            )
            exists = cursor.fetchone()
        if not exists:
            new_payment = _record_payment(
                link["invoice_id"], link["owner_id"], amount, "Razorpay",
                provider="razorpay", provider_payment_id=provider_payment_id, reference_id=reference_id,
                audit_action="razorpay_payment_received",
                audit_description=f"Razorpay payment received for invoice {link['invoice_id']}",
            )
            
            # Phase 4: Email Receipts
            try:
                invoice = _invoice_for_payment(link["invoice_id"], link["owner_id"])
                if invoice and invoice.get("client_email"):
                    subject = f"Payment Receipt for Invoice {invoice.get('invoice_number') or invoice['id']}"
                    body = f"Hello {invoice.get('client_name') or 'Customer'},\n\nWe have successfully received your payment of Rs.{amount} for Invoice {invoice.get('invoice_number') or invoice['id']}.\n\nReference: {provider_payment_id}\n\nThank you for your business!"
                    send_email(link["owner_id"], invoice["client_email"], subject, body)
            except EmailNotConfigured:
                pass
            except Exception as e:
                print(f"Failed to send email receipt: {e}")

    return {"message": "processed"}


@router.post("/{id}/refund")
def refund_payment(id: int, payload: PaymentRefundCreate, current_user: int = Depends(require_permission('payments.delete'))):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM payments WHERE id=%s AND owner_id=%s", (id, current_user))
        payment = cursor.fetchone()
        
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.get("provider") != "razorpay" or not payment.get("provider_payment_id"):
        raise HTTPException(status_code=400, detail="Only Razorpay payments can be refunded via this gateway")
    if payment.get("status") == "refunded":
        raise HTTPException(status_code=400, detail="Payment is already fully refunded")
        
    payment_amount = _money(payment.get("amount") or 0)
    refunded_amount = _money(payment.get("refunded_amount") or 0)
    available_to_refund = payment_amount - refunded_amount
    
    amount_to_refund = _money(payload.amount or available_to_refund)
    
    if amount_to_refund <= 0:
        raise HTTPException(status_code=400, detail="Invalid refund amount")
    if amount_to_refund > available_to_refund:
        raise HTTPException(status_code=400, detail=f"Refund amount ({amount_to_refund}) exceeds available amount ({available_to_refund})")

    key_id, key_secret, _, provider_configured = _razorpay_config(current_user)
    if not provider_configured:
        raise HTTPException(status_code=400, detail="Razorpay is not configured")

    body = {}
    if amount_to_refund < payment_amount:
        body["amount"] = int(amount_to_refund * 100)
        
    request_body = json.dumps(body).encode("utf-8")
    provider_payment_id = payment["provider_payment_id"]
    
    req = urlrequest.Request(
        f"https://api.razorpay.com/v1/payments/{provider_payment_id}/refunds",
        data=request_body if body else b"{}",
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    token = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
    req.add_header("Authorization", f"Basic {token}")
    
    provider_payload = _razorpay_request_with_retry(req)

    new_refunded_amount = refunded_amount + amount_to_refund
    new_status = "refunded" if new_refunded_amount >= payment_amount else "partially_refunded"

    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE payments 
            SET refunded_amount=%s, status=%s
            WHERE id=%s AND owner_id=%s
            RETURNING *
            """,
            (new_refunded_amount, new_status, id, current_user),
        )
        updated_payment = cursor.fetchone()
    conn.commit()

    recompute_invoice_settlement(payment["invoice_id"], current_user)

    log_action(
        current_user,
        current_user,
        "payment_refunded",
        "payment",
        id,
        f"Refunded {amount_to_refund} for payment {id} (Invoice {payment['invoice_id']})",
        {
            "amount_refunded": str(amount_to_refund),
            "razorpay_refund_id": provider_payload.get("id"),
            "new_status": new_status,
        },
    )

    return {"message": "Refund processed successfully", "data": updated_payment}


@router.get("/{id}")
def get_payment(id: int, current_user: int = Depends(require_permission('payments.view'))):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM payments WHERE id=%s AND owner_id=%s", (id, current_user))
        payment = cursor.fetchone()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"data": payment}


@router.delete("/{id}")
def delete_payment(id: int, current_user: int = Depends(require_permission('payments.delete'))):
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM payments WHERE id=%s AND owner_id=%s RETURNING *", (id, current_user))
        deleted_payment = cursor.fetchone()
    if deleted_payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    conn.commit()
    recompute_invoice_settlement(deleted_payment["invoice_id"], current_user)
    return {"message": "Payment deleted"}
