from typing import Any, Dict, List

from fastapi import APIRouter, Depends

from app.auth.oauth2 import get_current_user
from app.database import get_db

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _many(sql: str, params: tuple) -> List[Dict[str, Any]]:
    try:
        with get_db() as connection:
            with connection.cursor() as cur:
                cur.execute(sql, params)
                return cur.fetchall()
    except Exception as e:
        print(f"SQL Error in _many: {e}")
        raise e


@router.get("/")
def get_notifications(current_user: int = Depends(get_current_user)):
    notifications = []
    summary = {
        "overdue_invoices": 0,
        "low_stock_products": 0,
        "expiring_quotes": 0,
        "pending_payments": 0,
    }

    # 1. Overdue Invoices
    invoices = _many("""
        SELECT id, invoice_number, due_date, current_date - due_date AS days_overdue
        FROM invoices
        WHERE owner_id=%s AND status NOT IN ('paid', 'cancelled', 'draft') AND due_date < CURRENT_DATE
        ORDER BY due_date ASC
    """, (current_user,))
    for inv in invoices:
        summary["overdue_invoices"] += 1
        notifications.append({
            "id": f"inv-overdue-{inv['id']}",
            "type": "overdue_invoice",
            "message": f"Invoice {inv['invoice_number'] or 'INV'} is overdue by {inv['days_overdue']} days",
            "url": f"/invoices/{inv['id']}",
            "timestamp": inv["due_date"].isoformat() if inv["due_date"] else "",
        })

    # 2. Invoices Due Soon
    due_soon = _many("""
        SELECT id, invoice_number, due_date, due_date - current_date AS days_left
        FROM invoices
        WHERE owner_id=%s AND status NOT IN ('paid', 'cancelled', 'draft') AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + interval '3 days'
        ORDER BY due_date ASC
    """, (current_user,))
    for inv in due_soon:
        summary["pending_payments"] += 1
        day_str = "tomorrow" if inv['days_left'] == 1 else f"in {inv['days_left']} days"
        if inv['days_left'] == 0:
            day_str = "today"
        notifications.append({
            "id": f"inv-duesoon-{inv['id']}",
            "type": "invoice_due_soon",
            "message": f"Invoice {inv['invoice_number'] or 'INV'} is due {day_str}",
            "url": f"/invoices/{inv['id']}",
            "timestamp": inv["due_date"].isoformat() if inv["due_date"] else "",
        })

    # 3. Low Stock Alert
    products = _many("""
        SELECT id, name, stock, COALESCE(low_stock_threshold, 10) as threshold, created_at
        FROM products
        WHERE owner_id=%s AND stock <= COALESCE(low_stock_threshold, 10)
        ORDER BY stock ASC
    """, (current_user,))
    for p in products:
        summary["low_stock_products"] += 1
        notifications.append({
            "id": f"prod-lowstock-{p['id']}",
            "type": "low_stock",
            "message": f"{p['name']} stock is below threshold ({p['stock']} remaining)",
            "url": f"/products?view={p['id']}",
            "timestamp": p["created_at"].isoformat() if p["created_at"] else "",
        })

    # 4. Quotation Expiring
    quotes = _many("""
        SELECT id, quote_number, valid_until, valid_until - current_date AS days_left
        FROM quotations
        WHERE owner_id=%s AND status IN ('draft', 'sent') AND valid_until IS NOT NULL AND valid_until >= CURRENT_DATE AND valid_until <= CURRENT_DATE + interval '3 days'
        ORDER BY valid_until ASC
    """, (current_user,))
    for q in quotes:
        summary["expiring_quotes"] += 1
        day_str = "tomorrow" if q['days_left'] == 1 else f"in {q['days_left']} days"
        if q['days_left'] == 0:
            day_str = "today"
        notifications.append({
            "id": f"quote-expiring-{q['id']}",
            "type": "quote_expiring",
            "message": f"Quotation {q['quote_number'] or 'QT'} expires {day_str}",
            "url": f"/quotations?view={q['id']}",
            "timestamp": q["valid_until"].isoformat() if q["valid_until"] else "",
        })

    # 5. Payment Received (Last 7 days)
    payments = _many("""
        SELECT p.id, p.amount, p.created_at, i.invoice_number, i.id as invoice_id
        FROM payments p
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE p.owner_id=%s AND p.created_at >= CURRENT_DATE - interval '7 days'
        ORDER BY p.created_at DESC
        LIMIT 10
    """, (current_user,))
    for p in payments:
        notifications.append({
            "id": f"payment-rec-{p['id']}",
            "type": "payment_received",
            "message": f"Payment of ₹{float(p['amount']):.2f} received for {p['invoice_number'] or 'Invoice'}",
            "url": f"/invoices/{p['invoice_id']}" if p['invoice_id'] else "/payments",
            "timestamp": p["created_at"].isoformat() if p["created_at"] else "",
        })

    # 6. New Client Added (Last 7 days)
    clients = _many("""
        SELECT id, name, created_at
        FROM clients
        WHERE owner_id=%s AND created_at >= CURRENT_DATE - interval '7 days'
        ORDER BY created_at DESC
        LIMIT 5
    """, (current_user,))
    for c in clients:
        notifications.append({
            "id": f"client-new-{c['id']}",
            "type": "new_client",
            "message": f"New client {c['name']} was added",
            "url": f"/clients/{c['id']}",
            "timestamp": c["created_at"].isoformat() if c["created_at"] else "",
        })

    # 7. Client Portal Activity (Last 7 days)
    portal_activity = _many("""
        SELECT a.id, a.action, a.description, a.created_at, a.entity_id
        FROM audit_logs a
        WHERE a.owner_id=%s AND a.action IN ('quotation_accepted_by_client', 'quotation_rejected_by_client', 'client_portal_activated')
        AND a.created_at >= CURRENT_DATE - interval '7 days'
        ORDER BY a.created_at DESC
        LIMIT 10
    """, (current_user,))
    for a in portal_activity:
        msg = a["description"]
        url = "/clients"

        if "quotation" in a["action"]:
            url = f"/quotations?view={a['entity_id']}"

        notifications.append({
            "id": f"portal-activity-{a['id']}",
            "type": a["action"],
            "message": msg,
            "url": url,
            "timestamp": a["created_at"].isoformat() if a["created_at"] else "",
        })

    # Sort all notifications by timestamp descending (most recent first)
    notifications.sort(key=lambda x: x["timestamp"] or "1970-01-01", reverse=True)

    return {
        "notifications": notifications,
        "summary": summary,
    }
