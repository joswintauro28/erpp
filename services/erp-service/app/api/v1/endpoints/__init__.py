from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.clients import router as clients_router
from app.api.v1.endpoints.products import router as products_router
from app.api.v1.endpoints.invoices import router as invoices_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints.leads import router as leads_router

__all__ = [
    "auth_router",
    "clients_router",
    "products_router",
    "invoices_router",
    "dashboard_router",
    "notifications_router",
    "leads_router",
]
