import sys
sys.path.append('.')

from app.database import conn
from app.services.recurring_job import process_recurring_invoices
from datetime import date

print("Creating test data...")

try:
    with conn.cursor() as c:
        # Create user
        c.execute("INSERT INTO users (email, password) VALUES ('test_recurring@example.com', 'pwd') RETURNING id")
        user_id = c.fetchone()["id"]

        # Create client
        c.execute("INSERT INTO clients (name, email, phone, address, owner_id) VALUES ('Recur Client', 'r@example.com', '123', 'addr', %s) RETURNING id", (user_id,))
        client_id = c.fetchone()["id"]

        # Create product
        c.execute("INSERT INTO products (name, sku, price, stock, owner_id) VALUES ('Recur Prod', 'RP1', 100, 50, %s) RETURNING id", (user_id,))
        product_id = c.fetchone()["id"]

        # Create original invoice
        c.execute("""
            INSERT INTO invoices (client_id, owner_id, amount, due_date, issue_date, invoice_number)
            VALUES (%s, %s, 118, '2023-01-15', '2023-01-01', 'INV-RECUR1') RETURNING id
        """, (client_id, user_id))
        invoice_id = c.fetchone()["id"]

        # Create item
        c.execute("""
            INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, gst_rate, taxable_amount, cgst, sgst, igst, total)
            VALUES (%s, %s, 'Recur Prod', 1, 100, 18, 100, 9, 9, 0, 118)
        """, (invoice_id, product_id))

        # Create recurring schedule (active, due today)
        c.execute("""
            INSERT INTO recurring_invoices (owner_id, invoice_id, frequency, start_date, next_run_date, is_active)
            VALUES (%s, %s, 'monthly', CURRENT_DATE, CURRENT_DATE, TRUE) RETURNING id
        """, (user_id, invoice_id))
        schedule_id = c.fetchone()["id"]

    conn.commit()
    print("Test data created. Schedule ID:", schedule_id)

    print("Running process_recurring_invoices()...")
    process_recurring_invoices()

    with conn.cursor() as c:
        # Check new invoice
        c.execute("SELECT id, invoice_number, issue_date, due_date, amount FROM invoices WHERE owner_id = %s ORDER BY id DESC LIMIT 1", (user_id,))
        new_inv = c.fetchone()
        print("New Invoice Generated:", new_inv)
        assert new_inv["id"] != invoice_id, "New invoice not generated!"
        
        # Check next_run_date
        c.execute("SELECT next_run_date, last_generated_at FROM recurring_invoices WHERE id = %s", (schedule_id,))
        updated_sched = c.fetchone()
        print("Updated Schedule:", updated_sched)
        assert updated_sched["next_run_date"] > date.today(), "Next run date not advanced!"
        assert updated_sched["last_generated_at"] is not None, "Last generated at not set!"

        # Check audit logs
        c.execute("SELECT * FROM audit_logs WHERE owner_id = %s ORDER BY created_at DESC LIMIT 1", (user_id,))
        log = c.fetchone()
        print("Audit Log:", log["description"])
        assert "auto-generated" in log["description"]

    print("ALL TESTS PASSED")

except Exception as e:
    conn.rollback()
    print("TEST FAILED:", e)

