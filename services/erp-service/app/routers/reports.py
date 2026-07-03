from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from typing import Dict, Any
from app.database import conn
from app.auth.permissions import require_permission
from decimal import Decimal
from app.services.pdf_generator import build_profit_loss_pdf, build_balance_sheet_pdf, build_cash_flow_pdf, build_trial_balance_pdf

router = APIRouter(prefix="/reports", tags=["Reports"])

def _one(sql: str, params: tuple) -> Dict[str, Any]:
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchone()
    except Exception as e:
        conn.rollback()
        raise e

def _many(sql: str, params: tuple) -> list:
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()
    except Exception as e:
        conn.rollback()
        raise e

def get_ledger_cte(start_date=None, end_date=None, current_user=None) -> tuple:
    # Generates the base CTE for double entry, applying date filters
    date_filter_inv = ""
    date_params_inv = []
    if start_date:
        date_filter_inv += " AND COALESCE(i.issue_date, i.created_at::date) >= %s"
        date_params_inv.append(start_date)
    if end_date:
        date_filter_inv += " AND COALESCE(i.issue_date, i.created_at::date) <= %s"
        date_params_inv.append(end_date)
        
    date_filter_pay = ""
    date_params_pay = []
    if start_date:
        date_filter_pay += " AND COALESCE(p.payment_date, p.created_at::date) >= %s"
        date_params_pay.append(start_date)
    if end_date:
        date_filter_pay += " AND COALESCE(p.payment_date, p.created_at::date) <= %s"
        date_params_pay.append(end_date)

    date_filter_exp = ""
    date_params_exp = []
    if start_date:
        date_filter_exp += " AND COALESCE(e.expense_date, e.created_at::date) >= %s"
        date_params_exp.append(start_date)
    if end_date:
        date_filter_exp += " AND COALESCE(e.expense_date, e.created_at::date) <= %s"
        date_params_exp.append(end_date)
        
    cte = f"""
        WITH ledger AS (
            SELECT COALESCE(i.issue_date, i.created_at::date) as date, COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='1200' LIMIT 1), 'Accounts Receivable') as account, i.total as debit, 0 as credit
            FROM invoices i WHERE i.owner_id=%s AND i.status != 'cancelled' {date_filter_inv}
            UNION ALL
            SELECT COALESCE(i.issue_date, i.created_at::date) as date, COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='4000' LIMIT 1), 'Sales Revenue') as account, 0 as debit, i.total as credit
            FROM invoices i WHERE i.owner_id=%s AND i.status != 'cancelled' {date_filter_inv}
            UNION ALL
            SELECT COALESCE(p.payment_date, p.created_at::date) as date, COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='1010' LIMIT 1), 'Cash/Bank') as account, p.amount as debit, 0 as credit
            FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id WHERE p.owner_id=%s AND COALESCE(p.status, 'completed') = 'completed' {date_filter_pay}
            UNION ALL
            SELECT COALESCE(p.payment_date, p.created_at::date) as date, COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='1200' LIMIT 1), 'Accounts Receivable') as account, 0 as debit, p.amount as credit
            FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id WHERE p.owner_id=%s AND COALESCE(p.status, 'completed') = 'completed' {date_filter_pay}
            UNION ALL
            SELECT COALESCE(e.expense_date, e.created_at::date) as date, COALESCE(e.category, (SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='5100' LIMIT 1), 'Operating Expense') as account, e.amount as debit, 0 as credit
            FROM expenses e WHERE e.owner_id=%s {date_filter_exp}
            UNION ALL
            SELECT COALESCE(e.expense_date, e.created_at::date) as date, CASE WHEN e.status='paid' THEN COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='1010' LIMIT 1), 'Cash/Bank') ELSE COALESCE((SELECT account_name FROM accounts WHERE owner_id=%s AND account_code='2000' LIMIT 1), 'Accounts Payable') END as account, 0 as debit, e.amount as credit
            FROM expenses e WHERE e.owner_id=%s {date_filter_exp}
        )
    """
    
    params = []
    # 2 params for AR debit, plus date params
    params.extend([current_user, current_user] + date_params_inv)
    # 2 params for Rev credit, plus date params
    params.extend([current_user, current_user] + date_params_inv)
    # 2 params for Cash debit, plus date params
    params.extend([current_user, current_user] + date_params_pay)
    # 2 params for AR credit, plus date params
    params.extend([current_user, current_user] + date_params_pay)
    # 2 params for Expense debit, plus date params
    params.extend([current_user, current_user] + date_params_exp)
    # 3 params for Cash/AP credit, plus date params
    params.extend([current_user, current_user, current_user] + date_params_exp)
    
    return cte, params

