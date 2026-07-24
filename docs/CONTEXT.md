# DATAVEX ERP — Workspace Context Directory

This document serves as an entrypoint map and index for developers and AI agents working on the DATAVEX ERP codebase. It aggregates documentation, flow models, database schemas, and architectural guidelines.

## 1. Core Architecture Overview
DATAVEX ERP is an **Nx Polyglot Monorepo** composed of:
- **4 Frontend Workstations:** Next.js 16 (Turbopack) communicating via cookies and shared tokens.
- **5 Backend Microservices:** Built with NestJS (TypeScript/Prisma) and FastAPI (Python/SQLAlchemy).
- **2 Shared Packages:** Shared authentication middleware and UI design theme tokens.

---

## 2. Directory Index & Documentation

### General Documentation
- **[AGENTS.md](../AGENTS.md):** Unified system context rules and instructions for AI pairing. Contains core styling parameters, proxy configurations, and development commands.
- **[docs/SETUP_GUIDE.md](SETUP_GUIDE.md):** Comprehensive setup manual for running local instances, migrations, seeds, and testing accounts.
- **[docs/PROJECT.md](PROJECT.md):** Detailed SSO design guidelines, wildcards configuration, and Postgres database allotment definitions.
- **[docs/FUTURE_PLAN.md](FUTURE_PLAN.md):** Outlines workstation sandboxing, production VM setups (Caddy / RDS), and horizontal Kubernetes scaling mappings.

### Flow & Design Blueprints
- **[docs/flow_blueprint_erp.png](flow_blueprint_erp.png):** Visual diagrams of auth loops and SSO handshake redirects.
- **[docs/technical_blueprint_erp.png](technical_blueprint_erp.png):** Visual service connection routes, ports mapping, and DB topologies.

---

## 3. Local AGENTS.md Map

For targeted development or debugging within specific subdirectories, review the localized contexts:

- **Workstations:**
  - [apps/erp-shell/AGENTS.md](../apps/erp-shell/AGENTS.md) — Shell, Admin Dashboard, Login & Redirect Router
  - [apps/crm-ui/AGENTS.md](../apps/crm-ui/AGENTS.md) — CRM Workstation & Sales pipeline
  - [apps/billing-ui/AGENTS.md](../apps/billing-ui/AGENTS.md) — Billing workstation & invoices lifecycle
  - [apps/inventory-ui/AGENTS.md](../apps/inventory-ui/AGENTS.md) — Product listings, Serial logs, PO approvals

- **Backend Services:**
  - [services/core-iam/AGENTS.md](../services/core-iam/AGENTS.md) — SSO Token issuer, Auth Hashing, RBAC
  - [services/billing-service/AGENTS.md](../services/billing-service/AGENTS.md) — Invoices, Credit Notes, Payments
  - [services/inventory-service/AGENTS.md](../services/inventory-service/AGENTS.md) — Warehouses, Products, Serial tracking
  - [services/crm-service/AGENTS.md](../services/crm-service/AGENTS.md) — Sales Pipelines & Generic Dynamic CRUD
  - [services/erp-service/AGENTS.md](../services/erp-service/AGENTS.md) — Gateway backend orchestrating inter-service metrics queries

- **Shared Packages:**
  - [packages/auth-middleware/AGENTS.md](../packages/auth-middleware/AGENTS.md) — Shared Token interceptors
  - [packages/ui-theme/AGENTS.md](../packages/ui-theme/AGENTS.md) — Unified design system, Tailwind v4 variables, and custom transitions

---

## 4. CRM Modules Comprehensive Technical Audit & Context

The DATAVEX CRM Workspace handles end-to-end customer relationship management, sales pipeline orchestration, automated lead discovery, quotation lifecycles, and AI-assisted sales analytics.

### 4.1 CRM Frontend Workstation (`apps/crm-ui`) — Port 3001

#### Tech Stack & Theme Architecture
- **Framework:** Next.js 16 (Turbopack bundler) with TypeScript, React Hooks (`useState`, `useEffect`, `useCallback`), Lucide React icons, and Recharts.
- **Design System:** Consumes `@datavex/ui-theme` package. Styled in **Refined Crimson & Brushed Gold** theme via CSS custom variables (`--sidebar`: `#3D1013`, `--shell-brand`: `#8C1D24`, `--shell-accent`: `#E5B83C`).
- **Dependencies:** Workspace package `"@datavex/auth-middleware": "workspace:*"` for API calls (`api.get`, `api.post`, `api.put`, `api.delete`).

#### Authentication & Proxy Gateway Architecture
- **Token Intake & Verification:** Operates on a token-verification model with no local credentials UI. On mount, checks for `?token=<jwt>` in the URL parameters, restores stored tokens via `getAccessToken()`, or verifies session cookies via `/api/auth/refresh`.
- **SSO Fallback & Page Reload Stability:** Unauthenticated users are redirected to `http://localhost:3000/login?redirect=http://localhost:3001`. On browser reload (**Ctrl + R**), token state is restored seamlessly via `@datavex/auth-middleware` without session lockouts.
- **Routing Proxy (`proxy.ts`):** Next.js middleware intercepting `/api/:path*`:
  - `/api/auth/*` → Routes to `core-iam` (port 8002) preserving `/api` prefix.
  - In `erp-shell`, `CRM_PATHS` whitelists CRM domain routes (including `reports`, `lead-discovery`, `ai-assistant`, `sales-orders`, `opportunities`, `requirements`) and routes them through `erp-service` (`port 8000`) to `crm-service` (`port 8001`).
  - In `crm-ui`, all non-auth `/api/*` requests route directly to `crm-service` (`port 8001`).
- **Interactive OpenAPI Documentation:** `crm-service` exposes Swagger UI (`http://localhost:8001/docs`), ReDoc (`http://localhost:8001/redoc`), and OpenAPI JSON schema with `BearerAuth` JWT authorization support.

#### Core UI Components & Shell Topology
- **`Sidebar.tsx`:** Collapsible sidebar (260px expanded / 64px collapsed) with grouped navigation:
  - **Overview:** Dashboard (`/dashboard`)
  - **Sales & Leads:** Leads (`/leads`), Lead Discovery (`/lead-discovery`), Opportunities (`/opportunities`), Requirements (`/requirements`), Quotations (`/quotations`), Sales Orders (`/sales-orders`)
  - **Customer Mgmt:** Customers (`/customers`), Contacts (`/contacts`), Documents (`/documents`)
  - **Analytics & AI:** Reports (`/reports`), AI Assistant (`/ai-assistant`)
