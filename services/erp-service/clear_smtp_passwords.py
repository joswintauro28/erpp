import sys
sys.path.append('.')
from app.database import conn

print("Nullifying corrupted SMTP passwords...")
with conn.cursor() as cursor:
    cursor.execute("UPDATE company_settings SET smtp_password = NULL WHERE smtp_password IS NOT NULL")
conn.commit()
print("Migration complete. Corrupted passwords cleared. You may now securely re-enter your password in the Settings UI.")
