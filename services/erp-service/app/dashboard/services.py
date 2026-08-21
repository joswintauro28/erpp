from app.integrations.billing_client import get_dashboard_billing, get_invoice_summary
from app.integrations.crm_client import get_dashboard_crm
from app.integrations.inventory_client import get_dashboard_inventory


class DashboardService:
    def __init__(self, token: str):
        self.token = token

    def _sum_invoices(self, summary: list | None) -> int:
        if not summary or not isinstance(summary, list):
            return 0
        return sum(item.get("count", 0) for item in summary)

    async def get_stats(self) -> dict:
        billing, crm, inventory = await self._fetch_all_dashboards()

        summary = billing.get("summary", [])
        return {
            "total_clients": crm.get("total_customers", 0),
            "total_invoices": self._sum_invoices(summary),
            "total_revenue": billing.get("total_revenue", 0),
            "outstanding_revenue": billing.get("outstanding", 0),
            "overdue_amount": billing.get("overdue", 0),
            "total_products": inventory.get("total_products", 0),
            "low_stock_count": inventory.get("low_stock_count", 0),
            "pipeline_value": crm.get("pipeline_value", 0),
            "open_opportunities": crm.get("open_opportunities", 0),
            "total_warehouses": inventory.get("total_warehouses", 0),
            "total_stock": inventory.get("total_stock", 0),
            "pending_purchase_orders": inventory.get("pending_pos", 0),
            "total_customers": crm.get("total_customers", 0),
            "total_leads": crm.get("total_leads", 0),
        }

    async def get_client_growth(self) -> list[dict]:
        crm = await get_dashboard_crm(self.token)
        total = crm.get("total_customers", 0)
        return [{"month": "Current", "count": total}] if total > 0 else []

    async def get_payment_analytics(self) -> list[dict]:
        billing = await get_dashboard_billing(self.token)
        metrics = billing.get("payment_metrics", {})
        labels = {
            "today": "Today",
            "this_month": "This Month",
            "outstanding": "Outstanding",
            "refunds": "Refunds",
            "failed": "Failed",
        }
        return [
            {"method": labels.get(k, k), "amount": v, "count": 0}
            for k, v in metrics.items()
            if isinstance(v, (int, float))
        ]

    async def get_crm_dashboard(self) -> dict:
        return await get_dashboard_crm(self.token)

    async def get_inventory_dashboard(self) -> dict:
        return await get_dashboard_inventory(self.token)

    async def get_executive_overview(self) -> dict:
        billing, crm, inventory = await self._fetch_all_dashboards()
        return {
            "billing": billing,
            "crm": crm,
            "inventory": inventory,
        }

    async def _fetch_all_dashboards(self) -> tuple[dict, dict, dict]:
        import asyncio
        results = await asyncio.gather(
            get_dashboard_billing(self.token),
            get_dashboard_crm(self.token),
            get_dashboard_inventory(self.token),
            return_exceptions=True,
        )
        billing = results[0] if not isinstance(results[0], Exception) else {}
        crm = results[1] if not isinstance(results[1], Exception) else {}
        inventory = results[2] if not isinstance(results[2], Exception) else {}
        return billing, crm, inventory
