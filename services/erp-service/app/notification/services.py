from datetime import date, timedelta

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.billing_client import get_invoices, get_payments_metrics
from app.client.models import Client
from app.product.models import Product


class NotificationService:
    def __init__(self, db: AsyncSession, token: str):
        self.db = db
        self.token = token

    async def get_notifications(self, owner_id: int) -> dict:
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        notifications = []
        summary = {}

        # Overdue invoices via billing-service
        try:
            invoices = await get_invoices(self.token)
            overdue = [inv for inv in invoices if inv.get("status") == "overdue"]
            summary["overdue_invoices"] = len(overdue)
            if overdue:
                notifications.append({
                    "type": "overdue_invoice",
                    "title": f"{len(overdue)} overdue invoice(s)",
                    "severity": "high",
                    "count": len(overdue),
                })

            # Due soon
            due_soon = [
                inv for inv in invoices
                if inv.get("status") in ("sent", "pending")
                and inv.get("due_date")
            ]
            due_soon_filtered = [
                inv for inv in due_soon
                if today <= date.fromisoformat(inv["due_date"]) <= today + timedelta(days=7)
            ]
            summary["due_soon_invoices"] = len(due_soon_filtered)
            if due_soon_filtered:
                notifications.append({
                    "type": "due_soon",
                    "title": f"{len(due_soon_filtered)} invoice(s) due within 7 days",
                    "severity": "medium",
                    "count": len(due_soon_filtered),
                })
        except Exception:
            summary["overdue_invoices"] = 0
            summary["due_soon_invoices"] = 0

        # Low stock (local DB)
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

        # Recent payments via billing-service
        try:
            metrics = await get_payments_metrics(self.token)
            recent_count = metrics.get("thisMonth", 0)  # approximate
            summary["recent_payments"] = recent_count
            if recent_count > 0:
                notifications.append({
                    "type": "recent_payments",
                    "title": f"{recent_count} payment(s) received this month",
                    "severity": "info",
                    "count": recent_count,
                })
        except Exception:
            summary["recent_payments"] = 0

        # New clients (local DB)
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
