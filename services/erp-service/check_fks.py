from app.database import conn
c=conn.cursor()
c.execute("SELECT t.relname, conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE contype = 'f' AND pg_get_constraintdef(c.oid) LIKE '%users(id)%'")
print(c.fetchall())
