"""
VexBill AI Tools Layer
All database access for the AI module goes through these functions.
The LLM NEVER generates SQL. Every query is pre-defined and parameterized.
"""
from typing import Dict, Any, List, Optional
from datetime import date, timedelta
from app.database import conn
import traceback


def _one(sql: str, params: tuple) -> Dict[str, Any]:
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            row = cursor.fetchone()
            return dict(row) if row else {}
    except Exception as e:
        conn.rollback()
        print(f"[AI_TOOLS] SQL Error in _one: {e}")
        return {}


def _many(sql: str, params: tuple) -> List[Dict[str, Any]]:
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        conn.rollback()
        print(f"[AI_TOOLS] SQL Error in _many: {e}")
        return []


# ───────────────────────────────── INVENTORY ─────────────────────────────────

def get_inventory_summary(owner_id: int) -> str:
    products = _many(
        """
        SELECT name, stock, low_stock_threshold, price, category
        FROM products
        WHERE owner_id=%s
        ORDER BY name ASC
        """,
        (owner_id,)
    )
    if not products:
        return "Inventory: No products found in the system.\n"

    low_stock = [p for p in products if p['stock'] <= (p['low_stock_threshold'] or 10)]
    total_value = sum(float(p['price'] or 0) * float(p['stock'] or 0) for p in products)

    lines = [f"Inventory Summary ({len(products)} products, Total Value: ₹{total_value:,.2f}):"]
    for p in products:
        is_low = p['stock'] <= (p['low_stock_threshold'] or 10)
        tag = " ⚠️ [LOW STOCK]" if is_low else ""
        lines.append(f"  - {p['name']}: {p['stock']} units (₹{float(p['price'] or 0):,.2f} each){tag}")

    if low_stock:
        lines.append(f"\n⚠️ Low Stock Alert ({len(low_stock)} products):")
        for p in low_stock:
            lines.append(f"  - {p['name']}: Only {p['stock']} units remaining (threshold: {p['low_stock_threshold'] or 10})")

    return "\n".join(lines) + "\n"


def get_low_stock_products(owner_id: int) -> str:
    products = _many(
        """
        SELECT name, stock, low_stock_threshold
        FROM products
        WHERE owner_id=%s AND stock <= COALESCE(low_stock_threshold, 10)
        ORDER BY stock ASC
        """,
        (owner_id,)
    )
    if not products:
        return "Low Stock: All products are adequately stocked.\n"

    lines = [f"⚠️ Low Stock Products ({len(products)}):"]
    for p in products:
        lines.append(f"  - {p['name']}: {p['stock']} units (threshold: {p['low_stock_threshold'] or 10})")
    return "\n".join(lines) + "\n"


# ───────────────────────────────── INVOICES ─────────────────────────────────

def get_overdue_invoices(owner_id: int) -> str:
    invoices = _many(
        """
        SELECT i.invoice_number, i.balance_due, i.due_date, c.name as client_name, i.total
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        WHERE i.owner_id=%s
          AND i.status NOT IN ('cancelled', 'paid')
          AND i.balance_due > 0
          AND i.due_date < CURRENT_DATE
        ORDER BY i.due_date ASC
        LIMIT 15
        """,
        (owner_id,)
    )
    if not invoices:
        return "Overdue Invoices: None. All invoices are current.\n"

    total = sum(float(i['balance_due'] or 0) for i in invoices)
    lines = [f"⚠️ Overdue Invoices ({len(invoices)}, Total: ₹{total:,.2f}):"]
    for i in invoices:
        lines.append(f"  - {i['invoice_number']}: ₹{float(i['balance_due']):,.2f} due on {i['due_date']} (Client: {i['client_name'] or 'Unknown'})")
    return "\n".join(lines) + "\n"


