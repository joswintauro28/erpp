# erp-shell — Dashboard

## Design Direction: "Refined Crimson & Brushed Gold"

Premium, authoritative, production-ready. Deep maroon structural shell with crimson action
surfaces and brushed gold accents. Open card-based layout with strict 8pt grid spacing.

---

## Color System

| Role | Color Name | Hex | Usage |
|------|-----------|-----|-------|
| **Structural Dark** | Deep Maroon | `#4A1518` | Sidebar, Header — premium chassis backdrop |
| **Primary Brand / Action** | Crimson Red | `#8C1D24` | Buttons, CTAs, active indicators, chart-1 |
| **Accent / Logo** | Yellow-Gold | `#F1C423` | Premium badges, icon fills, pulse bar, sidebar brand |
| **Text Primary** | Charcoal Ink | `#111827` | Headings and primary paragraph text |
| **Text Secondary** | Industrial Slate | `#6B7280` | Subtitles, meta, placeholder, muted info |
| **Bg Base** | Pristine White | `#FFFFFF` | Cards, surfaces, content area |
| **Bg Alt** | Anodized Light Grey | `#F3F4F6` | Alternating section backgrounds |

## Typography Scale

Base: `16px` (`1rem`). Body line-height: `1.6`.

| Element | Font | Size | Weight | Line Ht | Letter Spacing |
|---------|------|------|--------|---------|---------------|
| H1 | Montserrat | 3rem / 48px | 700 | 1.2 | -0.02em |
| H2 | Montserrat | 2rem / 32px | 600 | 1.3 | -0.01em |
| H3 | Montserrat | 1.25rem / 20px | 600 | 1.4 | normal |
| Body | Inter | 1rem / 16px | 400 | 1.6 | normal |
| Body (small) | Inter | 0.875rem / 14px | 400 | 1.5 | normal |
| Button | Inter | 1rem / 16px | 500 | 1.0 | 0.02em |

## 8pt Grid

All spacing adheres to multiples of 8px:
- Section gaps: `24px` (3 × 8)
- Card padding: `16px` (2 × 8)
- Grid gaps: `24px` between chart cards, `16px` between KPIs
- Header height: `80px`
- Content padding: `24px` / `32px` on larger screens

## Component Specs

### Primary Button
- Background: `#8C1D24` (Crimson Red), Hover: `#70171D`
- Text: White, Size: Medium (500)
- Padding: `12px 24px`, Radius: `4px` (engineered)
- Hover shadow: `0 4px 6px rgba(0,0,0,0.1)`

### Cards
- Background: White, Border: `1px solid #E5E7EB`
- Radius: `6px` (card radius), Padding: `16px`
- Hover (KPI cards): `translateY(-4px)` + `0 10px 15px -3px rgba(0,0,0,0.05)`

### Top Navbar (Header)
- Background: Deep Maroon `#4A1518`
- Height: `80px`, Sticky with `0 2px 4px rgba(0,0,0,0.2)` shadow
- Bottom glow: Gold pulse-sweep gradient bar (`--shell-accent`)

### Sidebar — "Deep Maroon Chassis" Design
- Background: Deep Maroon `#4A1518` — premium instrument panel
- **Signature**: Crimson Red (`#8C1D24`) active state gradient with Gold (`#F1C423`) glow bar — illuminated control panel indicator
- **Active parent**: Crimson gradient (`rgba(140,29,36,0.25) → 0.05 → transparent`), white text, Gold icon, gold glow bar with shadow halo
- **Active child**: Crimson gradient (0.20 → transparent), white text, Gold icon + glow bar
- **Section dividers**: Gold short hairline (24px) + label, engraved panel label style; collapsed mode shows a gold dot
- **Brand**: "D" in a rounded gold badge + "DATAVEX" in Gold with `0.18em` tracking
- **Collapsed**: Gold dots between sections; full-width separators replaced by subtle gold dots
- **User footer**: Gold-bordered avatar with gold initials, real-time user name + role from auth context

