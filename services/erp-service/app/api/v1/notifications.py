from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def get_notifications(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    notifications = []
    summary = {
        "overdue_invoices": 0,
        "low_stock_products": 0,
        "expiring_quotes": 0,
        "pending_payments": 0,
    }

    # 1. Overdue Invoices
    try:
        invoices = db.execute(
            text("""
            SELECT id, invoice_number, due_date, CURRENT_DATE - due_date AS days_overdue
            FROM invoices
            WHERE owner_id = :user_id AND status NOT IN ('paid', 'cancelled', 'draft') AND due_date < CURRENT_DATE
            ORDER BY due_date ASC
            """),
            {"user_id": user_id}
        ).mappings().all()
        
        for inv in invoices:
            summary["overdue_invoices"] += 1
            notifications.append({
                "id": f"inv-overdue-{inv['id']}",
                "type": "overdue_invoice",
                "message": f"Invoice {inv['invoice_number'] or 'INV'} is overdue by {inv['days_overdue']} days",
                "url": f"/billing/invoices/{inv['id']}",
                "timestamp": inv["due_date"].isoformat() if inv["due_date"] else "",
            })
    except Exception:
        db.rollback()

    # 2. Invoices Due Soon
    try:
        due_soon = db.execute(
            text("""
            SELECT id, invoice_number, due_date, due_date - CURRENT_DATE AS days_left
            FROM invoices
            WHERE owner_id = :user_id AND status NOT IN ('paid', 'cancelled', 'draft') 
              AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '3 days'
            ORDER BY due_date ASC
            """),
            {"user_id": user_id}
        ).mappings().all()
        
        for inv in due_soon:
            summary["pending_payments"] += 1
            day_str = "tomorrow" if inv['days_left'] == 1 else f"in {inv['days_left']} days"
            if inv['days_left'] == 0:
                day_str = "today"
            notifications.append({
                "id": f"inv-duesoon-{inv['id']}",
                "type": "invoice_due_soon",
                "message": f"Invoice {inv['invoice_number'] or 'INV'} is due {day_str}",
                "url": f"/billing/invoices/{inv['id']}",
                "timestamp": inv["due_date"].isoformat() if inv["due_date"] else "",
            })
    except Exception:
        db.rollback()

    # 3. Low Stock Alert
    try:
        products = db.execute(
            text("""
            SELECT id, name, stock, COALESCE(low_stock_threshold, 10) as threshold, created_at
            FROM products
            WHERE owner_id = :user_id AND stock <= COALESCE(low_stock_threshold, 10)
            ORDER BY stock ASC
            """),
            {"user_id": user_id}
        ).mappings().all()
        
        for p in products:
            summary["low_stock_products"] += 1
            notifications.append({
                "id": f"prod-lowstock-{p['id']}",
                "type": "low_stock",
                "message": f"{p['name']} stock is below threshold ({p['stock']} remaining)",
                "url": f"/inventory/products?view={p['id']}",
                "timestamp": p["created_at"].isoformat() if p["created_at"] else "",
            })
    except Exception:
        db.rollback()

    # 4. Quotation Expiring
    try:
        quotes = db.execute(
            text("""
            SELECT id, quote_number, valid_until, valid_until - CURRENT_DATE AS days_left
            FROM quotations
            WHERE owner_id = :user_id AND status IN ('draft', 'sent') 
              AND valid_until IS NOT NULL AND valid_until >= CURRENT_DATE AND valid_until <= CURRENT_DATE + INTERVAL '3 days'
            ORDER BY valid_until ASC
            """),
            {"user_id": user_id}
        ).mappings().all()
        
        for q in quotes:
            summary["expiring_quotes"] += 1
            day_str = "tomorrow" if q['days_left'] == 1 else f"in {q['days_left']} days"
            if q['days_left'] == 0:
                day_str = "today"
            notifications.append({
                "id": f"quote-expiring-{q['id']}",
                "type": "quote_expiring",
                "message": f"Quotation {q['quote_number'] or 'QT'} expires {day_str}",
                "url": f"/billing/quotations?view={q['id']}",
                "timestamp": q["valid_until"].isoformat() if q["valid_until"] else "",
            })
    except Exception:
        db.rollback()

    # 5. Payment Received (Last 7 days)
    try:
        payments = db.execute(
            text("""
            SELECT p.id, p.amount, p.created_at, i.invoice_number, i.id as invoice_id
            FROM payments p
            LEFT JOIN invoices i ON p.invoice_id = i.id
            WHERE p.owner_id = :user_id AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY p.created_at DESC
            LIMIT 10
            """),
            {"user_id": user_id}
        ).mappings().all()
        
        for p in payments:
            notifications.append({
                "id": f"payment-rec-{p['id']}",
                "type": "payment_received",
                "message": f"Payment of ₹{float(p['amount']):.2f} received for {p['invoice_number'] or 'Invoice'}",
                "url": f"/billing/invoices/{p['invoice_id']}" if p['invoice_id'] else "/billing/payments",
                "timestamp": p["created_at"].isoformat() if p["created_at"] else "",
            })
    except Exception:
        db.rollback()

    # 6. New Client Added (Last 7 days)
    try:
        clients = db.execute(
            text("""
            SELECT id, name, created_at
            FROM clients
            WHERE owner_id = :user_id AND created_at >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 5
            """),
            {"user_id": user_id}
        ).mappings().all()
        
        for c in clients:
            notifications.append({
                "id": f"client-new-{c['id']}",
                "type": "new_client",
                "message": f"New client {c['name']} was added",
                "url": f"/crm/clients/{c['id']}",
                "timestamp": c["created_at"].isoformat() if c["created_at"] else "",
            })
    except Exception:
        db.rollback()

    # Sort notifications by timestamp descending
    notifications.sort(key=lambda x: x["timestamp"] or "1970-01-01", reverse=True)

    return {
        "notifications": notifications,
        "summary": summary,
    }
