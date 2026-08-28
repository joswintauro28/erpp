import logging
from abc import ABC, abstractmethod

import httpx

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