## Architecture

```
app/
├── layout.tsx                    # Root: Montserrat + Inter + JetBrains Mono, AuthProvider
├── page.tsx                      # Redirect / → /dashboard
├── globals.css                   # Refined Crimson & Brushed Gold tokens, 8pt grid, animations
├── not-found.tsx                 # 404 (brand theme)
├── error.tsx                     # 500 (brand theme)
├── forbidden/page.tsx            # 403 (brand theme)
└── (admin)/
    ├── layout.tsx                # Sidebar + Header wrapper, auth guard, collapsed state
    ├── loading.tsx               # Skeleton loading (KPI cards, charts, table rows)
    ├── dashboard/                # Wired to API
    ├── crm/                      # Full CRM module ported from crm-ui (via erp-service /crm passthrough)
    │   ├── leads/                # CRUD + MQL qualify
    │   ├── opportunities/        # CRUD + kanban stage drag
    │   ├── customers/            # CRUD (incl. credit limit driving the billing credit check)
    │   ├── contacts/  documents/ # CRUD
    │   ├── requirements/         # CRUD
    │   ├── quotations/           # CPQ create + approval overlay
    │   ├── sales-orders/         # CRUD + approve/credit-check release-hold flow
    │   ├── reports/  lead-discovery/
    │   └── clients/              # Legacy erp-service clients (kept)
    ├── billing/                  # 7 routes
    ├── accounting/               # 4 routes
    ├── inventory/                # 9 routes
    └── settings/                 # 4 routes

components/
├── Sidebar.tsx                   # Collapsible 240px/64px, Deep Maroon (#4A1518), useAuth()
├── Header.tsx                    # Deep Maroon sticky, 80px, notification bell w/ polling
├── multi-step-dialog.tsx         # Reusable branded step wizard (step indicator, animation)
└── ui/                           # shadcn primitives
    ├── button.tsx                # 4px radius, Crimson Red default (#8C1D24)
    ├── card.tsx                  # 6px radius, 1px border
    ├── textarea.tsx              # Matches Input styling
    └── ...

types/
├── crm.ts                        # Lead, Client, ApiClient, PortalAccess
├── billing.ts                    # ApiInvoice, InvoiceDetailView, ApiPayment, etc.
├── accounting.ts                 # FinancialReport, BalanceSheetItem, etc.
├── inventory.ts                  # Product, StockMovement, Warehouse, etc.
├── auth.ts                       # User, AuthState (re-exports from @datavex/auth-middleware)
├── dashboard.ts                  # DashboardData
├── api.ts                        # ApiClientError, ApiError (re-exports from @datavex/auth-middleware)
├── ui.ts                         # StepConfig, MultiStepDialogProps
├── notifications.ts
├── navigation.ts
└── settings.ts

services/
└── api.ts                        # Re-exports { setAccessToken, getAccessToken, api } from @datavex/auth-middleware

utils/
└── format.ts                     # money(), searchLeads(), searchClients(), searchBilling()

contexts/
└── AuthContext.tsx                # Login/logout/refresh, localStorage persistence
```

## Sidebar Navigation Structure

Mirrors the erp-ui navigation exactly. Standalone links sit between labeled groups:

| Type | Item | Items |
|------|------|-------|
| **Link** | Dashboard | — |
| **Group** | CRM | Leads, Opportunities, Requirements, Quotations, Sales Orders, Customers, Contacts, Documents, Reports, Lead Discovery |
| **Group** | Billing | Quotations, Invoices, Recurring Invoices, Credit Notes, Debit Notes, Payments |
| **Group** | Accounting | Chart of Accounts, General Ledger, Expenses, Reports |
| **Group** | Inventory | Products, Stock Movements, Stock Adjustments, Inventory Valuation, Warehouses, Purchase Orders, Suppliers, Batches, Serials |
| **Link** | AI Assistant | — |
      | **Link** | Email Logs | — |
      | **Link** | Audit Logs | — |
      | **Group** | Settings | General Settings, Branding, Notifications, Workflow Automation, Team Management |

