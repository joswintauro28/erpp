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
│   ├── inventory-service/                 # FastAPI (Python 3.13+, port 8004) — Product Catalog, Warehouses, Stock, Suppliers, POs, Serial Tracking
│   └── ai-service/                        # FastAPI (Python 3.13+, port 8005) — AI Chat, Session Management, LLM Integration
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

### 2.1 Executive Shell ([apps/erp-shell](apps/erp-shell/AGENTS.md)) — Port 3000

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
  - All other `/api/*` (products, warehouses, stock, suppliers, purchase-orders, purchase-requisitions, serial-numbers, quality-checks, fulfillment, work-orders, invoices, payments, CRM, dashboard) → `erp-service` FastAPI on port `8000` (stripping `/api` prefix) acting as the central API Gateway & Aggregator.
- **Imports & Path Aliases:** Shadcn primitives and `cn` utility from `@/components/ui/*` and `@/lib/utils`, mapped via tsconfig paths to `@datavex/ui-theme`.
- **Multi-Step Modals:** All forms use `components/multi-step-dialog.tsx` with horizontal step wizard.

### 2.2 CRM Workstation ([apps/crm-ui](apps/crm-ui/AGENTS.md)) — Port 3001

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

### 2.3 Billing Workstation ([apps/billing-ui](apps/billing-ui/AGENTS.md)) — Port 3002

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

### 2.4 Inventory Workstation ([apps/inventory-ui](apps/inventory-ui/AGENTS.md)) — Port 3004

**Tech Stack**
- Same as erp-shell: Next.js 16, TypeScript, Tailwind v4, lucide-react, recharts
- Shares `@datavex/ui-theme` package (same theme tokens and components)

**Architecture & Auth Pattern**
- **Token-verification only** — no login page, no credential handling.
- On mount, checks for `?token=<jwt>` in URL (passed from erp-shell after login), or tries `/api/auth/refresh` via cookie.
- If no token found, redirects to `http://localhost:3000/login?redirect=http://localhost:3004` (erp-shell login).
- `useAuth()` returns `{ user, isAuthenticated, loading, logout }` — no `login()` function.
- **Proxy** (`proxy.ts`): Routes `/api/auth/*` → core-iam (8002), all other `/api/*` → inventory-service (8004).

**Routes (12 total)**

| Route | API Endpoint | Description |
|-------|-------------|-------------|
| `/dashboard` | `GET /api/dashboard/inventory` | Aggregated KPIs (products, warehouses, stock, low stock, pending POs) |
| `/products` | `GET /api/products` | Product catalog with search, category badges |
| `/warehouses` | `GET /api/warehouses` | Warehouse locations with status |
| `/stock` | `GET /api/stock` | Stock levels per product/warehouse with availability |
| `/stock/movements` | `GET /api/stock/movements` | Movement log with type badges (in/out/adjustment) |
| `/suppliers` | `GET /api/suppliers` | Supplier list with contact info |
| `/purchase-orders` | `GET /api/purchase-orders` | Purchase order list with status badges |
| `/purchase-requisitions` | `GET /api/purchase-requisitions` | Purchase requisition buy requests with status badges |
| `/serial-numbers` | `GET /api/serial-numbers` | Serial tracking list with status filter |
| `/quality-checks` | `GET /api/quality-checks` | Quality inspection logs & status chips |
| `/fulfillment` | `GET /api/fulfillment/orders` | Sales order fulfillment pipeline Kanban |
| `/work-orders` | `GET /api/work-orders` | Manufacturing production run routing & issues |

**Sidebar:** Collapsible (260px/64px) with 4 groups: Dashboard (standalone), Inventory Management (Fulfillment, Products, Stock Levels, Stock Movements, Serial Numbers, Quality Checks), Procurement (Suppliers, Purchase Requisitions, Purchase Orders), Manufacturing (Work Orders), Locations (Warehouses).

---

## 3. Backend Project Contexts

DATAVEX ERP utilizes a decoupled backend architecture where each business domain has its own service and database.

### 3.1 Central IAM Service ([services/core-iam](services/core-iam/AGENTS.md)) — Port 8002

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

### 3.2 Billing Service ([services/billing-service](services/billing-service/AGENTS.md)) — Port 8003

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

### 3.3 Inventory Service ([services/inventory-service](services/inventory-service/AGENTS.md)) — Port 8004

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

### 3.4 FastAPI Business Backend ([services/erp-service](services/erp-service/AGENTS.md)) — Port 8000

- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`)
- **Migrations:** Alembic
- **Database Target:** `erp_db` (PostgreSQL)
- **Claims-Based Verification:** `decode_access_token` decodes JWT locally via shared `JWT_SECRET` + HS256 — no DB queries. `require_permission` dependency defined for RBAC enforcement. All endpoints use `get_current_token_payload` or `get_current_user_id` with `owner_id` scoping.
- **Request Logging:** `RequestLoggingMiddleware` adds unique `X-Request-ID` to every request/response, logs method, path, status code, duration (ms), and flags slow requests (>2s).
- **Standardized API Contracts:** `app/core/schemas.py` defines `PaginatedResponse`, `SuccessResponse`, `ErrorResponse`, `HealthResponse` for consistent API responses across all endpoints. Error responses include `success`, `error`, `detail`, and `request_id` fields.
- **Monolithic `/auth` endpoints decommissioned** — auth handled entirely by core-iam.
- **Inter-service Integration:** Dashboard and Notification modules forward the raw JWT to billing-service (port 8003) and inventory-service (port 8004) via `_raw_token` in the JWT payload.
- **Active Models (3):** Client, Lead, Product — all with `owner_id` data isolation.
- **Integration Clients:**
  - `billing_client.py` → `http://localhost:8003/api` (dashboard KPIs, invoices, payments)
  - `inventory_client.py` → `http://localhost:8004` (dashboard, products, warehouses)
   - `crm_client.py` → `http://localhost:8001/api` (dashboard, customers, leads)
- **RustFS Object Storage (`app/files/`):**
  - Presigned URL pattern — binary files never pass through backend servers
  - Client uploads/downloads directly to/from RustFS via presigned PUT/GET URLs
  - Centralized `file_records` table in `erp_db` — only erp-service has RustFS client
  - Per-domain buckets: `crm-assets`, `inv-docs`, `finance-records`, `erp-backups`
  - Endpoints: `POST /api/files/upload-request`, `POST /api/files/confirm-upload`, `GET /api/files/:id`, `GET /api/files/:id/download`, `DELETE /api/files/:id`, `GET /api/files?owner_type=&owner_id=`

---

### 3.5 CRM Service ([services/crm-service](services/crm-service/AGENTS.md)) — Port 8001

- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`)
- **Database Target:** `erp_crm` (PostgreSQL)
- **Claims-Based Verification:** JWT payload decoded from shared `JWT_SECRET` — no DB queries for auth. Uses `get_current_token_payload` / `get_current_user_id` dependencies.
- **Auth Pattern:** Token-verification only — no login endpoints, no credential handling. All authentication delegated to core-iam (port 8002).
- **Data Isolation:** All models use `owner_id` (Integer, indexed) scoped from JWT `user_id` claim — no local user/Admin model or password storage.

**Modules & Endpoints**

| Module | Endpoints | Key Features |
|--------|-----------|-------------|
| **Dashboard** | `GET /api/dashboard` | Aggregated KPIs: pipeline value, open opps, active customers, pipeline stages, recommendations, hot leads |
| **Customer** | `GET /api/customers`, `POST /api/customers`, `PUT /api/customers/:id_str`, `DELETE /api/customers/:id_str` (via generic CRUD) | Account, industry, tier, ARR, **credit limit** (enforced by the billing credit check on SO approval), status, contacts, documents |
| **Lead** | `GET /api/leads`, `POST /api/leads`, etc. (via generic CRUD) | Lead scoring, source tracking, status lifecycle (New→Qualified→Converted/Lost) |
| **Sales** | `GET /api/sales`, `POST /api/quotations`, `POST /api/sales-orders`, etc. | Requirements, quotations, sales orders with status lifecycle |
| **Interaction** *(planned — Service-Desk)* | — | Enquiries, site visits, follow-ups, tasks, communications, visit plans — **not in this service**; will ship as part of the future Service-Desk module |
| **Service** *(planned — Service-Desk)* | — | Complaint tracking, feedback scoring — **not in this service**; will ship as part of the future Service-Desk module |
| **AI** | `GET /api/ai-assistant` | AI assistant query log |
| **Generic CRUD** | `GET /api/:entity_type/fields`, `POST /api/:entity_type`, `PUT /api/:entity_type/:id_str`, `DELETE /api/:entity_type/:id_str` | Dynamic CRUD for all entity types with auto-generated ID strings |

All endpoints require `Authorization: Bearer <jwt>` header and validate via shared JWT secret.

---

### 3.6 AI Service ([services/ai-service](services/ai-service/AGENTS.md)) — Port 8005

- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`)
- **Migrations:** Alembic (own chain, independent deployment)
- **Database Target:** `erp_ai` (PostgreSQL)
- **Claims-Based Verification:** JWT payload decoded from shared `JWT_SECRET` — no DB queries for auth.
- **LLM Provider:** Pluggable — Groq (`httpx` REST calls, default) or Gemini (`google-genai` SDK)
- **Streaming:** Server-Sent Events (SSE) for real-time chat responses