- **`Header.tsx`:** Top navigation bar with global search, notification center, and user profile drawer.
- **`GenericCreateModal.tsx` (13 KB):** Dynamic schema-driven modal dialog:
  - Fetches field definitions on open from `/api/{entity_type}/fields`.
  - Automatically formats date inputs (`updated_at`, `date_raised`, `last_contact`).
  - Supports custom lead source input toggles ("Trade Show", "Website Inquiry", or custom text).
  - Handles multi-currency parsing (`INR` / `USD`) for deal values.
  - Manages both entity creation (`POST /api/{entity_type}`) and updating (`PUT /api/{entity_type}/{id_str}`).
- **`GenericDetailsModal.tsx` (46 KB):** Slide-over details drawer providing comprehensive entity views:
  - Displays full field properties, formatted status badges, and timeline histories.
  - Renders inline status transition buttons (e.g., Lead progression: New → Qualified → In Progress → Converted/Lost).
  - Integrates linked contacts, documents, and quick action controls.

#### Granular Route Breakdown (`app/(admin)/`)
1. **`/dashboard`:** Executive CRM command center rendering:
   - Aggregated KPI cards: Pipeline Value (formatted `$M`/`$K`), Open Opportunities count, and Active Customers count.
   - Interactive stage conversion funnel built with custom progress indicators and color tokens (`Leads`: `#6366f1`, `Opportunities`: `#0ea5e9`, `Sales Orders`: `#f59e0b`, `Sales Revenue`: `#10b981`).
   - Automated AI Recommendations and Hot Lead highlights.
2. **`/leads`:** Primary lead management workstation:
   - Summary Cards: Total Leads, Open Leads, Overdue/At Risk, and Active Sales Reps.
   - Controls: Search filter bar, CSV export utility (`exportToCSV`), manual refresh, and single-click navigation to AI Lead Discovery.
   - Table view with view/edit/delete handlers backed by `LeadTable` and `LeadDetailsModal`.
3. **`/lead-discovery`:** Autonomous B2B Prospecting Suite:
   - Search parameters: City, Industry, and Company Name inputs.
   - Website Crawler Input: Accepts target URLs (`/api/lead-discovery/scrape-url`) to extract raw HTML text and perform AI capabilities analysis.
   - Prospect Intelligence Card outputting: **AI Readiness Score (0-100)**, detected technology stack tags, operational pain points, custom AI solutions, key decision makers, and verified public contact info (Email, Phone, Address, LinkedIn).
   - Pinned Leads Registry: Stores target companies into database table `pinned_leads` with bulk import support (`POST /api/lead-discovery/import`).
4. **`/customers` & `/contacts`:** Account & Contact management:
   - Customer tiers (Platinum, Gold, Silver), status tracking (Active, Prospect, Dormant, Churned), ARR tracking, and industry classification.
   - Contact role tags: Primary, Decision Maker, Influencer, Inactive.
5. **`/opportunities`:** Interactive deal pipeline:
   - Stage progression: Discovery → Proposal → Negotiation → Won / Lost.
   - Tracks probability percentages, expected close dates, and value metrics.
6. **`/requirements`:** Client demand engineering:
   - Specifications, feature requests, priority levels, and technical feasibility tracking.
7. **`/quotations`:** Inter-service quote hub:
   - Connects through `crm-service` to `billing-service` (port 8003).
   - Manages quote generation, status lifecycle (Draft, Sent, Under Review, Expired), and **one-click Convert to Invoice** triggers.
8. **`/sales-orders`:** Executed sales registry:
   - Statuses: Pending, Confirmed, Invoiced, Paid, Cancelled.
   - Line items, total values, and order fulfillment states.
9. **`/documents`:** B2B Contract and Document repository:
   - Document types, statuses (Draft, Under Review, Signed, Expired), and attachment tracking.
10. **`/reports`:** Analytics hub displaying historical conversion metrics and sales performance.
11. **`/ai-assistant`:** Conversational Sales AI Interface:
    - Interactive chat UI communicating with `/api/ai-assistant/chat`.
    - Persists conversational message history and injects real-time CRM database counters into LLM prompts.

---

### 4.2 CRM Backend Microservice (`services/crm-service`) — Port 8001

