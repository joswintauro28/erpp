# DATAVEX ERP — Global Project Context for AI Agents

This document is the unified context hub and source of truth for AI agents working in this repository. It defines the system architecture, directory topology, tech stacks, core patterns, design rules, and commands across both frontend and backend modules.

---

## 1. System Topology & Directory Structure

DATAVEX ERP is organized as an **Nx Polyglot Monorepo**. This isolates frontend, backend, and shared libraries while standardizing on **TypeScript** (frontend/NestJS) and **Python** (FastAPI) to maximize agent context-awareness.

```
DATAVEX/ERP/ (Root)
├── apps/                                  # FRONTEND APPLICATIONS
│   ├── erp-shell/                         # Next.js 16 (Turbopack, port 3000) — Main Executive / Super Admin Shell
│   ├── crm-shell/                         # Next.js 16 (Turbopack, port 3001) — CRM Workstation / Sales Hub
│   ├── billing-ui/                        # Next.js 16 (Turbopack, port 3002) — Billing Workstation for Accountant/Auditor
│   └── inventory-ui/                      # Next.js 16 (Turbopack, port 3004) — Inventory Workstation for Inventory Manager
│
├── services/                              # BACKEND MICROSERVICES
│   ├── erp-service/                       # FastAPI (Python 3.13+, port 8000) — Core Business Logic Gateway
│   ├── crm-service/                       # FastAPI (Python 3.13+, port 8001) — CRM / Sales Pipeline Engine
│   ├── core-iam/                          # NestJS (Prisma, port 8002) — Central SSO & RBAC Engine
│   ├── billing-service/                   # NestJS (Prisma, port 8003) — Invoices, Payments, Quotations, Ledger
│   └── inventory-service/                 # FastAPI (Python 3.13+, port 8004) — Product Catalog, Warehouses, Stock, Suppliers, POs, Serial Tracking
│
├── packages/                              # CENTRAL SHAREABLE PACKAGES
│   ├── auth-middleware/                   # Shared JWT auth types, API client, token management
│   └── ui-theme/                          # Shared Shadcn UI primitives, custom theme, and Tailwind v4 variables
│
├── docs/                                  # DOCUMENTATION AND ROADMAPS
│   ├── SETUP_GUIDE.md                     # Step-by-step workspace installation and configuration guide
│   ├── PROJECT.md                         # Zero-Trust JWT wildcard cookies, DB allotment strategy
│   └── FUTURE_PLAN.md                     # Workstation sandboxing, VM & Kubernetes scaling maps
│
├── infrastructure/                        # DOCKER & GATEWAY CONFIGURATIONS
│   └── local/                             # Compose sandbox orchestration, hosts config, and nginx configs
│
├── nx.json                                # Nx build and caching configurations
├── package.json                           # Central workspace project registry (workspaces: apps/*, services/*, packages/*)
└── AGENTS.md                              # THIS FILE
```

---

## 2. Frontend Project Contexts

### 2.1 Executive Shell (`apps/erp-shell`) — Port 3000

