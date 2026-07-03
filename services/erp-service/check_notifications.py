from app.database import conn
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
tables = [r['table_name'] for r in cur.fetchall()]
print(tables)
if 'notifications' in tables:
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='notifications'")
    print('Columns:', cur.fetchall())