@router.get("/profit-loss")
def get_profit_loss(start_date: str = "", end_date: str = "", current_user: int = Depends(require_permission('reports.view'))):
    # P&L uses the Ledger CTE, but we only care about Revenue and Expense categories
    cte, params = get_ledger_cte(start_date, end_date, current_user)
    
    query = cte + """
        SELECT account, SUM(credit - debit) as amount 
        FROM ledger 
        WHERE account NOT IN ('Accounts Receivable', 'Accounts Payable', 'Cash/Bank', 'Cash', 'Bank', 'Inventory', 'Fixed Assets', 'GST Payable', 'Taxes Payable', 'Long Term Debt', 'Owner Equity', 'Retained Earnings')
        GROUP BY account
    """
    rows = _many(query, tuple(params))
    
    revenue = []
    cogs = []
    operating = []
    
    for row in rows:
        acc = row["account"]
        amt = float(row["amount"]) # revenue will be positive (credit > debit), expenses negative (debit > credit)
        
        if acc == "Sales Revenue":
            revenue.append({"name": acc, "amount": amt})
        elif acc in ["Direct Materials", "Direct Labor"]:
            cogs.append({"name": acc, "amount": -amt})
        else:
            operating.append({"name": acc, "amount": -amt})
            
    total_rev = sum(r["amount"] for r in revenue)
    total_cogs = sum(c["amount"] for c in cogs)
    gross_profit = total_rev - total_cogs
    total_op = sum(o["amount"] for o in operating)
    net_profit = gross_profit - total_op
    
    return {
        "revenue": revenue,
        "total_revenue": total_rev,
        "cogs": cogs,
        "total_cogs": total_cogs,
        "gross_profit": gross_profit,
        "operating_expenses": operating,
        "total_operating": total_op,
        "net_profit": net_profit,
        "net_profit_margin": round((net_profit / total_rev * 100) if total_rev > 0 else 0, 2)
    }

