import logging

from app.core.config import settings
from app.context.base import ContextProvider

logger = logging.getLogger(__name__)


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
                {
                    "name": p.get("name", ""),
                    "sku": p.get("sku", ""),
                    "price": p.get("price", 0),
                }
                for p in product_list[:5]
            ],
            "total_stock_items": len(stock_list),
            "low_stock_count": len(low_stock),
        }