Default expanded groups: CRM, Billing, Accounting (Inventory, Settings start collapsed).

## Billing Module

All pages mirror erp-ui structure with improvements in shared types, search filtering, and instrument-panel design.

| Route | Features |
|-------|----------|
| `/billing/invoices` | GST summary cards (taxable, CGST/SGST, IGST), search + status filter, full table with balances |
| `/billing/invoices/[id]` | Detail view with metric cards, GST breakdown, line items table, payment history, Make Recurring dialog |
| `/billing/quotations` | Status management workflow (draft→sent→accepted/rejected), search + filter, convert-to-invoice action |
| `/billing/payments` | Metric cards (today/this month/outstanding/refunds/failed), search, table with refund toggle, Record Payment dialog |
| `/billing/recurring-invoices` | Schedule list with color-coded frequency badges, pause/resume/run-now actions, search |
| `/billing/credit-notes` | Simple list table with search, download/delete actions |
| `/billing/debit-notes` | Simple list table with search, download/delete actions |

### v6 — Billing module built
- Added shared billing types to `types/billing.ts`
- Created 10 realistic invoices with full GST line items (CGST/SGST/IGST breakdown)
- Added quotation lifecycle, recurring schedules, credit/debit notes, and payment data
- Added `searchBilling<T>()` generic search helper in `utils/format.ts`

### Active state indicators
- **Parent section**: Crimson Red (`#8C1D24`) gradient background + Gold (`#F1C423`) 3px left bar + white text
- **Child link**: Crimson Red background (20%) + Gold icon + white text
- **Inactive**: 70% opacity text, 50% opacity icons
- **Hover**: Gold-accent background (6%), white text

### Section headers
Each section has a centered uppercase label (e.g. `— ADMIN —`) with flanking hairline rules. In collapsed mode the label is replaced by a short hairline rule to preserve the visual rhythm.

## Sidebar UX — typeui Fundamentals Applied

### Contrast compliance (WCAG AA)
- **Sidebar foreground**: bumped from 60% → 72% white opacity on `#272A30` — ensures ≥4.5:1 for small text
- **Active child**: uses white text with Ruby Red `#96282E` icon + left bar (no longer Ruby Red text which failed at ~1.93:1)
- **Active parent**: Ruby Red tinted background (`--sidebar-brand`/20) + white text + Brushed Brass left bar
- **Section labels**: 50% opacity at 10px — de-emphasized correctly per **hierarchy principle** (§2.3)
- **Inactive links**: 65% foreground opacity — readable but quiet

### Touch targets (Fitts's Law / SC 2.5.8)
- Section toggle buttons: `py-2.5` (10px) → ~40px total, close to 44×44px minimum
- Child links: `py-1.5` (6px) → ~32px — intentionally tighter as nested items; parent toggle satisfies the touch target

### Proximity & grouping (Law of Proximity)
- Section groups separated by `space-y-5` (20px) vs `space-y-0.5` (2px) within — clear tier distinction
- Section headers with flanking hairline rules provide **common region** boundaries
- Icon-to-text gap at 2.5 (10px) — aligns with 8px recommended spacing

### Active state hierarchy (Von Restorff Effect)
- Only one active item per section — Ruby Red left bar + tinted background + white text
- Active child gets a Ruby Red icon + left bar to distinguish from inactive siblings
- Hover state: subtle accent bg (7% white) — "soft handshake" per hover technique palette (H4)

## Collapsible Sidebar

The sidebar collapses between **240px** (expanded) and **64px** (icon-only) with a 300ms CSS transition on the `width` property. State is managed in `(admin)/layout.tsx` and passed as a prop to both `Sidebar` and `Header`.