#### Framework, Database & Environment Configuration
- **Framework:** FastAPI (Python 3.13+) with Uvicorn server.
- **Database Engine:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg` or SQLite fallback for development) targeting PostgreSQL database `erp_crm`.
- **Database Migrations:** Alembic configuration (`alembic.ini`).
- **Dependencies:** `fastapi`, `sqlalchemy`, `asyncpg`, `pydantic`, `requests`, `python-dotenv`, `alembic`.

#### Auth, RBAC & Data Isolation Model
- **Token Verification Dependency (`get_current_token_payload`):** Decodes JWT bearer tokens passed in `Authorization: Bearer <jwt>` headers using the shared secret (`JWT_SECRET`).
- **Multi-Tenant Data Scoping:** All queries filter against `owner_id` (Integer index) extracted from JWT claims (`user_id` or `sub`) to guarantee data isolation without a local user/password table.

#### Dynamic Entity Engine (`app/main.py`)
To avoid repetitive CRUD boilerplate, `main.py` registers a central dynamic entity mapper:
- **`ENTITY_MODEL_MAP`:** Maps route path strings to SQLAlchemy models:
  - `"customers"` → `models.Customer`
  - `"contacts"` → `models.Contact`
  - `"documents"` → `models.Document`
  - `"leads"` → `models.Lead`
  - `"opportunities"` → `models.Opportunity`
  - `"requirements"` → `models.Requirement`
  - `"sales-orders"` → `models.SalesOrder`
  - `"reports"` → `models.Report`
  - `"ai-assistant"` → `models.AIAssistantLog`
- **`PREFIX_MAP`:** Auto-generates human-readable string IDs:
  - `Customer` → `CU-1001`
  - `Contact` → `CO-1001`
  - `Document` → `DO-1001`
  - `Lead` → `LD-1001`
  - `Opportunity` → `OP-1001`
  - `Requirement` → `RE-1001`
  - `SalesOrder` → `SO-1001`
  - `Report` → `RP-1001`
  - `AIAssistantLog` → `AI-1001`

**Generic Endpoints in `main.py`:**
- `GET /api/{entity_type}/fields`: Inspects SQLAlchemy model attributes using `sqlalchemy.inspection.inspect` to build JSON form schema definitions. Automatically infers input types (`number`, `text`) and pre-populates select options (e.g., status enums, customer tiers, contact types).
- `POST /api/{entity_type}`: Calculates the next sequential ID integer, prepends the prefix (e.g., `LD-1042`), attaches `id_str`, and inserts the entity into `erp_crm`.
- `PUT /api/{entity_type}/{id_str}`: Queries record by `id_str` and updates matching model attributes.
- `DELETE /api/{entity_type}/{id_str}`: Deletes entity by `id_str`.

#### Feature Service Modules & Routers (`app/*/`)
1. **Dashboard Module (`app/dashboard/`):**
   - Router: `GET /api/dashboard`
   - Queries `models.Lead` (open status), `models.Opportunity` (open stages), `models.SalesOrder` (open statuses), and calculates total aggregated **Pipeline Value**.
   - Formats currency strings (`$1.25M`, `$450K`).
   - Counts active customers (`status == 'Active'`).
   - Returns metrics array, color-coded stage values, and AI recommendations (`crud.get_recommendations`).
2. **Lead Discovery & Scraping Suite (`app/lead_discovery/`):**
   - **`scraper.py`:** Includes `discover_and_qualify_companies`, `fetch_webpage_text`, and `LLM_CLIENT` (Groq/Gemini JSON generator).
   - `POST /api/lead-discovery/search`: Discovers B2B companies based on city/industry, filtering out directories, event portals, and listicles.
   - `POST /api/lead-discovery/scrape-url`: Crawls raw HTML text from a target website URL (up to 8,000 characters), sends structured prompt to LLM, and returns company overview, AI readiness score, tech stack, pain points, recommended solutions, decision makers, and public contacts. Includes graceful fallback when API quotas are exhausted.
   - `POST /api/lead-discovery/import`: Creates new `models.Lead` records and pins companies in `models.PinnedLead`.
   - `GET / POST / DELETE /api/lead-discovery/pinned`: Full CRUD management for pinned prospect records.
3. **AI Assistant Service (`app/ai_assistant/`):**
   - Router: `POST /api/ai-assistant/chat`
   - Integrates with Groq API endpoint (`https://api.groq.com/openai/v1/chat/completions`) using model `llama-3.1-8b-instant` (configurable via `GROQ_MODEL`).
   - Dynamically executes live database count queries (`Active Customers`, `Open Opportunities`, `Total Sales`) and injects these real-time stats directly into the system prompt context.
4. **Quotations Inter-Service Client (`app/quotations/` & `app/core/billing_client.py`):**
   - Router: `GET/POST/PUT/DELETE /api/quotations` and `POST /api/quotations/{id}/convert`
   - Proxies requests across microservice boundaries to `billing-service` (port 8003) via `billing_client.py`.
   - Extracts `_raw_token` from JWT claims and forwards `Authorization: Bearer <token>` to perform quotation operations and trigger convert-to-invoice functions.
5. **Domain CRUD Routers (`leads`, `customers`, `contacts`, `opportunities`, `requirements`, `sales_orders`, `documents`, `reports`):**
   - Each module contains specific `router.py`, `schemas.py`, `crud.py`, and `models.py`.
   - Feature endpoints return dedicated summary metadata objects alongside entity lists (e.g., `GET /api/leads` returns summary metrics `{total_leads, open, overdue_at_risk, owners}` along with `leads` list).

---

## 5. Billing Modules Comprehensive Technical Audit & Context

The DATAVEX Billing Workspace manages invoicing, GST compliance, quotation lifecycle, payment processing, recurring schedules, accounts receivable/payable, double-entry ledger bookkeeping, and financial reporting.

### 5.1 Billing Frontend Workstation (`apps/billing-ui`) — Port 3002

#### Tech Stack & Styling Guidelines
- **Framework:** Next.js 16 (Turbopack bundler) with TypeScript, React Hooks (`useState`, `useEffect`, `useCallback`), Lucide React icons, and Recharts.
- **Design System:** Consumes `@datavex/ui-theme` package. Styled in **Refined Crimson & Brushed Gold** theme via CSS custom variables (`--sidebar`: `#3D1013`, `--shell-brand`: `#8C1D24`, `--shell-accent`: `#E5B83C`).
- **Dependencies:** Workspace package `"@datavex/auth-middleware": "workspace:*"` for API calls (`api.get`, `api.post`, `api.put`, `api.delete`).

#### Authentication & Proxy Gateway Architecture
- **Token Intake & Verification:** Operates on a token-verification model with no local credentials UI. On mount, checks for `?token=<jwt>` in URL parameters or verifies session cookies via `/api/auth/refresh`.
- **SSO Fallback:** Unauthenticated sessions redirect to `http://localhost:3000/login?redirect=http://localhost:3002`.
- **Routing Proxy (`proxy.ts`):** Next.js middleware intercepting `/api/:path*`:
  - `/api/auth/*` → Routes to `core-iam` (port 8002) preserving `/api` prefix.
  - All other `/api/*` → Routes to `billing-service` (port 8003).

#### Shell & Component Topology
- **`Sidebar.tsx`:** Collapsible sidebar (260px expanded / 64px collapsed) with grouped navigation:
  - **Overview:** Dashboard (`/dashboard`)
  - **Billing:** Invoices (`/billing/invoices`), Quotations (`/billing/quotations`), Payments (`/billing/payments`), Credit Notes (`/billing/credit-notes`), Debit Notes (`/billing/debit-notes`), Recurring (`/billing/recurring-invoices`)
  - **Accounting:** Accounts (`/accounting/accounts`), Expenses (`/accounting/expenses`), Ledger (`/accounting/ledger`), Reports (`/accounting/reports`)
- **`Header.tsx`:** Top navigation bar with global search, notification center, and user profile drawer.
- **`quotation-form.tsx` (16 KB):** Dedicated line-item quotation builder component supporting real-time GST calculation, item additions/removals, discount controls, and client selection.

#### Granular Route Breakdown (`app/(admin)/`)
1. **`/dashboard`:** Executive financial command center rendering:
   - Aggregated KPI cards: Total Revenue, Outstanding Balance, Overdue Amount, Accounts Receivable (AR), Accounts Payable (AP), and Payment Metrics.
   - 12-month Revenue Trend chart built with Recharts.
   - Recent Invoices activity log and summary breakdown.
2. **`/billing/invoices`:** Main invoicing workstation:
   - Summary Cards: GST breakdown (CGST, SGST, IGST totals), Total Receivables, Total Payables, and Overdue totals.
   - Filter controls: Type filter (`receivable` / `payable`), Status filter (`draft`, `sent`, `partially_paid`, `paid`, `overdue`, `void`), and Search bar.
   - Actions: Create Invoice modal, export capabilities, and status transition controls.
3. **`/billing/invoices/[id]`:** Detailed invoice inspector:
   - Renders itemized product table (Quantity, Unit Price, GST Rate %, Line Amount).
   - Displays GST breakdown (Intrastate CGST+SGST vs Interstate IGST) based on place of supply.
   - Shows payment history log (Paid Amount vs Balance Due).
   - Actions: Print / Download PDF, Record Payment modal, and Void trigger.
4. **`/billing/quotations`:** B2B Quotation management:
   - Quote status lifecycle (`draft`, `sent`, `accepted`, `rejected`, `expired`).
   - Quote creation drawer using `quotation-form.tsx`.
   - **One-click Convert to Invoice** action button (`POST /api/invoices/quotations/:id/convert`).
5. **`/billing/payments`:** Payment registry & processing workstation:
   - Payment metrics: Daily/Monthly totals, Refund totals, Failed payments count.
   - Supported payment methods: Bank Transfer, UPI, Credit Card, Cheque, Cash.
   - Actions: Record New Payment modal, Issue Refund trigger (`POST /api/payments/:id/refund`), and Bank Reference ID tracking.
6. **`/billing/credit-notes` & `/billing/debit-notes`:** Adjustment notes management:
   - Credit Notes: Reduces invoice total/balance due for returns, billing errors, or discounts.
   - Debit Notes: Increases invoice total/balance due for additional charges or price adjustments.
   - Statuses: Draft, Issued.
7. **`/billing/recurring-invoices`:** Automated subscription & retainer schedules:
   - Template scheduling with frequency options (`weekly`, `monthly`, `quarterly`, `yearly`).
   - Next run date tracking, end date configurations, last generated timestamps, and auto-email toggles.
8. **`/accounting/accounts`:** Chart of Accounts (COA) management:
   - Financial account categories: Asset, Liability, Equity, Revenue, Expense.
   - Code structure, active statuses, and account balance monitoring.
9. **`/accounting/expenses`:** Expense tracking registry:
   - Expense categorization, payment method tags, account mapping, and reference tracking.
10. **`/accounting/ledger`:** General Ledger entries:
    - Double-entry bookkeeping log recording Debit and Credit entries with timestamp references.
11. **`/accounting/reports`:** Financial Statements:
    - Profit & Loss (P&L), Balance Sheet, Trial Balance, and Tax Summary reports.

---

### 5.2 Billing Backend Microservice (`services/billing-service`) — Port 8003

#### Framework & Infrastructure Stack
- **Framework:** NestJS 11 (Node.js runtime).
- **Database ORM:** Prisma Client targeting PostgreSQL database `erp_billing`.
- **Global Interceptor (`SnakeCaseInterceptor`):** Automatically converts camelCase TypeScript response objects into snake_case JSON output for client compatibility.
- **Port:** 8003.

#### Security & Auth Architecture (`src/auth/`)
- **`AuthGuard`:** Intercepts `Authorization: Bearer <jwt>` headers and decodes token claims using shared `JWT_SECRET` (no DB query per request).
- **`PermissionsGuard` & `@Permissions(...codes)`:** Enforces granular RBAC authorization (e.g., `invoices.view`, `invoices.create`, `invoices.edit`, `invoices.delete`, `payments.create`, `payments.refund`).
- **Data Isolation:** All queries filter using `organizationId` extracted from the JWT payload.

#### Database Schema Architecture (`prisma/schema.prisma` — 14 Models & 9 Enums)
- **Enums:** `InvoiceStatus` (`draft`, `sent`, `partially_paid`, `paid`, `overdue`, `void`), `InvoiceType` (`receivable`, `payable`), `GstTreatment` (`intrastate`, `interstate`), `PaymentMethod` (`Bank_Transfer`, `UPI`, `Credit_Card`, `Cheque`, `Cash`), `PaymentStatus` (`pending`, `cleared`, `completed`, `failed`, `refunded`), `NoteStatus` (`draft`, `issued`), `QuotationStatus` (`draft`, `sent`, `accepted`, `rejected`, `expired`), `RecurringFrequency` (`weekly`, `monthly`, `quarterly`, `yearly`), `RecurringStatus` (`active`, `paused`, `completed`), `AccountType` (`Asset`, `Liability`, `Equity`, `Revenue`, `Expense`).
- **Models:**
  - `Invoice` & `InvoiceItem`: Auto-calculates `subtotal`, `discount`, `cgst`, `sgst`, `igst`, `taxTotal`, `total`, `paidAmount`, and `balanceDue`. Supports dispatch creation (`from-dispatch`).
  - `Payment`: Records transaction amount, payment method, date, reference ID, and status. Auto-updates linked `Invoice`'s `paidAmount`, `balanceDue`, and `status`.
  - `CreditNote` & `DebitNote`: Linked to parent `Invoice`, auto-adjusts balance due upon issuance.
  - `Quotation` & `QuotationItem`: Unique `quoteNumber`, validity period, and `convertedInvoiceId` link.
  - `RecurringInvoice`: Template scheduling storing line items in a `Json` column with next run execution dates.
  - `Account`, `Expense`, `LedgerEntry`: Double-entry accounting system with COA mapping and Debit/Credit balances.
  - `BankTransaction` & `ReconciliationReport`: Bank statement import matching transactions to recorded payments.
  - `FiscalPeriod`: Financial month-end close and period locking (`isClosed`, `closedAt`, `closedBy`).
  - `DunningRecord`: Payment overdue escalation records tracking dunning levels (Level 1, 2, 3) and overdue days.

#### Feature Modules Architecture (`src/*/`)
1. **`invoices` (`InvoicesController` & `InvoicesService`):**
   - Endpoints: `GET /invoices`, `GET /invoices/:id`, `POST /invoices`, `POST /invoices/from-dispatch`, `PUT /invoices/:id/status`, `DELETE /invoices/:id`.
   - Business Logic: Calculates CGST/SGST (intrastate, split 50/50) vs IGST (interstate, full rate) based on `gstTreatment` and `placeOfSupply`. `createFromDispatch` generates invoices directly from warehouse shipment logs.
2. **`payments` (`PaymentsController` & `PaymentsService`):**
   - Endpoints: `GET /payments`, `POST /payments`, `POST /payments/:id/refund`, `GET /payments/metrics`.
   - Business Logic: Intercepts new payments, updates the associated `Invoice` balance, sets status to `partially_paid` or `paid`. Handles refund reversals (`POST /payments/:id/refund`) by reducing `paidAmount` and restoring `balanceDue`.
3. **`quotations` (`QuotationsController` & `QuotationsService`):**
   - Endpoints: `GET /invoices/quotations`, `GET /invoices/quotations/:id`, `POST /invoices/quotations`, `PUT /invoices/quotations/:id`, `PUT /invoices/quotations/:id/status`, `DELETE /invoices/quotations/:id`, `POST /invoices/quotations/:id/convert`.
   - Business Logic: Generates unique quote numbers (`QT-1001`), manages status lifecycle, and `convert` transforms quotes directly into new `Invoice` records.
4. **`dashboard` (`DashboardController` & `DashboardService`):**
   - Endpoint: `GET /dashboard/billing`
   - Business Logic: Executes parallel queries via `Promise.all` returning: `totalRevenue`, `outstanding`, `overdue`, `totalAR`, `totalAP`, `paymentMetrics`, `summary`, `recentInvoices`, and `revenueTrend` (12-month history).
5. **Advanced Modules (`accounting`, `bank-reconciliation`, `dunning`, `month-end-close`):**
   - Provides enterprise financial capabilities including bank statement matching, fiscal period closures, and overdue payment dunning notifications.

---

## 6. Inventory Modules Comprehensive Technical Audit & Context

The DATAVEX Inventory Workspace manages multi-warehouse stock tracking, product cataloging, procurement purchase orders, batch/serial tracking, stock movements, and supplier registries.

### 6.1 Inventory Frontend Workstation (`apps/inventory-ui`) — Port 3004

#### Tech Stack & Theme Guidelines
- **Framework:** Next.js 16 (Turbopack bundler) with TypeScript, React Hooks (`useState`, `useEffect`, `useCallback`), Lucide React icons, and Recharts.
- **Design System:** Consumes `@datavex/ui-theme` package. Styled in **Refined Crimson & Brushed Gold** theme via CSS custom variables (`--sidebar`: `#3D1013`, `--shell-brand`: `#8C1D24`, `--shell-accent`: `#E5B83C`).
- **Dependencies:** Workspace package `"@datavex/auth-middleware": "workspace:*"` for API requests (`api.get`, `api.post`, `api.put`, `api.delete`).

