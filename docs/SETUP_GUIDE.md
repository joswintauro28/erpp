# DATAVEX ERP Setup & Installation Guide

This document is the official, comprehensive setup guide for the **DATAVEX ERP** application. It details how to set up the system topology, build docker containers, configure hosts, run database migrations, and seed mock datasets for both the **Docker Compose Sandbox** and the **Manual / Native Developer Environment**.

---

## 1. Cloning & Repository Initialization

Run the following commands to pull the latest development branch:

```bash
# Clone the repository
git clone https://github.com/joswintauro28/ERP.git
cd ERP

# Switch to the active development branch and pull updates
git checkout dev
git pull origin dev
```

---

## 2. Path A: Recommended Docker Compose Sandbox (Fastest)

Running via Docker Compose isolates all PostgreSQL database schemas, routes traffic through Nginx, and compiles Next.js standalone targets automatically.

### Step 1: Pre-requisites
Ensure you have **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux) running.

### Step 2: Configure Hosts Subdomains (Optional but Recommended)
Run the hosts configuration utility to map local DNS subdomains (`app.erp.local`, `crm.erp.local`, etc.) to your loopback interface.

* **Windows (Run PowerShell as Administrator):**
  ```powershell
  .\infrastructure\local\setup-hosts.ps1
  ```
* **Linux / macOS (Run Bash with Sudo):**
  ```bash
  sudo ./infrastructure/local/setup-hosts.sh
  ```
*Note: If you skip DNS mapping, the redirect controllers fallback to standard localhost ports (`localhost:3000`, `localhost:3002`, etc.) automatically.*

### Step 3: Spin Up the Stack
Use the docker helper script to build and launch all 11 services in the background:

* **Windows (PowerShell):**
  ```powershell
  # Compile and build Next.js standalone layers
  .\infrastructure\local\docker-build.ps1 rebuild

  # Start the background containers
  .\infrastructure\local\docker-build.ps1 start
  ```
* **Linux / macOS (Bash):**
  ```bash
  # Compile and build Next.js standalone layers
  ./infrastructure/local/docker-build.sh rebuild

  # Start the background containers
  ./infrastructure/local/docker-build.sh start
  ```

### Step 4: Seed Container Databases
Execute the docker database seeder to populate all PostgreSQL instances inside the active containers:

* **Windows (PowerShell):**
  ```powershell
  .\infrastructure\local\seed-docker.ps1
  ```
* **Linux / macOS (Bash):**
  ```bash
  ./infrastructure/local/seed-docker.sh
  ```

### Step 5: Verify Container Health
Verify that all containers are healthy and running:
```bash
# Windows
.\infrastructure\local\docker-build.ps1 ps

# Linux / macOS
./infrastructure/local/docker-build.sh ps
```

---

## 3. Path B: Manual / Native Development Environment

This setup runs all microservices natively on the host machine.

### Step 1: Pre-requisites
Ensure the following tools are installed locally:
- **Bun (v1.0+)**: Used as the package manager and workspace tool.
- **Python (v3.13+)**: Required for FastAPI services.
- **PostgreSQL (v15+)**: Standard local database server.

### Step 2: Initialize PostgreSQL Databases
Create the 5 isolated database targets inside your PostgreSQL instance:
```sql
CREATE DATABASE erp_iam;
CREATE DATABASE erp_billing;
CREATE DATABASE erp_crm;
CREATE DATABASE erp_inventory;
CREATE DATABASE erp_db;
```

### Step 3: Install Workspace Packages
From the root directory, install workspace node modules to link shared npm libraries:
```bash
bun install
```

### Step 4: Individual Component Setup

Configure each module sequentially. Configure environment properties (`.env`), setup dependencies/venv, deploy migrations, and run seeds.

---

### 1. services/core-iam (NestJS SSO Authorization)
1. **Navigate & Setup `.env`**:
   ```bash
   cd services/core-iam
   # Create a .env file containing:
   DATABASE_URL="postgresql://postgres:root@localhost:5432/erp_iam"
   JWT_SECRET="development-jwt-secret-key-123"
   PORT=8002
   REFRESH_TOKEN_EXPIRE_SECONDS=604800
   ACCESS_TOKEN_EXPIRE_SECONDS=900
   ```