@router.get("/balance-sheet")
def get_balance_sheet(end_date: str = "", current_user: int = Depends(require_permission('reports.view'))):
    # Balance sheet represents point in time up to end_date (start_date is irrelevant)
    cte, params = get_ledger_cte(None, end_date, current_user)
    
    # 1. Get Assets and Liabilities from Ledger
    query = cte + """
        SELECT account, SUM(debit - credit) as amount
        FROM ledger
        WHERE account IN ('Cash/Bank', 'Cash', 'Bank', 'Accounts Receivable', 'Accounts Payable')
        GROUP BY account
    """
    rows = _many(query, tuple(params))
    
    # 2. Get Inventory
    inv_query = """
        SELECT COALESCE(SUM(
            CASE 
                WHEN costing_method = 'fifo' THEN (
                    SELECT COALESCE(SUM(remaining_quantity * unit_cost), 0) 
                    FROM fifo_cost_lots 
                    WHERE product_id = products.id
                )
                ELSE (stock * cost_price)
            END
        ), 0) as inventory 
        FROM products 
        WHERE owner_id=%s AND track_inventory=TRUE
    """
    inv_row = _one(inv_query, (current_user,))
    inventory = float(inv_row["inventory"])
    
    cash = 0
    ar = 0
    ap = 0
    
    for row in rows:
        acc = row["account"]
        amt = float(row["amount"]) # Asset (Debit > Credit = +), Liability (Credit > Debit => we will negate)
        if acc in ('Cash/Bank', 'Cash', 'Bank'): cash += amt
        elif acc == 'Accounts Receivable': ar = amt
        elif acc == 'Accounts Payable': ap = -amt # Convert to positive liability balance

    # 3. Calculate Net Profit for Retained Earnings
    query_pl = cte + """
        SELECT account, SUM(credit - debit) as amount 
        FROM ledger 
        WHERE account NOT IN ('Accounts Receivable', 'Accounts Payable', 'Cash/Bank', 'Cash', 'Bank', 'Inventory', 'Fixed Assets', 'GST Payable', 'Taxes Payable', 'Long Term Debt', 'Owner Equity', 'Retained Earnings')
        GROUP BY account
    """
    rows_pl = _many(query_pl, tuple(params))
    
    revenue = 0
    expenses = 0
    for row in rows_pl:
        acc = row["account"]
        amt = float(row["amount"])
        if acc == "Sales Revenue":
            revenue += amt
        else:
            # cogs and operating are negative amounts (debit > credit)
            expenses += amt
            
    net_profit = revenue + expenses # expenses are negative, so this is revenue - total expenses
    
    # 4. Compile Balance Sheet
    total_current_assets = cash + ar + inventory
    total_fixed_assets = 0
    total_assets = total_current_assets + total_fixed_assets
    
    total_current_liabilities = ap
    total_long_term = 0
    total_liabilities = total_current_liabilities + total_long_term
    
    retained_earnings = net_profit
    
    # Since VexBill doesn't have an AP/Cash double-entry for initial inventory load, 
    # we must represent Inventory value as an Owner's Capital injection to balance the sheet.
    owners_capital = inventory 
    
    total_equity = retained_earnings + owners_capital
    
    return {
        "assets": {
            "current": [
                {"name": "Cash & Bank", "amount": cash},
                {"name": "Accounts Receivable", "amount": ar},
                {"name": "Inventory", "amount": inventory}
            ],
            "total_current": total_current_assets,
            "fixed": [],
            "total_fixed": total_fixed_assets,
            "total": total_assets
        },
        "liabilities": {
            "current": [
                {"name": "Accounts Payable", "amount": ap}
            ],
            "total_current": total_current_liabilities,
            "long_term": [],
            "total_long_term": total_long_term,
            "total": total_liabilities
        },
        "equity": {
            "items": [
                {"name": "Retained Earnings", "amount": retained_earnings},
                {"name": "Owner's Capital (Inventory)", "amount": owners_capital}
            ],
            "total": total_equity
        }
    }

@router.get("/cash-flow")
def get_cash_flow(start_date: str = "", end_date: str = "", current_user: int = Depends(require_permission('reports.view'))):
    cte, params = get_ledger_cte(start_date, end_date, current_user)
    
    # Cash flow simplifies to analyzing the Cash/Bank account during the period
    query = cte + """
        SELECT 
            SUM(debit) as cash_in,
            SUM(credit) as cash_out,
            SUM(debit - credit) as net_cash
        FROM ledger
        WHERE account IN ('Cash/Bank', 'Cash', 'Bank')
    """
    row = _one(query, tuple(params))
    
    cash_in = float(row["cash_in"] or 0)
    cash_out = float(row["cash_out"] or 0)
    net_cash = float(row["net_cash"] or 0)
    
    return {
        "operating_activities": [
            {"name": "Cash Received from Customers", "amount": cash_in},
            {"name": "Cash Paid for Expenses", "amount": -cash_out}
        ],
        "cash_from_operating": net_cash,
        "investing_activities": [],
        "cash_from_investing": 0,
        "financing_activities": [],
        "cash_from_financing": 0,
        "net_change": net_cash,
        "ending_balance": net_cash # In a full system we'd add beginning balance
    }

