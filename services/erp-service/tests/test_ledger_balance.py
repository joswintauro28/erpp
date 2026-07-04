from app.routers.accounting import get_general_ledger

try:
    ledger = get_general_ledger(current_user=1, account="Accounts Receivable")
    print("Ledger AR OK:", len(ledger["data"]), "entries found.")
    for r in ledger["data"]:
        print(r["date"], r["description"], "Debit:", r["debit"], "Credit:", r["credit"], "Balance:", r["balance"])
except Exception as e:
    import traceback
    traceback.print_exc()
