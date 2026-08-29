import logging

from app.core.config import settings
from app.context.base import ContextProvider

logger = logging.getLogger(__name__)


class AdminContextProvider(ContextProvider):
    """Fetch cross-module admin data from multiple services."""

    async def get_context(self, user_id: int, token: str) -> dict:
        # Fetch from each service in parallel would be ideal, but for
        # simplicity we do sequential calls with graceful fallbacks.
        crm_data = await self._safe_crm(token)
        billing_data = await self._safe_billing(token)
        inventory_data = await self._safe_inventory(token)

        return {
            "module": "Admin",
            "description": "Cross-module overview and system management",
            "total_customers": crm_data.get("total_customers", 0),
            "total_leads": crm_data.get("total_leads", 0),
            "total_invoices": billing_data.get("total_invoices", 0),
            "outstanding_amount": billing_data.get("outstanding_amount", 0),
            "total_products": inventory_data.get("total_products", 0),
            "low_stock_items": inventory_data.get("low_stock_count", 0),
            "pending_purchase_orders": inventory_data.get("pending_pos", 0),
        }

    async def _safe_crm(self, token: str) -> dict:
        base = settings.CRM_SERVICE_URL
        customers = await self._fetch(f"{base}/api/customers", token)
        leads = await self._fetch(f"{base}/api/leads", token)
        return {
            "total_customers": len(customers) if isinstance(customers, list) else 0,
            "total_leads": len(leads) if isinstance(leads, list) else 0,
        }

    async def _safe_billing(self, token: str) -> dict:
        base = settings.BILLING_SERVICE_URL
        invoices = await self._fetch(f"{base}/api/invoices", token)
        invoice_list = invoices if isinstance(invoices, list) else []
        outstanding = sum(
            i.get("balanceDue", 0) or 0 for i in invoice_list if isinstance(i, dict)
        )
        return {
            "total_invoices": len(invoice_list),
            "outstanding_amount": outstanding,
        }

    async def _safe_inventory(self, token: str) -> dict:
        base = settings.INVENTORY_SERVICE_URL
        products = await self._fetch(f"{base}/products", token)
        stock = await self._fetch(f"{base}/stock", token)
        po = await self._fetch(f"{base}/purchase-orders", token)

        product_list = products if isinstance(products, list) else []
        stock_list = stock if isinstance(stock, list) else []
        po_list = po if isinstance(po, list) else []

        low_stock = [
            s for s in stock_list
            if (s.get("quantity", 0) or 0) - (s.get("reserved_quantity", 0) or 0) < 10
        ]
        pending_pos = [p for p in po_list if p.get("status") in ("draft", "ordered")]

        return {
            "total_products": len(product_list),
            "low_stock_count": len(low_stock),
            "pending_pos": len(pending_pos),
        }
