from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from app.database import conn
from app.auth.permissions import require_permission
from app.schemas.adjustment import CreditNoteCreate
from app.services.audit import log_action
from app.services.inventory import (
    change_warehouse_stock,
    get_main_warehouse,
    is_inventory_tracked,
    mark_serials_sold,
    record_stock_movement,
    restore_sold_serials,
)
import os

router = APIRouter(prefix="/credit-notes", tags=["Credit Notes"])


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
def get_credit_notes(current_user: int = Depends(require_permission('invoices.view'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT cn.*, i.invoice_number, c.name as client_name
                FROM credit_notes cn
                JOIN invoices i ON cn.invoice_id = i.id
                LEFT JOIN clients c ON i.client_id = c.id
                WHERE cn.owner_id = %s
                ORDER BY cn.created_at DESC
                """,
                (current_user,)
            )
            return {"data": cursor.fetchall()}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}")
def get_credit_note(id: int, current_user: int = Depends(require_permission('invoices.view'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT cn.*, i.invoice_number, c.name as client_name, i.client_id
                FROM credit_notes cn
                JOIN invoices i ON cn.invoice_id = i.id
                LEFT JOIN clients c ON i.client_id = c.id
                WHERE cn.id = %s AND cn.owner_id = %s
                """,
                (id, current_user)
            )
            cn = cursor.fetchone()
            if not cn:
                raise HTTPException(status_code=404, detail="Credit Note not found")
            return {"data": cn}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
def create_credit_note(data: CreditNoteCreate, current_user: int = Depends(require_permission('invoices.create'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, invoice_number FROM invoices WHERE id = %s AND owner_id = %s", (data.invoice_id, current_user))
            invoice = cursor.fetchone()
            if not invoice:
                raise HTTPException(status_code=404, detail="Invoice not found")

            # 1. Process items if provided
            credit_amount = 0.0
            processed_items = []

            if data.items and len(data.items) > 0:
                for req_item in data.items:
                    cursor.execute("""
                        SELECT id, product_id, description, quantity, total, cogs
                        FROM invoice_items
                        WHERE id = %s AND invoice_id = %s
                    """, (req_item.invoice_item_id, data.invoice_id))
                    inv_item = cursor.fetchone()

                    if not inv_item:
                        raise HTTPException(status_code=404, detail=f"Invoice item {req_item.invoice_item_id} not found")

                    cursor.execute("""
                        SELECT COALESCE(SUM(returned_quantity), 0) as already_returned
                        FROM credit_note_items
                        WHERE invoice_item_id = %s
                    """, (req_item.invoice_item_id,))
                    already_returned = float(cursor.fetchone()["already_returned"])

                    original_qty = float(inv_item["quantity"])
                    available_to_return = original_qty - already_returned

                    if req_item.returned_quantity > available_to_return:
                        product_name = inv_item["description"]
                        raise HTTPException(status_code=400, detail=f"Returned quantity exceeds available quantity for product {product_name}")

                    # Calculate proportional tax-inclusive line total
                    unit_total = float(inv_item["total"]) / original_qty
                    line_total = unit_total * req_item.returned_quantity
                    credit_amount += line_total
                    
                    unit_cogs = float(inv_item.get("cogs") or 0) / original_qty
                    cogs_to_restore = unit_cogs * req_item.returned_quantity

                    processed_items.append({
                        "invoice_item_id": inv_item["id"],
                        "product_id": inv_item["product_id"],
                        "product_name": inv_item["description"],
                        "original_quantity": original_qty,
                        "returned_quantity": req_item.returned_quantity,
                        "unit_price": float(inv_item["total"]) / original_qty,
                        "line_total": line_total,
                        "cogs": cogs_to_restore
                    })
            else:
                raise HTTPException(status_code=400, detail="Credit Note requires itemized returns.")

            # 2. Generate CN number safely across tenants to avoid unique constraint collisions
            cursor.execute("SELECT COALESCE(MAX(id), 0) as max_id FROM credit_notes")
            max_id = cursor.fetchone()["max_id"]
            cn_number = f"CN-{str(max_id + 1).zfill(5)}"

            # 3. Create credit note
            cursor.execute(
                """
                INSERT INTO credit_notes (owner_id, invoice_id, credit_note_number, amount, reason, restock_items)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                """,
                (current_user, data.invoice_id, cn_number, credit_amount, data.reason, data.restock_items)
            )
            cn_id = cursor.fetchone()["id"]

            # Insert item rows
            for pi in processed_items:
                cursor.execute(
                    """
                    INSERT INTO credit_note_items (credit_note_id, invoice_item_id, product_id, product_name, original_quantity, returned_quantity, unit_price, line_total, cogs)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (cn_id, pi["invoice_item_id"], pi["product_id"], pi["product_name"], pi["original_quantity"], pi["returned_quantity"], pi["unit_price"], pi["line_total"], pi["cogs"])
                )

            # 4. Update balance due
            cursor.execute("UPDATE invoices SET balance_due = GREATEST(balance_due - %s, 0) WHERE id = %s", (credit_amount, data.invoice_id))

            # 5. Optional Stock Restoration — uses original invoice warehouse, skips service products
            if data.restock_items:
                cursor.execute("SELECT warehouse_id FROM invoices WHERE id=%s AND owner_id=%s", (data.invoice_id, current_user))
                inv_row = cursor.fetchone()
                if inv_row and inv_row.get("warehouse_id"):
                    cursor.execute("SELECT * FROM warehouses WHERE id=%s AND owner_id=%s", (inv_row["warehouse_id"], current_user))
                    restock_warehouse = cursor.fetchone() or get_main_warehouse(cursor, current_user)
                else:
                    restock_warehouse = get_main_warehouse(cursor, current_user)

                for item in processed_items:
                    if item["product_id"]:
                        # Skip service (non-tracked) products
                        if not is_inventory_tracked(cursor, item["product_id"], current_user):
                            continue
                        from app.services.inventory import restore_outbound_stock
                        cursor.execute("UPDATE products SET stock = stock + %s WHERE id = %s AND owner_id = %s", (item["returned_quantity"], item["product_id"], current_user))
                        change_warehouse_stock(cursor, restock_warehouse["id"], item["product_id"], item["returned_quantity"], prevent_negative=False)
                        restore_outbound_stock(cursor, current_user, item["product_id"], restock_warehouse["id"], item["returned_quantity"], item["cogs"])
                        restore_sold_serials(cursor, current_user, item["product_id"], restock_warehouse["id"], data.invoice_id, item["returned_quantity"])
                        record_stock_movement(
                            cursor, current_user, item["product_id"], "In",
                            item["returned_quantity"], restock_warehouse["name"],
                            f"Credit Note {cn_number}", invoice_id=data.invoice_id,
                            warehouse_id=restock_warehouse["id"],
                        )

                log_action(current_user, current_user, "credit_note_stock_restored", "credit_note", cn_id, f"Stock restored from Credit Note {cn_number}")

            # 6. Recalculate status
            update_invoice_status(cursor, data.invoice_id, current_user)

        conn.commit()

        log_action(current_user, current_user, "credit_note_created", "credit_note", cn_id,
                   f"Credit Note {cn_number} created for Invoice {invoice['invoice_number']}",
                   {"invoice_id": data.invoice_id, "credit_amount": credit_amount})
        return {"message": "Credit note created successfully", "id": cn_id}

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def delete_credit_note(id: int, current_user: int = Depends(require_permission('invoices.delete'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM credit_notes WHERE id = %s AND owner_id = %s", (id, current_user))
            cn = cursor.fetchone()
            if not cn:
                raise HTTPException(status_code=404, detail="Credit Note not found")

            # 1. Reverse balance due
            cursor.execute("UPDATE invoices SET balance_due = balance_due + %s WHERE id = %s", (cn["amount"], cn["invoice_id"]))

            # 2. Reverse stock if it was restocked — skip service products
            if cn["restock_items"]:
                cursor.execute("SELECT warehouse_id FROM invoices WHERE id=%s AND owner_id=%s", (cn["invoice_id"], current_user))
                inv_row = cursor.fetchone()
                if inv_row and inv_row.get("warehouse_id"):
                    cursor.execute("SELECT * FROM warehouses WHERE id=%s AND owner_id=%s", (inv_row["warehouse_id"], current_user))
                    rev_warehouse = cursor.fetchone() or get_main_warehouse(cursor, current_user)
                else:
                    rev_warehouse = get_main_warehouse(cursor, current_user)

                cursor.execute("SELECT product_id, returned_quantity FROM credit_note_items WHERE credit_note_id = %s AND product_id IS NOT NULL", (id,))
                items = cursor.fetchall()
                for item in items:
                    if not is_inventory_tracked(cursor, item["product_id"], current_user):
                        continue
                    cursor.execute("UPDATE products SET stock = stock - %s WHERE id = %s AND owner_id = %s", (item["returned_quantity"], item["product_id"], current_user))
                    change_warehouse_stock(cursor, rev_warehouse["id"], item["product_id"], -item["returned_quantity"], prevent_negative=True)
                    mark_serials_sold(cursor, current_user, item["product_id"], rev_warehouse["id"], cn["invoice_id"], item["returned_quantity"])
                    record_stock_movement(
                        cursor, current_user, item["product_id"], "Out",
                        item["returned_quantity"], rev_warehouse["name"],
                        f"Credit Note Reversal {cn['credit_note_number']}",
                        invoice_id=cn["invoice_id"], warehouse_id=rev_warehouse["id"],
                    )

            # 3. Recalculate status
            update_invoice_status(cursor, cn["invoice_id"], current_user)

            # 4. Delete the note
            cursor.execute("DELETE FROM credit_notes WHERE id = %s", (id,))

        conn.commit()

        log_action(current_user, current_user, "credit_note_deleted", "credit_note", id, f"Credit Note {cn['credit_note_number']} deleted and reversed")
        return {"message": "Credit note deleted"}

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}/pdf")
def generate_credit_note_pdf(id: int, current_user: int = Depends(require_permission('invoices.view'))):
    from app.services.credit_note_pdf import build_credit_note_pdf
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT cn.*, i.invoice_number, c.name as client_name, c.address as client_address, c.email as client_email, c.phone as client_phone
                FROM credit_notes cn
                JOIN invoices i ON cn.invoice_id = i.id
                LEFT JOIN clients c ON i.client_id = c.id
                WHERE cn.id = %s AND cn.owner_id = %s
                """,
                (id, current_user)
            )
            cn = cursor.fetchone()
            if not cn:
                raise HTTPException(status_code=404, detail="Credit Note not found")

            cursor.execute("SELECT * FROM credit_note_items WHERE credit_note_id = %s", (id,))
            cn_items = cursor.fetchall()
            cn["items"] = cn_items

            cursor.execute("SELECT * FROM company_settings WHERE owner_id = %s", (current_user,))
            company = cursor.fetchone() or {}

            cursor.execute("SELECT * FROM branding_settings WHERE owner_id = %s", (current_user,))
            branding = cursor.fetchone() or {}

        pdf_path = build_credit_note_pdf(cn, company, branding)
        return FileResponse(path=pdf_path, filename=f"credit_note_{cn['credit_note_number']}.pdf", media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
