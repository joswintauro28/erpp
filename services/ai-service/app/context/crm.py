import logging

from app.core.config import settings
from app.context.base import ContextProvider

logger = logging.getLogger(__name__)


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
                {
                    "name": c.get("name", "Unknown"),
                    "industry": c.get("industry", ""),
                    "status": c.get("status", ""),
                }
                for c in customer_list[:5]
            ],
            "total_leads": len(lead_list),
            "recent_leads": [
                {
                    "name": l.get("name", "Unknown"),
                    "source": l.get("source", ""),
                    "status": l.get("status", ""),
                }
                for l in lead_list[:5]
            ],
        }