def get_invoice_summary(owner_id: int) -> str:
    stats = _one(
        """
        SELECT
            COUNT(*) FILTER (WHERE status NOT IN ('cancelled','paid') AND balance_due > 0) as unpaid_count,
            COALESCE(SUM(balance_due) FILTER (WHERE status NOT IN ('cancelled','paid') AND balance_due > 0), 0) as total_outstanding,
            COUNT(*) FILTER (WHERE status NOT IN ('cancelled','paid') AND balance_due > 0 AND due_date < CURRENT_DATE) as overdue_count,
            COALESCE(SUM(balance_due) FILTER (WHERE status NOT IN ('cancelled','paid') AND balance_due > 0 AND due_date < CURRENT_DATE), 0) as overdue_amount,
            COUNT(*) as total_invoices
        FROM invoices
        WHERE owner_id=%s
        """,
        (owner_id,)
    )

    recent = _many(
        """
        SELECT i.invoice_number, i.balance_due, i.due_date, i.status, c.name as client_name
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        WHERE i.owner_id=%s AND i.status NOT IN ('cancelled', 'paid') AND i.balance_due > 0
        ORDER BY i.due_date ASC
        LIMIT 10
        """,
        (owner_id,)
    )

    lines = [
        f"Invoice Summary:",
        f"  - Total Invoices: {stats.get('total_invoices', 0)}",
        f"  - Unpaid Invoices: {stats.get('unpaid_count', 0)} (₹{float(stats.get('total_outstanding', 0)):,.2f})",
        f"  - Overdue Invoices: {stats.get('overdue_count', 0)} (₹{float(stats.get('overdue_amount', 0)):,.2f})"
    ]
    if recent:
        lines.append("  Outstanding Invoices:")
        for i in recent:
            overdue_tag = " [OVERDUE]" if i['due_date'] and i['due_date'] < date.today() else ""
            lines.append(f"    - {i['invoice_number']}: ₹{float(i['balance_due']):,.2f} due {i['due_date'] or 'N/A'} ({i['client_name'] or 'Unknown'}){overdue_tag}")
    return "\n".join(lines) + "\n"


# ───────────────────────────────── PAYMENTS ─────────────────────────────────

def get_payment_summary(owner_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> str:
    if start_date and end_date:
        payments = _many(
            """
            SELECT p.amount, p.payment_date, p.provider, i.invoice_number
            FROM payments p
            LEFT JOIN invoices i ON p.invoice_id = i.id
            WHERE p.owner_id=%s AND COALESCE(p.status, 'completed')='completed'
              AND p.payment_date BETWEEN %s AND %s
            ORDER BY p.payment_date DESC
            LIMIT 15
            """,
            (owner_id, start_date, end_date)
        )
        total = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE owner_id=%s AND COALESCE(status, 'completed')='completed' AND payment_date BETWEEN %s AND %s",
            (owner_id, start_date, end_date)
        )
        period = f"from {start_date} to {end_date}"
    else:
        payments = _many(
            """
            SELECT p.amount, p.payment_date, p.provider, i.invoice_number
            FROM payments p
            LEFT JOIN invoices i ON p.invoice_id = i.id
            WHERE p.owner_id=%s AND COALESCE(p.status, 'completed')='completed'
            ORDER BY p.payment_date DESC
            LIMIT 15
            """,
            (owner_id,)
        )
        total = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE owner_id=%s AND COALESCE(status, 'completed')='completed'",
            (owner_id,)
        )
        period = "all time"

    if not payments:
        return f"Payments ({period}): No payments received.\n"

    lines = [f"Payments Received ({period}, Total: ₹{float(total.get('total', 0)):,.2f}):"]
    for p in payments:
        inv = f" for {p['invoice_number']}" if p['invoice_number'] else ""
        lines.append(f"  - ₹{float(p['amount']):,.2f} on {p['payment_date']} via {p['provider'] or 'manual'}{inv}")
    return "\n".join(lines) + "\n"


# ───────────────────────────────── EXPENSES ─────────────────────────────────

