from contextlib import asynccontextmanager

import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base
from app.core.deps import require_permission

from app.dashboard.models import Metric, PipelineStage, Recommendation, HotLead, Report
from app.customer.models import Customer, Contact, Document
from app.lead.models import Lead, Opportunity
from app.sales.models import Sale, Requirement, Quotation, SalesOrder
from app.interaction.models import Enquiry, SiteVisit, FollowUp, Task, Communication, VisitPlan
from app.service.models import Complaint, Feedback
from app.ai.models import AIAssistantLog

from app.dashboard.router import router as dashboard_router
from app.customer.router import router as customer_router
from app.lead.router import router as lead_router
from app.sales.router import router as sales_router
from app.interaction.router import router as interaction_router
from app.service.router import router as service_router
from app.ai.router import router as ai_router
from app.generic.router import router as generic_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="DATAVEX CRM API",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
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


crm_view = [Depends(require_permission("crm.view"))]

app.include_router(dashboard_router, dependencies=crm_view)
app.include_router(customer_router, dependencies=crm_view)
app.include_router(lead_router, dependencies=crm_view)
app.include_router(sales_router, dependencies=crm_view)
app.include_router(interaction_router, dependencies=crm_view)
app.include_router(service_router, dependencies=crm_view)
app.include_router(ai_router, dependencies=crm_view)
app.include_router(generic_router, dependencies=crm_view)


@app.get("/")
async def health_check():
    return {"message": "DATAVEX CRM API Running", "status": "healthy"}