#### Authentication & Proxy Gateway Architecture
- **Token Intake & Verification:** Uses token verification with no local login forms. Verifies `?token=<jwt>` in URL params or attempts `/api/auth/refresh` via HttpOnly cookies.
- **SSO Fallback:** Unauthenticated sessions redirect to `http://localhost:3000/login?redirect=http://localhost:3004`.
- **Routing Proxy (`proxy.ts`):** Next.js middleware intercepting `/api/:path*`:
  - `/api/auth/*` → Routes to `core-iam` (port 8002) preserving `/api` prefix.
  - All other `/api/*` → Routes to `inventory-service` (port 8004) stripping the `/api` prefix.

#### Navigation Shell Topology (`Sidebar.tsx`)
- **Collapsible Sidebar (260px / 64px):**
  - **Overview:** Dashboard (`/dashboard`)
  - **Inventory Management:** Products (`/inventory/products`), Stock Levels (`/inventory/stock`), Stock Movements (`/inventory/stock/movements`), Serial Numbers (`/inventory/serial-numbers`)
  - **Procurement:** Suppliers (`/inventory/suppliers`), Purchase Orders (`/inventory/purchase-orders`)
  - **Locations:** Warehouses (`/inventory/warehouses`)
- **`Header.tsx`:** Global bar with quick search, inventory notifications, and user session menu.

