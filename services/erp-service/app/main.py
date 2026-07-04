import pkgutil
import importlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import engine, Base
from app import models
from app.db_bootstrap import ensure_phase1_schema
from app.services.recurring_job import process_recurring_invoices
from app.services.workflow_automation import run_daily_workflows
from app import routers

# Create missing base schema tables using SQLAlchemy metadata
Base.metadata.create_all(bind=engine)

# Bootstrap remaining phase 1 table additions
ensure_phase1_schema()

app = FastAPI(title="VexBill ERP Backend")

# Dynamic CORS Configuration from Settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Background scheduler configurations
scheduler = BackgroundScheduler()

@app.on_event("startup")
def startup_event():
    scheduler.add_job(
        process_recurring_invoices,
        trigger="cron",
        hour=0,
        minute=5,
        id="daily_recurring_invoices",
        replace_existing=True
    )
    scheduler.add_job(
        run_daily_workflows,
        trigger="cron",
        hour=8,
        minute=0,
        id="daily_workflows",
        replace_existing=True
    )
    scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

# Dynamic Router Autodiscovery
def autodiscover_routers(app: FastAPI):
    for _, module_name, _ in pkgutil.iter_modules(routers.__path__):
        module = importlib.import_module(f"app.routers.{module_name}")
        if hasattr(module, "router"):
            app.include_router(module.router)

autodiscover_routers(app)

@app.get("/")
def root():
    return {"message": "VexBill API Running", "status": "healthy"}