**Tech Stack**
- **Framework:** Next.js 16.2.10 (Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (all theme via CSS `@theme` directives in `@datavex/ui-theme/globals.css`)
- **Icons:** `lucide-react`
- **Charts:** `recharts`

**UI Theme:** "Refined Crimson & Brushed Gold"

| CSS Custom Variable | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `--sidebar`/`--shell-header` | `#3D1013` | Deep Maroon sidebar & header chassis |
| `--shell-brand` | `#8C1D24` | Crimson Red — buttons, active states, primary actions |
| `--shell-accent` | `#E5B83C` | Milled Brass / Gold — badges, icon highlight fills, sweep pulse |
| `--sidebar-primary` / `--sidebar-active-bg` | `#8C1D24` | Gold / Crimson — brand marks, active icons, active background |
| `--radius-sm` | `4px` | Button corners |
| `--radius-md` | `6px` | Card corners |

All tokens defined in `packages/ui-theme/src/globals.css` as CSS custom properties, mapped to Tailwind via `@theme inline`.

**Core Frontend Patterns**
- **Authentication (`useAuth`):** `AuthContext` handles login status, session persistence via `localStorage`. User payload: `id, email, full_name, role, organization_name, permissions`.
- **Central SSO Redirection & Routing:**
  - Login page processes `?redirect=...` for full browser redirects back to calling workstation domains.
  - On success, passes `?token=<jwt>` in the redirect URL so the target workstation can authenticate.
  - Role-based workstation routing: `Accountant`/`Auditor` → Billing (`3002`), `Sales Executive` → CRM (`3001`), Admins → stay on Shell (`3000`).
- **API Service (`services/api.ts`):** Re-exports `{ setAccessToken, getAccessToken, api }` from `@datavex/auth-middleware`.
- **Routing Gateway Proxy (`proxy.ts`):** Next.js middleware intercepting `/api/:path*`:
  - `/api/auth/*` → core-iam on port `8002` (preserving `/api` prefix)
  - `/api/invoices*`, `/api/payments*`, `/api/dashboard/billing` → billing-service on port `8003` (preserving `/api` prefix)
  - `/api/products*`, `/api/warehouses*`, `/api/stock*`, `/api/suppliers*`, `/api/purchase-orders*`, `/api/serial-numbers*`, `/api/dashboard/inventory` → inventory-service on port `8004` (stripping `/api` prefix)
  - All other `/api/*` → erp-service FastAPI on port `8000` (stripping `/api` prefix)
- **Imports & Path Aliases:** Shadcn primitives and `cn` utility from `@/components/ui/*` and `@/lib/utils`, mapped via tsconfig paths to `@datavex/ui-theme`.
- **Multi-Step Modals:** All forms use `components/multi-step-dialog.tsx` with horizontal step wizard.

### 2.2 CRM Workstation (`apps/crm-shell`) — Port 3001

**Tech Stack**
- Same as erp-shell: Next.js 16, TypeScript, Tailwind v4, lucide-react, recharts
- Shares `@datavex/ui-theme` package (same theme tokens and components)

**Architecture & Auth Pattern**
- **Token-verification only** — no login page, no credential handling.
- On mount, checks for `?token=<jwt>` in URL (passed from erp-shell after login), or tries `/api/auth/refresh` via cookie.
- If no token found, redirects to `http://localhost:3000/login?redirect=http://localhost:3001` (erp-shell login).
- `useAuth()` returns `{ user, isAuthenticated, loading, logout }` — no `login()` function.
- **Proxy** (`proxy.ts`): Routes `/api/auth/*` → core-iam (8002), all other `/api/*` → crm-service (8001).

---

### 2.3 Billing Workstation (`apps/billing-ui`) — Port 3002

**Tech Stack**
- Same as erp-shell: Next.js 16, TypeScript, Tailwind v4, lucide-react, recharts
- Shares `@datavex/ui-theme` package (same theme tokens and components)

**Architecture & Auth Pattern**
- **Token-verification only** — no login page, no credential handling.
- On mount, checks for `?token=<jwt>` in URL (passed from erp-shell after login), or tries `/api/auth/refresh` via cookie.
- If no token found, redirects to `http://localhost:3000/login?redirect=http://localhost:3002` (erp-shell login).
- `useAuth()` returns `{ user, isAuthenticated, loading, logout }` — no `login()` function.
- **Proxy** (`proxy.ts`): Routes `/api/auth/*` → core-iam (8002), all other `/api/*` → billing-service (8003).

**Routes (9 total)**

| Route | API Endpoint | Description |
|-------|-------------|-------------|
| `/dashboard` | `GET /api/dashboard/billing` | Aggregated KPIs (revenue, outstanding, overdue, payment metrics, trends) |
| `/billing/invoices` | `GET /api/invoices` | Invoice list with GST summary cards, search, status filter |
| `/billing/invoices/[id]` | `GET /api/invoices/:id` | Invoice detail with line items, GST breakdown, payments |
| `/billing/quotations` | `GET /api/invoices/quotations` | Quotation list with status filter |
| `/billing/payments` | `GET /api/payments` + `GET /api/payments/metrics` | Payment list with daily/monthly/refund/failed KPIs |
| `/billing/credit-notes` | `GET /api/invoices/credit-notes` | Credit note list |
| `/billing/debit-notes` | `GET /api/invoices/debit-notes` | Debit note list |
| `/billing/recurring-invoices` | `GET /api/invoices/recurring` | Recurring invoice schedules with frequency badges |

**Sidebar:** Collapsible (260px/64px), billing-specific nav: Dashboard + Billing group (Invoices, Quotations, Payments, Credit Notes, Debit Notes, Recurring). Same Deep Maroon chassis as erp-shell.

---

### 2.4 Inventory Workstation (`apps/inventory-ui`) — Port 3004

**Tech Stack**
- Same as erp-shell: Next.js 16, TypeScript, Tailwind v4, lucide-react, recharts
- Shares `@datavex/ui-theme` package (same theme tokens and components)

**Architecture & Auth Pattern**
- **Token-verification only** — no login page, no credential handling.
- On mount, checks for `?token=<jwt>` in URL (passed from erp-shell after login), or tries `/api/auth/refresh` via cookie.
- If no token found, redirects to `http://localhost:3000/login?redirect=http://localhost:3004` (erp-shell login).
- `useAuth()` returns `{ user, isAuthenticated, loading, logout }` — no `login()` function.
- **Proxy** (`proxy.ts`): Routes `/api/auth/*` → core-iam (8002), all other `/api/*` → inventory-service (8004).

**Routes (8 total)**

| Route | API Endpoint | Description |
|-------|-------------|-------------|
| `/dashboard` | `GET /api/dashboard/inventory` | Aggregated KPIs (products, warehouses, stock, low stock, pending POs) |
| `/inventory/products` | `GET /api/products` | Product catalog with search, category badges |
| `/inventory/warehouses` | `GET /api/warehouses` | Warehouse locations with status |
| `/inventory/stock` | `GET /api/stock` | Stock levels per product/warehouse with availability |
| `/inventory/stock/movements` | `GET /api/stock/movements` | Movement log with type badges (in/out/adjustment) |
| `/inventory/suppliers` | `GET /api/suppliers` | Supplier list with contact info |
| `/inventory/purchase-orders` | `GET /api/purchase-orders` | Purchase order list with status badges |
| `/inventory/serial-numbers` | `GET /api/serial-numbers` | Serial tracking list with status filter |

**Sidebar:** Collapsible (260px/64px) with 4 groups: Dashboard (standalone), Inventory Management (Products, Stock Levels, Stock Movements, Serial Numbers), Procurement (Suppliers, Purchase Orders), Locations (Warehouses). Same Deep Maroon chassis as erp-shell.

---

## 3. Backend Project Contexts

DATAVEX ERP utilizes a decoupled backend architecture where each business domain has its own service and database.

### 3.1 Central IAM Service (`services/core-iam`) — Port 8002

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database ORM:** Prisma Client (generated locally to `@prisma/client-iam` — isolated from other services)
- **Database Target:** `erp_iam` (PostgreSQL)
- **Auth Hashing:** `bcryptjs`
- **RBAC:** `@Permissions(...codes)` decorator + `PermissionsGuard` for endpoint security
- **JWT SSO Strategy:** Signed JWTs with claims: `sub` (string userId), `email`, `role`, `permissions[]`, `organization_id`, `organization_name`. HttpOnly refresh cookie.
- **Seed Users:**
  | Name | Email | Password | Role |
  |---|---|---|---|
  | Alex Chen | admin@datavex.com | Admin@123! | Organization Owner |
  | Maya Patel | sales@datavex.com | Sales@123! | Sales Executive |
  | Jordan Kim | accounts@datavex.com | Acc@123! | Accountant |
  | Sam Rivera | inventory@datavex.com | Inv@123! | Inventory Manager |
  | Priya Sharma | auditor@datavex.com | Aud@123! | Auditor |
- **Prisma isolation:** Uses `output = "../node_modules/@prisma/client-iam"` in schema.prisma to avoid conflicts with other services' Prisma clients. Imports from `@prisma/client-iam`.

### 3.2 Billing Service (`services/billing-service`) — Port 8003

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database ORM:** Prisma Client (default `@prisma/client`)
- **Database Target:** `erp_billing` (PostgreSQL)
- **Auth:** Claims-based JWT verification via shared `JWT_SECRET` — no DB queries for auth. `AuthGuard` verifies the token, `PermissionsGuard` checks RBAC from JWT claims.
- **Response Format:** All responses auto-converted to snake_case via global `SnakeCaseInterceptor`.

**Modules & Endpoints**

| Module | Endpoints | Key Features |
|--------|-----------|-------------|
| **Invoices** | `GET /invoices`, `GET /:id`, `POST /`, `PUT /:id/status`, `DELETE /:id` | GST calc (CGST/SGST/IGST), auto-balance tracking, status enforcement |
| **Payments** | `GET /payments`, `POST /`, `POST /:id/refund`, `GET /payments/metrics` | Auto-updates invoice paidAmount/balanceDue/status; refund reversal |
| **Quotations** | `GET /invoices/quotations`, `GET /:id`, `POST /`, `PUT /:id`, `PUT /:id/status`, `DELETE /:id`, `POST /:id/convert` | Convert-to-invoice, status lifecycle |
| **Credit Notes** | `GET /invoices/credit-notes`, `POST /`, `DELETE /:id` | Auto-adjusts invoice balance, cancels if fully credited |
| **Debit Notes** | `GET /invoices/debit-notes`, `POST /`, `DELETE /:id` | Increases invoice total + balance |
| **Recurring Invoices** | `GET /invoices/recurring`, `GET /:id`, `POST /`, `DELETE /:id` | Template-based scheduling with frequency enum |
| **Dashboard** | `GET /dashboard/billing` | Aggregated KPIs: totalRevenue, outstanding, overdue, paymentMetrics, summary, recentInvoices, revenueTrend |

**Prisma Schema (7 models):** Invoice (with InvoiceItem relation), Payment, CreditNote, DebitNote, Quotation, RecurringInvoice. All models use `ownerId` for data isolation.

### 3.3 Inventory Service (`services/inventory-service`) — Port 8004

- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`)
- **Migrations:** Alembic
- **Database Target:** `erp_inventory` (PostgreSQL)
- **Claims-Based Verification:** JWT payload decoded from shared `JWT_SECRET` — no DB queries for auth.

**Models (7):** Product, Warehouse, Stock, StockMovement, Supplier, PurchaseOrder (with PurchaseOrderItem), SerialNumber. All models use `owner_id` for data isolation.

**Modules & Endpoints**

| Module | Endpoints | Key Features |
|--------|-----------|-------------|
| **Products** | `GET /products`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Full catalog with SKU, barcode, pricing, tax, batch/serial flags |
| **Warehouses** | `GET /warehouses`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Location management with code, address, city/state |
| **Stock** | `GET /stock`, `PUT /stock/adjust` | Combined stock view per product×warehouse; adjust with auto-movement log |
| **Stock Movements** | `GET /stock/movements`, `POST /stock/movements` | In/out/adjustment logging with reference tracking |
| **Suppliers** | `GET /suppliers`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Vendor registry with GST, payment terms |
| **Purchase Orders** | `GET /purchase-orders`, `GET /:id`, `POST /`, `PUT /:id/status`, `DELETE /:id` | PO with line items, auto-totaling, status lifecycle (draft→ordered→received) |
| **Serial Numbers** | `GET /serial-numbers`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | Serial tracking per product×warehouse with status filter |

### 3.4 FastAPI Business Backend (`services/erp-service`) — Port 8000

- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`)
- **Migrations:** Alembic
- **Database Target:** `erp_db` (PostgreSQL)
- **Claims-Based Verification:** `decode_access_token` decodes JWT locally via shared `JWT_SECRET` + HS256 — no DB queries. `require_permission` dependency defined but not yet applied to any route (all endpoints use basic `get_current_user_id` with `owner_id` scoping).
- **Monolithic `/auth` endpoints decommissioned** — auth handled entirely by core-iam.
- **Inter-service Integration:** Dashboard and Notification modules forward the raw JWT to billing-service (port 8003) and inventory-service (port 8004) via `_raw_token` in the JWT payload.
- **Active Models (3):** Client, Lead, Product — all with `owner_id` data isolation.
- **Integration Clients:**
  - `billing_client.py` → `http://localhost:8003/api` (dashboard KPIs, invoices, payments)
  - `inventory_client.py` → `http://localhost:8004` (dashboard, products, warehouses)
   - `crm_client.py` → `http://localhost:8001/api` (dashboard, customers, leads)

