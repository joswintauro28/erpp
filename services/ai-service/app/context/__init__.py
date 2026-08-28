from abc import ABC, abstractmethod
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ContextProvider(ABC):
    """Abstract context provider — fetches live data for a module."""

    @abstractmethod
    async def get_context(self, user_id: int, token: str) -> dict:
        """Fetch module-specific context data."""
        ...

    async def _fetch(self, url: str, token: str) -> dict | list | None:
        """Helper to call another service with auth."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code == 200:
                    return resp.json()
                logger.warning("Context fetch failed: %s -> %s", url, resp.status_code)
                return None
        except Exception as e:
            logger.warning("Context fetch error: %s -> %s", url, str(e))
            return None


class CRMContextProvider(ContextProvider):
    """Fetch CRM data from crm-service."""

    async def get_context(self, user_id: int, token: str) -> dict:
        base = settings.CRM_SERVICE_URL
        customers = await self._fetch(f"{base}/api/customers", token)
        leads = await self._fetch(f"{base}/api/leads", token)

        customer_list = customers if isinstance(customers, list) else []
        lead_list = leads if isinstance(leads, list) else []

        return {
            "module": "CRM",
            "total_customers": len(customer_list),
            "recent_customers": [
                {"name": c.get("name", "Unknown"), "industry": c.get("industry", ""), "status": c.get("status", "")}
                for c in customer_list[:5]
            ],
            "total_leads": len(lead_list),
            "recent_leads": [
                {"name": l.get("name", "Unknown"), "source": l.get("source", ""), "status": l.get("status", "")}
                for l in lead_list[:5]
            ],
        }


class BillingContextProvider(ContextProvider):
    """Fetch billing data from billing-service."""

    async def get_context(self, user_id: int, token: str) -> dict:
        base = settings.BILLING_SERVICE_URL
        invoices = await self._fetch(f"{base}/api/invoices", token)
        metrics = await self._fetch(f"{base}/api/payments/metrics", token)

        invoice_list = invoices if isinstance(invoices, list) else []

        return {
            "module": "Billing",
            "total_invoices": len(invoice_list),
            "recent_invoices": [
                {
                    "number": i.get("invoiceNumber", ""),
                    "amount": i.get("total", 0),
                    "status": i.get("status", ""),
                }
                for i in invoice_list[:5]
            ],
            "payment_metrics": metrics if isinstance(metrics, dict) else {},
        }


class InventoryContextProvider(ContextProvider):
    """Fetch inventory data from inventory-service."""

    async def get_context(self, user_id: int, token: str) -> dict:
        base = settings.INVENTORY_SERVICE_URL
        products = await self._fetch(f"{base}/products", token)
        stock = await self._fetch(f"{base}/stock", token)

        product_list = products if isinstance(products, list) else []
        stock_list = stock if isinstance(stock, list) else []

        low_stock = [
            s for s in stock_list
            if (s.get("quantity", 0) or 0) - (s.get("reserved_quantity", 0) or 0) < 10
        ]

        return {
            "module": "Inventory",
            "total_products": len(product_list),
            "recent_products": [
                {"name": p.get("name", ""), "sku": p.get("sku", ""), "price": p.get("price", 0)}
                for p in product_list[:5]
            ],
            "total_stock_items": len(stock_list),
            "low_stock_count": len(low_stock),
        }


class AdminContextProvider(ContextProvider):
    """Fetch cross-module admin data."""

    async def get_context(self, user_id: int, token: str) -> dict:
        return {
            "module": "Admin",
            "description": "Cross-module overview and system management",
        }


def get_context_provider(module: str) -> ContextProvider:
    """Factory to get the context provider for a module."""
    providers = {
        "crm": CRMContextProvider,
        "billing": BillingContextProvider,
        "inventory": InventoryContextProvider,
        "admin": AdminContextProvider,
    }
    cls = providers.get(module)
    if not cls:
        raise ValueError(f"Unknown module: {module}")
    return cls()
