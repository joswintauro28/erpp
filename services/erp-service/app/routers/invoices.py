from datetime import date
from decimal import Decimal, ROUND_HALF_UP
import os
import tempfile
import textwrap

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.database import conn
from app.schemas.invoice import Invoice, InvoiceUpdate, InvoiceEmailRequest
from app.auth.permissions import require_permission
from app.email_utils.email_utils import EmailNotConfigured, send_email
from app.services.audit import log_action
from app.services.inventory import (
    apply_fifo_batches,
    apply_specific_batch_allocations,
    assert_warehouse_owned,
    change_warehouse_stock,
    get_main_warehouse,
    is_inventory_tracked,
    mark_serials_sold,
    mark_specific_serials_sold,
    record_stock_movement,
    restore_sold_serials,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])
MONEY = Decimal("0.01")


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(MONEY, rounding=ROUND_HALF_UP)


def _stock_quantity(value) -> int:
    quantity = Decimal(str(value or 0))
    if quantity != quantity.to_integral_value():
        raise HTTPException(status_code=400, detail="Product-linked invoice quantities must be whole numbers")
    return int(quantity)


def _calculate_items(items, gst_treatment: str):
    calculated = []
    subtotal = tax_total = cgst_total = sgst_total = igst_total = Decimal("0.00")
    for item in items:
        quantity = _money(item.quantity)
        unit_price = _money(item.unit_price)
        gst_rate = Decimal(str(item.gst_rate or 0))
        taxable = _money(quantity * unit_price)
        tax = _money(taxable * gst_rate / Decimal("100"))
        if gst_treatment == "interstate":
            cgst = Decimal("0.00")
            sgst = Decimal("0.00")
            igst = tax
        else:
            cgst = _money(tax / 2)
            sgst = tax - cgst
            igst = Decimal("0.00")
        total = taxable + cgst + sgst + igst
        calculated.append({
            "product_id": item.product_id,
            "description": item.description,
            "quantity": quantity,
            "unit_price": unit_price,
            "gst_rate": gst_rate,
            "taxable_amount": taxable,
            "cgst": cgst,
            "sgst": sgst,
            "igst": igst,
            "total": total,
            # Pass through serial/batch metadata for _apply_stock_deltas
            "serial_ids": getattr(item, "serial_ids", None),
            "batch_allocations": getattr(item, "batch_allocations", None),
        })
        subtotal += taxable
        tax_total += tax
        cgst_total += cgst
        sgst_total += sgst
        igst_total += igst
    return calculated, subtotal, tax_total, cgst_total, sgst_total, igst_total, subtotal + tax_total


def _product_quantities(items):
    quantities = {}
    for item in items:
        product_id = item.get("product_id") if isinstance(item, dict) else item["product_id"]
        if not product_id:
            continue
        quantity = _stock_quantity(item.get("quantity") if isinstance(item, dict) else item["quantity"])
        quantities[product_id] = quantities.get(product_id, 0) + quantity
    return quantities


def _assert_products_owned(cursor, items, owner_id: int):
    product_ids = sorted({item.get("product_id") for item in items if item.get("product_id")})
    for product_id in product_ids:
        cursor.execute("SELECT id FROM products WHERE id=%s AND owner_id=%s", (product_id, owner_id))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=400, detail=f"Product {product_id} not found")


def _resolve_warehouse(cursor, warehouse_id, owner_id):
    """Return warehouse row. If warehouse_id given, validate it. Else fall back to main warehouse."""
    if warehouse_id:
        return assert_warehouse_owned(cursor, warehouse_id, owner_id)
    return get_main_warehouse(cursor, owner_id)