2. **Deploy Schema & Seed**:
   ```bash
   bunx prisma db push
   bunx prisma db seed
   ```

---

### 2. services/billing-service (NestJS Invoicing Ledger)
1. **Navigate & Setup `.env`**:
   ```bash
   cd ../billing-service
   # Create a .env file containing:
   DATABASE_URL="postgresql://postgres:root@localhost:5432/erp_billing"
   JWT_SECRET="development-jwt-secret-key-123"
   PORT=8003
   ```
2. **Deploy Schema**:
   ```bash
   bunx prisma db push
   bunx prisma generate
   ```

---

### 3. services/crm-service (FastAPI CRM Core)
1. **Navigate & Setup `.env`**:
   ```bash
   cd ../crm-service
   # Copy example environment:
   cp .env.example .env
   # Ensure DATABASE_URL is set to: postgresql+asyncpg://postgres:root@localhost:5432/erp_crm
   ```
2. **Configure Virtual Environment & Dependencies**:
   ```bash
   python -m venv .venv
   # Windows Activation:
   .venv\Scripts\Activate.ps1
   # Linux/macOS Activation:
   source .venv/bin/activate

   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. **Run Migrations & Seed**:
   ```bash
   # Deploy schema via Alembic
   PYTHONPATH=. alembic upgrade head
   # Populate crm mock data
   PYTHONPATH=. python scripts/seed_data.py
   ```

---

### 4. services/inventory-service (FastAPI Warehousing)
1. **Navigate & Setup `.env`**:
   ```bash
   cd ../inventory-service
   # Copy example environment:
   cp .env.example .env
   # Ensure DATABASE_URL is set to: postgresql+asyncpg://postgres:root@localhost:5432/erp_inventory
   ```
2. **Configure Virtual Environment & Dependencies**:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate

   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. **Run Migrations & Seed**:
   ```bash
   PYTHONPATH=. alembic upgrade head
   PYTHONPATH=. python scripts/seed.py
   ```

---

### 5. services/erp-service (FastAPI Executive Gateway)
1. **Navigate & Setup `.env`**:
   ```bash
   cd ../erp-service
   # Copy example environment:
   cp .env.example .env
   # Ensure DATABASE_URL is set to: postgresql+asyncpg://postgres:root@localhost:5432/erp_db
   ```
2. **Configure Virtual Environment & Dependencies**:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate

   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. **Run Migrations**:
   ```bash
   PYTHONPATH=. alembic upgrade head
   ```

---

### 6. Frontend Workstations (Next.js Apps)
Navigate to each workstation and ensure environment configs match target API layers:
* `apps/erp-shell/.env` &rarr; points to API gateway `http://localhost:8000`
* `apps/crm-shell/.env` &rarr; points to port `3001`
* `apps/billing-ui/.env` &rarr; points to port `3002`
* `apps/inventory-ui/.env` &rarr; points to port `3004`

---

### Step 5: Launch Local Services
Start all microservices natively using the Nx monorepo command from the workspace root:
```bash
cd ../..
bun nx run-many --target=dev
```

---

## 4. Reference: Seeded Users Reference

Executing the seeding scripts populates the IAM databases with the following standard test credentials:

| Full Name | Email | Password | Primary Role | Assigned Workstation |
| :--- | :--- | :--- | :--- | :--- |
| **Alex Chen** | `admin@datavex.com` | `Admin@123!` | Organization Owner | http://app.erp.local:3000 |
| **Maya Patel** | `sales@datavex.com` | `Sales@123!` | Sales Executive | http://crm.erp.local:3001 |
| **Jordan Kim** | `accounts@datavex.com` | `Acc@123!` | Accountant | http://billing.erp.local:3002 |
| **Sam Rivera** | `inventory@datavex.com` | `Inv@123!` | Inventory Manager | http://inventory.erp.local:3004 |
| **Priya Sharma** | `auditor@datavex.com` | `Aud@123!` | Auditor | http://billing.erp.local:3002 |
