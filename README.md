# DATAVEX ERP — Enterprise Resource Planning Monorepo

Welcome to the **DATAVEX ERP** ecosystem, a modern, polyglot monorepo engineered with an asynchronous FastAPI python backend, modular NestJS business domains, and next-generation Next.js 16 (Turbopack) workstations.

---

## 1. System Topology & Workspace Map

The project is structured using **Nx monorepo workspace resolution**, which isolates modules into clean folders:

```
DATAVEX/ERP/ (Root)
├── apps/                                  # FRONTEND APPLICATIONS (Workstations)
│   ├── erp-shell/                         # Next.js 16 (Port 3000) — Main Executive / Super Admin Shell
│   ├── crm-shell/                         # Next.js 16 (Port 3001) — CRM Workstation / Sales Hub
│   ├── billing-ui/                        # Next.js 16 (Port 3002) — Billing Workstation for Accountant/Auditor
│   └── inventory-ui/                      # Next.js 16 (Port 3004) — Inventory Workstation for Inventory Manager
│
├── services/                              # BACKEND MICROSERVICES (REST APIs)
│   ├── erp-service/                       # FastAPI (Port 8000) — Core Business Logic Gateway
│   ├── crm-service/                       # FastAPI (Port 8001) — CRM / Sales Pipeline Engine
│   ├── core-iam/                          # NestJS (Port 8002) — Central Single Sign-On & RBAC Engine
│   ├── billing-service/                   # NestJS (Port 8003) — Invoices, Payments, Quotations, and General Ledger
│   └── inventory-service/                 # FastAPI (Port 8004) — Products, Stock, Suppliers, and PO tracking
│
├── packages/                              # CENTRAL SHAREABLE PACKAGES
│   ├── auth-middleware/                   # Shared JWT types, Axios clients, and token refresh hooks
│   └── ui-theme/                          # Shared Tailwind v4 variables, globals, and Shadcn UI components
│
├── infrastructure/                        # DOCKER & REVERSE PROXY
│   └── local/                             # Docker compose config, setup-hosts script, Nginx maps
│
└── AGENTS.md                              # Unified AI Agent instructions & project context hub
```

---

## 2. Dynamic Redirection & Hostnames

The project supports two local runtime styles depending on your preference:

### Local DNS Style (Subdomains on Port 80)
Using the reverse proxy (Nginx gateway), the application resolves via beautiful domain addresses:
* **Executive Shell**: `http://app.erp.local`
* **CRM Workstation**: `http://crm.erp.local`
* **Billing Workstation**: `http://billing.erp.local`
* **Inventory Workstation**: `http://inventory.erp.local`

To enable this, execute the hosts mapping script as Administrator:
```powershell
.\infrastructure\local\setup-hosts.ps1
```

### Localhost Port Style (Zero-Setup direct ports)
If you don't wish to configure hosts mappings on your machine, you can access the frontends directly on their localhost ports:
* **Executive Shell**: `http://localhost:3000`
* **CRM Workstation**: `http://localhost:3001`
* **Billing Workstation**: `http://localhost:3002`
* **Inventory Workstation**: `http://localhost:3004`

> **Note**: The client-side workstations automatically detect the browser's hostname at runtime. If you log in via localhost, SSO redirects will dynamically route you back via localhost ports automatically.

---

## 3. Database Separation Strategy

Each service operates on its own dedicated PostgreSQL database target. In local development/Docker Compose, these databases run as 5 logical databases hosted in a single database container instance:

| Database Name | Microservice | Description |
|:---|:---|:---|
| `erp_iam` | `core-iam` | SSO user credentials, global roles, permissions mapping |
| `erp_billing` | `billing-service` | Financial invoices, payments, credit/debit records, quotations |
| `erp_inventory` | `inventory-service` | Product catalog items, stock records, warehouses, and PO listings |
| `erp_crm` | `crm-service` | Sales leads, client accounts, interactions tracking |
| `erp_db` | `erp-service` | Central business gateway stats |

---

## 4. Run Scripts & Verification

### Running inside Docker Compose (Sandbox)
The repository contains a production-ready dockerization configuration (featuring Next.js standalone outputs, cached dependencies, automated Alembic migrations, and sequential healthchecks):

```powershell
# Windows (PowerShell):
# 1. Build and compile the stack
.\infrastructure\local\docker-build.ps1 rebuild

# 2. Spin up all containers in background
.\infrastructure\local\docker-build.ps1 start

# 3. Seed database containers with development data
.\infrastructure\local\seed-docker.ps1

# 4. Check status (verify healthy transitions)
.\infrastructure\local\docker-build.ps1 ps

# 5. Stop the stack
.\infrastructure\local\docker-build.ps1 stop
```

```bash
# Linux / macOS (Bash):
# 1. Build and compile the stack
./infrastructure/local/docker-build.sh rebuild

# 2. Spin up all containers in background
./infrastructure/local/docker-build.sh start

# 3. Seed database containers with development data
./infrastructure/local/seed-docker.sh

# 4. Check status (verify healthy transitions)
./infrastructure/local/docker-build.sh ps

# 5. Stop the stack
./infrastructure/local/docker-build.sh stop
```

### Running Locally (Native Process Development)
To run services in developer mode natively:
```powershell
# 1. Install workspace dependencies
bun install

# 2. Run everything simultaneously via Nx Task Runner
bun nx run-many --target=dev
```

---

## 5. Development Resources

- **[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)**: Detailed workspace setup guides, seeding references, and command instructions.
- **[docs/PROJECT.md](docs/PROJECT.md)**: SSO architecture workflows and JWT wildcard cookie parameters.
- **[docs/FUTURE_PLAN.md](docs/FUTURE_PLAN.md)**: Deployment guidelines for Virtual Machines (Caddy) and enterprise scaling maps (Kubernetes).
- **[AGENTS.md](AGENTS.md)**: AI code generation parameters and directory design rules.