def _apply_stock_deltas(cursor, invoice_id: int, owner_id: int, old_quantities: dict, new_quantities: dict,
                        warehouse=None, invoice_items=None):
    """
    Apply stock changes for an invoice.
    - Skips products where track_inventory=False (service products).
    - Uses specified warehouse (falls back to main).
    - Supports explicit serial_ids and batch_allocations per item.
    """
    if warehouse is None:
        warehouse = get_main_warehouse(cursor, owner_id)
    warehouse_id = warehouse["id"]
    warehouse_name = warehouse["name"]

    # Build item-level metadata (serial_ids, batch_allocations) keyed by product_id
    item_meta = {}
    if invoice_items:
        for item in invoice_items:
            pid = item.get("product_id") if isinstance(item, dict) else getattr(item, "product_id", None)
            if pid:
                item_meta[pid] = {
                    "serial_ids": item.get("serial_ids") if isinstance(item, dict) else getattr(item, "serial_ids", None),
                    "batch_allocations": item.get("batch_allocations") if isinstance(item, dict) else getattr(item, "batch_allocations", None),
                }

    product_ids = set(old_quantities) | set(new_quantities)
    for product_id in sorted(product_ids):
        delta = new_quantities.get(product_id, 0) - old_quantities.get(product_id, 0)
        if delta == 0:
            continue

        # Skip service (non-inventory) products
        if not is_inventory_tracked(cursor, product_id, owner_id):
            continue

        cursor.execute(
            "SELECT id, name, stock FROM products WHERE id=%s AND owner_id=%s FOR UPDATE",
            (product_id, owner_id),
        )
        product = cursor.fetchone()
        if product is None:
            raise HTTPException(status_code=400, detail=f"Product {product_id} not found")

        meta = item_meta.get(product_id, {})
        from app.services.inventory import deduct_outbound_stock, restore_outbound_stock

        if delta > 0:
            if product["stock"] < delta:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
            movement_type = "Out"
            quantity = delta
            stock_change = -quantity
            change_warehouse_stock(cursor, warehouse_id, product_id, -quantity, prevent_negative=True)
            
            cogs = deduct_outbound_stock(cursor, owner_id, product_id, quantity)
            cursor.execute(
                "UPDATE invoice_items SET cogs = COALESCE(cogs, 0) + %s WHERE invoice_id=%s AND product_id=%s", 
                (cogs, invoice_id, product_id)
            )

            # Batch: manual allocation or FEFO fallback
            batch_allocs = meta.get("batch_allocations")
            if batch_allocs:
                alloc_dicts = [a.dict() if hasattr(a, "dict") else dict(a) for a in batch_allocs]
                apply_specific_batch_allocations(cursor, owner_id, product_id, warehouse_id, alloc_dicts)
            else:
                apply_fifo_batches(cursor, owner_id, product_id, warehouse_id, quantity)

            # Serials: manual selection or auto fallback
            serial_ids = meta.get("serial_ids")
            if serial_ids:
                mark_specific_serials_sold(cursor, owner_id, product_id, warehouse_id, invoice_id, serial_ids)
            else:
                mark_serials_sold(cursor, owner_id, product_id, warehouse_id, invoice_id, quantity)
        else:
            movement_type = "In"
            quantity = abs(delta)
            stock_change = quantity
            change_warehouse_stock(cursor, warehouse_id, product_id, quantity, prevent_negative=False)
            restore_sold_serials(cursor, owner_id, product_id, warehouse_id, invoice_id, quantity)
            
            cursor.execute("SELECT SUM(cogs) as total_cogs, SUM(quantity) as total_qty FROM invoice_items WHERE invoice_id=%s AND product_id=%s", (invoice_id, product_id))
            row = cursor.fetchone()
            if row and row["total_qty"] and row["total_qty"] > 0:
                unit_cogs = float(row["total_cogs"] or 0) / float(row["total_qty"])
                cogs_to_restore = unit_cogs * quantity
                restore_outbound_stock(cursor, owner_id, product_id, warehouse_id, quantity, cogs_to_restore)
                cursor.execute("UPDATE invoice_items SET cogs = GREATEST(0, COALESCE(cogs, 0) - %s) WHERE invoice_id=%s AND product_id=%s", (cogs_to_restore, invoice_id, product_id))

        cursor.execute(
            "UPDATE products SET stock = stock + %s WHERE id=%s AND owner_id=%s",
            (stock_change, product_id, owner_id),
        )
        record_stock_movement(
            cursor,
            owner_id,
            product_id,
            movement_type,
            quantity,
            warehouse_name,
            str(invoice_id),
            invoice_id=invoice_id,
            warehouse_id=warehouse_id,
        )


