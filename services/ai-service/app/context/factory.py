from app.context.base import ContextProvider
from app.context.crm import CRMContextProvider
from app.context.billing import BillingContextProvider
from app.context.inventory import InventoryContextProvider
from app.context.admin import AdminContextProvider


_PROVIDERS = {
    "crm": CRMContextProvider,
    "billing": BillingContextProvider,
    "inventory": InventoryContextProvider,
    "admin": AdminContextProvider,
}


def get_context_provider(module: str) -> ContextProvider:
    """Factory to get the context provider for a module."""
    cls = _PROVIDERS.get(module)
    if not cls:
        raise ValueError(
            f"Unknown module: {module}. "
            f"Supported: {', '.join(_PROVIDERS.keys())}"
        )
    return cls()
