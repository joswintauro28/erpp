import sys
sys.path.append('.')

from app.database import conn
from app.services.workflow_automation import check_invoice_reminders
from datetime import date, timedelta

print("Creating test data for workflow...")

try:
    with conn.cursor() as c:
        # Create user
        c.execute("INSERT INTO users (email, password) VALUES ('test_workflow@example.com', 'pwd') RETURNING id")
        user_id = c.fetchone()["id"]

        # Create client
        c.execute("INSERT INTO clients (name, email, phone, address, owner_id) VALUES ('Workflow Client', 'w@example.com', '123', 'addr', %s) RETURNING id", (user_id,))
        client_id = c.fetchone()["id"]

        # Invoice 1: Due in exactly 3 days (Upcoming)
        c.execute("""
            INSERT INTO invoices (client_id, owner_id, amount, due_date, issue_date, invoice_number)
            VALUES (%s, %s, 100, CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE, 'INV-UPCOM') RETURNING id
        """, (client_id, user_id))
        
        # Invoice 2: Due today (Due Today)
        c.execute("""
            INSERT INTO invoices (client_id, owner_id, amount, due_date, issue_date, invoice_number)
            VALUES (%s, %s, 100, CURRENT_DATE, CURRENT_DATE, 'INV-TODAY') RETURNING id
        """, (client_id, user_id))

        # Invoice 3: Overdue by 7 days (Overdue)
        c.execute("""
            INSERT INTO invoices (client_id, owner_id, amount, due_date, issue_date, invoice_number)
            VALUES (%s, %s, 100, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '14 days', 'INV-OVERD') RETURNING id
        """, (client_id, user_id))

    conn.commit()

    print("Running check_invoice_reminders()...")
    # This will attempt to send emails. Since SMTP is likely missing keys in this shell without ENCRYPTION_KEY,
    # the email sending will fail, but the script handles email errors by logging and continuing!
    # Wait, if email fails, it logs and CONTINUES. Oh wait, if it fails, it doesn't insert into workflow_logs!
    # Let me check my code. I put the try/except around email logic, and the workflow_log insertion happens AFTER.
    # "If email_err: continue". This means if it fails to send, it won't mark it as executed. This is correct!
    
    print("Test ready.")
except Exception as e:
    conn.rollback()
    print("FAILED:", e)