def _payload_items(invoice: Invoice):
    if invoice.items:
        return invoice.items
    from app.schemas.invoice import InvoiceItem
    return [InvoiceItem(description="Invoice total", quantity=1, unit_price=invoice.amount or 0, gst_rate=0)]


def _assert_client(client_id: int, owner_id: int):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM clients WHERE id=%s AND owner_id=%s", (client_id, owner_id))
        client = cursor.fetchone()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


def _computed_status_sql(alias="invoices"):
    return f"""
    CASE
        WHEN {alias}.status = 'cancelled' THEN 'cancelled'
        WHEN COALESCE({alias}.balance_due, {alias}.amount) <= 0 THEN 'paid'
        WHEN COALESCE({alias}.paid_amount, 0) > 0 THEN 'partially_paid'
        WHEN {alias}.due_date < CURRENT_DATE THEN 'overdue'
        ELSE COALESCE({alias}.status, 'pending')
    END
    """


def recompute_invoice_settlement(invoice_id: int, owner_id: int):
    with conn.cursor() as cursor:
        cursor.execute("SELECT total, amount, due_date, status FROM invoices WHERE id=%s AND owner_id=%s", (invoice_id, owner_id))
        invoice = cursor.fetchone()
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS paid
            FROM payments
            WHERE invoice_id=%s AND owner_id=%s AND COALESCE(status, 'completed') = 'completed'
            """,
            (invoice_id, owner_id),
        )
        paid = _money(cursor.fetchone()["paid"])
        total = _money(invoice["total"] or invoice["amount"])
        balance = max(total - paid, Decimal("0.00"))
        if invoice["status"] == "cancelled":
            status = "cancelled"
        elif balance <= 0:
            status = "paid"
        elif paid > 0:
            status = "partially_paid"
        elif invoice["due_date"] and invoice["due_date"] < date.today():
            status = "overdue"
        else:
            status = "pending"
        cursor.execute(
            """
            UPDATE invoices
            SET paid_amount=%s, balance_due=%s, status=%s, updated_at=CURRENT_TIMESTAMP
            WHERE id=%s AND owner_id=%s
            RETURNING *
            """,
            (paid, balance, status, invoice_id, owner_id),
        )
        updated = cursor.fetchone()
    conn.commit()
    return updated


def _get_invoice_full(invoice_id: int, owner_id: int):
    with conn.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT invoices.*, {_computed_status_sql()} AS computed_status,
                   clients.name AS client_name, clients.email AS client_email, clients.phone AS client_phone,
                   clients.address AS client_address, clients.gst_number AS client_gst_number, clients.state AS client_state,
                   w.name AS warehouse_name,
                   eway_bills.eway_bill_number, eway_bills.vehicle_number, eway_bills.transporter_name, eway_bills.distance_km
            FROM invoices
            JOIN clients ON invoices.client_id = clients.id
            LEFT JOIN warehouses w ON invoices.warehouse_id = w.id
            LEFT JOIN eway_bills ON invoices.id = eway_bills.invoice_id
            WHERE invoices.id=%s AND invoices.owner_id=%s
            """,
            (invoice_id, owner_id),
        )
        invoice = cursor.fetchone()
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        cursor.execute(
            """
            SELECT ii.*, p.name AS product_name, p.sku AS product_sku,
                   COALESCE((SELECT SUM(returned_quantity) FROM credit_note_items cni WHERE cni.invoice_item_id = ii.id), 0) AS already_returned
            FROM invoice_items ii
            LEFT JOIN products p ON ii.product_id = p.id
            WHERE ii.invoice_id=%s
            ORDER BY ii.id ASC
            """,
            (invoice_id,),
        )
        items = cursor.fetchall()
        cursor.execute("SELECT * FROM payments WHERE invoice_id=%s AND owner_id=%s ORDER BY created_at DESC", (invoice_id, owner_id))
        payments = cursor.fetchall()
        cursor.execute("SELECT * FROM company_settings WHERE owner_id=%s", (owner_id,))
        company = cursor.fetchone() or {}
        cursor.execute("SELECT * FROM branding_settings WHERE owner_id=%s", (owner_id,))
        branding = cursor.fetchone() or {}
    return {"invoice": invoice, "items": items, "payments": payments, "company": company, "branding": branding}


