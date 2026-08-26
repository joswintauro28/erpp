# DATAVEX ERP Setup & Installation Guide

This document is the official, comprehensive setup guide for the **DATAVEX ERP** application. It details how to set up the system topology, build docker containers, configure hosts, run database migrations, and seed mock datasets for both the **Docker Compose Sandbox** and the **Manual / Native Developer Environment**.

---

## 1. Cloning & Repository Initialization

### Option A — Full Clone (includes full git history for all branches)

```bash
# Clone the repository
git clone https://github.com/joswintauro28/ERP.git
cd ERP

# Switch to the active development branch and pull updates
git checkout dev
git pull origin dev
```

### Option B — Single-Branch Shallow Clone (faster, smaller download)

For a quicker checkout that only pulls the `dev` branch with truncated history:

```bash
# Clone only the dev branch with depth 1 (latest commit, no full history)
git clone https://github.com/joswintauro28/ERP.git --branch dev --single-branch --depth 1
cd ERP
```

---

## 2. Path A: Recommended Docker Compose Sandbox (Fastest)

Running via Docker Compose isolates all PostgreSQL database schemas, routes traffic through Nginx, and compiles Next.js standalone targets automatically.

### Step 1: Pre-requisites
Ensure you have **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux) running, and that ports **80** (nginx), **5432** (PostgreSQL), and **3000-3004**, **8000-8004** (services) are available — stop any local dev servers or other containers using them.

### Step 2: Prepare Environment File
The Docker stack requires a `.env.docker` file in `infrastructure/local/`. Copy the example if it doesn't exist:

```bash
# All platforms
cp infrastructure/local/.env.docker.example infrastructure/local/.env.docker
```

Review and adjust values (JWT secret, DB credentials, API keys) as needed.

### Step 3: Configure Hosts Subdomains (Optional but Recommended)
Run the hosts configuration utility to map local DNS subdomains (`app.erp.local`, `crm.erp.local`, etc.) to your loopback interface.

* **Windows (PowerShell — must be run as Administrator):**
  ```powershell
  .\infrastructure\local\setup-hosts.ps1
  ```
* **Linux / macOS (Bash with Sudo):**
  ```bash
  sudo ./infrastructure/local/setup-hosts.sh
  ```
*Note: If you skip DNS mapping, the redirect controllers fallback to standard localhost ports (`localhost:3000`, `localhost:3002`, etc.) automatically.*

### Step 4: One-Time Environment Setup (Optional)
A convenience script combines Step 2, Step 3, and Dockerfile verification into a single run:

* **Windows (PowerShell as Administrator):**
  ```powershell
  .\infrastructure\local\setup-docker.ps1
  ```
* **Linux / macOS (Bash with Sudo):**
  ```bash
  sudo ./infrastructure/local/setup-docker.sh
  ```

### Step 5: Spin Up the Stack
Use the docker helper script to build and launch all 11 services:

* **Windows (PowerShell):**
  ```powershell
  # Build all images (no-cache) and start containers in background
  .\infrastructure\local\docker-build.ps1 rebuild
  ```
* **Linux / macOS (Bash):**
  ```bash
  # Build all images (no-cache) and start containers in background
  ./infrastructure/local/docker-build.sh rebuild
  ```

> The `rebuild` command compiles all images with `--no-cache` and immediately starts the stack. If you only need to start existing containers without rebuilding, use `.\infrastructure\local\docker-build.ps1 up`.

### Step 6: Seed Container Databases
After all containers report healthy, execute the database seeder to populate all PostgreSQL instances:

* **Windows (PowerShell):**
  ```powershell
  .\infrastructure\local\seed-docker.ps1
  ```
* **Linux / macOS (Bash):**
  ```bash
  ./infrastructure/local/seed-docker.sh
  ```

### Step 7: Verify Container Health
Verify that all containers are healthy and running:

```bash
# Windows
.\infrastructure\local\docker-build.ps1 ps

# Linux / macOS
./infrastructure/local/docker-build.sh ps
```

All 11 containers should show a running status. If any show "unhealthy", wait a moment and re-run `docker-build.ps1 ps` — some services (especially frontends with Turbopack) may need extra startup time.

### Step 8: Verify Login
Open `http://app.erp.local` (or `http://localhost:3000` if hosts not configured) and log in with the seeded admin credentials:

| Email | Password |
|-------|----------|
| `admin@datavex.com` | `Admin@123!` |

Other test accounts are listed in the [Seeded Users Reference](#4-reference-seeded-users-reference) section below.

---

## 2B. Path A2: Internal / Production Deployment (VM)

For deploying on an internal company VM (HTTP only, real domain names), use the `infrastructure/internal/` configuration. This is a separate, standalone compose setup with production secrets and real domain names.

### Prerequisites
- Ubuntu 24.04 VM with Docker installed
- SSH access via ProxyJump through gitlab-vm
- DNS records or `/etc/hosts` entries for `*.erp.datavex.com`
- Ports 80 forwarded from public IP to VM

### Steps
```bash
# 1. SSH into the VM
ssh datavex-vm

# 2. Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Log out and back in

# 3. Clone the repo
git clone <repo-url> datavex-erp
cd datavex-erp

# 4. Configure environment
cd infrastructure/internal
cp .env.docker.example .env.docker
nano .env.docker  # Fill in production secrets

# 5. Build and start
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d

# 6. Seed databases
docker compose --env-file .env.docker exec erp-service python scripts/seed.py
docker compose --env-file .env.docker exec core-iam bunx prisma db seed

# 7. Verify
docker compose --env-file .env.docker ps
curl http://app.erp.datavex.com
```

See [`infrastructure/internal/DEPLOY.md`](../infrastructure/internal/DEPLOY.md) for the complete deployment guide with troubleshooting.

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
