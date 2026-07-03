from fastapi import APIRouter, HTTPException, Depends

from app.database import conn
from app.schemas.client import Client
from app.auth.permissions import require_permission
from app.services.audit import log_action

router = APIRouter(prefix="/clients", tags=["Clients"])


def _client_or_404(client_id: int, owner_id: int):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM clients WHERE id=%s AND owner_id=%s", (client_id, owner_id))
        client = cursor.fetchone()
    if client is None:
        raise HTTPException(status_code=404, detail=f"Client with id {client_id} not found")
    return client


@router.get("/")
def get_clients(
    limit: int = 100,
    skip: int = 0,
    search: str | None = None,
    state: str | None = None,
    has_gst: bool | None = None,
    current_user: int = Depends(require_permission('clients.view')),
):
    clauses = ["owner_id = %s"]
    params = [current_user]
    if search:
        clauses.append("(name ILIKE %s OR email ILIKE %s OR phone ILIKE %s OR gst_number ILIKE %s)")
        term = f"%{search}%"
        params.extend([term, term, term, term])
    if state:
        clauses.append("state ILIKE %s")
        params.append(f"%{state}%")
    if has_gst is not None:
        clauses.append("gst_number IS NOT NULL AND gst_number <> ''" if has_gst else "(gst_number IS NULL OR gst_number = '')")

    params.extend([limit, skip])
    with conn.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT * FROM clients
            WHERE {' AND '.join(clauses)}
            ORDER BY id DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params),
        )
        clients = cursor.fetchall()
    return {"data": clients}


@router.get("/search")
def search_clients(name: str, current_user: int = Depends(require_permission('clients.view'))):
    return get_clients(search=name, current_user=current_user)


@router.post("/")
def create_client(client: Client, current_user: int = Depends(require_permission('clients.create'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO clients (name, email, phone, address, gst_number, state, website, industry, notes, owner_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (client.name, client.email, client.phone, client.address, client.gst_number, client.state, client.website, client.industry, client.notes, current_user),
        )
        new_client = cursor.fetchone()
    conn.commit()
    log_action(
        current_user,
        current_user,
        "create",
        "client",
        new_client["id"],
        f"Client created: {new_client.get('name')}",
        {"client_name": new_client.get("name"), "email": new_client.get("email")},
    )
    return {"data": new_client}


@router.get("/{id}")
def get_client(id: int, current_user: int = Depends(require_permission('clients.view'))):
    client = _client_or_404(id, current_user)
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*) AS invoice_count,
                COALESCE(SUM(total), 0) AS lifetime_billed,
                COALESCE(SUM(paid_amount), 0) AS lifetime_paid,
                COALESCE(SUM(balance_due), 0) AS outstanding
            FROM invoices
            WHERE owner_id=%s AND client_id=%s
            """,
            (current_user, id),
        )
        summary = cursor.fetchone()
    return {"data": {**client, "summary": summary}}


@router.get("/{id}/invoices")
def get_client_invoices(id: int, current_user: int = Depends(require_permission('clients.view'))):
    _client_or_404(id, current_user)
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, invoice_number, amount, subtotal, tax_total, total, paid_amount, balance_due,
                   status, issue_date, due_date, created_at
            FROM invoices
            WHERE owner_id=%s AND client_id=%s
            ORDER BY created_at DESC
            """,
            (current_user, id),
        )
        invoices = cursor.fetchall()
    return {"data": invoices}


@router.get("/{id}/payments")
def get_client_payments(id: int, current_user: int = Depends(require_permission('clients.view'))):
    _client_or_404(id, current_user)
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT p.*, i.invoice_number
            FROM payments p
            JOIN invoices i ON p.invoice_id = i.id
            WHERE p.owner_id=%s AND i.client_id=%s
            ORDER BY p.created_at DESC
            """,
            (current_user, id),
        )
        payments = cursor.fetchall()
    return {"data": payments}


@router.put("/{id}")
def update_client(id: int, client: Client, current_user: int = Depends(require_permission('clients.edit'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE clients
            SET name=%s, email=%s, phone=%s, address=%s, gst_number=%s, state=%s, website=%s, industry=%s, notes=%s
            WHERE id=%s AND owner_id=%s
            RETURNING *
            """,
            (client.name, client.email, client.phone, client.address, client.gst_number, client.state, client.website, client.industry, client.notes, id, current_user),
        )
        updated_client = cursor.fetchone()
    if updated_client is None:
        raise HTTPException(status_code=404, detail=f"Client with id {id} not found")
    conn.commit()
    log_action(
        current_user,
        current_user,
        "update",
        "client",
        id,
        f"Client updated: {updated_client.get('name')}",
        {"client_name": updated_client.get("name"), "email": updated_client.get("email")},
    )
    return {"data": updated_client}


@router.delete("/{id}")
def delete_client(id: int, current_user: int = Depends(require_permission('clients.delete'))):
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM clients WHERE id=%s AND owner_id=%s RETURNING *", (id, current_user))
        deleted_client = cursor.fetchone()
    if deleted_client is None:
        raise HTTPException(status_code=404, detail=f"Client with id {id} not found")
    conn.commit()
    log_action(
        current_user,
        current_user,
        "delete",
        "client",
        id,
        f"Client deleted: {deleted_client.get('name')}",
        {"client_name": deleted_client.get("name"), "email": deleted_client.get("email")},
    )
    return {"message": "Client deleted"}
