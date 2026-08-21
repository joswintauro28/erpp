from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi

from app.core.config import settings
from app.core.exceptions import TooManyRequestsException
from app.core.middleware import SecurityHeadersMiddleware

# Import feature routers
from app.client.router import router as clients_router
from app.product.router import router as products_router
from app.dashboard.router import router as dashboard_router
from app.notification.router import router as notifications_router
from app.notification.websocket import router as notifications_ws_router
from app.crm.router import router as crm_router
from app.billing.router import router as billing_router
from app.inventory.router import router as inventory_router
from app.settings.router import router as settings_router
from app.events.router import router as events_router
from app.files.router import router as files_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    from app.events.notifications_consumer import run_notifications_worker
    from app.events.cogs_consumer import run_cogs_worker
    notif_task = asyncio.create_task(run_notifications_worker())
    cogs_task = asyncio.create_task(run_cogs_worker())
    yield
    notif_task.cancel()
    cogs_task.cancel()
    try:
        await asyncio.gather(notif_task, cogs_task, return_exceptions=True)
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="DATAVEX ERP Gateway API",
    description="Core Business Logic & Microservice Aggregation Gateway for DATAVEX ERP.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="DATAVEX ERP Gateway API",
        version="1.0.0",
        description="Core Business Logic & Microservice Aggregation Gateway for DATAVEX ERP. Aggregates IAM, CRM, Billing, and Inventory domains.",
        routes=app.routes,
    )
    openapi_schema["components"] = openapi_schema.get("components", {})
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter JWT Bearer token issued by Core IAM SSO",
        }
    }
    openapi_schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    if exc.status_code == 429:
        return JSONResponse(status_code=429, content={"detail": exc.detail})
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    logging.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Include Routers
app.include_router(clients_router)
app.include_router(products_router)
app.include_router(dashboard_router)
app.include_router(notifications_router)
app.include_router(notifications_ws_router)
app.include_router(crm_router)
app.include_router(billing_router)
app.include_router(inventory_router)
app.include_router(settings_router)
app.include_router(events_router)
app.include_router(files_router)


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy"}

@app.get("/", tags=["system"])
async def root():
    return {"message": "DATAVEX ERP API Running", "status": "healthy"}