@router.get("/trial-balance")
def get_trial_balance(start_date: str = "", end_date: str = "", current_user: int = Depends(require_permission('reports.view'))):
    cte, params = get_ledger_cte(start_date, end_date, current_user)
    
    query = cte + """
        SELECT account, SUM(debit) as debit, SUM(credit) as credit
        FROM ledger
        GROUP BY account
        ORDER BY account
    """
    rows = _many(query, tuple(params))
    
    total_debit = sum(float(r["debit"]) for r in rows)
    total_credit = sum(float(r["credit"]) for r in rows)
    
    return {
        "accounts": [{"account": r["account"], "debit": float(r["debit"]), "credit": float(r["credit"])} for r in rows],
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balanced": round(total_debit, 2) == round(total_credit, 2)
    }

@router.get("/charts")
def get_charts(start_date: str = "", end_date: str = "", current_user: int = Depends(require_permission('reports.view'))):
    cte, params = get_ledger_cte(start_date, end_date, current_user)
    
    # We want monthly aggregation.
    query = cte + """
        SELECT 
            TO_CHAR(date, 'YYYY-MM') as month,
            SUM(CASE WHEN account = 'Sales Revenue' THEN credit ELSE 0 END) as revenue,
            SUM(CASE WHEN account NOT IN ('Accounts Receivable', 'Accounts Payable', 'Cash/Bank', 'Sales Revenue') THEN debit - credit ELSE 0 END) as expenses,
            SUM(CASE WHEN account = 'Cash/Bank' THEN debit - credit ELSE 0 END) as net_cash
        FROM ledger
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month
    """
    rows = _many(query, tuple(params))
    
    monthly_data = []
    for r in rows:
        rev = float(r["revenue"])
        exp = float(r["expenses"])
        profit = rev - exp
        monthly_data.append({
            "month": r["month"],
            "revenue": rev,
            "expenses": exp,
            "profit": profit,
            "net_cash": float(r["net_cash"])
        })
        
    return monthly_data


def _get_company_name(owner_id):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT company_name FROM company_settings WHERE owner_id=%s", (owner_id,))
            row = cursor.fetchone()
            return row["company_name"] if row else "VexBill"
    except:
        return "VexBill"


def _period_text(start_date, end_date):
    if start_date and end_date:
        return f"Period: {start_date} to {end_date}"
    elif end_date:
        return f"As of {end_date}"
    return "All Time"


@router.get("/profit-loss/pdf")
def export_profit_loss_pdf(start_date: str = "", end_date: str = "", current_user: int = Depends(require_permission('reports.view'))):
    data = get_profit_loss(start_date, end_date, current_user)
    company = _get_company_name(current_user)
    pdf = build_profit_loss_pdf(data, company, _period_text(start_date, end_date))
    return FileResponse(path=pdf, filename="profit_loss.pdf", media_type="application/pdf")


@router.get("/balance-sheet/pdf")
def export_balance_sheet_pdf(end_date: str = "", current_user: int = Depends(require_permission('reports.view'))):
    data = get_balance_sheet(end_date, current_user)
    company = _get_company_name(current_user)
    pdf = build_balance_sheet_pdf(data, company, _period_text(None, end_date))
    return FileResponse(path=pdf, filename="balance_sheet.pdf", media_type="application/pdf")


@router.get("/cash-flow/pdf")
def export_cash_flow_pdf(start_date: str = "", end_date: str = "", current_user: int = Depends(require_permission('reports.view'))):
    data = get_cash_flow(start_date, end_date, current_user)
    company = _get_company_name(current_user)
    pdf = build_cash_flow_pdf(data, company, _period_text(start_date, end_date))
    return FileResponse(path=pdf, filename="cash_flow.pdf", media_type="application/pdf")


@router.get("/trial-balance/pdf")
def export_trial_balance_pdf(start_date: str = "", end_date: str = "", current_user: int = Depends(require_permission('reports.view'))):
    data = get_trial_balance(start_date, end_date, current_user)
    company = _get_company_name(current_user)
    pdf = build_trial_balance_pdf(data, company, _period_text(start_date, end_date))
    return FileResponse(path=pdf, filename="trial_balance.pdf", media_type="application/pdf")