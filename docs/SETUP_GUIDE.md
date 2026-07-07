# DATAVEX ERP Setup & Installation Guide

This document provides a comprehensive step-by-step guide to clone, install, configure, migrate, seed, and run the **DATAVEX ERP** application.

---

## System Requirements & Prerequisites

Ensure the following tools are installed on your system before proceeding:

* **Bun (v1.0+)** *(Highly Recommended)*: Used as the package manager and runtime execution engine for the frontend. (If not using Bun, Node.js v20+ with npm/yarn can be used).
* **Python (v3.12 or v3.13)**: The backend service is built using modern asynchronous FastAPI structures requiring Python 3.12 or higher.
* **PostgreSQL (v15+)**: An active PostgreSQL server instance must be running, with a database created (default name: `erp_db`).
* **Git**: Used for cloning the repository and managing branch checkouts.

---

## Step 1: Clone the Repository

1. Open your terminal (PowerShell is recommended on Windows) and run:
   ```powershell
   git clone https://github.com/joswintauro28/ERP.git
   cd ERP
   ```

2. Checkout the correct development branch:
   ```powershell
   git checkout dev
   git pull origin dev
   ```

---

## Step 2: Configure & Run the Backend Service

The backend is built with FastAPI and runs from the `services/erp-service/` directory.

### 1. Set Up Environment Variables
Navigate to the service directory and copy the example environment file:
```powershell
cd services/erp-service
copy .env.example .env
```
Open the newly created `.env` file and customize the variables to match your Postgres configuration (specifically `DATABASE_URL`):
```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/erp_db
JWT_SECRET=YOUR_RANDOM_SECRET_KEY
PORT=8000
FRONTEND_URL=http://localhost:3000
```

### 2. Set Up Virtual Environment & Dependencies
Create a Python virtual environment and install the required modules:
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Run Database Migrations
To upgrade your database schema to the latest state, configure the Python search path (`PYTHONPATH`) and run the Alembic upgrade command:
```powershell
$env:PYTHONPATH="."
.venv\Scripts\alembic upgrade head
```

### 4. Database Reset (Optional)
To completely delete the existing tables and clear the database back to a clean slate, run the reset script:
```powershell
$env:PYTHONPATH="."
.venv\Scripts\python scripts/reset_db.py
```
*Note: Always run the migrations (`alembic upgrade head`) after resetting the database to recreate the empty tables.*

### 5. Seed the Database
There are two database seeding scripts available. Choose the one that fits your requirements:

* **Full mock data seed (Recommended)**: Seeds the database with system permissions, roles, and generates a personalized, isolated dataset (clients, leads, products, invoices, payments, settings, credit/debit notes) for *all* 6 development users.
  ```powershell
  $env:PYTHONPATH="."
  .venv\Scripts\python scripts/seed.py
  ```

* **Admin-only seed**: Seeds the database with system permissions, roles, and a single, isolated dataset for the system administrator.
  ```powershell
  $env:PYTHONPATH="."
  .venv\Scripts\python scripts/seed_admin.py
  ```

---

## Step 3: Seeded Users Reference

Executing `seed.py` populates the database with the following developer and role-based test accounts. Since data is isolated by user, each log-in will yield a fully-populated, realistic dashboard matching their domain:

| Full Name | Email | Password | Primary Role / Department |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@example.com` | `password123` | **Organization Owner** (Super Admin) |
| **Alex Chen** | `admin@datavex.com` | `Admin@123!` | **Organization Owner** (Administrator) |
| **Maya Patel** | `sales@datavex.com` | `Sales@123!` | **Sales Executive** (Sales) |
| **Jordan Kim** | `accounts@datavex.com` | `Acc@123!` | **Accountant** (Finance) |
| **Sam Rivera** | `inventory@datavex.com` | `Inv@123!` | **Inventory Manager** (Logistics) |
| **Priya Sharma** | `auditor@datavex.com` | `Aud@123!` | **Auditor** (Audit) |

All users belong to the `DATAVEX Industries` organization, but view their own isolated entities upon logging in.

---

## Step 4: Configure & Run the Frontend Application

The frontend is a Next.js 16 application located in `apps/erp-shell/`.

### 1. Set Up Environment Variables
Navigate to the frontend directory and copy the environment example file:
```powershell
cd ../../apps/erp-shell
copy .env.example .env
```
*Note: The default `.env` is pre-configured to communicate via a Next.js rewrite proxy at `/api` matching your local port (8000).*

### 2. Install Node Dependencies
Install package dependencies using Bun from the root of the workspace (or inside the app folder):
```powershell
bun install
```

---

## Step 5: Startup Commands

Both services can be run simultaneously in separate terminals using the following startup commands:

### Running the Backend Service
The backend folder contains a custom PowerShell startup script `run.ps1` which handles activating the environment and initiating Uvicorn:
```powershell
cd services/erp-service
.\run.ps1
```
*Uvicorn will spin up a hot-reloading development server on `http://127.0.0.1:8000`.*

### Running the Frontend Application
The frontend folder also contains a custom PowerShell startup script `run.ps1` which handles clearing local Next.js cache state and launching the application:
```powershell
cd apps/erp-shell
.\run.ps1
```
*Next.js Turbopack will compile and run the application on `http://localhost:3000`.*
