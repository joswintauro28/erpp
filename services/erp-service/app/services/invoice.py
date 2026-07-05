from datetime import date, datetime, timezone

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.client import Client
from app.models.invoice import (
    CreditNote,
    DebitNote,
    Invoice,
    InvoiceItem,
    Payment,
)
from app.repositories.invoice import (
    CreditNoteRepository,
    DebitNoteRepository,
    InvoiceItemRepository,
    InvoiceRepository,
    PaymentRepository,
)


class InvoiceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = InvoiceRepository(db)
        self.item_repo = InvoiceItemRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.credit_repo = CreditNoteRepository(db)
        self.debit_repo = DebitNoteRepository(db)

    async def list_invoices(self, owner_id: int) -> list[Invoice]:
        stmt = sa.select(Invoice).where(Invoice.owner_id == owner_id).order_by(Invoice.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_invoice(self, invoice_id: int, owner_id: int) -> Invoice | None:
        stmt = sa.select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.owner_id == owner_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_invoice(self, owner_id: int, client_id: int, items_data: list[dict], **data) -> Invoice:
        client_stmt = sa.select(Client).where(Client.id == client_id)
        client_result = await self.db.execute(client_stmt)
        client = client_result.scalar_one_or_none()
        if not client:
            raise NotFoundException("Client not found")

        gst_treatment = data.get("gst_treatment", "intrastate")
        place_of_supply = data.get("place_of_supply") or client.state or ""

        subtotal = 0.0
        cgst = 0.0
        sgst = 0.0
        igst = 0.0

        invoice = Invoice(
            owner_id=owner_id,
            client_id=client_id,
            invoice_number=data.get("invoice_number"),
            status=data.get("status", "draft"),
            issue_date=data.get("issue_date"),
            due_date=data.get("due_date"),
            gst_treatment=gst_treatment,
            place_of_supply=place_of_supply,
            notes=data.get("notes"),
        )
        self.db.add(invoice)
        await self.db.flush()

        for item_data in items_data:
            qty = float(item_data["quantity"])
            unit_price = float(item_data["unit_price"])
            gst_rate = float(item_data.get("gst_rate", 0))
            amount = qty * unit_price
            subtotal += amount

            item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=item_data.get("product_id"),
                description=item_data["description"],
                quantity=qty,
                unit_price=unit_price,
                gst_rate=gst_rate,
                amount=amount,
            )
            self.db.add(item)

            if gst_treatment == "interstate":
                igst += amount * gst_rate / 100
            else:
                half = amount * gst_rate / 200
                cgst += half
                sgst += half

        tax_total = cgst + sgst + igst
        total = subtotal + tax_total

        invoice.subtotal = round(subtotal, 2)
        invoice.cgst = round(cgst, 2)
        invoice.sgst = round(sgst, 2)
        invoice.igst = round(igst, 2)
        invoice.tax_total = round(tax_total, 2)
        invoice.total = round(total, 2)
        invoice.balance_due = round(total, 2)

        await self.db.flush()
        return invoice

    async def update_invoice_status(self, invoice_id: int, owner_id: int, status: str) -> Invoice | None:
        invoice = await self.get_invoice(invoice_id, owner_id)
        if not invoice:
            return None
        return await self.repo.update(invoice_id, status=status)

    async def count_invoices(self, owner_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Invoice).where(Invoice.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def sum_revenue(self, owner_id: int) -> float:
        stmt = sa.select(sa.func.coalesce(sa.func.sum(Invoice.total), 0)).where(
            Invoice.owner_id == owner_id,
            Invoice.status.in_(["paid", "sent"]),
        )
        result = await self.db.execute(stmt)
        return float(result.scalar() or 0)

    async def sum_outstanding(self, owner_id: int) -> float:
        stmt = sa.select(sa.func.coalesce(sa.func.sum(Invoice.balance_due), 0)).where(
            Invoice.owner_id == owner_id,
            Invoice.status.in_(["sent", "overdue"]),
        )
        result = await self.db.execute(stmt)
        return float(result.scalar() or 0)

    async def sum_overdue(self, owner_id: int) -> float:
        today = date.today()
        stmt = sa.select(sa.func.coalesce(sa.func.sum(Invoice.balance_due), 0)).where(
            Invoice.owner_id == owner_id,
            Invoice.status == "sent",
            Invoice.due_date < today,
        )
        result = await self.db.execute(stmt)
        return float(result.scalar() or 0)

    async def get_recent_invoices(self, owner_id: int, limit: int = 5) -> list[dict]:
        stmt = (
            sa.select(Invoice, Client.name.label("client_name"))
            .join(Client, Invoice.client_id == Client.id)
            .where(Invoice.owner_id == owner_id)
            .order_by(Invoice.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        today = date.today()
        invoice_list = []
        for row in rows:
            inv = row[0]
            display_status = inv.status
            if inv.status == "sent" and inv.due_date and inv.due_date < today:
                display_status = "overdue"
            elif inv.status == "sent" and inv.paid_amount and inv.paid_amount > 0:
                paid = float(inv.paid_amount)
                total = float(inv.total)
                if paid >= total:
                    display_status = "paid"
                elif paid > 0:
                    display_status = "partially_paid"

            invoice_list.append({
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "client_name": row.client_name,
                "total": float(inv.total),
                "status": display_status,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            })
        return invoice_list

    async def get_revenue_trend(self, owner_id: int) -> list[dict]:
        stmt = sa.text("""
            SELECT
                DATE_TRUNC('month', p.payment_date)::date AS month,
                COALESCE(SUM(p.amount), 0) AS revenue
            FROM payments p
            JOIN invoices i ON p.invoice_id = i.id
            WHERE i.owner_id = :owner_id
                AND p.status = 'completed'
            GROUP BY month
            ORDER BY month
        """)
        result = await self.db.execute(stmt, {"owner_id": owner_id})
        rows = result.all()
        return [
            {"month": str(r.month), "revenue": float(r.revenue)}
            for r in rows
        ]

    async def get_invoice_summary(self, owner_id: int) -> dict:
        stmt = sa.text("""
            SELECT status, COUNT(*) as count FROM invoices
            WHERE owner_id = :owner_id
            GROUP BY status
        """)
        result = await self.db.execute(stmt, {"owner_id": owner_id})
        rows = result.all()
        total = sum(r.count for r in rows) or 1
        return {
            r.status: {"count": r.count, "percentage": round(r.count / total * 100, 1)}
            for r in rows
        }
