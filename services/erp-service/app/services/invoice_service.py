from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.client import Client
from app.models.invoice import Invoice, InvoiceItem


def list_invoices(db: Session, owner_id: int) -> list[Invoice]:
    return db.execute(
        select(Invoice).where(Invoice.owner_id == owner_id).order_by(Invoice.created_at.desc())
    ).scalars().all()


def get_invoice(db: Session, invoice_id: int, owner_id: int) -> Invoice:
    invoice = db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.owner_id == owner_id)
    ).scalar_one_or_none()
    if not invoice:
        raise NotFoundException("Invoice not found")
    return invoice


def create_invoice(db: Session, owner_id: int, data: dict, items_data: list[dict]) -> Invoice:
    subtotal = 0.0
    tax_total = 0.0

    invoice_items = []
    for item_data in items_data:
        qty = float(item_data["quantity"])
        unit_price = float(item_data["unit_price"])
        gst_rate = float(item_data.get("gst_rate", 0))
        amount = qty * unit_price
        subtotal += amount

        cgst = 0.0
        sgst = 0.0
        igst = 0.0
        if gst_rate > 0:
            tax_amount = amount * gst_rate / 100
            if data.get("gst_treatment") == "interstate":
                igst = tax_amount
            else:
                cgst = tax_amount / 2
                sgst = tax_amount / 2
            tax_total += tax_amount

        inv_item = InvoiceItem(
            product_id=item_data.get("product_id"),
            description=item_data["description"],
            quantity=qty,
            unit_price=unit_price,
            gst_rate=gst_rate,
            amount=amount,
        )
        invoice_items.append(inv_item)

    total = subtotal + tax_total
    invoice = Invoice(
        owner_id=owner_id,
        client_id=data["client_id"],
        due_date=data.get("due_date"),
        issue_date=data.get("issue_date") or date.today(),
        status=data.get("status", "draft"),
        gst_treatment=data.get("gst_treatment", "intrastate"),
        place_of_supply=data.get("place_of_supply"),
        notes=data.get("notes"),
        subtotal=subtotal,
        cgst=sum(i.cgst for i in invoice_items) if data.get("gst_treatment") != "interstate" else 0,
        sgst=sum(i.sgst for i in invoice_items) if data.get("gst_treatment") != "interstate" else 0,
        igst=sum(i.igst for i in invoice_items) if data.get("gst_treatment") == "interstate" else 0,
        tax_total=tax_total,
        total=total,
        balance_due=total,
        items=invoice_items,
    )
    db.add(invoice)
    db.flush()
    return invoice


def update_invoice_status(db: Session, invoice_id: int, owner_id: int, status: str) -> Invoice:
    invoice = get_invoice(db, invoice_id, owner_id)
    invoice.status = status
    db.flush()
    return invoice


def get_dashboard_stats(db: Session, owner_id: int) -> dict:
    from app.models.product import Product

    client_count = db.execute(
        select(func.count(Client.id)).where(Client.owner_id == owner_id)
    ).scalar() or 0

    invoice_count = db.execute(
        select(func.count(Invoice.id)).where(Invoice.owner_id == owner_id)
    ).scalar() or 0

    revenue = db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.owner_id == owner_id, Invoice.status == "paid"
        )
    ).scalar() or 0.0

    outstanding = db.execute(
        select(func.coalesce(func.sum(Invoice.balance_due), 0)).where(
            Invoice.owner_id == owner_id, Invoice.status != "cancelled"
        )
    ).scalar() or 0.0

    overdue = db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.owner_id == owner_id,
            Invoice.balance_due > 0,
            Invoice.due_date < date.today(),
            Invoice.status != "cancelled",
        )
    ).scalar() or 0

    product_count = db.execute(
        select(func.count(Product.id)).where(Product.owner_id == owner_id)
    ).scalar() or 0

    low_stock = db.execute(
        select(func.count(Product.id)).where(
            Product.owner_id == owner_id,
            Product.stock <= Product.low_stock_threshold,
        )
    ).scalar() or 0

    return {
        "total_clients": client_count,
        "total_invoices": invoice_count,
        "total_revenue": float(revenue),
        "outstanding_amount": float(outstanding),
        "overdue_invoices": overdue,
        "total_products": product_count,
        "low_stock_count": low_stock,
    }
