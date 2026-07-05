from datetime import date

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.invoice import Invoice, Payment
from app.models.product import Product


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stats(self, owner_id: int) -> dict:
        total_clients = await self._count(Client, owner_id)
        total_invoices = await self._count(Invoice, owner_id)
        total_products = await self._count(Product, owner_id)

        revenue = await self._sum_invoice_field(owner_id, Invoice.total, ["paid", "sent"])
        outstanding = await self._sum_invoice_field(owner_id, Invoice.balance_due, ["sent", "overdue"])

        today = date.today()
        overdue_stmt = sa.select(sa.func.coalesce(sa.func.sum(Invoice.balance_due), 0)).where(
            Invoice.owner_id == owner_id,
            Invoice.status == "sent",
            Invoice.due_date < today,
        )
        overdue_result = await self.db.execute(overdue_stmt)
        overdue = float(overdue_result.scalar() or 0)

        low_stock_stmt = sa.select(sa.func.count()).select_from(Product).where(
            Product.owner_id == owner_id,
            Product.track_inventory == True,
            Product.stock <= Product.low_stock_threshold,
        )
        low_stock_result = await self.db.execute(low_stock_stmt)
        low_stock = low_stock_result.scalar() or 0

        return {
            "total_clients": total_clients,
            "total_invoices": total_invoices,
            "total_revenue": round(revenue, 2),
            "outstanding_revenue": round(outstanding, 2),
            "overdue_amount": round(overdue, 2),
            "total_products": total_products,
            "low_stock_count": low_stock,
        }

    async def get_client_growth(self, owner_id: int) -> list[dict]:
        stmt = sa.text("""
            SELECT
                DATE_TRUNC('month', created_at)::date AS month,
                COUNT(*) as count
            FROM clients
            WHERE owner_id = :owner_id
            GROUP BY month
            ORDER BY month
        """)
        result = await self.db.execute(stmt, {"owner_id": owner_id})
        return [
            {"month": str(r.month), "count": r.count}
            for r in result.all()
        ]

    async def get_payment_analytics(self, owner_id: int) -> list[dict]:
        stmt = sa.text("""
            SELECT
                payment_method,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE owner_id = :owner_id
            GROUP BY payment_method
        """)
        result = await self.db.execute(stmt, {"owner_id": owner_id})
        return [
            {"method": r.payment_method or "Unknown", "count": r.count, "amount": float(r.total)}
            for r in result.all()
        ]

    async def _count(self, model, owner_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(model).where(model.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _sum_invoice_field(self, owner_id: int, field, statuses: list[str]) -> float:
        stmt = sa.select(sa.func.coalesce(sa.func.sum(field), 0)).where(
            Invoice.owner_id == owner_id,
            Invoice.status.in_(statuses),
        )
        result = await self.db.execute(stmt)
        return float(result.scalar() or 0)
