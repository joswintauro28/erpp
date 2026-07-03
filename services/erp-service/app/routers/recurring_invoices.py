from datetime import date
from fastapi import APIRouter, Depends, HTTPException

from app.database import conn
from app.auth.permissions import require_permission
from app.schemas.recurring import RecurringInvoiceCreate, RecurringInvoiceUpdate
from app.services.audit import log_action

router = APIRouter(prefix="/recurring", tags=["Recurring Invoices"])


@router.post("/")
def create_recurring_invoice(schedule: RecurringInvoiceCreate, current_user: int = Depends(require_permission('invoices.create'))):
    try:
        with conn.cursor() as cursor:
            # Validate invoice ownership
            cursor.execute("SELECT id, invoice_number FROM invoices WHERE id = %s AND owner_id = %s", (schedule.invoice_id, current_user))
            invoice = cursor.fetchone()
            if not invoice:
                raise HTTPException(status_code=404, detail="Invoice not found")

            # Check for existing active schedule
            cursor.execute("SELECT id FROM recurring_invoices WHERE invoice_id = %s AND owner_id = %s AND is_active = TRUE", (schedule.invoice_id, current_user))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="An active recurring schedule already exists for this invoice")

            cursor.execute(
                """
                INSERT INTO recurring_invoices (
                    owner_id, invoice_id, frequency, start_date, next_run_date, end_date, auto_email, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE) RETURNING *
                """,
                (current_user, schedule.invoice_id, schedule.frequency, schedule.start_date, schedule.start_date, schedule.end_date, schedule.auto_email)
            )
            new_schedule = cursor.fetchone()
        conn.commit()

        log_action(
            owner_id=current_user,
            user_id=current_user,
            action="create",
            entity_type="recurring_invoice",
            entity_id=new_schedule["id"],
            description=f"Recurring schedule created for invoice {invoice['invoice_number']} ({schedule.frequency})",
            metadata={"invoice_id": schedule.invoice_id, "frequency": schedule.frequency}
        )
        return {"data": new_schedule}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def get_recurring_invoices(current_user: int = Depends(require_permission('invoices.view'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT ri.*, i.invoice_number, c.name AS client_name
                FROM recurring_invoices ri
                JOIN invoices i ON ri.invoice_id = i.id
                JOIN clients c ON i.client_id = c.id
                WHERE ri.owner_id = %s
                ORDER BY ri.created_at DESC
                """,
                (current_user,)
            )
            schedules = cursor.fetchall()
        return {"data": schedules}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}")
def get_recurring_invoice(id: int, current_user: int = Depends(require_permission('invoices.view'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT ri.*, i.invoice_number, c.name AS client_name
                FROM recurring_invoices ri
                JOIN invoices i ON ri.invoice_id = i.id
                JOIN clients c ON i.client_id = c.id
                WHERE ri.id = %s AND ri.owner_id = %s
                """,
                (id, current_user)
            )
            schedule = cursor.fetchone()
        if not schedule:
            raise HTTPException(status_code=404, detail="Recurring schedule not found")
        return {"data": schedule}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}")
def update_recurring_invoice(id: int, update_data: RecurringInvoiceUpdate, current_user: int = Depends(require_permission('invoices.edit'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM recurring_invoices WHERE id = %s AND owner_id = %s", (id, current_user))
            schedule = cursor.fetchone()
            if not schedule:
                raise HTTPException(status_code=404, detail="Recurring schedule not found")

            updates = []
            params = []
            if update_data.frequency is not None:
                updates.append("frequency = %s")
                params.append(update_data.frequency)
            if update_data.end_date is not None:
                updates.append("end_date = %s")
                params.append(update_data.end_date)
            if update_data.auto_email is not None:
                updates.append("auto_email = %s")
                params.append(update_data.auto_email)

            if updates:
                params.append(id)
                params.append(current_user)
                cursor.execute(
                    f"UPDATE recurring_invoices SET {', '.join(updates)} WHERE id = %s AND owner_id = %s RETURNING *",
                    tuple(params)
                )
                schedule = cursor.fetchone()
        conn.commit()

        log_action(current_user, current_user, "update", "recurring_invoice", id, f"Recurring schedule updated")
        return {"data": schedule}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def delete_recurring_invoice(id: int, current_user: int = Depends(require_permission('invoices.delete'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM recurring_invoices WHERE id = %s AND owner_id = %s RETURNING id", (id, current_user))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Recurring schedule not found")
        conn.commit()

        log_action(current_user, current_user, "delete", "recurring_invoice", id, "Recurring schedule deleted")
        return {"message": "Recurring schedule deleted"}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/pause")
def pause_recurring_invoice(id: int, current_user: int = Depends(require_permission('invoices.create'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE recurring_invoices SET is_active = FALSE WHERE id = %s AND owner_id = %s RETURNING *",
                (id, current_user)
            )
            schedule = cursor.fetchone()
            if not schedule:
                raise HTTPException(status_code=404, detail="Recurring schedule not found")
        conn.commit()

        log_action(current_user, current_user, "pause", "recurring_invoice", id, "Recurring schedule paused")
        return {"data": schedule}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/resume")
def resume_recurring_invoice(id: int, current_user: int = Depends(require_permission('invoices.create'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE recurring_invoices SET is_active = TRUE WHERE id = %s AND owner_id = %s RETURNING *",
                (id, current_user)
            )
            schedule = cursor.fetchone()
            if not schedule:
                raise HTTPException(status_code=404, detail="Recurring schedule not found")
        conn.commit()

        log_action(current_user, current_user, "resume", "recurring_invoice", id, "Recurring schedule resumed")
        return {"data": schedule}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/run-now")
def run_now(id: int, current_user: int = Depends(require_permission('invoices.create'))):
    # Simulates a run for a single schedule by executing the scheduler logic synchronously for this ID
    from app.services.recurring_job import process_recurring_invoices
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM recurring_invoices WHERE id = %s AND owner_id = %s", (id, current_user))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Recurring schedule not found")
            # Force run it by temporarily making next_run_date today, running it, and it calculates next_run normally
            cursor.execute("UPDATE recurring_invoices SET next_run_date = CURRENT_DATE, is_active = TRUE WHERE id = %s", (id,))
        conn.commit()

        # Run job
        process_recurring_invoices()

        log_action(current_user, current_user, "run_now", "recurring_invoice", id, "Manual Run Now triggered")

        return {"message": "Recurring schedule executed"}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