---

### 3.5 CRM Service (`services/crm-service`) — Port 8001

- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (sync, via `create_engine` + `SessionLocal`)
- **Database Target:** `erp_crm` (PostgreSQL)
- **Claims-Based Verification:** JWT payload decoded from shared `JWT_SECRET` — no DB queries for auth. Uses `get_current_token_payload` / `get_current_user_id` dependencies.
- **Auth Pattern:** Token-verification only — no login endpoints, no credential handling. All authentication delegated to core-iam (port 8002).
- **Data Isolation:** All models use `owner_id` (Integer, indexed) scoped from JWT `user_id` claim — no local user/Admin model or password storage.

**Modules & Endpoints**

| Module | Endpoints | Key Features |
|--------|-----------|-------------|
| **Dashboard** | `GET /api/dashboard` | Aggregated KPIs: pipeline value, open opps, active customers, open complaints, pipeline stages, recommendations, hot leads |
| **Customer** | `GET /api/customers`, `POST /api/customers`, `PUT /api/customers/:id_str`, `DELETE /api/customers/:id_str` (via generic CRUD) | Account, industry, tier, ARR tracking, contacts, documents |
| **Lead** | `GET /api/leads`, `POST /api/leads`, etc. (via generic CRUD) | Lead scoring, source tracking, status lifecycle (New→Qualified→Converted/Lost) |
| **Sales** | `GET /api/sales`, `POST /api/quotations`, `POST /api/sales-orders`, etc. | Requirements, quotations, sales orders with status lifecycle |
| **Interaction** | `GET /api/enquiries`, `POST /api/site-visits`, etc. | Enquiries, site visits, follow-ups, tasks, communications, visit plans |
| **Service** | `GET /api/complaints`, `POST /api/feedback` | Complaint tracking, feedback scoring |
| **AI** | `GET /api/ai-assistant` | AI assistant query log |
| **Generic CRUD** | `GET /api/:entity_type/fields`, `POST /api/:entity_type`, `PUT /api/:entity_type/:id_str`, `DELETE /api/:entity_type/:id_str` | Dynamic CRUD for all entity types with auto-generated ID strings |

