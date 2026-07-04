from app.database import conn

cursor = conn.cursor()
cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
print([row['column_name'] for row in cursor.fetchall()])
