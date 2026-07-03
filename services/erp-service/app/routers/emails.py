from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.database import conn
from app.auth.permissions import require_permission

router = APIRouter(prefix="/email", tags=["Email Logs"])

@router.get("/logs")
def get_email_logs(limit: int = 50, skip: int = 0, current_user: int = Depends(require_permission('invoices.view'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT el.*, i.invoice_number 
                FROM email_logs el
                LEFT JOIN invoices i ON el.invoice_id = i.id
                WHERE el.owner_id = %s
                ORDER BY el.created_at DESC
                LIMIT %s OFFSET %s
                """,
                (current_user, limit, skip)
            )
            logs = cursor.fetchall()
        return {"data": logs}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/{id}")
def get_email_log(id: int, current_user: int = Depends(require_permission('invoices.view'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT el.*, i.invoice_number 
                FROM email_logs el
                LEFT JOIN invoices i ON el.invoice_id = i.id
                WHERE el.id = %s AND el.owner_id = %s
                """,
                (id, current_user)
            )
            log = cursor.fetchone()
        if not log:
            raise HTTPException(status_code=404, detail="Email log not found")
        return {"data": log}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