#### Granular Route Breakdown (`app/(admin)/`)
1. **`/dashboard`:** Real-time Inventory Command Center rendering:
   - Aggregated KPIs: Total Products, Total Warehouses, Total Stock Quantity, Low Stock Alerts count, Pending Purchase Orders count.
   - Low Stock Alert Table highlighting items below `low_stock_threshold`.
   - Warehouse Stock Breakdown charts & Recent Movements feed.
2. **`/inventory/products`:** Product Catalog Workstation:
   - SKU, Barcode, Category tags, Units of Measure (`pcs`, `kg`, `boxes`, etc.), Cost Price, Selling Price, Tax Rate %, Costing Method (`FIFO`, `LIFO`, `Weighted Average`).
   - Feature flags: Inventory Tracking toggle, Batch Tracking toggle, Serial Number Tracking toggle.
   - Action controls: Create Product modal, Edit catalog details, filter by category.
3. **`/inventory/warehouses`:** Multi-Warehouse Location Management:
   - Code (e.g., `WH-MAIN`, `WH-EAST`), Name, Street Address, City, State, Country, Postal Code, and Active Status.
   - Per-location stock summaries and capacity tracking.
4. **`/inventory/stock`:** Real-Time Stock Levels:
   - Combined matrix view per Product × Warehouse combination: Total Quantity, Reserved Quantity, Available Quantity.
   - Single-click **Stock Adjustment Modal** allowing manual quantity adjustments with reason notes.
5. **`/inventory/stock/movements`:** Audit Log & Movement History:
   - Tracks stock movement types: `IN` (Receiving/Procurement), `OUT` (Dispatch/Sales), `ADJUSTMENT` (Audit reconciliation).
   - Records reference IDs (e.g., linked Purchase Order ID, Sales Order ID), timestamp, and notes.
6. **`/inventory/suppliers`:** Vendor & Procurement Registry:
   - Supplier Code (e.g., `SUP-1001`), Contact Person, Email, Phone, Tax Identification / GST number, Payment Terms (e.g., `Net 30`, `Net 60`, `Immediate`).
7. **`/inventory/purchase-orders`:** Procurement Lifecycle Engine:
   - Status progression: `DRAFT` → `ORDERED` → `RECEIVED` → `CANCELLED`.
   - Line items table (Product selection, Quantity ordered, Unit cost, Total cost auto-calculation).
   - Receiving workflow: Triggers stock increment (`IN`) upon receiving purchase orders.
8. **`/inventory/serial-numbers`:** Item-level Serial Tracking:
   - Individual serial number tracking tied to Product ID and Warehouse ID.
   - Serial statuses: `IN_STOCK`, `DISPATCHED`, `RETURNED`, `DAMAGED`.

---

### 6.2 Inventory Backend Microservice (`services/inventory-service`) — Port 8004

