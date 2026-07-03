import logging
from datetime import date
from dateutil.relativedelta import relativedelta

from app.database import conn
from app.schemas.invoice import InvoiceEmailRequest
from app.routers.invoices import send_invoice_email_logic
from app.services.audit import log_action

logger = logging.getLogger(__name__)

def process_recurring_invoices():
    logger.info("Running process_recurring_invoices job...")
    try:
        with conn.cursor() as cursor:
            # Find all active recurring schedules due to run today or earlier
            cursor.execute(
                """
                SELECT * FROM recurring_invoices
                WHERE is_active = TRUE
                AND next_run_date <= CURRENT_DATE
                """
            )
            schedules = cursor.fetchall()
    except Exception as e:
        logger.error(f"Error fetching recurring invoices: {e}")
        return

    for schedule in schedules:
        try:
            with conn.cursor() as cursor:
                # 1. Fetch original invoice
                cursor.execute(
                    "SELECT * FROM invoices WHERE id = %s AND owner_id = %s",
                    (schedule["invoice_id"], schedule["owner_id"])
                )
                original_invoice = cursor.fetchone()

                if not original_invoice:
                    # Invoice might have been deleted but schedule wasn't properly cascaded or handled.
                    continue

                # 2. Fetch original invoice items
                cursor.execute(
                    "SELECT * FROM invoice_items WHERE invoice_id = %s ORDER BY id ASC",
                    (original_invoice["id"],)
                )
                original_items = cursor.fetchall()

                # Calculate new dates
                today = date.today()
                term_days = (original_invoice["due_date"] - original_invoice["issue_date"]).days if original_invoice["due_date"] and original_invoice["issue_date"] else 0
                new_due_date = today + relativedelta(days=max(term_days, 0))

                # 3. Clone invoice row
                cursor.execute(
                    """
                    INSERT INTO invoices (
                        client_id, amount, owner_id, due_date, issue_date,
                        subtotal, cgst, sgst, igst, tax_total, total,
                        paid_amount, balance_due, gst_treatment, place_of_supply,
                        notes, status, inventory_applied
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s,
                        0, %s, %s, %s,
                        %s, 'pending', %s
                    ) RETURNING id
                    """,
                    (
                        original_invoice["client_id"], original_invoice["amount"], original_invoice["owner_id"], new_due_date, today,
                        original_invoice["subtotal"], original_invoice["cgst"], original_invoice["sgst"], original_invoice["igst"], original_invoice["tax_total"], original_invoice["total"],
                        original_invoice["total"], original_invoice["gst_treatment"], original_invoice["place_of_supply"],
                        original_invoice["notes"], original_invoice["inventory_applied"]
                    )
                )
                new_invoice_id = cursor.fetchone()["id"]

                # Generate new invoice number
                new_invoice_number = f"INV-{new_invoice_id:05d}"
                cursor.execute(
                    "UPDATE invoices SET invoice_number = %s WHERE id = %s",
                    (new_invoice_number, new_invoice_id)
                )

                # 4. Clone invoice items
                for item in original_items:
                    cursor.execute(
                        """
                        INSERT INTO invoice_items (
                            invoice_id, product_id, description, quantity, unit_price,
                            gst_rate, taxable_amount, cgst, sgst, igst, total
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s
                        )
                        """,
                        (
                            new_invoice_id, item["product_id"], item["description"], item["quantity"], item["unit_price"],
                            item["gst_rate"], item["taxable_amount"], item["cgst"], item["sgst"], item["igst"], item["total"]
                        )
                    )

                # 5. Calculate next run date
                frequency = schedule["frequency"]
                if frequency == "weekly":
                    next_run = today + relativedelta(weeks=1)
                elif frequency == "monthly":
                    next_run = today + relativedelta(months=1)
                elif frequency == "quarterly":
                    next_run = today + relativedelta(months=3)
                elif frequency == "yearly":
                    next_run = today + relativedelta(years=1)
                else:
                    next_run = today + relativedelta(months=1)

                is_active = True
                if schedule["end_date"] and next_run > schedule["end_date"]:
                    is_active = False

                # 6. Update schedule
                cursor.execute(
                    """
                    UPDATE recurring_invoices
                    SET next_run_date = %s, last_generated_at = CURRENT_TIMESTAMP, is_active = %s
                    WHERE id = %s
                    """,
                    (next_run, is_active, schedule["id"])
                )

            # Commit the transaction for this schedule
            conn.commit()

            # 7. Auto-email if configured
            if schedule["auto_email"]:
                try:
                    email_req = InvoiceEmailRequest()
                    send_invoice_email_logic(new_invoice_id, email_req, schedule["owner_id"])
                    
                    log_action(
                        owner_id=schedule["owner_id"],
                        user_id=schedule["owner_id"],
                        action="recurring_invoice_email_sent",
                        entity_type="invoice",
                        entity_id=new_invoice_id,
                        description=f"Automatic recurring invoice email sent for invoice {new_invoice_number}",
                        metadata={"invoice_number": new_invoice_number}
                    )
                except Exception as email_err:
                    logger.error(f"Failed to auto-email recurring invoice {new_invoice_id}: {email_err}")
                    
                    log_action(
                        owner_id=schedule["owner_id"],
                        user_id=schedule["owner_id"],
                        action="recurring_invoice_email_failed",
                        entity_type="invoice",
                        entity_id=new_invoice_id,
                        description=f"Automatic recurring invoice email failed for invoice {new_invoice_number}",
                        metadata={"invoice_number": new_invoice_number, "error": str(email_err)}
                    )

            # 8. Log action
            log_action(
                owner_id=schedule["owner_id"],
                user_id=schedule["owner_id"],
                action="create",
                entity_type="invoice",
                entity_id=new_invoice_id,
                description=f"Recurring invoice auto-generated: {new_invoice_number}",
                metadata={"recurring_schedule_id": schedule["id"], "invoice_number": new_invoice_number}
            )

        except Exception as e:
            conn.rollback()
            logger.error(f"Error processing recurring schedule {schedule['id']}: {e}")

    logger.info("Finished process_recurring_invoices job.")
