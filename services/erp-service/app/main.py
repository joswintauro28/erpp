from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import TooManyRequestsException
from app.core.database import engine, Base
from app.core.middleware import SecurityHeadersMiddleware

# Import models to ensure they are registered in Base metadata
from app.client.models import Client
from app.lead.models import Lead
from app.product.models import Product

# Import feature routers
from app.client.router import router as clients_router
from app.lead.router import router as leads_router
from app.product.router import router as products_router
from app.dashboard.router import router as dashboard_router
from app.notification.router import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="DATAVEX ERP API",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(TooManyRequestsException)
async def too_many_requests_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import logging
    logging.error(f"Unhandled exception occurred: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Include Routers
app.include_router(clients_router)
app.include_router(leads_router)
app.include_router(products_router)
app.include_router(dashboard_router)
app.include_router(notifications_router)


@app.get("/")
async def health_check():
    return {"message": "DATAVEX ERP API Running", "status": "healthy"}