### Collapsed behavior
- **Brand**: Only the "D" logo remains; text fades out
- **Nav items**: Icons stay centered; text labels fade out via `w-0 opacity-0`
- **Groups**: Chevrons hidden; click-to-expand disabled (groups stay closed)
- **User section**: Only the avatar remains; name/email fade out
- **Toggle**: Menu button in header calls `onToggleSidebar` callback

### Implementation
```tsx
// layout.tsx — state owner
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
<Sidebar collapsed={sidebarCollapsed} />
<Header collapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(v => !v)} />

// Sidebar.tsx — dynamic width
<aside style={{ width: collapsed ? "64px" : "var(--sidebar-width)" }}>
  // labels use: collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
  // with transition-[width,opacity] duration-300
</aside>
```

## Key Changes from Previous Version

### v2 — "Modern & Bright Industrial" Theme Refresh

1. **Primary Brand**: Deep Burgundy (`#5A181C`) → Ruby Red (`#96282E`) — lighter, more energetic
2. **Action**: Crimson Red (`#B32428`) → Bright Crimson (`#C81D25`) — draws eye instantly
3. **Accent**: Champagne Gold (`#D4AF37`) → Brushed Brass (`#CBA052`) — softer, more premium
4. **Structural dark**: New Forge Grey (`#272A30`) replaces red in Header + Sidebar — makes red/brass pop
5. **Text**: Charcoal (`#1E1E1E`) → Deep Ink (`#111827`); Steel Grey (`#6C757D`) → Slate Dust (`#6B7280`)
6. **Bg**: Slate Grey (`#F8F9FA`) → Cloud Grey (`#F3F4F6`) for alternating sections
7. **Sidebar + Header**: Now share Forge Grey (`#272A30`) background — unified dark structural shell
8. **Hamburger icon**: Switches between `PanelLeftOpen` (collapsed) and `PanelLeftClose` (expanded)
9. **Button default**: Now Bright Crimson (`#C81D25`) / hover `#A0171E`

### v3 — Sidebar Restructure & Polish

1. **Route group**: `(dashboard)` renamed to `(admin)` — cleaner URL structure
2. **Nav sections**: Flat list replaced by labeled groups (Admin, CRM, Billing, Accounting, Inventory)
3. **Active indicators**: Ruby Red left border bars on active parent + child links
4. **Section headers**: Centered uppercase labels with flanking hairline rules
5. **Avatar**: Uses Ruby Red `--sidebar-brand` background instead of Brushed Brass
6. **Icons**: Active child links show Ruby Red icon with full opacity; inactive at 50%

### v4 — "Instrument Panel" Sidebar Redesign

**Signature**: The active state uses a Ruby Red glow gradient (linear-gradient from `rgba(150,40,46,0.28)` → transparent) with a 3px Brushed Brass glow bar — mimicking an illuminated indicator light on a factory control panel. This is the single memorable element; everything else stays quiet.

**Changes from v3:**
1. **Active parent**: Ruby Red glow gradient background + 3px brass glow bar with shadow halo (no more flat accent background)
2. **Active child**: Matching Ruby Red glow gradient (0.18 alpha) + brass glow bar — consistent instrument language
3. **Section dividers**: Replaced centered labels with flanking rules → left-aligned brass short hairline (24px) + label — cleaner, more industrial, like engraved panel labels
4. **Collapsed section separators**: Hairline rules replaced by small brass dots — preserves rhythm without clutter
5. **Brand**: "DATAVEX" now uses `0.05em` letter-spacing — wider, more deliberate
6. **User area**: Initials in a brass-bordered square with semi-transparent brass fill — subtle brass plate treatment
7. **Icons**: Inactive icons at 50% opacity, active icons turn Brushed Brass — color carries hierarchy
8. **Chevron icons**: Turn Brushed Brass when section is active — consistent glow bar language

### v5 — Nav structure mirrors erp-ui