#### Framework & Infrastructure Stack
- **Framework:** FastAPI (Python 3.13+) with Uvicorn server.
- **Database Engine:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`) targeting PostgreSQL database `erp_inventory`.
- **Database Migrations:** Alembic setup (`alembic.ini`).
- **Port:** 8004.

#### Security & Tenant Scoping Architecture (`app/core/`)
- **Claims-Based Auth (`get_current_org_id` / `get_current_user`):** Decodes JWT tokens passed via `Authorization: Bearer <jwt>` using the shared secret (`JWT_SECRET`).
- **Data Isolation:** All database models enforce `organization_id` indexing and parameter filtering on every session query.

#### Database Models Architecture (`app/*/models.py` — 7 Models)
1. **`Product` (`app/product/models.py`):** `id`, `organization_id`, `name`, `sku` (unique), `barcode`, `category`, `unit`, `price`, `cost_price`, `tax_rate`, `track_inventory`, `low_stock_threshold`, `uses_batch_tracking`, `uses_serial_tracking`, `costing_method`, `is_active`.
2. **`Warehouse` (`app/warehouse/models.py`):** `id`, `organization_id`, `name`, `code` (unique per org), `address`, `city`, `state`, `country`, `postal_code`, `is_active`.
3. **`Stock` (`app/stock/models.py`):** `id`, `organization_id`, `product_id`, `warehouse_id`, `quantity`, `reserved_quantity`, `available_quantity` (`quantity - reserved_quantity`).
4. **`StockMovement` (`app/stock/models.py`):** `id`, `organization_id`, `product_id`, `warehouse_id`, `movement_type` (`IN`/`OUT`/`ADJUSTMENT`), `quantity`, `reference_type`, `reference_id`, `notes`, `created_at`.
5. **`Supplier` (`app/supplier/models.py`):** `id`, `organization_id`, `name`, `code`, `contact_person`, `email`, `phone`, `address`, `tax_id`, `payment_terms`.
6. **`PurchaseOrder` & `PurchaseOrderItem` (`app/purchase_order/models.py`):** `id`, `organization_id`, `order_number`, `supplier_id`, `status` (`DRAFT`, `ORDERED`, `RECEIVED`, `CANCELLED`), `total_amount`, `expected_date`.
7. **`SerialNumber` (`app/serial_number/models.py`):** `id`, `organization_id`, `serial_number` (unique), `product_id`, `warehouse_id`, `status` (`IN_STOCK`, `DISPATCHED`, `RETURNED`, `DAMAGED`).

#### Feature Routers & Services Architecture (`app/*/`)
1. **`dashboard/` (`router.py` & `services.py`):**
   - Endpoints: `GET /dashboard/inventory`, `GET /dashboard/inventory/low-stock`, `GET /dashboard/inventory/movements`, `GET /dashboard/inventory/warehouses`.
   - Aggregates KPIs: total product count, warehouse count, sum of total stock, count of products below `low_stock_threshold`, pending PO count.
2. **`product/` (`router.py`, `services.py`, `schemas.py`):**
   - Endpoints: `GET /products`, `GET /products/:id`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`.
   - Manages catalog entries, SKU generation, pricing rules, and tracking mode flags.
3. **`warehouse/` (`router.py`, `services.py`):**
   - Endpoints: `GET /warehouses`, `GET /warehouses/:id`, `POST /warehouses`, `PUT /warehouses/:id`, `DELETE /warehouses/:id`.
   - Controls physical location definitions.
4. **`stock/` (`router.py`, `services.py`):**
   - Endpoints: `GET /stock`, `PUT /stock/adjust`, `GET /stock/movements`, `POST /stock/movements`.
   - `PUT /stock/adjust` updates stock quantities and automatically inserts a `StockMovement` audit record.
5. **`supplier/` (`router.py`, `services.py`):**
   - Endpoints: `GET /suppliers`, `GET /suppliers/:id`, `POST /suppliers`, `PUT /suppliers/:id`, `DELETE /suppliers/:id`.
   - Vendor registry management.
6. **`purchase_order/` (`router.py`, `services.py`):**
   - Endpoints: `GET /purchase-orders`, `GET /purchase-orders/:id`, `POST /purchase-orders`, `PUT /purchase-orders/:id/status`, `DELETE /purchase-orders/:id`.
   - Updating status to `RECEIVED` automatically triggers stock increments (`IN`) in the target warehouse.
7. **`serial_number/` (`router.py`, `services.py`):**
   - Endpoints: `GET /serial-numbers`, `GET /serial-numbers/:id`, `POST /serial-numbers`, `PUT /serial-numbers/:id`, `DELETE /serial-numbers/:id`.
   - Item-level serial tracking with status updates upon dispatch or return.

---

## 7. Central IAM Service Comprehensive Technical Audit & Context (`services/core-iam`) — Port 8002

### Architecture & Stack Parameters
- **Framework:** NestJS 11 (TypeScript runtime).
- **Database ORM:** Prisma Client generated locally to `@prisma/client-iam` (`output = "../node_modules/@prisma/client-iam"`) to prevent collision with other NestJS Prisma instances.
- **Database Target:** `erp_iam` (PostgreSQL).
- **Password Hashing:** `bcryptjs` with salt rounds.
- **Token Strategy:** Signed JWT Access Tokens (HS256 algorithm with `JWT_SECRET`) containing claims: `sub` (User ID), `email`, `role`, `permissions[]`, `organization_id`, `organization_name`. Secured refresh session cookies via `RefreshToken` database model.

### Database Models Architecture (`prisma/schema.prisma` — 13 Models)
1. **`User`:** `id`, `email` (unique), `passwordHash`, `fullName`, `isActive`, `lastLogin`, `failedLoginAttempts`, `lockedUntil`, `passwordChangedAt`.
2. **`Organization`:** `id`, `name`, `ownerId` (references `User`).
3. **`OrganizationMember`:** `id`, `organizationId`, `userId`, `roleId`, `status`.
4. **`Role`:** `id`, `name` (unique), `description`, `isSystemRole`.
5. **`Permission`:** `id`, `code` (unique, e.g., `invoices.view`, `invoices.create`, `inventory.edit`), `name`, `module`.
6. **`RolePermission`:** Join table mapping `Role` to `Permission`.
7. **`RefreshToken`:** `id`, `userId`, `tokenHash` (unique), `expiresAt`, `revoked`, `userAgent`, `ipAddress`.
8. **`Invitation`:** Organization member invitation links (`token`, `email`, `roleId`, `status`).
9. **`BrandingSetting`:** Custom organization logos (`logoUrl`), primary color (`primaryColor`), accent color (`accentColor`), custom invoice footers, and payment terms.
10. **`CompanySetting`:** Corporate identity metadata (GST number, legal address, company email, phone, industry).
11. **`NotificationSetting`:** Preferences for invoice notifications, payment reminders, low stock alerts, and weekly reports.
12. **`WorkflowSetting`:** Automation toggles for upcoming invoice reminders, overdue payment escalation notices, and inventory alert workflows.

