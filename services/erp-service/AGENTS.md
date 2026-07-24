# DATAVEX ERP — FastAPI Core Business Gateway (`services/erp-service`) Agent Context

This backend service acts as the central business logic gateway and handles lead/client interactions and orchestration dashboard calculations.

## 1. Tech Stack
- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`)
- **Database Migrations:** Alembic
- **Database Target:** `erp_db` (PostgreSQL)
- **Port:** 8000

## 2. Architecture & Design Patterns
- **Auth Pattern:** Token verification via `decode_access_token` and shared `JWT_SECRET`. Enforces isolation via the standard `owner_id` context.
- **Proxy Routers (passthrough to downstream microservices):**
  - `crm/router.py` (`prefix="/crm"`) — Generic CRUD passthrough for all CRM entities (customers, contacts, leads, documents, opportunities, etc.) + specific endpoints (lead-discovery, AI assistant, reports dashboard, lead convert) → crm-service (8001). Includes lead-to-internal mapping (`_map_lead`, `_reverse_map_lead`). Validated via `VALID_ENTITIES` set (20 entity types).
  - `billing/router.py` — Full passthrough for invoices, payments, quotations, credit/debit notes, accounting, bank reconciliation → billing-service (8003).
  - `inventory/router.py` — Full passthrough for warehouses, stock, suppliers, purchase orders, serial numbers → inventory-service (8004).
- **Business Logic Routers (with data mapping):**
  - `client/router.py` (`prefix="/clients"`) — Fetches customers from crm-service, maps to internal Client schema.
  - `product/router.py` (`prefix="/products"`) — Passthrough to inventory-service with lightweight wrapper.
- **Dashboard Aggregation (`dashboard/router.py`):** Fetches and merges KPIs from all three downstream services (billing, crm, inventory) concurrently.
- **Microservice Integration Clients:**
  - `billing_client.py` -> Connects to billing-service (`http://localhost:8003/api`).
  - `inventory_client.py` -> Connects to inventory-service (`http://localhost:8004`).
  - `crm_client.py` -> Connects to crm-service (`http://localhost:8001/api`) — generic CRUD + specific functions for dashboard, lead-discovery, AI assistant.
- **Interactive OpenAPI Documentation:** Exposes Swagger UI (`http://localhost:8000/docs`), ReDoc (`http://localhost:8000/redoc`), and OpenAPI spec (`http://localhost:8000/openapi.json`) with Bearer JWT authorization. `SecurityHeadersMiddleware` excludes `/docs`, `/redoc`, and `/openapi.json` from restrictive CSP headers.
- **Active Models:** Client, Lead, Product.

## 3. Run & Database Setup Commands
- **Run Service:**
  ```powershell
  bun nx run erp-service:dev
  # Or alternative startup:
  cd services/erp-service && .\run.ps1
  ```
- **Database Operations:**
  ```powershell
  cd services/erp-service
  $env:PYTHONPATH="."
  .venv\Scripts\alembic upgrade head      # Apply migrations
  .venv\Scripts\python scripts/reset_db.py # Drop all tables
  .venv\Scripts\python scripts/seed.py     # Seed 241 rows of business data
  ```
