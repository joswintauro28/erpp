import logging

from app.core.config import settings
from app.context.base import ContextProvider

logger = logging.getLogger(__name__)


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
