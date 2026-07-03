from fastapi import APIRouter, Depends

from app.database import conn
from app.auth.permissions import require_permission

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _one(sql, params):
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchone()
    except Exception as e:
        conn.rollback()
        print(f"Dashboard SQL Error in _one: {e}")
        raise e


def _many(sql, params):
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()
    except Exception as e:
        conn.rollback()
        print(f"Dashboard SQL Error in _many: {e}")
        raise e


@router.get("/stats")
def get_stats(current_user: int = Depends(require_permission('reports.view'))):
    counts = _one(
        """
        SELECT
            (SELECT COUNT(*) FROM clients WHERE owner_id=%s) AS total_clients,
            (SELECT COUNT(*) FROM invoices WHERE owner_id=%s) AS total_invoices,
            (SELECT COUNT(*) FROM invoices WHERE owner_id=%s AND balance_due > 0 AND due_date < CURRENT_DATE AND status <> 'cancelled') AS overdue_invoices,
            (SELECT COUNT(*) FROM leads WHERE owner_id=%s) AS total_leads,
            (SELECT COUNT(*) FROM leads WHERE owner_id=%s AND converted_client_id IS NOT NULL) AS converted_leads,
            (SELECT COUNT(*) FROM products WHERE owner_id=%s) AS total_products,
            (SELECT COALESCE(SUM(stock * COALESCE(cost_price, 0)), 0) FROM products WHERE owner_id=%s AND COALESCE(track_inventory, TRUE) = TRUE) AS inventory_value,
            (SELECT COUNT(*) FROM products WHERE owner_id=%s AND COALESCE(track_inventory, TRUE) = TRUE AND stock <= COALESCE(low_stock_threshold, 10)) AS low_stock_count,
            (SELECT COUNT(*) FROM stock_movements WHERE owner_id=%s AND movement_type='In') AS stock_in,
            (SELECT COUNT(*) FROM stock_movements WHERE owner_id=%s AND movement_type='Out') AS stock_out,
            (SELECT COALESCE(SUM(total), 0) FROM quotations WHERE owner_id=%s AND status IN ('draft', 'sent', 'accepted') AND invoice_id IS NULL) AS total_quotation_value,
            (SELECT COUNT(*) FROM quotations WHERE owner_id=%s AND status IN ('draft', 'sent')) AS active_quotations,
            (SELECT COUNT(*) FROM quotations WHERE owner_id=%s AND status = 'accepted') AS accepted_quotations,
            (SELECT COUNT(*) FROM quotations WHERE owner_id=%s) AS total_quotations
        """,
        (current_user, current_user, current_user, current_user, current_user,
         current_user, current_user, current_user, current_user, current_user,
         current_user, current_user, current_user, current_user),
    )
    money = _one(
        """
        SELECT COALESCE(SUM(p.amount),0) AS total_revenue,
               COALESCE((SELECT SUM(balance_due) FROM invoices WHERE owner_id=%s AND status <> 'cancelled'),0) AS outstanding_amount,
               COALESCE((SELECT SUM(total) FROM invoices WHERE owner_id=%s AND status <> 'cancelled'),0) AS billed_amount
        FROM payments p
        WHERE p.owner_id=%s AND COALESCE(p.status, 'completed')='completed'
        """,
        (current_user, current_user, current_user),
    )
    pending = _one(
        """
        SELECT COUNT(*) AS pending_invoices
        FROM invoices
        WHERE owner_id=%s AND balance_due > 0 AND status <> 'cancelled'
        """,
        (current_user,),
    )
    conversion_rate = 0
    if counts["total_leads"]:
        conversion_rate = round((counts["converted_leads"] / counts["total_leads"]) * 100, 2)
        
    quotation_conversion_rate = 0
    if counts["total_quotations"]:
        quotation_conversion_rate = round((counts["accepted_quotations"] / counts["total_quotations"]) * 100, 2)
        
    return {
        **counts,
        **money,
        **pending,
        "lead_conversion_rate": conversion_rate,
        "quotation_conversion_rate": quotation_conversion_rate,
        "total_revenue": float(money["total_revenue"]),
        "outstanding_amount": float(money["outstanding_amount"]),
        "billed_amount": float(money["billed_amount"]),
        "inventory_value": float(counts["inventory_value"]),
        "total_quotation_value": float(counts["total_quotation_value"]),
    }


