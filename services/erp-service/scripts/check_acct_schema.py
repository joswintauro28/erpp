from app.database import conn

tables = ['expenses', 'ledger_entries', 'invoices', 'payments']
try:
    with conn.cursor() as cur:
        for t in tables:
            cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name=%s", (t,))
            print(f'{t}:', [(r['column_name'], r['data_type']) for r in cur.fetchall()])
except Exception as e:
    print(e)