def get_expense_summary(owner_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> str:
    if start_date and end_date:
        expenses = _many(
            """
            SELECT category, SUM(amount) as total, COUNT(*) as count
            FROM expenses
            WHERE owner_id=%s AND expense_date BETWEEN %s AND %s
            GROUP BY category
            ORDER BY total DESC
            """,
            (owner_id, start_date, end_date)
        )
        grand = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE owner_id=%s AND expense_date BETWEEN %s AND %s",
            (owner_id, start_date, end_date)
        )
        period = f"from {start_date} to {end_date}"
    else:
        expenses = _many(
            """
            SELECT category, SUM(amount) as total, COUNT(*) as count
            FROM expenses
            WHERE owner_id=%s
            GROUP BY category
            ORDER BY total DESC
            """,
            (owner_id,)
        )
        grand = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE owner_id=%s",
            (owner_id,)
        )
        period = "all time"

    if not expenses:
        return f"Expenses ({period}): No expenses recorded.\n"

    lines = [f"Expenses ({period}, Total: ₹{float(grand.get('total', 0)):,.2f}):"]
    for e in expenses:
        lines.append(f"  - {e['category'] or 'Uncategorized'}: ₹{float(e['total']):,.2f} ({e['count']} entries)")
    return "\n".join(lines) + "\n"


# ─────────────────────────────── CLIENTS / CRM ──────────────────────────────

def get_top_customers(owner_id: int) -> str:
    clients = _many(
        """
        SELECT c.name, c.email,
            COALESCE(SUM(i.total), 0) as lifetime_value,
            COALESCE(SUM(i.balance_due) FILTER (WHERE i.status NOT IN ('cancelled','paid')), 0) as outstanding,
            COUNT(i.id) as invoice_count
        FROM clients c
        LEFT JOIN invoices i ON c.id = i.client_id AND i.status <> 'cancelled'
        WHERE c.owner_id=%s
        GROUP BY c.id, c.name, c.email
        ORDER BY lifetime_value DESC
        LIMIT 10
        """,
        (owner_id,)
    )
    if not clients:
        return "Clients: No clients found.\n"

    lines = ["Top Customers (by Lifetime Value):"]
    for c in clients:
        lines.append(f"  - {c['name']}: ₹{float(c['lifetime_value']):,.2f} lifetime ({c['invoice_count']} invoices, ₹{float(c['outstanding']):,.2f} outstanding)")
    return "\n".join(lines) + "\n"


# ──────────────────────────────────── LEADS ──────────────────────────────────

def get_lead_summary(owner_id: int) -> str:
    leads = _many(
        """
        SELECT status, COUNT(*) as count, COALESCE(SUM(expected_value), 0) as value
        FROM leads
        WHERE owner_id=%s
        GROUP BY status
        ORDER BY count DESC
        """,
        (owner_id,)
    )
    if not leads:
        return "Leads: No leads found in CRM.\n"

    total = sum(l['count'] for l in leads)
    lines = [f"CRM Leads Pipeline ({total} total):"]
    for l in leads:
        lines.append(f"  - {(l['status'] or 'Unknown').title()}: {l['count']} leads (Expected: ₹{float(l['value']):,.2f})")
    return "\n".join(lines) + "\n"


# ────────────────────────────────── QUOTATIONS ──────────────────────────────

def get_quotation_summary(owner_id: int) -> str:
    quotes = _many(
        """
        SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as value
        FROM quotations
        WHERE owner_id=%s
        GROUP BY status
        ORDER BY count DESC
        """,
        (owner_id,)
    )
    if not quotes:
        return "Quotations: No quotations found.\n"

    total = sum(q['count'] for q in quotes)
    lines = [f"Quotations Pipeline ({total} total):"]
    for q in quotes:
        lines.append(f"  - {(q['status'] or 'Unknown').title()}: {q['count']} quotes (₹{float(q['value']):,.2f})")
    return "\n".join(lines) + "\n"