All endpoints require `Authorization: Bearer <jwt>` header and validate via shared JWT secret.

---

## 4. Shared Packages

### `packages/auth-middleware`

- **JWT Auth Client:** Shared `setAccessToken`/`getAccessToken`, auto-refresh on 401, typed `api.get/post/put/patch/delete`.
- **Shared Types:** `User`, `ApiError`, `ApiClientError` — consumed by all frontend apps.
- **Package Name:** `@datavex/auth-middleware`
- **Required Dependency:** All frontend apps must list `"@datavex/auth-middleware": "workspace:*"` in `package.json` dependencies. Each app's `types/api.ts` re-exports `ApiError`/`ApiClientError` from this package (not standalone definitions).

### `packages/ui-theme`

- **Tailwind CSS v4 Configuration:** `components.json` handles Shadcn CLI setups.
- **Imports & Resolution:** tsconfig maps `@/*` → `./src/*` inside the package.
- **Styles:** `src/globals.css` defines all theme tokens via CSS custom properties, mapped to Tailwind via `@theme inline`. Includes `kpi-enter` and `step-in` animations.
- **Exported components (11):** badge, button, card, dialog, input, label, progress, select, spinner, table, textarea.
- **Utility:** `cn()` via clsx + tailwind-merge.

---

## 5. Development Workflows & Scripts