@router.get("/summary")
def report_summary(current_user: int = Depends(require_permission('reports.view'))):
    row = _one(
        """
        SELECT COALESCE((SELECT SUM(amount) FROM payments WHERE owner_id=%s AND COALESCE(status, 'completed')='completed'),0) AS revenue,
               COALESCE((SELECT SUM(amount) FROM expenses WHERE owner_id=%s),0) AS expenses
        """,
        (current_user, current_user),
    )
    revenue = row["revenue"]
    expenses = row["expenses"]
    return {"revenue": float(revenue), "expenses": float(expenses), "profit": float(revenue - expenses)}


@router.get("/revenue-trend")
def revenue_trend(current_user: int = Depends(require_permission('reports.view'))):
    return _many(
        """
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, SUM(amount) AS revenue
        FROM payments
        WHERE owner_id=%s AND COALESCE(status, 'completed')='completed'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY TO_CHAR(created_at, 'YYYY-MM')
        """,
        (current_user,),
    )


@router.get("/invoice-summary")
def invoice_summary(current_user: int = Depends(require_permission('reports.view'))):
    rows = _many(
        """
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
        WHERE owner_id=%s
        GROUP BY 1
        """,
        (current_user,),
    )
    total = sum(row["count"] for row in rows)
    if total == 0:
        return {"paid": 0, "pending": 0, "partially_paid": 0, "overdue": 0, "cancelled": 0}
    return {row["status"]: round((row["count"] / total) * 100, 2) for row in rows}


@router.get("/recent-invoices")
def recent_invoices(current_user: int = Depends(require_permission('reports.view'))):
    return _many(
        """
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
        WHERE i.owner_id=%s
        ORDER BY i.created_at DESC
        LIMIT 5
        """,
        (current_user,),
    )


@router.get("/client-growth")
def client_growth(current_user: int = Depends(require_permission('reports.view'))):
    return _many(
        """
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS clients
        FROM clients
        WHERE owner_id=%s
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY TO_CHAR(created_at, 'YYYY-MM')
        """,
        (current_user,),
    )


@router.get("/payment-analytics")
def payment_analytics(current_user: int = Depends(require_permission('reports.view'))):
    return _many(
        """
        SELECT COALESCE(payment_method, provider, 'Unknown') AS method, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount
        FROM payments
        WHERE owner_id=%s AND COALESCE(status, 'completed')='completed'
        GROUP BY COALESCE(payment_method, provider, 'Unknown')
        ORDER BY amount DESC
        """,
        (current_user,),
    )


@router.get("/recent-stock-movements")
def recent_stock_movements(current_user: int = Depends(require_permission('reports.view'))):
    return _many(
        """
        SELECT sm.id, sm.invoice_id, sm.product_id, sm.movement_type, sm.quantity, sm.reference, sm.created_at,
               p.name AS product_name, p.sku
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        WHERE sm.owner_id=%s
        ORDER BY sm.created_at DESC NULLS LAST, sm.id DESC
        LIMIT 5
        """,
        (current_user,),
    )


@router.get("/inventory-summary")
def inventory_summary(current_user: int = Depends(require_permission('reports.view'))):
    """Returns inventory widgets: pending POs, expiring batches, warehouse distribution."""
    # Pending purchase orders
    pending_pos = _one(
        """
        SELECT COUNT(*) AS count,
               COALESCE(SUM(total), 0) AS total_value
        FROM purchase_orders
        WHERE owner_id=%s AND status IN ('draft', 'sent')
        """,
        (current_user,),
    )

    # Batches expiring within 30 days
    expiring_batches = _many(
        """
        SELECT pb.id, pb.batch_number, pb.expiry_date, pb.quantity,
               p.name AS product_name, p.sku,
               w.name AS warehouse_name
        FROM product_batches pb
        JOIN products p ON pb.product_id = p.id
        LEFT JOIN warehouses w ON pb.warehouse_id = w.id
        WHERE pb.owner_id=%s
          AND pb.expiry_date IS NOT NULL
          AND pb.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
          AND pb.quantity > 0
        ORDER BY pb.expiry_date ASC
        LIMIT 20
        """,
        (current_user,),
    )

    # Stock distribution by warehouse
    warehouse_distribution = _many(
        """
        SELECT w.name AS warehouse_name, COALESCE(SUM(ws.quantity), 0) AS total_quantity
        FROM warehouses w
        LEFT JOIN warehouse_stock ws ON ws.warehouse_id = w.id
        WHERE w.owner_id=%s AND w.status = 'active'
        GROUP BY w.id, w.name
        ORDER BY total_quantity DESC
        """,
        (current_user,),
    )

    return {
        "pending_purchase_orders": {
            "count": pending_pos["count"],
            "total_value": float(pending_pos["total_value"]),
        },
        "expiring_batches": expiring_batches,
        "expiring_batches_count": len(expiring_batches),
        "warehouse_distribution": warehouse_distribution,
    }
