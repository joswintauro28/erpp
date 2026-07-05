from datetime import date, timedelta

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.invoice import Invoice
from app.models.product import Product


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_notifications(self, owner_id: int) -> dict:
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        notifications = []
        summary = {}

        # Overdue invoices
        overdue_stmt = sa.select(Invoice).where(
            Invoice.owner_id == owner_id,
            Invoice.status == "sent",
            Invoice.due_date < today,
        ).order_by(Invoice.due_date.asc())
        overdue_result = await self.db.execute(overdue_stmt)
        overdue_invoices = overdue_result.scalars().all()
        summary["overdue_invoices"] = len(overdue_invoices)
        if overdue_invoices:
            notifications.append({
                "type": "overdue_invoice",
                "title": f"{len(overdue_invoices)} overdue invoice(s)",
                "severity": "high",
                "count": len(overdue_invoices),
            })

        # Due soon (next 7 days)
        due_soon_stmt = sa.select(Invoice).where(
            Invoice.owner_id == owner_id,
            Invoice.status == "sent",
            Invoice.due_date >= today,
            Invoice.due_date <= today + timedelta(days=7),
        )
        due_soon_result = await self.db.execute(due_soon_stmt)
        due_soon = due_soon_result.scalars().all()
        summary["due_soon_invoices"] = len(due_soon)
        if due_soon:
            notifications.append({
                "type": "due_soon",
                "title": f"{len(due_soon)} invoice(s) due within 7 days",
                "severity": "medium",
                "count": len(due_soon),
            })

        # Low stock
        low_stock_stmt = sa.select(Product).where(
            Product.owner_id == owner_id,
            Product.track_inventory == True,
            Product.stock <= Product.low_stock_threshold,
        )
        low_stock_result = await self.db.execute(low_stock_stmt)
        low_stock = low_stock_result.scalars().all()
        summary["low_stock_items"] = len(low_stock)
        if low_stock:
            notifications.append({
                "type": "low_stock",
                "title": f"{len(low_stock)} product(s) below minimum stock level",
                "severity": "medium",
                "count": len(low_stock),
            })

        # Recent payments
        recent_stmt = sa.select(Invoice).where(
            Invoice.owner_id == owner_id,
        )
        recent_result = await self.db.execute(recent_stmt)
        all_invoices = recent_result.scalars().all()
        invoice_map = {inv.id: inv for inv in all_invoices}

        payments_stmt = sa.text("""
            SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE owner_id = :owner_id
                AND created_at >= :since
                AND status = 'completed'
        """)
        payments_result = await self.db.execute(
            payments_stmt,
            {"owner_id": owner_id, "since": seven_days_ago},
        )
        payment_row = payments_result.one()
        summary["recent_payments"] = payment_row.count
        if payment_row.count > 0:
            notifications.append({
                "type": "recent_payments",
                "title": f"{payment_row.count} payment(s) received (₹{float(payment_row.total):,.2f})",
                "severity": "info",
                "count": payment_row.count,
            })

        # New clients
        new_clients_stmt = sa.select(sa.func.count()).select_from(Client).where(
            Client.owner_id == owner_id,
            Client.created_at >= seven_days_ago,
        )
        new_clients_result = await self.db.execute(new_clients_stmt)
        new_clients = new_clients_result.scalar() or 0
        summary["new_clients"] = new_clients
        if new_clients > 0:
            notifications.append({
                "type": "new_clients",
                "title": f"{new_clients} new client(s) added this week",
                "severity": "info",
                "count": new_clients,
            })

        return {
            "notifications": notifications,
            "summary": summary,
        }
