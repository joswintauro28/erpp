# erp-service — DATAVEX ERP Backend

FastAPI asynchronous backend application using Python 3.12+, SQLAlchemy 2.0 (async), Alembic, and PostgreSQL.

---

## Technical Stack

* **Framework**: FastAPI
* **Database Toolkit**: SQLAlchemy 2.0 (Asynchronous AsyncIO engine)
* **Migrations**: Alembic
* **Authentication**: Claims-based JWT verification (shared `JWT_SECRET`, `organization_id` tenant scoping)
* **Hashing**: Native Python `bcrypt`
* **Server**: Uvicorn with WatchFiles reloader

---

## Directory Structure

```
app/
├── main.py                   # FastAPI app init, CORS policy, router mounting, column auto-migrations
├── core/                     # Config, async DB engine, JWT deps (get_current_org_id), exceptions, middleware, request logging, shared schemas
├── integrations/             # Downstream service clients (billing 8003, inventory 8004, crm 8001) forwarding the raw JWT
├── crm/router.py             # /crm generic CRUD passthrough → crm-service
├── billing/router.py         # Full passthrough → billing-service
├── inventory/router.py       # Full passthrough → inventory-service
├── client/router.py          # /clients business logic (mapped from CRM customers)
├── product/router.py         # /products passthrough → inventory-service
├── dashboard/                # Aggregated KPIs from billing + crm + inventory
├── settings/                 # Per-org SystemSettings (organization_id unique)
├── notification/             # Org-scoped Notification model + REST/WebSocket gateway
├── files/                    # RustFS file registry (FileRecord, presigned upload/download)
└── events/                   # RabbitMQ event bus + WebSocket broadcast
scripts/
├── seed.py                   # Org-scoped mock dataset, dual-profile (--profile dev|testing)
├── reset_db.py               # Drop all tables
├── create_db.py              # Create tables without Alembic
└── migrate_rustfs_keys.py    # One-off RustFS key migration
alembic/                      # Alembic migrations history
alembic.ini                   # Alembic configuration
run.ps1                       # PowerShell backend runner
```

---

## Architecture Overview

The service is a gateway/aggregator: domain routers mount directly in `main.py`, and every query is tenant-scoped.

1. **Core (`app/core/`)**: Configuration, async SQLAlchemy engine/session, JWT dependencies (`get_current_org_id` reads the `organization_id` claim — strict, no cross-org bypass), exception handlers, and `RequestLoggingMiddleware` (X-Request-ID + slow-request flags).
2. **Integration Clients (`app/integrations/`)**: Forward the caller's raw JWT to billing-service, inventory-service, and crm-service.
3. **Domain Routers**: Passthrough routers (`crm`, `billing`, `inventory`, `product`) and business-logic routers (`client`, `dashboard`, `settings`, `notification`, `files`, `events`).

---

## Key Features

### 1. Robust Password Hashing
Uses direct Python `bcrypt` binding for hashing and verification, avoiding third-party wrapper lag. Limits passwords to standard byte lengths and secures passwords safely.

### 2. Auto-Migration Engine
Upon application startup, the startup handler running in `main.py` checks database tables for consistency. If missing columns (such as `payments.status`) are detected, it executes raw SQL statements to patch the table schema dynamically before loading endpoints.

### 3. Asynchronous Database Session Management
Utilizes PostgreSQL's asynchronous driver (`postgresql+asyncpg`) and maps operations to SQLAlchemy's `AsyncSession` context to handle high concurrent connection volumes cleanly.

---

## Getting Started

### 1. Environment Configurations
Copy `.env.example` to `.env` and set your local credentials:
```bash
cp .env.example .env
```

### 2. Run Database Migrations & Seed Data
```powershell
# Set PYTHONPATH so python knows how to resolve app module
$env:PYTHONPATH="."

# Run Alembic migrations
.venv\Scripts\alembic upgrade head

# Seed org-scoped mock data (SystemSettings/branding, per-org rows; add --profile testing for edge data)
.venv\Scripts\python scripts/seed.py
```

### 3. Startup Backend Server
Use the custom PowerShell script to launch the application:
```powershell
.\run.ps1
```
The FastAPI documentation is automatically generated and accessible at:
* Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
* Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