### Default Developer Seed Accounts (`prisma/seed.ts`)
| User Full Name | Seed Email | Seed Password | Role Assignment |
|---|---|---|---|
| Alex Chen | `admin@datavex.com` | `Admin@123!` | Organization Owner |
| Maya Patel | `sales@datavex.com` | `Sales@123!` | Sales Executive |
| Jordan Kim | `accounts@datavex.com` | `Acc@123!` | Accountant |
| Sam Rivera | `inventory@datavex.com` | `Inv@123!` | Inventory Manager |
| Priya Sharma | `auditor@datavex.com` | `Aud@123!` | Auditor |

---

## 8. Central Shared Packages Comprehensive Technical Audit & Context

### 8.1 Auth Middleware Package (`packages/auth-middleware`) — `@datavex/auth-middleware`

#### Tech Stack & Responsibilities
- **Type:** Shared TypeScript package (`workspace:*`).
- **Target:** Exported client library consumed by all Next.js workstations (`erp-shell`, `crm-ui`, `billing-ui`, `inventory-ui`).
- **Core Files (`src/`):**
  - `api.ts`: Central HTTP client configured with Axios/Fetch interceptors. Handles `setAccessToken` and `getAccessToken` in-memory. Intercepts `401 Unauthorized` responses to perform transparent `/api/auth/refresh` token refreshes via HttpOnly cookies.
  - `types.ts`: Universal interfaces: `User` (`id`, `email`, `full_name`, `role`, `organization_name`, `permissions`), `ApiError`, `ApiClientError`.
  - `index.ts`: Public package re-exports (`api`, `setAccessToken`, `getAccessToken`, `User`, `ApiError`, `ApiClientError`).

### 8.2 UI Theme Package (`packages/ui-theme`) — `@datavex/ui-theme`

#### Design Tokens & Style Architecture (`src/globals.css`)
- **Theme Name:** **Refined Crimson & Brushed Gold**
- **CSS Variables & Semantic Usage:**
  - `--sidebar` / `--shell-header`: `#3D1013` (Deep Maroon chassis)
  - `--shell-brand`: `#8C1D24` (Crimson Red for action buttons, active tabs, brand accents)
  - `--shell-accent`: `#E5B83C` (Milled Brass / Gold for badges, status indicators, subtle borders)
  - `--radius-sm`: `4px` (Button & input corners)
  - `--radius-md`: `6px` (Card & dialog corners)
- **Tailwind v4 Integration:** Configured using `@theme inline` directives mapping custom properties into Tailwind utility classes.
- **Custom Keyframe Animations:** `kpi-enter` (entrance sweep transition for dashboard metric cards) and `step-in` (wizard step animation).

#### Shared Components & Shadcn Primitives (`src/components/`)
- **Primitives (`src/components/ui/` — 11 Components):** `badge`, `button`, `card`, `dialog`, `input`, `label`, `progress`, `select`, `spinner`, `table`, `textarea`.
- **Shared Utilities (`src/components/shared/` — 4 Components):**
  - `multi-step-dialog.tsx`: Horizontal multi-step wizard modal used for complex creation flows across all shell applications.
  - `empty-state.tsx`: Standardized empty state graphic component.
  - `loading-spinner.tsx`: Centered spinner layout.
  - `search-input.tsx`: Debounced search bar widget.
- **Helper Utility (`src/lib/utils.ts`):** Exposes `cn(...inputs)` combining `clsx` and `tailwind-merge`.

---

## 9. Executive Shell Workstation Comprehensive Technical Audit (`apps/erp-shell`) — Port 3000

### Tech Stack & Design Token System
- **Framework:** Next.js 16.2.10 (Turbopack bundler) with TypeScript, React Hooks, Lucide React icons, and Recharts.
- **Design System:** Consumes `@datavex/ui-theme` package. Styled in **Refined Crimson & Brushed Gold** theme (`--sidebar`: `#3D1013`, `--shell-brand`: `#8C1D24`, `--shell-accent`: `#E5B83C`).
- **Dependencies:** Workspace package `"@datavex/auth-middleware": "workspace:*"` for API calls (`api.get`, `api.post`, `api.put`, `api.delete`).

### SSO Login Gateway & Cross-Workstation Routing
- **Central Login Screen (`app/(auth)/login`):**
  - Serves as the single authenticating entryway for the entire monorepo.
  - Accepts `?redirect=...` query parameter (e.g. `http://localhost:3002/dashboard`).
  - Calls `POST /api/auth/login` on `core-iam` (port 8002).
  - Stores JWT token in `localStorage` and HttpOnly cookies, then appends `?token=<jwt>` to the redirect URL so calling workstations can consume the token seamlessly.
- **Role-Based Routing Rules:**
  - `Accountant` / `Auditor` → Redirected to Billing Workstation (`http://localhost:3002`).
  - `Sales Executive` → Redirected to CRM Workstation (`http://localhost:3001`).
  - `Inventory Manager` → Redirected to Inventory Workstation (`http://localhost:3004`).
  - `Organization Owner` / `Super Admin` → Retained on Executive Shell (`http://localhost:3000`).

### Routing Proxy Gateway Architecture (`proxy.ts`)
- Next.js middleware intercepting `/api/:path*`:
  - `/api/auth/*` → Routes to `core-iam` (port 8002) preserving `/api` prefix.
  - CRM paths (20 prefixes: customers, contacts, leads, documents, lead-discovery, ai-assistant, quotations, opportunities, sales, sales-orders, requirements, enquiries, site-visits, follow-ups, tasks, communications, visit-plans, complaints, feedback) → Routes to `erp-service` (port 8000) with `/crm` prepended (e.g. `/api/customers` → `/crm/customers` on erp-service).
  - All other `/api/*` → Routes to `erp-service` (port 8000) without prefix transformation.