1. **Removed "Admin" group** — Dashboard, AI Assistant are now standalone links between groups
2. **Added Billing items**: Recurring Invoices, Credit Notes, Debit Notes
3. **Added Accounting item**: Reports
4. **Added Inventory items**: Stock Adjustments, Warehouses
5. **Added standalone links**: Email Logs, Audit Logs
6. **Expanded Settings**: Branding, Notifications, Workflow Automation, Team Management
7. **Default expanded groups**: CRM, Billing, Accounting (matching erp-ui)
8. **New icons**: `Repeat`, `SlidersHorizontal`, `Mail`, `FileClock` from lucide-react

## Accounting Module

| Route | Page | Key Features |
|-------|------|-------------|
| `/accounting/accounts` | Chart of Accounts | 32 accounts across 5 types, type filter cards with totals, search by code/name/group, toggle active/inactive |
| `/accounting/ledger` | General Ledger | 20 journal entries with debit/credit columns, sort by date, search across all fields, footer totals |
| `/accounting/expenses` | Expenses | 15 expenses across 8 categories, metric cards (total/month/pending/categories), search, download/delete |
| `/accounting/reports` | Financial Reports | 3 tabs: P&L with 4 KPI cards + bar chart + detail table; Balance Sheet (3-card split); Tax Summary with liability breakdown |

## Inventory Module

| Route | Page | Key Features |
|-------|------|-------------|
| `/inventory/fulfillment` | Order Fulfillment | SO fulfillment pipeline Kanban, auto-PO on shortage, SO status sync |
| `/inventory/products` | Products | Product catalog with SKU, pricing, tax rates, batch/serial flags |
| `/inventory/stock` | Stock Levels | Real-time stock per product x warehouse, adjustment modal |
| `/inventory/stock/movements` | Stock Movements | In/Out/Adjustment movement log with reference tracking |
| `/inventory/serial-numbers` | Serial Numbers | Serial tracking per product x warehouse with status filter |
| `/inventory/quality-checks` | Quality Checks | Quality inspection logs and status chips |
| `/inventory/suppliers` | Suppliers | Vendor registry with GST, payment terms |
| `/inventory/purchase-requisitions` | Purchase Requisitions | Buy requests with status badges |
| `/inventory/purchase-orders` | Purchase Orders | PO lifecycle (draft -> ordered -> received) with auto-totaling |
| `/inventory/work-orders` | Work Orders | Manufacturing production run routing and issue tracking |
| `/inventory/warehouses` | Warehouses | Multi-warehouse locations with capacity tracking |

## Settings Module

| Route | Page | Key Features |
|-------|------|-------------|
| `/settings` | General Settings | Company info, financial settings (fiscal year, currency), regional settings (timezone, date format) |
| `/settings/branding` | Branding | Logo/favicon upload, brand colour palette (6 colours with hex inputs), email template customisation |
| `/settings/notifications` | Notifications | 3-channel grid (Email/SMS/Push) with toggles, alert threshold badges (overdue, low stock, quote expiry) |
| `/settings/workflow` | Workflow Automation | 8 rules with trigger/condition/action columns, active/inactive toggle, KPI cards |
| `/team` | Team Management | 10 members with role badges, department, status (active/invited/disabled), permission tags, invite/resend actions |

## Current Route Map (33 routes)

