import logging
from datetime import date

from app.database import conn
from app.schemas.invoice import InvoiceEmailRequest
from app.routers.invoices import send_invoice_email_logic
from app.email_utils.email_utils import send_email
from app.services.audit import log_action
from app.routers.workflow_settings import get_or_create_workflow_settings

logger = logging.getLogger(__name__)

WORKFLOW_TYPE_UPCOMING = "upcoming_reminder"
WORKFLOW_TYPE_DUE_TODAY = "due_today_reminder"
WORKFLOW_TYPE_OVERDUE = "overdue_reminder"
WORKFLOW_TYPE_QUOTE_EXPIRY = "quote_expiry_reminder"
WORKFLOW_TYPE_LOW_STOCK = "low_stock_notification"

def _get_active_owners():
    with conn.cursor() as c:
        c.execute("SELECT id FROM users")
        return [r["id"] for r in c.fetchall()]

def check_invoice_reminders(owner_id: int):
    logger.info(f"Running check_invoice_reminders for owner {owner_id}")
    settings = get_or_create_workflow_settings(owner_id)

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, invoice_number, due_date, client_id, status 
                FROM invoices 
                WHERE owner_id = %s AND status NOT IN ('paid', 'cancelled') 
                AND due_date IS NOT NULL
                """,
                (owner_id,)
            )
            invoices = cursor.fetchall()
    except Exception as e:
        logger.error(f"Error fetching invoices for workflow reminders owner {owner_id}: {e}")
        return

    today = date.today()

    for inv in invoices:
        invoice_id = inv["id"]
        due_date = inv["due_date"]
        invoice_number = inv["invoice_number"]

        try:
            delta = (due_date - today).days
            workflow_type_to_send = None
            subject = None

            if delta == settings["upcoming_reminder_days"]:
                if settings["send_upcoming_invoice_reminders"]:
                    workflow_type_to_send = WORKFLOW_TYPE_UPCOMING
                    subject = f"Upcoming Reminder: Invoice {invoice_number} is due in {delta} days"
                
            elif delta == 0:
                if settings["send_due_today_reminders"]:
                    workflow_type_to_send = WORKFLOW_TYPE_DUE_TODAY
                    subject = f"Reminder: Invoice {invoice_number} is due today"

            elif delta < 0 and abs(delta) % settings["overdue_reminder_frequency_days"] == 0:
                if settings["send_overdue_reminders"]:
                    workflow_type_to_send = WORKFLOW_TYPE_OVERDUE
                    subject = f"Overdue Reminder: Invoice {invoice_number} is overdue by {abs(delta)} days"

            if not workflow_type_to_send:
                continue

            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id FROM workflow_logs 
                    WHERE invoice_id = %s AND workflow_type = %s AND executed_at::date = CURRENT_DATE
                    """,
                    (invoice_id, workflow_type_to_send)
                )
                if cursor.fetchone():
                    continue

            try:
                req = InvoiceEmailRequest(subject=subject, message=None)
                send_invoice_email_logic(invoice_id, req, owner_id)
            except Exception as email_err:
                logger.error(f"Failed to send {workflow_type_to_send} for invoice {invoice_id}: {email_err}")
                continue

            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO workflow_logs (owner_id, invoice_id, workflow_type)
                    VALUES (%s, %s, %s)
                    """,
                    (owner_id, invoice_id, workflow_type_to_send)
                )
            conn.commit()

            log_action(owner_id, owner_id, "send_reminder", "invoice", invoice_id, f"Reminder sent for {invoice_number}", {"workflow_type": workflow_type_to_send})

        except Exception as e:
            conn.rollback()
            logger.error(f"Error processing workflow for invoice {invoice_id}: {e}")

def check_quotation_expiry_reminders(owner_id: int):
    logger.info(f"Running check_quotation_expiry_reminders for owner {owner_id}")
    settings = get_or_create_workflow_settings(owner_id)
    if not settings["send_quotation_expiry_reminders"]:
        return

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT q.id, q.quote_number, q.valid_until, c.email as client_email, c.name as client_name 
                FROM quotations q
                JOIN clients c ON q.client_id = c.id
                WHERE q.owner_id = %s AND q.status IN ('draft', 'sent') AND q.valid_until IS NOT NULL
                """,
                (owner_id,)
            )
            quotes = cursor.fetchall()
    except Exception as e:
        logger.error(f"Error fetching quotes owner {owner_id}: {e}")
        return

    today = date.today()
    for q in quotes:
        quote_id = q["id"]
        valid_until = q["valid_until"]
        
        try:
            delta = (valid_until - today).days
            if delta != settings["quotation_expiry_days"]:
                continue
                
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM workflow_logs WHERE quotation_id = %s AND workflow_type = %s AND executed_at::date = CURRENT_DATE",
                    (quote_id, WORKFLOW_TYPE_QUOTE_EXPIRY)
                )
                if cursor.fetchone():
                    continue

            if settings["send_quotation_expiry_email"] and q["client_email"]:
                try:
                    subject = f"Reminder: Quotation {q['quote_number']} expires in {delta} days"
                    body = f"Hi {q['client_name']},\n\nThis is a friendly reminder that quotation {q['quote_number']} will expire on {valid_until}.\n\nPlease let us know if you have any questions.\n\nThanks!"
                    send_email(owner_id, q["client_email"], subject, body)
                except Exception as email_err:
                    logger.error(f"Failed to email quote {quote_id}: {email_err}")
                    continue

            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO workflow_logs (owner_id, quotation_id, workflow_type) VALUES (%s, %s, %s)",
                    (owner_id, quote_id, WORKFLOW_TYPE_QUOTE_EXPIRY)
                )
            conn.commit()

            log_action(owner_id, owner_id, "quotation_reminder_sent", "quotation", quote_id, f"Quotation expiry reminder sent for {q['quote_number']}")

        except Exception as e:
            conn.rollback()
            logger.error(f"Error processing quote {quote_id}: {e}")