### Aggregated Executive Dashboard (`app/(admin)/dashboard/`)
- **Route:** `/dashboard` — single pane of glass aggregating all services.
- **7 parallel fetches:** `/dashboard/stats`, `/dashboard/recent-invoices`, `/dashboard/revenue-trend`, `/dashboard/invoice-summary`, `/dashboard/payment-analytics`, `/dashboard/client-growth` (all → erp-service) + `/dashboard/crm` (erp-service proxied to crm-service).
- **KPI row:** 6 columns — Revenue, Outstanding, Invoices, Pipeline Value, Open Opportunities, Clients.
- **Charts:** Revenue Trend (Area), Invoice Distribution (Pie donut), Pipeline Distribution (Pie donut), Payment Analytics (Bar), Client Growth (Area).
- **CRM sections:** Pipeline Distribution chart, AI Recommendations card. Alert banner includes AI insights count.
- **Local components:** `PipelineChart.tsx`, `Recommendations.tsx` (ported from crm-ui).
- **Consistent styling:** All cards use `shadow-engineered` hover effect.

### Embedded CRM Pages (`app/(admin)/crm/`)
- 12 CRM pages ported from the standalone `crm-ui` workstation: customers, contacts, documents, lead-discovery, ai-assistant, quotations (frontend), dashboard (merged into main dashboard), plus original pages for clients, leads, opportunities, requirements, sales-orders, reports.
- Shared components: `GenericCreateModal.tsx`, `GenericDetailsModal.tsx`, `exportCsv.ts` (ported from crm-ui).
- All CRM API calls flow through erp-service's `/crm` passthrough router.

### Navigation Topology (`Sidebar.tsx`)
- **Executive Command Sidebar (260px / 64px):**
  - **Executive Overview:** Dashboard (`/dashboard`)
  - **Workstation Launchers & Embedded Modules:**
    - CRM Hub (`/crm` - leads, opportunities, pipelines)
    - Billing & Financials (`/billing` - invoices, payments, financial KPIs)
    - Inventory Operations (`/inventory` - stock levels, low stock alerts, warehouses)
    - Accounting (`/accounting` - accounts, ledger, reports)
  - **Organization Settings:** Team Members (`/team`), Settings (`/settings`)

---

## 10. Core Business Gateway & Aggregator Comprehensive Technical Audit (`services/erp-service`) — Port 8000

### Framework & Architectural Role
- **Framework:** FastAPI (Python 3.13+) powered by SQLAlchemy 2.0 AsyncSession (`postgresql+asyncpg` targeting `erp_db`).
- **Role:** Central business domain gateway and cross-service aggregator. Orchestrates multi-domain data calls across `billing-service` (8003), `inventory-service` (8004), and `crm-service` (8001).
- **Port:** 8000.

### Token Forwarding & Claims Authentication (`app/core/deps.py`)
- **`decode_access_token`:** Decodes incoming JWT bearer tokens using shared `JWT_SECRET` (HS256).
- **`_raw_token` Context:** Extracts the raw JWT token string from the `Authorization` header and places it into `payload["_raw_token"]`, enabling backend microservice queries on behalf of the user.
- **Tenant Isolation:** Enforces `owner_id` scoping across active database models (`Client`, `Lead`, `Product`).

### Microservice Integration Clients (`app/integrations/`)
1. **`billing_client.py`:**
   - Interacts with `http://localhost:8003/api`.
   - Methods: `get_dashboard_billing`, `get_invoices`, `get_invoice_summary`, `get_payments`, and full CRUD for invoices, quotations, credit/debit notes, recurring invoices, payments, accounts, expenses, bank reconciliation, periods.
2. **`inventory_client.py`:**
   - Interacts with `http://localhost:8004`.
   - Methods: `get_dashboard_inventory`, `get_low_stock_products`, `get_stock_movements_dashboard`, and full CRUD for products, warehouses, stock, suppliers, purchase orders, serial numbers.
3. **`crm_client.py`:**
    - Interacts with `http://localhost:8001/api`.
    - **Generic CRUD:** `get_entity_list`, `get_entity_detail`, `create_entity`, `update_entity`, `delete_entity` — used by `crm/router.py` for all 20 entity types.
    - **`extract_list(data, key)`:** Normalizes responses returning either `{key: [...]}` or `[...]`.
    - **Specific functions:** `get_dashboard_crm`, `get_customers`, `get_leads`, `ai_assistant_chat`, `lead_discovery_search|scrape_url|import`, `pinned_leads` CRUD.

### Proxy Routers & Business Logic Routers

| Router | Prefix | Type | Target |
|--------|--------|------|--------|
| `crm/router.py` | `/crm` | Generic CRUD passthrough + specific endpoints | crm-service (8001) |
| `billing/router.py` | (root) | Full passthrough | billing-service (8003) |
| `inventory/router.py` | (root) | Full passthrough | inventory-service (8004) |
| `client/router.py` | `/clients` | Business logic with data mapping | crm-service (8001) |
| `product/router.py` | `/products` | Lightweight passthrough | inventory-service (8004) |

#### CRM Passthrough Router (`app/crm/router.py`) — prefix `/crm`
- **`VALID_ENTITIES`:** 20 approved entity types (customers, contacts, leads, documents, opportunities, sales, requirements, quotations, sales-orders, reports, ai-assistant, lead-discovery, enquiries, site-visits, follow-ups, tasks, communications, visit-plans, complaints, feedback).
- **Generic CRUD handlers:** `GET/POST /{entity_type}`, `GET/PUT/DELETE /{entity_type}/{id_str}` — proxies to `crm_client.get_entity_list/create/update/delete`.
- **Lead-specific mapping:** `_map_lead()` transforms raw crm-service fields (`company`, `name`, `est_value`) to the erp-shell expected schema (`company_name`, `contact_person`, `expected_value`). `_reverse_map_lead()` converts form submissions back. Both applied automatically in generic handlers when `entity_type == "leads"`.
- **`POST /crm/leads/{id}/convert`:** Lead conversion endpoint (formerly in dedicated `lead/router.py`).
- **Specific passthrough endpoints:** `GET /crm/reports/dashboard`, `POST /crm/ai-assistant/chat`, `POST /crm/lead-discovery/search|scrape-url|import`, `GET|POST|DELETE /crm/lead-discovery/pinned`.
- **Quotations stub:** `GET /crm/quotations` returns empty data (quotations handled by billing-service).

#### Dedicated lead router (`app/lead/router.py`) — **DELETED**
- Mapping logic (`_map_lead`, `_reverse_map_lead`, `extract_list`) moved into `app/crm/router.py`.
- Lead routes (`/leads`, `/leads/{id}`, `/leads/{id}/convert`) now served through `/crm/leads` via the generic CRM passthrough.