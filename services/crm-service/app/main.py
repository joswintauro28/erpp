from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base

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


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import logging
    logging.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(dashboard_router)
app.include_router(customer_router)
app.include_router(lead_router)
app.include_router(sales_router)
app.include_router(interaction_router)
app.include_router(service_router)
app.include_router(ai_router)
app.include_router(generic_router)


@app.get("/")
async def health_check():
    return {"message": "DATAVEX CRM API Running", "status": "healthy"}