All commands run from the repository root unless specified otherwise.

### Workspace Package Resolution
All Next.js frontends must configure `turbopack.root` in `next.config.ts` to resolve shared workspace packages (`@datavex/*`) when using Turbopack:
```ts
// next.config.ts
import path from "path";
const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(__dirname, "../..") },
};
```

### JWT Secret Consistency
All backend services share the same JWT secret (`JWT_SECRET`) to validate tokens issued by core-iam:
- **core-iam** (`.env`): `JWT_SECRET="development-jwt-secret-key-123"`
- **billing-service** (`.env`): `JWT_SECRET="development-jwt-secret-key-123"`
- **erp-service** (`config.py` default): `JWT_SECRET: str = "development-jwt-secret-key-123"`
- **inventory-service** (`config.py` default): `JWT_SECRET: str = "development-jwt-secret-key-123"`

> **IMPORTANT:** All four values must match. If core-iam issues tokens with a different secret than a backend service uses to verify, all requests will fail with 401 Unauthorized.

### Run Development Servers

| Command | Description |
|---------|-------------|
| `bun nx run-many --target=dev` | Run all services (frontends + backends) |
| `bun nx serve erp-shell` | Frontend shell only (port 3000) |
| `bun nx serve billing-ui` | Billing workstation only (port 3002) |
| `bun nx run crm-service:dev` | FastAPI CRM (port 8001) |
| `bun nx run core-iam:dev` | NestJS IAM (port 8002) |
| `bun nx run billing-service:dev` | NestJS billing (port 8003) |
| `bun nx run erp-service:dev` | FastAPI backend (port 8000) — uses custom `run.ps1` |
| `cd services/erp-service && .\run.ps1` | FastAPI backend alternative startup |

### Database Operations