# ─────────────────────────────── FINANCIAL REPORTS ───────────────────────────

def get_revenue_summary(owner_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> str:
    if start_date and end_date:
        rev = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE owner_id=%s AND COALESCE(status, 'completed')='completed' AND payment_date BETWEEN %s AND %s",
            (owner_id, start_date, end_date)
        )
        period = f"from {start_date} to {end_date}"
    else:
        rev = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE owner_id=%s AND COALESCE(status, 'completed')='completed'",
            (owner_id,)
        )
        period = "all time"
    return f"Revenue ({period}): ₹{float(rev.get('total', 0)):,.2f}\n"


def get_profit_summary(owner_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> str:
    if start_date and end_date:
        rev = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE owner_id=%s AND COALESCE(status, 'completed')='completed' AND payment_date BETWEEN %s AND %s",
            (owner_id, start_date, end_date)
        )
        exp = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE owner_id=%s AND expense_date BETWEEN %s AND %s",
            (owner_id, start_date, end_date)
        )
        period = f"from {start_date} to {end_date}"
    else:
        rev = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE owner_id=%s AND COALESCE(status, 'completed')='completed'",
            (owner_id,)
        )
        exp = _one(
            "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE owner_id=%s",
            (owner_id,)
        )
        period = "all time"

    revenue = float(rev.get('total', 0))
    expenses = float(exp.get('total', 0))
    profit = revenue - expenses
    return f"Financial Summary ({period}):\n  - Revenue: ₹{revenue:,.2f}\n  - Expenses: ₹{expenses:,.2f}\n  - Net Profit: ₹{profit:,.2f}\n"


# ─────────────────────────────── DASHBOARD SNAPSHOT ─────────────────────────

def get_dashboard_snapshot(owner_id: int) -> str:
    """Full business overview for the dashboard intent."""
    rev = _one("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE owner_id=%s AND COALESCE(status, 'completed')='completed'", (owner_id,))
    exp = _one("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE owner_id=%s", (owner_id,))
    outstanding = _one("SELECT COALESCE(SUM(balance_due), 0) as total, COUNT(*) as count FROM invoices WHERE owner_id=%s AND status NOT IN ('cancelled','paid') AND balance_due > 0", (owner_id,))
    overdue = _one("SELECT COUNT(*) as count, COALESCE(SUM(balance_due), 0) as total FROM invoices WHERE owner_id=%s AND status NOT IN ('cancelled','paid') AND balance_due > 0 AND due_date < CURRENT_DATE", (owner_id,))
    products = _one("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE stock <= COALESCE(low_stock_threshold, 10)) as low_stock FROM products WHERE owner_id=%s", (owner_id,))
    leads_count = _one("SELECT COUNT(*) as total FROM leads WHERE owner_id=%s", (owner_id,))
    clients_count = _one("SELECT COUNT(*) as total FROM clients WHERE owner_id=%s", (owner_id,))

    revenue = float(rev.get('total', 0))
    expenses = float(exp.get('total', 0))

    return f"""Business Dashboard Snapshot (as of {date.today()}):
  - Total Revenue: ₹{revenue:,.2f}
  - Total Expenses: ₹{expenses:,.2f}
  - Net Profit: ₹{revenue - expenses:,.2f}
  - Cash Balance (Revenue - Expenses): ₹{revenue - expenses:,.2f}
  - Outstanding Invoices: {outstanding.get('count', 0)} invoices (₹{float(outstanding.get('total', 0)):,.2f})
  - Overdue Invoices: {overdue.get('count', 0)} invoices (₹{float(overdue.get('total', 0)):,.2f})
  - Products in Inventory: {products.get('total', 0)} (Low Stock: {products.get('low_stock', 0)})
  - Total Clients: {clients_count.get('total', 0)}
  - Total Leads: {leads_count.get('total', 0)}
"""
