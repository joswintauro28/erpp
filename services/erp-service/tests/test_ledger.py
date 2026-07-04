from app.routers.accounting import get_general_ledger

try:
    ledger = get_general_ledger(current_user=1)
    print("Ledger OK:", len(ledger["data"]), "entries found.")
    if ledger["data"]:
        print("Sample:", ledger["data"][0])
except Exception as e:
    import traceback
    traceback.print_exc()
