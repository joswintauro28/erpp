from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.exceptions import TooManyRequestsException
from app.core.permissions import seed_system_permissions
from app.database import engine, async_session_factory
from app.models.base import Base
from app.models import *  # noqa: F401, F403
from app.api.middleware import SecurityHeadersMiddleware
from app.api.v1.endpoints import (
    auth_router,
    clients_router,
    products_router,
    invoices_router,
    dashboard_router,
    notifications_router,
    leads_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed system permissions
    async with async_session_factory() as session:
        await seed_system_permissions(session)
        await session.commit()

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="DATAVEX ERP API",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Exception handlers
@app.exception_handler(TooManyRequestsException)
async def too_many_requests_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": exc.detail},
    )

# Routers
app.include_router(auth_router)
app.include_router(clients_router)
app.include_router(products_router)
app.include_router(invoices_router)
app.include_router(dashboard_router)
app.include_router(notifications_router)
app.include_router(leads_router)


@app.get("/")
async def health_check():
    return {"message": "DATAVEX ERP API Running", "status": "healthy"}