def check_low_stock_notifications(owner_id: int):
    logger.info(f"Running check_low_stock_notifications for owner {owner_id}")
    settings = get_or_create_workflow_settings(owner_id)
    if not settings["notify_low_stock"]:
        return

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT p.id, p.name, p.stock, COALESCE(p.low_stock_threshold, 10) as threshold, u.email as user_email, cs.email as company_email
                FROM products p
                JOIN users u ON p.owner_id = u.id
                LEFT JOIN company_settings cs ON p.owner_id = cs.owner_id
                WHERE p.owner_id = %s AND p.stock <= COALESCE(p.low_stock_threshold, 10)
                """,
                (owner_id,)
            )
            products = cursor.fetchall()
    except Exception as e:
        logger.error(f"Error fetching products owner {owner_id}: {e}")
        return

    for p in products:
        product_id = p["id"]
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM workflow_logs WHERE product_id = %s AND workflow_type = %s AND executed_at::date = CURRENT_DATE",
                    (product_id, WORKFLOW_TYPE_LOW_STOCK)
                )
                if cursor.fetchone():
                    continue
                    
            if settings["send_low_stock_email"]:
                target_email = p["company_email"] or p["user_email"]
                if target_email:
                    try:
                        subject = f"Low Stock Alert: {p['name']}"
                        body = f"Product {p['name']} is running low on stock.\nCurrent stock: {p['stock']}\nThreshold: {p['threshold']}"
                        send_email(owner_id, target_email, subject, body)
                    except Exception as email_err:
                        logger.error(f"Failed to email low stock product {product_id}: {email_err}")
                        continue

            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO workflow_logs (owner_id, product_id, workflow_type) VALUES (%s, %s, %s)",
                    (owner_id, product_id, WORKFLOW_TYPE_LOW_STOCK)
                )
            conn.commit()

            log_action(owner_id, owner_id, "low_stock_alert_sent", "product", product_id, f"Low stock alert for {p['name']}")

        except Exception as e:
            conn.rollback()
            logger.error(f"Error processing low stock product {product_id}: {e}")

def run_daily_workflows():
    logger.info("Starting run_daily_workflows execution")
    try:
        owners = _get_active_owners()
        for owner_id in owners:
            try:
                check_invoice_reminders(owner_id)
            except Exception as e:
                logger.exception(f"check_invoice_reminders failed for owner {owner_id}: {e}")

            try:
                check_quotation_expiry_reminders(owner_id)
            except Exception as e:
                logger.exception(f"check_quotation_expiry_reminders failed for owner {owner_id}: {e}")

            try:
                check_low_stock_notifications(owner_id)
            except Exception as e:
                logger.exception(f"check_low_stock_notifications failed for owner {owner_id}: {e}")
                
            # Log successful daily run completion for this owner
            log_action(owner_id, owner_id, "daily_workflow_executed", "system", owner_id, "Daily workflows executed successfully")
            
    except Exception as e:
        logger.exception(f"Critical error in run_daily_workflows: {e}")
    logger.info("Completed run_daily_workflows execution")