@router.post("/")
def create_invoice(invoice: Invoice, current_user: int = Depends(require_permission('invoices.create'))):
    _assert_client(invoice.client_id, current_user)
    payload_items = _payload_items(invoice)
    items, subtotal, tax_total, cgst, sgst, igst, total = _calculate_items(payload_items, invoice.gst_treatment)
    issue_date = invoice.issue_date or date.today()
    status = invoice.status or "pending"
    product_quantities = _product_quantities(items) if status != "cancelled" else {}
    try:
        with conn.cursor() as cursor:
            _assert_products_owned(cursor, items, current_user)
            # Resolve warehouse (optional for service-only invoices)
            warehouse = _resolve_warehouse(cursor, invoice.warehouse_id, current_user)
            cursor.execute(
                """
                INSERT INTO invoices (client_id, amount, owner_id, due_date, issue_date, subtotal, cgst, sgst, igst,
                                      tax_total, total, paid_amount, balance_due, gst_treatment, place_of_supply, notes, status,
                                      inventory_applied, warehouse_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (invoice.client_id, total, current_user, invoice.due_date, issue_date, subtotal, cgst, sgst, igst,
                 tax_total, total, total, invoice.gst_treatment, invoice.place_of_supply, invoice.notes, status,
                 bool(product_quantities), warehouse["id"]),
            )
            new_invoice = cursor.fetchone()
            cursor.execute(
                "UPDATE invoices SET invoice_number=%s WHERE id=%s RETURNING *",
                (f"INV-{new_invoice['id']:05d}", new_invoice["id"]),
            )
            new_invoice = cursor.fetchone()
            for item in items:
                cursor.execute(
                    """
                    INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, gst_rate,
                                               taxable_amount, cgst, sgst, igst, total)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (new_invoice["id"], item["product_id"], item["description"], item["quantity"], item["unit_price"], item["gst_rate"],
                     item["taxable_amount"], item["cgst"], item["sgst"], item["igst"], item["total"]),
                )
            _apply_stock_deltas(cursor, new_invoice["id"], current_user, {}, product_quantities,
                                warehouse=warehouse, invoice_items=items)
        conn.commit()
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
    log_action(
        current_user,
        current_user,
        "create",
        "invoice",
        new_invoice["id"],
        f"Invoice created: {new_invoice.get('invoice_number')}",
        {"invoice_number": new_invoice.get("invoice_number"), "client_id": new_invoice.get("client_id"), "total": new_invoice.get("total")},
    )
    return {"data": new_invoice}


@router.get("/")
def get_invoices(
    search: str | None = None,
    status: str | None = None,
    client_id: int | None = None,
    overdue: bool | None = None,
    limit: int = 100,
    skip: int = 0,
    current_user: int = Depends(require_permission('invoices.view')),
):
    clauses = ["invoices.owner_id = %s"]
    params = [current_user]
    if search:
        clauses.append("(clients.name ILIKE %s OR invoices.invoice_number ILIKE %s)")
        term = f"%{search}%"
        params.extend([term, term])
    if client_id:
        clauses.append("invoices.client_id = %s")
        params.append(client_id)
    if overdue is True:
        clauses.append("COALESCE(invoices.balance_due, invoices.amount) > 0 AND invoices.due_date < CURRENT_DATE")
    params.extend([limit, skip])
    status_filter = status.lower() if status else None
    with conn.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT invoices.id, invoices.invoice_number, invoices.client_id, clients.name AS client_name,
                   invoices.amount, invoices.subtotal, invoices.tax_total, invoices.total, invoices.paid_amount,
                   invoices.balance_due, {_computed_status_sql()} AS status, invoices.due_date, invoices.issue_date,
                   invoices.created_at, invoices.warehouse_id,
                   w.name AS warehouse_name
            FROM invoices
            JOIN clients ON invoices.client_id = clients.id
            LEFT JOIN warehouses w ON invoices.warehouse_id = w.id
            WHERE {' AND '.join(clauses)}
            ORDER BY invoices.created_at DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params),
        )
        invoices = cursor.fetchall()
    if status_filter:
        invoices = [inv for inv in invoices if (inv.get("status") or "").lower() == status_filter]
    return {"data": invoices}