```
/                          → Redirect to /dashboard
/_not-found                → 404 (brand theme)
/dashboard                 → Dashboard (KPIs, charts, wired to API)
/crm/leads                 → Leads (wired: CRUD + MQL qualify)
/crm/opportunities         → Opportunities (wired: CRUD + kanban stage drag)
/crm/customers             → Customers (wired: CRUD incl. credit limit)
/crm/contacts              → Contacts (wired: CRUD)
/crm/documents             → Documents (wired: CRUD)
/crm/requirements          → Requirements (wired: CRUD)
/crm/quotations            → Quotations (wired: CPQ + approval overlay + convert-to-SO)
/crm/sales-orders          → Sales Orders (wired: CRUD + approve/credit-check + release-hold)
/crm/reports               → Reports (wired: CRUD + dashboard)
/crm/lead-discovery        → Lead Discovery (wired: search/scrape/import/pinned)
/crm/clients               → Client list (legacy erp-service, kept)
/crm/clients/[id]          → Client detail (legacy erp-service, kept)
/billing/invoices          → Invoices list (wired to API)
/billing/invoices/[id]     → Invoice detail (wired to API)
/billing/quotations        → Quotations (API-ready)
/billing/payments          → Payments (API-ready)
/billing/recurring-invoices → Recurring invoices (API-ready)
/billing/credit-notes      → Credit notes (API-ready)
/billing/debit-notes       → Debit notes (API-ready)
/accounting/accounts       → Chart of Accounts (API-ready)
/accounting/ledger         → General Ledger (API-ready)
/accounting/expenses       → Expenses (API-ready)
/accounting/reports        → Financial Reports (API-ready)
/inventory/fulfillment       → Order Fulfillment (API-ready)
/inventory/products        → Products (API-ready)
/inventory/stock           → Stock Levels (API-ready)
/inventory/stock/movements → Stock Movements (API-ready)
/inventory/serial-numbers  → Serial Numbers (API-ready)
/inventory/quality-checks  → Quality Checks (API-ready)
/inventory/suppliers       → Suppliers (API-ready)
/inventory/purchase-requisitions → Purchase Requisitions (API-ready)
/inventory/purchase-orders → Purchase Orders (API-ready)
/inventory/work-orders     → Work Orders (API-ready)
/inventory/warehouses      → Warehouses (API-ready)
/settings                  → General Settings (API-ready)
/settings/branding         → Branding (API-ready)
/settings/notifications    → Notifications (API-ready)
/settings/workflow         → Workflow Automation (API-ready)
/team                      → Team Management (API-ready)
/forbidden                 → 403 (brand theme)
/login                     → Login page
```

**Legend**: Wired to API = fetches real data from backend; API-ready = empty state, no API calls yet.

### v7 — "Refined Crimson & Brushed Gold" Theme + Real User Data

1. **Theme rewrite**: Replaced Forge Grey `#272A30` with Deep Maroon `#4A1518` for sidebar/header chassis
2. **Brand colors**: Ruby Red `#96282E` → Crimson Red `#8C1D24`; Brushed Brass `#CBA052` → Yellow-Gold `#F1C423`
3. **Action color**: Bright Crimson `#C81D25` → Crimson Red `#8C1D24` (unified with brand)
4. **Card radius**: `8px` → `6px` (tighter engineered feel)
5. **Header bg**: Now uses `--shell-header: #4A1518` CSS variable, matching sidebar chassis
6. **Sidebar user**: Hardcoded "Ajith Goveas / Administrator" replaced with `useAuth()` — shows `user.full_name` and `user.role` from backend, with computed initials in gold avatar
7. **Header user**: Hardcoded "AJ" initials replaced with dynamic initials from `useAuth()`
8. **Logout**: Uses `logout()` from auth context + `router.push()` instead of raw localStorage removal
9. **Sidebar**: Added `useRouter` import, added `useAuth` hook, displays `displayName`, `displayRole`, and `initials` computed from `user.full_name` or `user.email`
10. **Header**: Added `useAuth` hook, displays dynamic initials in brand-colored avatar badge

### v8 — Type Reorganization, MultiStepDialog, Mock Data Removal, Backend Leads API

