from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extensions import TRANSACTION_STATUS_IDLE

from app.config import load_env_file

load_env_file()

from app.db_bootstrap import ensure_phase1_schema
from app.database import conn
from app.routers import auth, clients, dashboard, eway_bills, expenses, invoices, leads, ledger, payments, products, quotations, search, settings, stock, users, notifications, accounting, reports, ai, emails, audit_logs, recurring_invoices, workflow_settings, credit_notes, debit_notes, team, client_portal, warehouses, purchase_orders, inventory, suppliers, accounts

ensure_phase1_schema()


from apscheduler.schedulers.background import BackgroundScheduler
from app.services.recurring_job import process_recurring_invoices
from app.services.workflow_automation import run_daily_workflows

app = FastAPI()

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def cleanup_database_transaction(request, call_next):
    try:
        return await call_next(request)
    finally:
        try:
            if conn.get_transaction_status() != TRANSACTION_STATUS_IDLE:
                conn.rollback()
        except Exception:
            pass


app.include_router(clients.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(dashboard.router)
app.include_router(eway_bills.router)
app.include_router(quotations.router)
app.include_router(payments.router)
app.include_router(leads.router)
app.include_router(products.router)
app.include_router(ledger.router)
app.include_router(accounts.router)
app.include_router(expenses.router)
app.include_router(search.router)
app.include_router(notifications.router)
app.include_router(accounting.router)
app.include_router(reports.router)
app.include_router(ai.router)
app.include_router(settings.router)
app.include_router(stock.router)
app.include_router(warehouses.router)
app.include_router(purchase_orders.router)
app.include_router(inventory.router)
app.include_router(emails.router)
app.include_router(audit_logs.router)
app.include_router(recurring_invoices.router)
app.include_router(workflow_settings.router)
app.include_router(credit_notes.router)
app.include_router(debit_notes.router)
app.include_router(team.router)
app.include_router(client_portal.router)
app.include_router(suppliers.router)


@app.get("/")
def root():
    return {"message": "VexBill API Running"}