@router.get("/overdue")
def get_overdue_invoices(current_user: int = Depends(require_permission('invoices.view'))):
    return get_invoices(overdue=True, current_user=current_user)


@router.get("/gst-summary")
def gst_summary(current_user: int = Depends(require_permission('invoices.view'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT COALESCE(SUM(subtotal),0) AS taxable_value,
                   COALESCE(SUM(cgst),0) AS cgst,
                   COALESCE(SUM(sgst),0) AS sgst,
                   COALESCE(SUM(igst),0) AS igst,
                   COALESCE(SUM(tax_total),0) AS tax_total,
                   COALESCE(SUM(total),0) AS invoice_total
            FROM invoices
            WHERE owner_id=%s AND status <> 'cancelled'
            """,
            (current_user,),
        )
        summary = cursor.fetchone()
    return {"data": summary}


@router.get("/{id}/details")
def get_invoice_details(id: int, current_user: int = Depends(require_permission('invoices.view'))):
    data = _get_invoice_full(id, current_user)
    invoice = data["invoice"]
    return {
        "data": {
            **invoice,
            "status": invoice["computed_status"],
            "items": data["items"],
            "payments": data["payments"],
            "company": data["company"],
            "branding": data["branding"],
            "eway_bill": {
                "eway_bill_number": invoice.get("eway_bill_number"),
                "vehicle_number": invoice.get("vehicle_number"),
                "transporter_name": invoice.get("transporter_name"),
                "distance_km": invoice.get("distance_km"),
            },
        }
    }


@router.get("/{id}")
def get_invoice(id: int, current_user: int = Depends(require_permission('invoices.view'))):
    return get_invoice_details(id, current_user)


@router.put("/{id}")
def update_invoice(id: int, invoice: Invoice, current_user: int = Depends(require_permission('invoices.edit'))):
    _assert_client(invoice.client_id, current_user)
    payload_items = _payload_items(invoice)
    items, subtotal, tax_total, cgst, sgst, igst, total = _calculate_items(payload_items, invoice.gst_treatment)
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM invoices WHERE id=%s AND owner_id=%s FOR UPDATE", (id, current_user))
            existing_invoice = cursor.fetchone()
            if existing_invoice is None:
                raise HTTPException(status_code=404, detail=f"Invoice with id {id} not found")
            _assert_products_owned(cursor, items, current_user)

            # Resolve warehouse
            wh_id = invoice.warehouse_id or existing_invoice.get("warehouse_id")
            warehouse = _resolve_warehouse(cursor, wh_id, current_user)

            cursor.execute("SELECT product_id, quantity FROM invoice_items WHERE invoice_id=%s", (id,))
            old_items = cursor.fetchall()
            old_quantities = _product_quantities(old_items) if existing_invoice.get("inventory_applied") else {}
            new_quantities = _product_quantities(items) if existing_invoice.get("status") != "cancelled" else {}
            _apply_stock_deltas(cursor, id, current_user, old_quantities, new_quantities,
                                warehouse=warehouse, invoice_items=items)

            cursor.execute(
                """
                UPDATE invoices
                SET client_id=%s, amount=%s, due_date=%s, issue_date=%s, subtotal=%s, cgst=%s, sgst=%s, igst=%s,
                    tax_total=%s, total=%s, gst_treatment=%s, place_of_supply=%s, notes=%s,
                    inventory_applied=%s, warehouse_id=%s, updated_at=CURRENT_TIMESTAMP
                WHERE id=%s AND owner_id=%s
                RETURNING *
                """,
                (invoice.client_id, total, invoice.due_date, invoice.issue_date or date.today(), subtotal, cgst, sgst, igst,
                 tax_total, total, invoice.gst_treatment, invoice.place_of_supply, invoice.notes,
                 bool(new_quantities), warehouse["id"], id, current_user),
            )
            updated_invoice = cursor.fetchone()
            cursor.execute("DELETE FROM invoice_items WHERE invoice_id=%s", (id,))
            for item in items:
                cursor.execute(
                    """
                    INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, gst_rate,
                                               taxable_amount, cgst, sgst, igst, total)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (id, item["product_id"], item["description"], item["quantity"], item["unit_price"], item["gst_rate"],
                     item["taxable_amount"], item["cgst"], item["sgst"], item["igst"], item["total"]),
                )
        conn.commit()
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
    settled_invoice = recompute_invoice_settlement(id, current_user)
    log_action(
        current_user,
        current_user,
        "update",
        "invoice",
        id,
        f"Invoice updated: {settled_invoice.get('invoice_number')}",
        {"invoice_number": settled_invoice.get("invoice_number"), "client_id": settled_invoice.get("client_id"), "total": settled_invoice.get("total")},
    )
    return {"data": settled_invoice}


@router.put("/{id}/status")
def update_invoice_status(id: int, invoice: InvoiceUpdate, current_user: int = Depends(require_permission('invoices.edit'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM invoices WHERE id=%s AND owner_id=%s FOR UPDATE", (id, current_user))
            existing_invoice = cursor.fetchone()
            if existing_invoice is None:
                raise HTTPException(status_code=404, detail=f"Invoice with id {id} not found")

            # Resolve warehouse for stock ops
            wh_id = existing_invoice.get("warehouse_id")
            warehouse = _resolve_warehouse(cursor, wh_id, current_user)

            cursor.execute("SELECT product_id, quantity FROM invoice_items WHERE invoice_id=%s", (id,))
            item_quantities = _product_quantities(cursor.fetchall())
            if invoice.status == "cancelled" and existing_invoice.get("inventory_applied"):
                _apply_stock_deltas(cursor, id, current_user, item_quantities, {}, warehouse=warehouse)
                inventory_applied = False
            elif invoice.status != "cancelled" and not existing_invoice.get("inventory_applied"):
                _apply_stock_deltas(cursor, id, current_user, {}, item_quantities, warehouse=warehouse)
                inventory_applied = bool(item_quantities)
            else:
                inventory_applied = existing_invoice.get("inventory_applied")

            if invoice.status == "paid":
                cursor.execute(
                    """
                    UPDATE invoices SET paid_amount=total, balance_due=0, status='paid',
                        inventory_applied=%s, updated_at=CURRENT_TIMESTAMP
                    WHERE id=%s AND owner_id=%s RETURNING *
                    """,
                    (inventory_applied, id, current_user),
                )
            else:
                cursor.execute(
                    """
                    UPDATE invoices SET status=%s, inventory_applied=%s, updated_at=CURRENT_TIMESTAMP
                    WHERE id=%s AND owner_id=%s RETURNING *
                    """,
                    (invoice.status, inventory_applied, id, current_user),
                )
            updated_invoice = cursor.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
    if invoice.status != "cancelled":
        updated_invoice = recompute_invoice_settlement(id, current_user)
    log_action(
        current_user,
        current_user,
        "update",
        "invoice",
        id,
        f"Invoice status updated to {updated_invoice.get('status')}",
        {"invoice_number": updated_invoice.get("invoice_number"), "status": updated_invoice.get("status")},
    )
    return {"data": updated_invoice}


def _build_invoice_pdf(id: int, current_user: int):
    from app.services.pdf_generator import build_invoice_pdf
    data = _get_invoice_full(id, current_user)
    return build_invoice_pdf(data["invoice"], data["company"], data["branding"], data["items"])


@router.get("/{id}/pdf")
def generate_invoice_pdf(id: int, current_user: int = Depends(require_permission('invoices.view'))):
    pdf_file = _build_invoice_pdf(id, current_user)
    return FileResponse(path=pdf_file, filename=f"invoice_{id}.pdf", media_type="application/pdf")


def send_invoice_email_logic(id: int, request: InvoiceEmailRequest, current_user: int):
    data = _get_invoice_full(id, current_user)
    invoice = data["invoice"]
    company = data["company"]

    to_email = request.to_email or invoice.get("client_email")
    if not to_email:
        raise HTTPException(status_code=400, detail="Client email is required")

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT invoice_email_subject, invoice_email_body FROM branding_settings WHERE owner_id = %s", (current_user,))
            branding = cursor.fetchone() or {}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    raw_subject = request.subject or branding.get("invoice_email_subject") or "Invoice {invoice_number} from {company_name}"
    raw_body = request.message or branding.get("invoice_email_body") or "Hi {client_name},\n\nPlease find your invoice {invoice_number} for {total_amount} attached.\n\nThanks,\n{company_name}"

    variables = {
        "{invoice_number}": str(invoice.get("invoice_number") or id),
        "{client_name}": str(invoice.get("client_name") or "Customer"),
        "{company_name}": str(company.get("company_name") or "us"),
        "{total_amount}": f"Rs.{float(invoice.get('total') or 0):,.2f}",
        "{invoice_date}": str(invoice.get("issue_date") or ""),
        "{due_date}": str(invoice.get("due_date") or ""),
    }

    subject = raw_subject
    body = raw_body
    for key, val in variables.items():
        subject = subject.replace(key, val)
        body = body.replace(key, val)

    pdf_file = _build_invoice_pdf(id, current_user)
    try:
        send_email(
            owner_id=current_user,
            to_email=to_email,
            subject=subject,
            body=body,
            attachments=[pdf_file]
        )
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO email_logs (invoice_id, recipient, subject, status, error, owner_id) VALUES (%s, %s, %s, %s, %s, %s)",
                    (id, to_email, subject, "sent", None, current_user),
                )
            conn.commit()
        except Exception:
            conn.rollback()
    except EmailNotConfigured as exc:
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO email_logs (invoice_id, recipient, subject, status, error, owner_id) VALUES (%s, %s, %s, %s, %s, %s)",
                    (id, to_email, subject, "not_configured", str(exc), current_user),
                )
            conn.commit()
        except Exception:
            conn.rollback()
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO email_logs (invoice_id, recipient, subject, status, error, owner_id) VALUES (%s, %s, %s, %s, %s, %s)",
                    (id, to_email, subject, "failed", str(exc), current_user),
                )
            conn.commit()
        except Exception:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Email send failed")

    log_action(current_user, current_user, "email", "invoice", id, "Invoice email sent successfully")
    return {"message": "Email sent successfully"}


@router.post("/{id}/email")
def email_invoice(id: int, request: InvoiceEmailRequest, current_user: int = Depends(require_permission('invoices.create'))):
    return send_invoice_email_logic(id, request, current_user)


@router.delete("/{id}")
def delete_invoice(id: int, current_user: int = Depends(require_permission('invoices.delete'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM invoices WHERE id=%s AND owner_id=%s FOR UPDATE", (id, current_user))
            existing_invoice = cursor.fetchone()
            if existing_invoice is None:
                raise HTTPException(status_code=404, detail=f"Invoice with id {id} not found")
            if existing_invoice.get("inventory_applied"):
                wh_id = existing_invoice.get("warehouse_id")
                warehouse = _resolve_warehouse(cursor, wh_id, current_user)
                cursor.execute("SELECT product_id, quantity FROM invoice_items WHERE invoice_id=%s", (id,))
                old_quantities = _product_quantities(cursor.fetchall())
                _apply_stock_deltas(cursor, id, current_user, old_quantities, {}, warehouse=warehouse)
            cursor.execute("DELETE FROM invoices WHERE id=%s AND owner_id=%s RETURNING *", (id, current_user))
            deleted_invoice = cursor.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
    if deleted_invoice is None:
        raise HTTPException(status_code=404, detail=f"Invoice with id {id} not found")
    log_action(
        current_user,
        current_user,
        "delete",
        "invoice",
        id,
        f"Invoice deleted: {deleted_invoice.get('invoice_number')}",
        {"invoice_number": deleted_invoice.get("invoice_number"), "client_id": deleted_invoice.get("client_id"), "total": deleted_invoice.get("total")},
    )
    return {"message": "Invoice deleted"}
