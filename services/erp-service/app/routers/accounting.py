from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from app.database import conn
from app.auth.permissions import require_permission
import math

router = APIRouter(prefix="/accounting", tags=["Accounting"])

def _many(sql: str, params: tuple) -> List[Dict[str, Any]]:
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()
    except Exception as e:
        conn.rollback()
        print(f"Accounting SQL Error: {e}")
        raise e

@router.get("/ledger")
def get_general_ledger(
    page: int = 1,
    limit: int = 50,
    search: str = "",
    account: str = "",
    start_date: str = "",
    end_date: str = "",
    current_user: int = Depends(require_permission('reports.view'))
):
    offset = (page - 1) * limit

    base_query = """
        WITH ledger_data AS (
            -- Invoices (Debit AR)
            SELECT COALESCE(i.issue_date, i.created_at::date) as date, COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='1200' LIMIT 1), 'Accounts Receivable') as account, 'Invoice ' || COALESCE(i.invoice_number, i.id::text) as description, i.total as debit, 0 as credit, i.id as ref_id, 'invoice' as ref_type
            FROM invoices i WHERE i.owner_id=%s AND i.status != 'cancelled'
            UNION ALL
            -- Invoices (Credit Revenue)
            SELECT COALESCE(i.issue_date, i.created_at::date) as date, COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='4000' LIMIT 1), 'Sales Revenue') as account, 'Invoice ' || COALESCE(i.invoice_number, i.id::text) as description, 0 as debit, i.total as credit, i.id as ref_id, 'invoice' as ref_type
            FROM invoices i WHERE i.owner_id=%s AND i.status != 'cancelled'
            UNION ALL
            -- Payments (Debit Cash)
            SELECT COALESCE(p.payment_date, p.created_at::date) as date, COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='1010' LIMIT 1), 'Cash/Bank') as account, 'Payment for ' || COALESCE(i.invoice_number, 'Invoice') as description, p.amount as debit, 0 as credit, p.id as ref_id, 'payment' as ref_type
            FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id WHERE p.owner_id=%s AND COALESCE(p.status, 'completed') = 'completed'
            UNION ALL
            -- Payments (Credit AR)
            SELECT COALESCE(p.payment_date, p.created_at::date) as date, COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='1200' LIMIT 1), 'Accounts Receivable') as account, 'Payment for ' || COALESCE(i.invoice_number, 'Invoice') as description, 0 as debit, p.amount as credit, p.id as ref_id, 'payment' as ref_type
            FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id WHERE p.owner_id=%s AND COALESCE(p.status, 'completed') = 'completed'
            UNION ALL
            -- Expenses (Debit Expense)
            SELECT COALESCE(e.expense_date, e.created_at::date) as date, COALESCE(e.category, (SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='5100' LIMIT 1), 'Operating Expense') as account, e.vendor as description, e.amount as debit, 0 as credit, e.id as ref_id, 'expense' as ref_type
            FROM expenses e WHERE e.owner_id=%s
            UNION ALL
            -- Expenses (Credit Cash/AP)
            SELECT COALESCE(e.expense_date, e.created_at::date) as date, CASE WHEN e.status='paid' THEN COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='1010' LIMIT 1), 'Cash/Bank') ELSE COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='2000' LIMIT 1), 'Accounts Payable') END as account, e.vendor as description, 0 as debit, e.amount as credit, e.id as ref_id, 'expense' as ref_type
            FROM expenses e WHERE e.owner_id=%s
        )
        SELECT * FROM ledger_data
        WHERE 1=1
    """
    
    params = [current_user] * 13

    if account:
        base_query += " AND account ILIKE %s"
        params.append(f"%{account}%")
        
    if search:
        base_query += " AND (description ILIKE %s OR account ILIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])
        
    if start_date:
        base_query += " AND date >= %s"
        params.append(start_date)
        
    if end_date:
        base_query += " AND date <= %s"
        params.append(end_date)
        
    # Count total for pagination
    count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as sub"
    try:
        with conn.cursor() as cursor:
            cursor.execute(count_query, tuple(params))
            total_items = cursor.fetchone()["total"]
    except Exception as e:
        conn.rollback()
        raise e

    # Fetch paginated rows with running balance
    if account:
        # If an account is selected, we can compute an accurate running balance
        paginated_query = f"""
            WITH base AS ({base_query}),
            with_balance AS (
                SELECT *, SUM(debit - credit) OVER (ORDER BY date ASC, ref_type ASC, ref_id ASC) as balance
                FROM base
            )
            SELECT * FROM with_balance
            ORDER BY date DESC, ref_type DESC, ref_id DESC
            LIMIT %s OFFSET %s
        """
    else:
        # If no specific account is selected, running balance makes no sense globally
        paginated_query = f"""
            WITH base AS ({base_query})
            SELECT *, null as balance FROM base
            ORDER BY date DESC, account ASC, ref_type DESC, ref_id DESC
            LIMIT %s OFFSET %s
        """

    params.extend([limit, offset])
    rows = _many(paginated_query, tuple(params))

    return {
        "data": rows,
        "pagination": {
            "total": total_items,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total_items / limit)
        }
    }
