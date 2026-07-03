from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.permissions import require_permission
from app.database import conn
from app.services.audit import sanitize_metadata

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/", include_in_schema=False)
@router.get("")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    start_date: date | None = None,
    end_date: date | None = None,
    entity_type: str | None = None,
    action: str | None = None,
    search: str | None = None,
    current_user: int = Depends(require_permission('audit_logs.view')),
):
    clauses = ["owner_id = %s"]
    params = [current_user]

    if start_date:
        clauses.append("created_at::date >= %s")
        params.append(start_date)
    if end_date:
        clauses.append("created_at::date <= %s")
        params.append(end_date)
    if entity_type:
        clauses.append("entity_type = %s")
        params.append(entity_type)
    if action:
        clauses.append("action = %s")
        params.append(action)
    if search:
        term = f"%{search}%"
        clauses.append("(description ILIKE %s OR action ILIKE %s OR entity_type ILIKE %s OR entity_id ILIKE %s)")
        params.extend([term, term, term, term])

    where_sql = " AND ".join(clauses)

    try:
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) AS total FROM audit_logs WHERE {where_sql}", tuple(params))
            total = cursor.fetchone()["total"]
            cursor.execute(
                f"""
                SELECT id, owner_id, user_id, action, entity_type, entity_id, description, metadata, created_at
                FROM audit_logs
                WHERE {where_sql}
                ORDER BY created_at DESC, id DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params + [limit, skip]),
            )
            logs = cursor.fetchall()
        for log in logs:
            log["metadata"] = sanitize_metadata(log.get("metadata"))
        return {"data": logs, "total": total, "limit": limit, "skip": skip}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}")
def get_audit_log(id: int, current_user: int = Depends(require_permission('audit_logs.view'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, owner_id, user_id, action, entity_type, entity_id, description, metadata, created_at
                FROM audit_logs
                WHERE id = %s AND owner_id = %s
                """,
                (id, current_user),
            )
            log = cursor.fetchone()
        if not log:
            raise HTTPException(status_code=404, detail="Audit log not found")
        log["metadata"] = sanitize_metadata(log.get("metadata"))
        return {"data": log}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
