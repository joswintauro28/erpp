from app.database import conn

try:
    conn.rollback() # Clear any pending transaction holding locks
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE expenses
            ADD COLUMN IF NOT EXISTS expense_number VARCHAR(50),
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
            ADD COLUMN IF NOT EXISTS expense_date DATE,
            ADD COLUMN IF NOT EXISTS notes TEXT;
        """)
    conn.commit()
    print("Schema altered successfully.")
except Exception as e:
    conn.rollback()
    print("Error:", e)
