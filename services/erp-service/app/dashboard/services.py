from datetime import date

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.billing_client import get_dashboard_billing, get_invoice_summary
from app.client.models import Client
from app.product.models import Product


class DashboardService:
    def __init__(self, db: AsyncSession, token: str):
        self.db = db
        self.token = token

    async def get_stats(self, owner_id: int) -> dict:
        total_clients = await self._count(Client, owner_id)
        total_products = await self._count(Product, owner_id)

        low_stock_stmt = sa.select(sa.func.count()).select_from(Product).where(
            Product.owner_id == owner_id,
            Product.track_inventory == True,
            Product.stock <= Product.low_stock_threshold,
        )
        low_stock_result = await self.db.execute(low_stock_stmt)
        low_stock = low_stock_result.scalar() or 0

        billing = await get_dashboard_billing(self.token)

        return {
            "total_clients": total_clients,
            "total_invoices": billing.get("summary", {}).get("totalInvoices", 0),
            "total_revenue": billing.get("totalRevenue", 0),
            "outstanding_revenue": billing.get("outstanding", 0),
            "overdue_amount": billing.get("overdue", 0),
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

    async def get_payment_analytics(self, token: str) -> list[dict]:
        billing = await get_dashboard_billing(token)
        metrics = billing.get("paymentMetrics", {})
        return [
            {"method": k, "count": v.get("count", 0), "amount": v.get("total", 0)}
            for k, v in metrics.items()
        ]

    async def _count(self, model, owner_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(model).where(model.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