**Models (3):** AISession (UUID, user_id, module enum, title), AIMessage (role, content, token_count), AIAuditLog (action, details). All models use `user_id` for data isolation.

**Modules & Endpoints**

| Module | Endpoints | Key Features |
|--------|-----------|-------------|
| **Chat** | `POST /api/ai/chat` | Send message, receive SSE-streamed response with context |
| **Sessions** | `GET /api/ai/sessions`, `DELETE /api/ai/sessions/:id` | Session management with module-aware context |
| **History** | `GET /api/ai/history/:id` | Session message history |
| **Suggestions** | `GET /api/ai/suggestions` | Module-aware prompt suggestions |
| **Health** | `GET /api/ai/health` | LLM provider health check |
| **Dashboard** | `GET /api/ai/dashboard` | Usage analytics and audit logs |

**Context Providers (call other services for live data):**
- `crm_client.py` → `http://crm-service:8001/api` (customers, leads)
- `billing_client.py` → `http://billing-service:8003/api` (invoices, payments)
- `inventory_client.py` → `http://inventory-service:8004/api` (stock, purchase orders)

**Frontend Integration:** All 4 frontend apps route `/api/ai/*` → ai-service (port 8005) via their `proxy.ts`. Shared `<AIChat>` component in `@datavex/ui-theme`.

**Required Environment Variables:**
```bash
AI_PROVIDER=groq              # "groq" or "gemini"
GROQ_API_KEY=gsk_xxxxx        # Required if AI_PROVIDER=groq
GEMINI_API_KEY=xxxxx          # Required if AI_PROVIDER=gemini
```

---

## 4. Shared Packages

### `packages/auth-middleware` ([AGENTS.md](packages/auth-middleware/AGENTS.md))

- **JWT Auth Client:** Shared `setAccessToken`/`getAccessToken`, auto-refresh on 401, typed `api.get/post/put/patch/delete`.
- **Shared Types:** `User`, `ApiError`, `ApiClientError` — consumed by all frontend apps.
- **Package Name:** `@datavex/auth-middleware`
- **Required Dependency:** All frontend apps must list `"@datavex/auth-middleware": "workspace:*"` in `package.json` dependencies. Each app's `types/api.ts` re-exports `ApiError`/`ApiClientError` from this package (not standalone definitions).

### `packages/ui-theme` ([AGENTS.md](packages/ui-theme/AGENTS.md))

- **Tailwind CSS v4 Configuration:** `components.json` handles Shadcn CLI setups.
- **Imports & Resolution:** tsconfig maps `@/*` → `./src/*` inside the package.
- **Styles:** `src/globals.css` defines all theme tokens via CSS custom properties, mapped to Tailwind via `@theme inline`. Includes `kpi-enter` and `step-in` animations.
- **Exported components (12):** badge, button, card, dialog, input, label, progress, select, spinner, table, textarea.
- **Shared components:** ai-chat, empty-state, page-header, search-input, section-heading, status-filter.
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
- **ai-service** (`config.py` default): `JWT_SECRET: str = "development-jwt-secret-key-123"`

> **IMPORTANT:** All five values must match. If core-iam issues tokens with a different secret than a backend service uses to verify, all requests will fail with 401 Unauthorized.

### Run Development Servers

> **⚠️ Known Issue:** `bun nx run-many --target=dev` starts **all 10 services in parallel** (4 Next.js + 6 backends), which can overwhelm system resources and cause Turbopack to hang ("Compiling / ..." forever). Use the selective commands below instead.

| Command | Description |
|---------|-------------|
| `npm run dev:core` | **Recommended** — erp-shell + all backends (no extra workstations) |
| `npm run dev:shell` | erp-shell frontend only (port 3000) |
| `npm run dev:backend` | All backend services only (no frontends) |
| `npm run dev` | Run all services (may cause compilation hangs) |
| `bun nx serve erp-shell` | Frontend shell only (port 3000) |
| `bun nx serve billing-ui` | Billing workstation only (port 3002) |
| `bun nx run crm-service:dev` | FastAPI CRM (port 8001) |
| `bun nx run core-iam:dev` | NestJS IAM (port 8002) |
| `bun nx run billing-service:dev` | NestJS billing (port 8003) |
| `bun nx run erp-service:dev` | FastAPI backend (port 8000) — uses custom `run.ps1` |
| `cd services/erp-service && .\run.ps1` | FastAPI backend alternative startup |
| `bun nx run ai-service:dev` | AI Service FastAPI (port 8005) |

### Database Operations

