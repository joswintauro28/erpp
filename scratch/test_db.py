import os
import psycopg2
from dotenv import load_dotenv

# Load env from crm-ser
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'services', 'crm-ser', '.env')
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")
print("Connecting to:", db_url)

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
    tables = cursor.fetchall()
    print("Tables in database:")
    for t in tables:
        print("-", t[0])
    cursor.close()
    conn.close()
except Exception as e:
    print("DB Connection failed:", e)
