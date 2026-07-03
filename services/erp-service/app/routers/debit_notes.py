from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from app.database import conn
from app.auth.permissions import require_permission
from app.schemas.adjustment import DebitNoteCreate
from app.services.audit import log_action

router = APIRouter(prefix="/debit-notes", tags=["Debit Notes"])

def update_invoice_status(cursor, invoice_id, owner_id):
    cursor.execute("SELECT total, balance_due FROM invoices WHERE id = %s AND owner_id = %s", (invoice_id, owner_id))
    inv = cursor.fetchone()
    if not inv:
        return
    
    total = float(inv["total"] or 0)
    balance_due = float(inv["balance_due"] or 0)
    
    if balance_due <= 0:
        status = "paid"
    elif balance_due < total:
        status = "partially_paid"
    else:
        status = "pending"
        
    cursor.execute("UPDATE invoices SET status = %s WHERE id = %s", (status, invoice_id))

@router.get("/")
def get_debit_notes(current_user: int = Depends(require_permission('invoices.view'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT dn.*, i.invoice_number, c.name as client_name
                FROM debit_notes dn
                JOIN invoices i ON dn.invoice_id = i.id
                LEFT JOIN clients c ON i.client_id = c.id
                WHERE dn.owner_id = %s
                ORDER BY dn.created_at DESC
                """,
                (current_user,)
            )
            return cursor.fetchall()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}")
def get_debit_note(id: int, current_user: int = Depends(require_permission('invoices.view'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT dn.*, i.invoice_number, c.name as client_name, i.client_id
                FROM debit_notes dn
                JOIN invoices i ON dn.invoice_id = i.id
                LEFT JOIN clients c ON i.client_id = c.id
                WHERE dn.id = %s AND dn.owner_id = %s
                """,
                (id, current_user)
            )
            dn = cursor.fetchone()
            if not dn:
                raise HTTPException(status_code=404, detail="Debit Note not found")
            return dn
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def create_debit_note(data: DebitNoteCreate, current_user: int = Depends(require_permission('invoices.create'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, invoice_number FROM invoices WHERE id = %s AND owner_id = %s", (data.invoice_id, current_user))
            invoice = cursor.fetchone()
            if not invoice:
                raise HTTPException(status_code=404, detail="Invoice not found")
                
            cursor.execute("SELECT COUNT(id) as cnt FROM debit_notes WHERE owner_id = %s", (current_user,))
            cnt = cursor.fetchone()["cnt"]
            dn_number = f"DN-{str(cnt + 1).zfill(5)}"

            cursor.execute(
                """
                INSERT INTO debit_notes (owner_id, invoice_id, debit_note_number, amount, reason)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
                """,
                (current_user, data.invoice_id, dn_number, data.amount, data.reason)
            )
            dn_id = cursor.fetchone()["id"]

            cursor.execute("UPDATE invoices SET balance_due = balance_due + %s WHERE id = %s", (data.amount, data.invoice_id))
            
            update_invoice_status(cursor, data.invoice_id, current_user)
            
        conn.commit()
        
        log_action(current_user, current_user, "debit_note_created", "debit_note", dn_id, f"Debit Note {dn_number} created for Invoice {invoice['invoice_number']}", {"invoice_id": data.invoice_id, "amount": data.amount})
        return {"message": "Debit note created successfully", "id": dn_id}
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def delete_debit_note(id: int, current_user: int = Depends(require_permission('invoices.delete'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM debit_notes WHERE id = %s AND owner_id = %s", (id, current_user))
            dn = cursor.fetchone()
            if not dn:
                raise HTTPException(status_code=404, detail="Debit Note not found")

            # Reverse balance due (do not allow negative)
            cursor.execute("UPDATE invoices SET balance_due = GREATEST(balance_due - %s, 0) WHERE id = %s", (dn["amount"], dn["invoice_id"]))
            
            update_invoice_status(cursor, dn["invoice_id"], current_user)
            
            cursor.execute("DELETE FROM debit_notes WHERE id = %s", (id,))
            
        conn.commit()
        
        log_action(current_user, current_user, "debit_note_deleted", "debit_note", id, f"Debit Note {dn['debit_note_number']} deleted and reversed")
        return {"message": "Debit note deleted"}
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}/pdf")
def generate_debit_note_pdf(id: int, current_user: int = Depends(require_permission('invoices.view'))):
    from app.services.debit_note_pdf import build_debit_note_pdf
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT dn.*, i.invoice_number, c.name as client_name, c.address as client_address, c.email as client_email, c.phone as client_phone
                FROM debit_notes dn
                JOIN invoices i ON dn.invoice_id = i.id
                LEFT JOIN clients c ON i.client_id = c.id
                WHERE dn.id = %s AND dn.owner_id = %s
                """,
                (id, current_user)
            )
            dn = cursor.fetchone()
            if not dn:
                raise HTTPException(status_code=404, detail="Debit Note not found")
                
            cursor.execute("SELECT * FROM company_settings WHERE owner_id = %s", (current_user,))
            company = cursor.fetchone() or {}
            
            cursor.execute("SELECT * FROM branding_settings WHERE owner_id = %s", (current_user,))
            branding = cursor.fetchone() or {}

        pdf_path = build_debit_note_pdf(dn, company, branding)
        return FileResponse(path=pdf_path, filename=f"debit_note_{dn['debit_note_number']}.pdf", media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
