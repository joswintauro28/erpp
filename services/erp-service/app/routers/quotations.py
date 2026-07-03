from datetime import date
from decimal import Decimal
import os
import tempfile

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.database import conn
from app.schemas.quotation import Quotation, QuotationUpdate, QuotationEmailRequest
from app.auth.permissions import require_permission
from app.email_utils.email_utils import EmailNotConfigured, send_email
from app.services.audit import log_action

from app.routers.invoices import _money, _calculate_items, _assert_client, _assert_products_owned

router = APIRouter(prefix="/quotations", tags=["Quotations"])


def _computed_status_sql(alias="quotations"):
    return f"""
    CASE
        WHEN {alias}.invoice_id IS NOT NULL THEN 'converted'
        WHEN {alias}.status IN ('draft', 'sent') AND {alias}.valid_until < CURRENT_DATE THEN 'expired'
        ELSE COALESCE({alias}.status, 'draft')
    END
    """


def _get_quotation_full(quotation_id: int, owner_id: int):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT quotations.*,
                       clients.name AS client_name, clients.email AS client_email, clients.phone AS client_phone,
                       clients.address AS client_address, clients.gst_number AS client_gst_number, clients.state AS client_state,
                       leads.company_name AS lead_company_name,
                       {_computed_status_sql()} AS computed_status
                FROM quotations
                JOIN clients ON quotations.client_id = clients.id
                LEFT JOIN leads ON quotations.lead_id = leads.id
                WHERE quotations.id=%s AND quotations.owner_id=%s
                """,
                (quotation_id, owner_id),
            )
            quotation = cursor.fetchone()
            if quotation is None:
                raise HTTPException(status_code=404, detail="Quotation not found")
            quotation["status"] = quotation.pop("computed_status", quotation.get("status"))
            
            cursor.execute(
                """
                SELECT qi.*, p.name AS product_name, p.sku AS product_sku
                FROM quotation_items qi
                LEFT JOIN products p ON qi.product_id = p.id
                WHERE qi.quotation_id=%s
                ORDER BY qi.id ASC
                """,
                (quotation_id,),
            )
            items = cursor.fetchall()
            
            cursor.execute("SELECT * FROM company_settings WHERE owner_id=%s", (owner_id,))
            company = cursor.fetchone() or {}
            
            cursor.execute("SELECT * FROM branding_settings WHERE owner_id=%s", (owner_id,))
            branding = cursor.fetchone() or {}
            
        return {"quotation": quotation, "items": items, "company": company, "branding": branding}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
def create_quotation(quotation: Quotation, current_user: int = Depends(require_permission('quotations.create'))):
    _assert_client(quotation.client_id, current_user)
    items, subtotal, tax_total, cgst, sgst, igst, total = _calculate_items(quotation.items, quotation.gst_treatment)
    issue_date = quotation.issue_date or date.today()
    status = quotation.status or "draft"
    
    try:
        with conn.cursor() as cursor:
            _assert_products_owned(cursor, items, current_user)
            cursor.execute(
                """
                INSERT INTO quotations (client_id, lead_id, valid_until, issue_date, subtotal, cgst, sgst, igst,
                                      tax_total, total, notes, status, owner_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (quotation.client_id, quotation.lead_id, quotation.valid_until, issue_date, subtotal, cgst, sgst, igst,
                 tax_total, total, quotation.notes, status, current_user),
            )
            new_quotation = cursor.fetchone()
            
            cursor.execute(
                "UPDATE quotations SET quote_number=%s WHERE id=%s RETURNING *",
                (f"QT-{new_quotation['id']:05d}", new_quotation["id"]),
            )
            new_quotation = cursor.fetchone()
            
            for item in items:
                cursor.execute(
                    """
                    INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, gst_rate,
                                               taxable_amount, cgst, sgst, igst, total)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (new_quotation["id"], item["product_id"], item["description"], item["quantity"], item["unit_price"], item["gst_rate"],
                     item["taxable_amount"], item["cgst"], item["sgst"], item["igst"], item["total"]),
                )
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
        "quotation",
        new_quotation["id"],
        f"Quotation created: {new_quotation.get('quote_number')}",
        {"quote_number": new_quotation.get("quote_number"), "client_id": new_quotation.get("client_id"), "total": new_quotation.get("total")},
    )
    return {"data": new_quotation}


@router.get("/")
def get_quotations(
    search: str | None = None,
    status: str | None = None,
    client_id: int | None = None,
    limit: int = 100,
    skip: int = 0,
    current_user: int = Depends(require_permission('quotations.view')),
):
    clauses = ["quotations.owner_id = %s"]
    params = [current_user]
    
    if search:
        clauses.append("(clients.name ILIKE %s OR quotations.quote_number ILIKE %s)")
        term = f"%{search}%"
        params.extend([term, term])
    if client_id:
        clauses.append("quotations.client_id = %s")
        params.append(client_id)
    if status:
        clauses.append("quotations.status = %s")
        params.append(status.lower())
        
    params.extend([limit, skip])
    
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT quotations.id, quotations.quote_number, quotations.client_id, clients.name AS client_name,
                       quotations.subtotal, quotations.tax_total, quotations.total, {_computed_status_sql()} AS status,
                       quotations.issue_date, quotations.valid_until, quotations.created_at, quotations.invoice_id
                FROM quotations
                JOIN clients ON quotations.client_id = clients.id
                WHERE {' AND '.join(clauses)}
                ORDER BY quotations.created_at DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params),
            )
            quotations = cursor.fetchall()
        return {"data": quotations}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}")
def get_quotation(id: int, current_user: int = Depends(require_permission('quotations.view'))):
    data = _get_quotation_full(id, current_user)
    return {
        "data": {
            **data["quotation"],
            "items": data["items"],
            "company": data["company"],
            "branding": data["branding"],
        }
    }


@router.put("/{id}")
def update_quotation(id: int, quotation: Quotation, current_user: int = Depends(require_permission('quotations.edit'))):
    _assert_client(quotation.client_id, current_user)
    items, subtotal, tax_total, cgst, sgst, igst, total = _calculate_items(quotation.items, quotation.gst_treatment)
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM quotations WHERE id=%s AND owner_id=%s FOR UPDATE", (id, current_user))
            existing_quotation = cursor.fetchone()
            if existing_quotation is None:
                raise HTTPException(status_code=404, detail=f"Quotation with id {id} not found")
            if existing_quotation.get("invoice_id"):
                raise HTTPException(status_code=400, detail="Cannot edit a quotation that has been converted to an invoice")
                
            _assert_products_owned(cursor, items, current_user)

            cursor.execute(
                """
                UPDATE quotations
                SET client_id=%s, lead_id=%s, valid_until=%s, issue_date=%s, subtotal=%s, cgst=%s, sgst=%s, igst=%s,
                    tax_total=%s, total=%s, notes=%s
                WHERE id=%s AND owner_id=%s
                RETURNING *
                """,
                (quotation.client_id, quotation.lead_id, quotation.valid_until, quotation.issue_date or date.today(),
                 subtotal, cgst, sgst, igst, tax_total, total, quotation.notes, id, current_user),
            )
            updated_quotation = cursor.fetchone()
            
            cursor.execute("DELETE FROM quotation_items WHERE quotation_id=%s", (id,))
            for item in items:
                cursor.execute(
                    """
                    INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, gst_rate,
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
    log_action(
        current_user,
        current_user,
        "update",
        "quotation",
        id,
        f"Quotation updated: {updated_quotation.get('quote_number')}",
        {"quote_number": updated_quotation.get("quote_number"), "client_id": updated_quotation.get("client_id"), "total": updated_quotation.get("total")},
    )
    return {"data": updated_quotation}


@router.patch("/{id}/status")
def update_quotation_status(id: int, update: QuotationUpdate, current_user: int = Depends(require_permission('quotations.edit'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT status, invoice_id, valid_until FROM quotations WHERE id=%s AND owner_id=%s FOR UPDATE", (id, current_user))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Quotation not found")
            
            # Compute current effective status
            is_expired = row["valid_until"] is not None and row["valid_until"] < date.today() and row["status"] in ("draft", "sent")
            current_status = "converted" if row["invoice_id"] else ("expired" if is_expired else row["status"])
            
            new_status = update.status.lower()
            allowed = False
            
            if current_status == "draft" and new_status == "sent":
                allowed = True
            elif current_status == "sent" and new_status in ("accepted", "rejected"):
                allowed = True
                
            if not allowed:
                raise HTTPException(status_code=400, detail=f"Cannot transition from {current_status} to {new_status}")

            cursor.execute(
                """
                UPDATE quotations SET status=%s
                WHERE id=%s AND owner_id=%s RETURNING *
                """,
                (new_status, id, current_user),
            )
            updated_quotation = cursor.fetchone()
            updated_quotation["status"] = new_status  # Override with exact new status
        conn.commit()
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
    log_action(
        current_user,
        current_user,
        "update",
        "quotation",
        id,
        f"Quotation status updated to {updated_quotation.get('status')}",
        {"quote_number": updated_quotation.get("quote_number"), "status": updated_quotation.get("status")},
    )
    return {"data": updated_quotation}


@router.post("/{id}/convert-to-invoice")
def convert_to_invoice(id: int, current_user: int = Depends(require_permission('quotations.create'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT *, {_computed_status_sql()} AS computed_status FROM quotations WHERE id=%s AND owner_id=%s", (id, current_user))
            quotation = cursor.fetchone()
            
            if not quotation:
                raise HTTPException(status_code=404, detail="Quotation not found")
            if quotation["computed_status"] == "converted" or quotation.get("invoice_id"):
                raise HTTPException(status_code=400, detail="Quotation has already been converted to an invoice")
            if quotation["computed_status"] != "accepted":
                raise HTTPException(status_code=400, detail=f"Only accepted quotations can be converted. Current status: {quotation['computed_status']}")
                
            # Create Invoice
            # Since quotation might not have gst_treatment stored explicitly (it's in the payload, but not DB),
            # we infer it from igst > 0
            gst_treatment = "interstate" if float(quotation["igst"] or 0) > 0 else "intrastate"
            
            cursor.execute(
                """
                INSERT INTO invoices (client_id, amount, owner_id, issue_date, due_date, subtotal, cgst, sgst, igst,
                                      tax_total, total, paid_amount, balance_due, gst_treatment, notes, status,
                                      inventory_applied)
                VALUES (%s, %s, %s, CURRENT_DATE, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, 'pending', FALSE)
                RETURNING *
                """,
                (quotation["client_id"], quotation["total"], current_user,
                 quotation["subtotal"], quotation["cgst"], quotation["sgst"], quotation["igst"],
                 quotation["tax_total"], quotation["total"], quotation["total"], gst_treatment, quotation["notes"]),
            )
            new_invoice = cursor.fetchone()
            
            cursor.execute(
                "UPDATE invoices SET invoice_number=%s WHERE id=%s RETURNING *",
                (f"INV-{new_invoice['id']:05d}", new_invoice["id"]),
            )
            new_invoice = cursor.fetchone()
            
            # Copy items
            cursor.execute("SELECT * FROM quotation_items WHERE quotation_id=%s", (id,))
            items = cursor.fetchall()
            
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
                
            # Update quotation to link the invoice
            cursor.execute(
                "UPDATE quotations SET status='accepted', invoice_id=%s WHERE id=%s",
                (new_invoice["id"], id)
            )
            
        conn.commit()
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
    log_action(
        current_user,
        current_user,
        "convert_to_invoice",
        "quotation",
        id,
        f"Quotation {quotation.get('quote_number') or id} converted to invoice {new_invoice.get('invoice_number')}",
        {"quote_number": quotation.get("quote_number"), "invoice_id": new_invoice.get("id"), "invoice_number": new_invoice.get("invoice_number")},
    )
    log_action(
        current_user,
        current_user,
        "create",
        "invoice",
        new_invoice["id"],
        f"Invoice created from quotation {quotation.get('quote_number') or id}: {new_invoice.get('invoice_number')}",
        {"quote_id": id, "quote_number": quotation.get("quote_number"), "invoice_number": new_invoice.get("invoice_number"), "total": new_invoice.get("total")},
    )
    return {"message": "Quotation converted to invoice successfully", "invoice_id": new_invoice["id"], "invoice_number": new_invoice["invoice_number"]}


@router.delete("/{id}")
def delete_quotation(id: int, current_user: int = Depends(require_permission('quotations.delete'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM quotations WHERE id=%s AND owner_id=%s RETURNING *", (id, current_user))
            deleted_quotation = cursor.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
    if deleted_quotation is None:
        raise HTTPException(status_code=404, detail="Quotation not found")
    log_action(
        current_user,
        current_user,
        "delete",
        "quotation",
        id,
        f"Quotation deleted: {deleted_quotation.get('quote_number')}",
        {"quote_number": deleted_quotation.get("quote_number"), "client_id": deleted_quotation.get("client_id"), "total": deleted_quotation.get("total")},
    )
    return {"message": "Quotation deleted"}


def _build_quotation_pdf(id: int, current_user: int):
    data = _get_quotation_full(id, current_user)
    quotation = data["quotation"]
    company = data["company"]
    branding = data["branding"]
    items = data["items"]
    pdf_file = os.path.join(tempfile.gettempdir(), f"vexbill_quotation_{id}.pdf")
    c = canvas.Canvas(pdf_file, pagesize=A4)
    width, height = A4

    primary = colors.HexColor((branding.get("primary_color") or "#111827")[:7])
    c.setFillColor(primary)
    c.rect(0, height - 34 * mm, width, 34 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(18 * mm, height - 18 * mm, company.get("company_name") or "VexBill")
    c.setFont("Helvetica", 9)
    c.drawString(18 * mm, height - 25 * mm, company.get("address") or "")
    c.drawRightString(width - 18 * mm, height - 18 * mm, "QUOTATION")
    c.drawRightString(width - 18 * mm, height - 25 * mm, quotation.get("quote_number") or f"QT-{id:05d}")

    y = height - 48 * mm
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(18 * mm, y, "Quotation To")
    c.drawString(115 * mm, y, "Quotation Details")
    c.setFont("Helvetica", 9)
    y -= 6 * mm
    c.drawString(18 * mm, y, quotation.get("client_name") or "")
    c.drawString(115 * mm, y, f"Issue Date: {quotation.get('issue_date')}")
    y -= 5 * mm
    c.drawString(18 * mm, y, quotation.get("client_email") or "")
    c.drawString(115 * mm, y, f"Valid Until: {quotation.get('valid_until') or 'N/A'}")
    y -= 5 * mm
    c.drawString(18 * mm, y, quotation.get("client_address") or "")
    c.drawString(115 * mm, y, f"Status: {quotation.get('status').title()}")
    y -= 5 * mm
    c.drawString(18 * mm, y, f"Client GST: {quotation.get('client_gst_number') or 'N/A'}")
    c.drawString(115 * mm, y, f"Company GST: {company.get('gst_number') or 'N/A'}")

    y -= 14 * mm
    headers = ["Item", "Qty", "Rate", "GST%", "Taxable", "CGST", "SGST", "IGST", "Total"]
    xs = [18, 78, 92, 112, 128, 150, 168, 186, 204]
    c.setFont("Helvetica-Bold", 8)
    for x, header in zip(xs, headers):
        c.drawRightString(x * mm if header != "Item" else x * mm, y, header) if header != "Item" else c.drawString(x * mm, y, header)
    y -= 4 * mm
    c.line(18 * mm, y, width - 18 * mm, y)
    y -= 6 * mm
    c.setFont("Helvetica", 8)
    for item in items:
        if y < 35 * mm:
            c.showPage()
            y = height - 25 * mm
        c.drawString(18 * mm, y, str(item["description"])[:35])
        c.drawRightString(86 * mm, y, str(item["quantity"]))
        c.drawRightString(106 * mm, y, f"Rs.{_money(item['unit_price'])}")
        c.drawRightString(122 * mm, y, f"{item['gst_rate']}%")
        c.drawRightString(146 * mm, y, f"Rs.{_money(item['taxable_amount'])}")
        c.drawRightString(166 * mm, y, f"Rs.{_money(item['cgst'])}")
        c.drawRightString(184 * mm, y, f"Rs.{_money(item['sgst'])}")
        c.drawRightString(202 * mm, y, f"Rs.{_money(item['igst'])}")
        c.drawRightString(width - 18 * mm, y, f"Rs.{_money(item['total'])}")
        y -= 6 * mm

    y -= 6 * mm
    totals = [
        ("Subtotal", quotation.get("subtotal")),
        ("CGST", quotation.get("cgst")),
        ("SGST", quotation.get("sgst")),
        ("IGST", quotation.get("igst")),
        ("Total", quotation.get("total")),
    ]
    c.setFont("Helvetica", 9)
    for label, value in totals:
        c.drawRightString(165 * mm, y, label)
        c.drawRightString(width - 18 * mm, y, f"Rs.{_money(value)}")
        y -= 5 * mm
    c.setFont("Helvetica", 8)
    
    notes = quotation.get("notes") or ""
    if notes:
        y -= 10 * mm
        c.setFont("Helvetica-Bold", 9)
        c.drawString(18 * mm, y, "Notes:")
        c.setFont("Helvetica", 9)
        y -= 5 * mm
        c.drawString(18 * mm, y, notes)
        
    footer = branding.get("invoice_footer") or "Thank you for your business."
    c.drawString(18 * mm, 20 * mm, footer)
    c.save()
    return pdf_file


@router.get("/{id}/pdf")
def generate_quotation_pdf(id: int, current_user: int = Depends(require_permission('quotations.view'))):
    try:
        pdf_file = _build_quotation_pdf(id, current_user)
        return FileResponse(path=pdf_file, filename=f"quotation_{id}.pdf", media_type="application/pdf")
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/email")
def email_quotation(id: int, request: QuotationEmailRequest, current_user: int = Depends(require_permission('quotations.create'))):
    data = _get_quotation_full(id, current_user)
    quotation = data["quotation"]
    to_email = request.to_email or quotation.get("client_email")
    if not to_email:
        raise HTTPException(status_code=400, detail="Client email is required")
    subject = request.subject or f"Quotation {quotation.get('quote_number') or id}"
    message = request.message or "Please find your quotation attached."
    pdf_file = _build_quotation_pdf(id, current_user)
    status = "sent"
    error = None
    try:
        send_email(owner_id=current_user, to_email=to_email, subject=subject, body=message, attachments=[pdf_file])
        
        # Automatically update quotation status to sent if it's draft
        if quotation.get("status") == "draft":
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE quotations SET status='sent' WHERE id=%s AND owner_id=%s",
                    (id, current_user)
                )
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO email_logs (recipient, subject, status, error, owner_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (to_email, subject, "sent", None, current_user),
                )
            conn.commit()
        except Exception:
            conn.rollback()

    except EmailNotConfigured as exc:
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO email_logs (recipient, subject, status, error, owner_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (to_email, subject, "not_configured", str(exc), current_user),
                )
            conn.commit()
        except Exception:
            conn.rollback()
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO email_logs (recipient, subject, status, error, owner_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (to_email, subject, "failed", str(exc), current_user),
                )
            conn.commit()
        except Exception:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Email send failed")
    return {"message": "Quotation email sent"}