1. **Types directory**: Created `types/` with 11 domain-organized modules (crm, billing, accounting, inventory, auth, dashboard, notifications, navigation, ui, settings, api). All inline types and types from `lib/data.ts` migrated.
2. **MultiStepDialog**: New reusable `components/multi-step-dialog.tsx` with branded horizontal step indicator (numbered circles, brand-color fill), step-in animation, form wrapper with back/next/save footer. `animate-step-in` keyframes in `globals.css`.
3. **Form consistency**: All 6 modal pages (CRM clients/leads, billing payments/quotations/invoices recurring, client detail) refactored to use MultiStepDialog. Label→input `space-y-2` (8px canonical tight), field→field `space-y-5` (20px), grid `gap-x-5 gap-y-4`. Native `<label>` → shadcn `<Label>`, native `<textarea>` → shadcn `<Textarea>`.
4. **`isFirstStep`/`isLastStep` internalized**: MultiStepDialog computes these from `currentStep` and `steps.length`, removed from all 6 call sites.
5. **Mock data removed**: `lib/data.ts` deleted. Helpers (`money`, `searchBilling`, `searchLeads`, `searchClients`) extracted to `utils/format.ts`. All 23 page files updated to import from `@/utils/format` and initialize state as empty arrays.
6. **Loading skeleton**: `app/(admin)/loading.tsx` — brand progress bar, 4 KPI card skeletons, 2 chart skeletons, table row skeletons, `animate-pulse`.
7. **Error pages**: `app/not-found.tsx` (404), `app/forbidden/page.tsx` (403), `app/error.tsx` (500) — all matching brand dark theme.
8. **Notification bell**: Header wired to `GET /notifications` with dropdown, count badge, read/unread state, 2-min polling.
9. **Auth persistence**: `sessionStorage` → `localStorage` in AuthContext and api.ts.
10. **Dashboard rewired**: All mock data removed, 4 KPIs, Quick Actions bar, 6 parallel API calls (`/dashboard/stats`, `/recent-invoices`, `/revenue-trend`, `/invoice-summary`, `/payment-analytics`, `/client-growth`). Empty states on all charts/tables. Chart improvements: data dots, active dot, lighter grid, custom tooltip, donut center label, sorted bars, per-bar colors.
11. **Leads wired to API**: Frontend fetches `GET /leads`, creates via `POST /leads`, edits via `PUT /leads/{id}`, deletes via `DELETE /leads/{id}`, converts via `POST /leads/{id}/convert`. Analytics computed client-side via `useMemo`. Loading spinner.
12. **Leads backend API created**: Full CRUD layer — migration (10 new columns, `name`→`company_name` rename), model update, schemas (`LeadCreate`/`LeadUpdate`/`LeadOut`), repository, service (with `convert_lead` that creates a `Client`), and endpoints registered in `main.py`.
13. **AI Intelligence nav item**: Disabled "Coming Soon" badge.
14. **Client portal access**: Removed from URL helpers (no backend endpoint yet), `PortalSection` conditionally hidden.
15. **Build**: 33 pages clean on frontend, import-OK on backend.

### v9 — Central SSO Authentication (core-iam) & Intelligent Workstation Routing

1. **Isolated Centralized IAM Backend (`core-iam`):** Built and deployed the NestJS authentication service on port **`8002`** backed by a dedicated `erp_iam` PostgreSQL database.
2. **Standard Developer Seeding:** Created seeds for system roles, permissions, and developer accounts, strictly restricting settings creation to administrators (`Organization Owner`).
3. **Decoupled claims-based RBAC:** FastAPI permission verification dependencies (`deps.py`) refactored to validate roles and permission codes directly from cryptographically verified JWT claims, removing monolithic SQL lookups.
4. **Next.js Proxy Gateway:** Configured `proxy.ts` rewrite engine in the Next.js shell to intelligently route `/api/auth/*` traffic to the NestJS IAM service (preserving `/api`) and business APIs to the FastAPI backend (stripping `/api`).
5. **SSO Redirection:** Updated the login portal to process query parameters and perform redirects back to originating workstation subdomains (e.g. CRM, Billing).
6. **Intelligent Workstation Routing:** Added automatic role-to-workstation routing on login: `Sales Executive` -> CRM (`3001`), `Accountant`/`Auditor` -> Billing (`3002`), and Admins -> Admin Shell (`3000`).

### v10 — Billing Workstation (billing-ui) & 3-Way Proxy Routing

