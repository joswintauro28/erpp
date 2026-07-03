from fastapi import APIRouter, Depends, HTTPException
from app.database import conn
from app.auth.permissions import require_permission
from app.schemas.workflow import WorkflowSettingsUpdate, WorkflowSettingsOut
from app.services.audit import log_action

router = APIRouter(prefix="/workflow-settings", tags=["Workflow Settings"])

def get_or_create_workflow_settings(owner_id: int):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM workflow_settings WHERE owner_id = %s", (owner_id,))
        settings = cursor.fetchone()
        if not settings:
            cursor.execute(
                """
                INSERT INTO workflow_settings (owner_id) 
                VALUES (%s) RETURNING *
                """, (owner_id,)
            )
            settings = cursor.fetchone()
        return settings

@router.get("/", response_model=WorkflowSettingsOut)
def get_workflow_settings(current_user: int = Depends(require_permission('workflow.manage'))):
    try:
        settings = get_or_create_workflow_settings(current_user)
        conn.commit()
        return settings
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=WorkflowSettingsOut)
def update_workflow_settings(data: WorkflowSettingsUpdate, current_user: int = Depends(require_permission('workflow.manage'))):
    try:
        old_settings = get_or_create_workflow_settings(current_user)
        
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE workflow_settings SET
                    send_upcoming_invoice_reminders = %s,
                    upcoming_reminder_days = %s,
                    send_due_today_reminders = %s,
                    send_overdue_reminders = %s,
                    overdue_reminder_frequency_days = %s,
                    auto_email_recurring_invoices = %s,
                    notify_low_stock = %s,
                    send_low_stock_email = %s,
                    send_quotation_expiry_reminders = %s,
                    send_quotation_expiry_email = %s,
                    quotation_expiry_days = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE owner_id = %s
                RETURNING *
                """,
                (
                    data.send_upcoming_invoice_reminders,
                    data.upcoming_reminder_days,
                    data.send_due_today_reminders,
                    data.send_overdue_reminders,
                    data.overdue_reminder_frequency_days,
                    data.auto_email_recurring_invoices,
                    data.notify_low_stock,
                    data.send_low_stock_email,
                    data.send_quotation_expiry_reminders,
                    data.send_quotation_expiry_email,
                    data.quotation_expiry_days,
                    current_user
                )
            )
            new_settings = cursor.fetchone()
            
        conn.commit()
        
        log_action(
            owner_id=current_user,
            user_id=current_user,
            action="update",
            entity_type="workflow_settings",
            entity_id=new_settings["id"],
            description="Workflow automation settings updated",
            metadata={"previous": old_settings, "new": new_settings}
        )
        
        return new_settings
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
