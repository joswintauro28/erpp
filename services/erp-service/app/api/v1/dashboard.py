from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.schemas.invoice import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def stats(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    from app.services.invoice_service import get_dashboard_stats
    res = get_dashboard_stats(db, user_id)
    return res


@router.get("/recent-invoices")
def recent_invoices(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("""
        SELECT i.id, i.invoice_number, c.name AS client_name, i.total AS amount,
               CASE
                   WHEN i.status='cancelled' THEN 'cancelled'
                   WHEN i.balance_due <= 0 THEN 'paid'
                   WHEN i.paid_amount > 0 THEN 'partially_paid'
                   WHEN i.due_date < CURRENT_DATE THEN 'overdue'
                   ELSE 'pending'
               END AS status,
               i.created_at
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        WHERE i.owner_id = :user_id
        ORDER BY i.created_at DESC
        LIMIT 5
        """),
        {"user_id": user_id}
    ).mappings().all()
    
    formatted = []
    for r in result:
        item = dict(r)
        if item.get("created_at"):
            item["created_at"] = item["created_at"].isoformat()
        formatted.append(item)
    return formatted


@router.get("/revenue-trend")
def revenue_trend(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("""
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, SUM(amount) AS revenue
        FROM payments
        WHERE owner_id = :user_id AND COALESCE(status, 'completed') = 'completed'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY TO_CHAR(created_at, 'YYYY-MM')
        """),
        {"user_id": user_id}
    ).mappings().all()
    return [dict(r) for r in result]


@router.get("/invoice-summary")
def invoice_summary(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
        SELECT
            CASE
                WHEN status='cancelled' THEN 'cancelled'
                WHEN balance_due <= 0 THEN 'paid'
                WHEN paid_amount > 0 THEN 'partially_paid'
                WHEN due_date < CURRENT_DATE THEN 'overdue'
                ELSE 'pending'
            END AS status,
            COUNT(*) AS count
        FROM invoices
        WHERE owner_id = :user_id
        GROUP BY 1
        """),
        {"user_id": user_id}
    ).mappings().all()
    
    total = sum(r["count"] for r in rows)
    if total == 0:
        return {"paid": 0, "pending": 0, "partially_paid": 0, "overdue": 0, "cancelled": 0}
    return {r["status"]: round((r["count"] / total) * 100, 2) for r in rows}


@router.get("/client-growth")
def client_growth(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("""
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS clients
        FROM clients
        WHERE owner_id = :user_id
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY TO_CHAR(created_at, 'YYYY-MM')
        """),
        {"user_id": user_id}
    ).mappings().all()
    return [dict(r) for r in result]


@router.get("/payment-analytics")
def payment_analytics(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("""
        SELECT COALESCE(payment_method, 'Unknown') AS method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
        FROM payments
        WHERE owner_id = :user_id AND COALESCE(status, 'completed') = 'completed'
        GROUP BY COALESCE(payment_method, 'Unknown')
        ORDER BY amount DESC
        """),
        {"user_id": user_id}
    ).mappings().all()
    return [dict(r) for r in result]


@router.get("/recent-stock-movements")
def recent_stock_movements(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    try:
        result = db.execute(
            text("""
            SELECT sm.id, sm.invoice_id, sm.product_id, sm.movement_type, sm.quantity, sm.reference, sm.created_at,
                   p.name AS product_name
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            WHERE sm.owner_id = :user_id
            ORDER BY sm.created_at DESC NULLS LAST, sm.id DESC
            LIMIT 5
            """),
            {"user_id": user_id}
        ).mappings().all()
        
        formatted = []
        for r in result:
            item = dict(r)
            if item.get("created_at"):
                item["created_at"] = item["created_at"].isoformat()
            formatted.append(item)
        return formatted
    except Exception:
        db.rollback()
        return []


@router.get("/inventory-summary")
def inventory_summary(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    pending_pos_count = 0
    pending_pos_value = 0.0
    expiring_batches = []
    warehouse_distribution = []
    
    try:
        pending_pos = db.execute(
            text("SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total_value FROM purchase_orders WHERE owner_id = :user_id AND status IN ('draft', 'sent')"),
            {"user_id": user_id}
        ).mappings().first()
        if pending_pos:
            pending_pos_count = pending_pos["count"]
            pending_pos_value = float(pending_pos["total_value"])
    except Exception:
        db.rollback()
        
    try:
        expiring = db.execute(
            text("""
            SELECT pb.id, pb.batch_number, pb.expiry_date, pb.quantity, p.name AS product_name
            FROM product_batches pb
            JOIN products p ON pb.product_id = p.id
            WHERE pb.owner_id = :user_id AND pb.expiry_date IS NOT NULL
              AND pb.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
              AND pb.quantity > 0
            ORDER BY pb.expiry_date ASC
            LIMIT 20
            """),
            {"user_id": user_id}
        ).mappings().all()
        for r in expiring:
            item = dict(r)
            if item.get("expiry_date"):
                item["expiry_date"] = item["expiry_date"].isoformat()
            expiring_batches.append(item)
    except Exception:
        db.rollback()
        
    try:
        distribution = db.execute(
            text("""
            SELECT w.name AS warehouse_name, COALESCE(SUM(ws.quantity), 0) AS total_quantity
            FROM warehouses w
            LEFT JOIN warehouse_stock ws ON ws.warehouse_id = w.id
            WHERE w.owner_id = :user_id AND w.status = 'active'
            GROUP BY w.id, w.name
            ORDER BY total_quantity DESC
            """),
            {"user_id": user_id}
        ).mappings().all()
        warehouse_distribution = [dict(r) for r in distribution]
    except Exception:
        db.rollback()

    return {
        "pending_purchase_orders": {
            "count": pending_pos_count,
            "total_value": pending_pos_value,
        },
        "expiring_batches": expiring_batches,
        "expiring_batches_count": len(expiring_batches),
        "warehouse_distribution": warehouse_distribution,
    }


@router.get("/summary")
def report_summary(
    user_id: int = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
        SELECT 
            COALESCE((SELECT SUM(amount) FROM payments WHERE owner_id = :user_id AND COALESCE(status, 'completed') = 'completed'), 0) AS revenue,
            COALESCE((SELECT SUM(amount) FROM expenses WHERE owner_id = :user_id), 0) AS expenses
        """),
        {"user_id": user_id}
    ).mappings().first()
    
    revenue = float(row["revenue"]) if row else 0.0
    expenses = float(row["expenses"]) if row else 0.0
    return {"revenue": revenue, "expenses": expenses, "profit": revenue - expenses}