1. **Standalone Billing Workstation (`apps/billing-ui`):** Built a new Next.js 16 app on port `3002` for Accountant/Auditor roles, with billing-specific collapsible sidebar and 9 routes (dashboard, invoices, quotations, payments, credit/debit notes, recurring invoices).
2. **Token-Passing SSO:** Login page now appends `?token=<jwt>` when redirecting to workstation ports (3001/3002), enabling cross-origin authentication without shared localStorage.
3. **3-Way Proxy Routing:** `proxy.ts` expanded to route `/api/invoices*`, `/api/payments*`, `/api/dashboard/billing` to billing-service (port 8003) in addition to existing auth→IAM and business→erp-service routes.
4. **billing-service:** New NestJS microservice on port 8003 with 7 modules (Invoices, Payments, Quotations, Credit Notes, Debit Notes, Recurring Invoices, Dashboard) backed by `erp_billing` database.
5. **Prisma Client Isolation:** core-iam now generates its Prisma client to `@prisma/client-iam` (custom output path) to prevent conflicts when multiple services use Prisma in the same monorepo.
6. **Billing Pages Wired:** Invoices list + detail, quotations, payments, credit notes, debit notes, and recurring invoices all fetch from the billing-service API.

### v11 — Full CRM module ported from crm-ui (crm-shell) into the shell

1. **Complete port**: All crm-ui `(admin)` pages + components copied to `(admin)/crm/*` — leads, opportunities (incl. Kanban), customers (incl. credit-limit field), contacts, requirements, quotations (incl. CPQ modal + approval overlay), sales-orders (incl. approve/release-hold + credit toast), documents, reports, lead-discovery. **Dashboard excluded** — the exec `/dashboard` already aggregates pipeline value, open opportunities, clients, and recommendations, so the CRM dashboard would be redundant in the shell.
2. **AI Assistant excluded** by design — the shell has its own `/ai-assistant`; the old `crm/ai-assistant` page + sidebar link were removed.
3. **Gateway routes added** (`erp-service` `/crm` passthrough): `GET /crm/dashboard`, `POST /crm/opportunities/{id}/stage`, `POST /crm/sales-orders/{id}/approve`, `POST /crm/leads/{id}/qualify`, `GET /crm/quotations/{id}/approval`; removed the hard-coded empty quotations response (quotations now return real billing-backed data).
4. **Toasts**: ported `utils/toast.ts` + `components/ToastContainer.tsx` from crm-ui and mounted in the admin layout.
5. **Cleanup**: replaced the generic `GenericCreateModal`/`GenericDetailsModal` usage with the bespoke crm-ui modals; deleted both generic modals. Fixed 3 strict-mode implicit-any errors in copied modals. Fixed exec dashboard recommendation link to the shell's own `/ai-assistant`.

### v12 — File Upload/Storage Pipeline & Proxy Fix

1. **Proxy routing fix:** Added `/files/` → erp-service routing (preserving `/api` prefix) in `proxy.ts`. Previously, all file operations from the executive shell returned 404 because the proxy stripped `/api` but the file router expected `/api/files/*`.
2. **File upload/viewer integration:** `DocumentCreateModal` now sends `file_uri` (matching the CRM Document model) instead of `file_id`. On edit, fetches existing file metadata to populate `FileViewer`.
3. **FileViewer stream endpoint:** Downloads now use `/api/files/{id}/stream` (302 redirect) instead of the JSON-wrapping `/download` endpoint.
4. **Theme alignment:** File upload/viewer components aligned to shell theme tokens.

## What's Left

- **Wire remaining pages to API**: Quotations, Recurring Invoices, Credit/Debit Notes, Payments, all Accounting/Inventory/Settings/Team pages (currently empty state)
- **Standalone pages**: AI Assistant (/ai-assistant), Email Logs (/email-logs), Audit Logs (/audit-logs)
- **Client portal access**: No backend endpoint yet, section hidden
- **Dark mode refinement**: Dark theme needs visual pass against new brand colors
- **Auth-based filtering**: Leads/Clients filtered by `owner_id` — only visible to owning user
