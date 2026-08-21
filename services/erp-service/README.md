# erp-service — DATAVEX ERP Backend

FastAPI asynchronous backend application using Python 3.12+, SQLAlchemy 2.0 (async), Alembic, and PostgreSQL.

---

## Technical Stack

* **Framework**: FastAPI
* **Database Toolkit**: SQLAlchemy 2.0 (Asynchronous AsyncIO engine)
* **Migrations**: Alembic
* **Authentication**: PyJWT (JWT Access & Refresh tokens)
* **Hashing**: Native Python `bcrypt`
* **Server**: Uvicorn with WatchFiles reloader

---

## Directory Structure

```
app/
├── api/
│   ├── deps.py               # Dependency injection (get_db, get_current_user_id)
│   └── v1/
│       ├── endpoints/        # Auth, Leads, Clients, Invoices, Payments, Products
│       ├── dashboard.py      # Analytics aggregation and trends endpoints
│       ├── notifications.py  # Low stock, expiring quotes, overdue alerts
│       └── router.py         # Version 1 global router mounting endpoints
├── core/
│   ├── config.py             # Pydantic Settings class parsing .env
│   ├── exceptions.py         # Custom HTTP exceptions (NotFound, Conflict, Auth)
│   └── security.py           # password hashing (bcrypt) and JWT signing logic
├── database.py               # Async engine, SessionLocal creation
├── main.py                   # FastAPI app init, CORS policy, DB column auto-migrations
├── models/                   # SQLAlchemy models (User, Lead, Client, Invoice, Product, Settings)
├── repositories/             # Database access layer (CRUD services)
├── schemas/                  # Pydantic data schemas (input validation and serialization)
└── services/                 # Business logic orchestration layer
scripts/
├── seed.py                   # Seeds complete mock dataset (leads, items, charts)
└── seed_admin.py             # Seeds minimal system administrator
alembic/                      # Alembic migrations history
alembic.ini                   # Alembic configuration
run.ps1                       # PowerShell backend runner
```

---

## Architecture Overview

This backend follows a strict **Controller-Service-Repository** pattern:

1. **Routing (`app/api/v1/endpoints/`)**: Receives the HTTP request, parses input payload via Pydantic schemas, calls dependencies to get current user, and forwards tasks to the Service layer.
2. **Service Layer (`app/services/`)**: Orchestrates business decisions, transaction control, validation, and communicates with repositories.
3. **Repository Layer (`app/repositories/`)**: Interfaces with the database via asynchronous SQLAlchemy queries.
4. **Schemas (`app/schemas/`)**: Pydantic models validate input parameters and serialize SQL results to JSON structures.

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

# Seed admin user
.venv\Scripts\python scripts/seed_admin.py
```

### 3. Startup Backend Server
Use the custom PowerShell script to launch the application:
```powershell
.\run.ps1
```
The FastAPI documentation is automatically generated and accessible at:
* Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
* Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
