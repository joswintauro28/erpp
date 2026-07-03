from app.database import conn
from app.routers.accounting import get_general_ledger
from decimal import Decimal

def run_audit():
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*), SUM(total) FROM invoices WHERE status != 'cancelled' AND owner_id=1")
        inv_count, inv_sum = cur.fetchone().values()
        inv_sum = inv_sum or Decimal('0')

        cur.execute("SELECT COUNT(*), SUM(amount) FROM payments WHERE COALESCE(status, 'completed') = 'completed' AND owner_id=1")
        pay_count, pay_sum = cur.fetchone().values()
        pay_sum = pay_sum or Decimal('0')
        
        cur.execute("SELECT COUNT(*), SUM(amount) FROM expenses WHERE owner_id=1")
        exp_count, exp_sum = cur.fetchone().values()
        exp_sum = exp_sum or Decimal('0')

    # User 1 Ledger
    ledger_u1 = get_general_ledger(limit=10000, current_user=1)["data"]
    
    expected_entries = (inv_count * 2) + (pay_count * 2) + (exp_count * 2)
    
    total_debit = sum(e["debit"] for e in ledger_u1)
    total_credit = sum(e["credit"] for e in ledger_u1)
    
    print("--- AUDIT REPORT ---")
    print(f"Total Invoices: {inv_count} (Value: {inv_sum})")
    print(f"Total Payments: {pay_count} (Value: {pay_sum})")
    print(f"Total Expenses: {exp_count} (Value: {exp_sum})")
    print(f"Expected Ledger Entries: {expected_entries}")
    print(f"Actual Ledger Entries: {len(ledger_u1)}")
    print(f"Total Debits: {total_debit}")
    print(f"Total Credits: {total_credit}")
    print(f"Debits == Credits? {total_debit == total_credit}")
    
    invoices_debit_ar = sum(e["debit"] for e in ledger_u1 if e["ref_type"] == "invoice" and e["account"] == "Accounts Receivable")
    invoices_credit_rev = sum(e["credit"] for e in ledger_u1 if e["ref_type"] == "invoice" and e["account"] == "Sales Revenue")
    print(f"Invoice AR Debits == Invoice Rev Credits == Inv Sum? {invoices_debit_ar == invoices_credit_rev == inv_sum}")

    pay_debit_cash = sum(e["debit"] for e in ledger_u1 if e["ref_type"] == "payment" and e["account"] == "Cash/Bank")
    pay_credit_ar = sum(e["credit"] for e in ledger_u1 if e["ref_type"] == "payment" and e["account"] == "Accounts Receivable")
    print(f"Payment Cash Debits == Payment AR Credits == Pay Sum? {pay_debit_cash == pay_credit_ar == pay_sum}")
    
    # Test Isolation
    ledger_u2 = get_general_ledger(limit=10000, current_user=999)["data"]
    print(f"Multi-user Isolation: User 999 entries = {len(ledger_u2)}")

if __name__ == "__main__":
    run_audit()