#### FastAPI Business DB (`services/erp-service`)
```powershell
cd services/erp-service
$env:PYTHONPATH="."
.venv\Scripts\alembic upgrade head      # Apply migrations
.venv\Scripts\python scripts/reset_db.py # Drop all tables
.venv\Scripts\python scripts/seed.py     # Seed 241 rows of business data
```

#### NestJS IAM DB (`services/core-iam`)
```powershell
cd services/core-iam
bunx prisma db push    # Deploy schema to erp_iam
bunx prisma db seed    # Seed developer accounts + permissions
```

#### NestJS Billing DB (`services/billing-service`)
```powershell
cd services/billing-service
bunx prisma db push    # Deploy schema to erp_billing
bunx prisma generate   # Regenerate Prisma client
```

---

## 6. SSO Auth Flow (Cross-Workstation)

1. User visits a workstation URL (e.g. `http://localhost:3002/dashboard`).
2. No token found → browser redirects to `http://localhost:3000/login?redirect=http://localhost:3002/dashboard`.
3. User logs in on erp-shell → calls `POST /api/auth/login` → core-iam validates credentials, returns JWT.
4. erp-shell stores token in localStorage, then redirects to `http://localhost:3002/dashboard?token=<jwt>`.
5. billing-ui picks up `?token=` from URL, stores it, fetches `/api/auth/users/me` to verify, and renders authenticated content.
6. Subsequent API calls include `Authorization: Bearer <jwt>` header.
7. On 401, the api.ts service attempts `/api/auth/refresh` via HttpOnly cookie before failing.

---

## 7. Local Docker Sandbox & Orchestration

The application contains a production-optimized local Docker sandbox configured in `infrastructure/local/`.

### Docker Architecture Details:
- **Consistent Alpine Builders**: Node/Bun services compile natively on Alpine-based Node layers (`node:24-alpine`) with Bun copied inside, avoiding glibc vs musl runtime crashes.
- **Next.js Standalone Mode**: Configured to compile to minimal standalone node targets, reducing container image size by ~95% (~100MB instead of ~2GB).
- **Python Isolation & Auto-Migrations**: FastAPI backends run in virtualenvs (`/opt/venv`), run under non-root permissions, and perform Alembic db migrations (`alembic upgrade head`) automatically on startup.
- **Consolidated Healthchecks**: All containers run custom, lightweight healthchecks (via Node `http` or Python `urllib`) to track container status inside Compose.
- **Sequential Boot Sequence**: Standardized `depends_on: condition: service_healthy` triggers ensure Postgres starts first, followed by database migrations, services, frontends, and finally Nginx.

### Operational Commands:
* **Add local hosts subdomains**:
  * **Windows (Administrator PowerShell)**:
    ```powershell
    .\infrastructure\local\setup-hosts.ps1
    ```
  * **Linux / macOS (Sudo Bash)**:
    ```bash
    sudo ./infrastructure/local/setup-hosts.sh
    ```
* **Build / Rebuild the Docker Stack**:
  * **Windows**: `.\infrastructure\local\docker-build.ps1 rebuild`
  * **Linux / macOS**: `./infrastructure/local/docker-build.sh rebuild`
* **Start the Stack**:
  * **Windows**: `.\infrastructure\local\docker-build.ps1 start`
  * **Linux / macOS**: `./infrastructure/local/docker-build.sh start`
* **Seed Database Containers**:
  * **Windows**: `.\infrastructure\local\seed-docker.ps1`
  * **Linux / macOS**: `./infrastructure/local/seed-docker.sh`
* **View Container Status**:
  * **Windows**: `.\infrastructure\local\docker-build.ps1 ps`
  * **Linux / macOS**: `./infrastructure/local/docker-build.sh ps`
* **Stop the Stack**:
  * **Windows**: `.\infrastructure\local\docker-build.ps1 stop`
  * **Linux / macOS**: `./infrastructure/local/docker-build.sh stop`

---

## 8. Linked Documentation References

1. **[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md):** Step-by-step walkthrough on environment setup, local configurations, and active login accounts.
2. **[docs/PROJECT.md](docs/PROJECT.md):** SSO architecture, database allotment strategy, and Zero-Trust subdomains structure.
3. **[docs/FUTURE_PLAN.md](docs/FUTURE_PLAN.md):** Local sandboxing, VM deployment architectures (Caddy + RDS), and horizontal container scaling roadmaps.
4. **[apps/erp-shell/PROGRESS.md](apps/erp-shell/PROGRESS.md):** Status tracker for erp-shell frontend routes, pages, and design iterations.
