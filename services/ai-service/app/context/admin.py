import logging

from app.context.base import ContextProvider

logger = logging.getLogger(__name__)


class AdminContextProvider(ContextProvider):
    """Fetch cross-module admin data."""

    async def get_context(self, user_id: int, token: str) -> dict:
        return {
            "module": "Admin",
            "description": "Cross-module overview and system management",
        }