#### FastAPI Business DB (`services/erp-service`)
```powershell
cd services/erp-service
$env:PYTHONPATH="."
.venv\Scripts\alembic upgrade head      # Apply migrations
.venv\Scripts\python scripts/reset_db.py # Drop all tables
.venv\Scripts\python scripts/seed.py     # Seed 241 rows of business data
```

#### FastAPI AI DB (`services/ai-service`)
```powershell
cd services/ai-service
$env:PYTHONPATH="."
.venv\Scripts\alembic upgrade head      # Apply migrations
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

## 6. SSO Auth Flow & Session Persistence

1. User visits a workstation URL (e.g. `http://localhost:3002/dashboard`).
2. No active token found → browser redirects to `http://localhost:3000/login?redirect=http://localhost:3002/dashboard`.
3. User logs in on erp-shell → calls `POST /api/auth/login` → core-iam validates credentials, returns JWT access token, and sets HttpOnly refresh cookie (`refresh_token`).
4. erp-shell stores access token via `@datavex/auth-middleware` (in memory and `localStorage`), then redirects to `http://localhost:3002/dashboard?token=<jwt>`.
5. Target workstation (e.g., `billing-ui`, `crm-ui`, `inventory-ui`) picks up `?token=` on mount, stores it, cleans the URL bar (`window.history.replaceState`), and fetches `/api/auth/users/me` to verify user claims.
6. **Browser Reload (Ctrl+R) Protection:** On page refresh, `AuthProvider` checks active access tokens via `getAccessToken()` before attempting `/api/auth/refresh`. This prevents session lockouts across workstations and Incognito windows.
7. **Cookie Domain Scoping:** `COOKIE_DOMAIN=localhost` (local dev) and `COOKIE_DOMAIN=erp.local` (Docker Compose) ensure HttpOnly refresh cookies are scoped correctly across all workstation origins.
8. On 401 Unauthorized response, `api.ts` automatically calls `/api/auth/refresh` with credentials before retrying the original request or redirecting to login.

---

## 7. Interactive Swagger & OpenAPI Documentation

All FastAPI microservices expose interactive OpenAPI 3.0 documentation with built-in **`BearerAuth` JWT authorization** for testing:

| Service | Swagger UI | ReDoc | OpenAPI JSON |
|---------|------------|-------|--------------|
| **ERP Gateway Service** (`erp-service` — 8000) | `http://localhost:8000/docs` | `http://localhost:8000/redoc` | `http://localhost:8000/openapi.json` |
| **CRM Service** (`crm-service` — 8001) | `http://localhost:8001/docs` | `http://localhost:8001/redoc` | `http://localhost:8001/openapi.json` |
| **Inventory Service** (`inventory-service` — 8004) | `http://localhost:8004/docs` | `http://localhost:8004/redoc` | `http://localhost:8004/openapi.json` |
| **AI Service** (`ai-service` — 8005) | `http://localhost:8005/docs` | `http://localhost:8005/redoc` | `http://localhost:8005/openapi.json` |

> **Security Note:** `SecurityHeadersMiddleware` in `erp-service` automatically excludes `/docs`, `/redoc`, and `/openapi.json` from restrictive `Content-Security-Policy` headers to ensure Swagger CDN assets render smoothly.

---

## 7. Local Docker Sandbox & Orchestration

The application contains a production-optimized local Docker sandbox configured in `infrastructure/local/`.

### Docker Architecture Details:
- **Consistent Alpine Builders**: Node/Bun services compile natively on Alpine-based Node layers (`node:22-alpine`) with Bun copied inside, avoiding glibc vs musl runtime crashes.
- **Next.js Standalone Mode**: Configured to compile to minimal standalone node targets, reducing container image size by ~95% (~100MB instead of ~2GB).
- **Python Isolation & Auto-Migrations**: FastAPI backends run in virtualenvs (`/opt/venv`), run under non-root permissions, and perform Alembic db migrations (`alembic upgrade head`) automatically on startup.
- **RustFS Object Storage**: S3-compatible object storage for file uploads. `rustfs-init` container auto-creates buckets (`crm-assets`, `inv-docs`, `finance-records`, `erp-backups`) on first start. erp-service is the only service with RustFS client access.
- **Consolidated Healthchecks**: All containers run custom, lightweight healthchecks (via Node `http` or Python `urllib`) to track container status inside Compose.
- **AI Service Integration**: AI chat (SSE streaming) runs through ai-service with Groq/Gemini LLM providers. All 4 frontends proxy `/api/ai/*` to ai-service. Nginx configured with `proxy_buffering off` for streaming.
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
4. **[TODO.md](TODO.md):** AI chatbot implementation plan and progress tracker.
4. **[apps/erp-shell/PROGRESS.md](apps/erp-shell/PROGRESS.md):** Status tracker for erp-shell frontend routes, pages, and design iterations.
