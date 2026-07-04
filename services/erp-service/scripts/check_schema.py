from app.database import conn
try:
    with conn.cursor() as cur:
        tables = ['invoices', 'products', 'quotations', 'payments', 'clients']
        for t in tables:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name=%s", (t,))
            print(f'{t}:', [r['column_name'] for r in cur.fetchall()])
except Exception as e:
    print(e)
    conn.rollback()
