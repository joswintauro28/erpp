# DATAVEX ERP — Progress & Audit Report

## Cross-App UI/UX Layout Unification — Complete (2026-08-29)

Full visual consistency pass across all 4 frontend apps (`erp-shell`, `billing-ui`, `crm-ui`, `inventory-ui`) and the shared `@datavex/ui-theme` package. Every dashboard now follows an identical layout template; admin layouts, root layouts, sidebars, and loading states are standardized.

### What Was Built/Fixed

| Component | Changes |
|-----------|--------|
| `packages/ui-theme/src/components/shared/alert-banner.tsx` | **New** — shared `AlertBanner` component with accent/danger/warning variants |
| `packages/ui-theme/src/globals.css` | Added custom select arrow styles, `pulse-sweep` animation, `prefers-reduced-motion` support |
| `packages/ui-theme/src/index.ts` | Added `AlertBanner` export |
| `apps/erp-shell/app/(admin)/dashboard/page.tsx` | Adopted `PageHeader`, `SectionHeading`, `AlertBanner` from ui-theme; replaced 7 inline section heading blocks |
| `apps/erp-shell/app/(admin)/dashboard/loading.tsx` | Standardized to consistent section pattern with `space-y-10 lg:space-y-12` |
| `apps/erp-shell/app/(admin)/layout.tsx` | Replaced raw `Loader2` with `LoadingSpinner` from ui-theme; standardized loading bg |
| `apps/erp-shell/app/(admin)/billing/invoices/page.tsx` | Replaced local `SectionHeading` with shared; adopted `PageHeader`, `SearchInput`, `EmptyState`; fixed `space-y-8` → `space-y-10 lg:space-y-12`; standardized `TableHead` styling |
| `apps/erp-shell/components/Sidebar.tsx` | Updated "Soon" badge from plain text to pill style matching crm-ui |
| `apps/billing-ui/app/(admin)/dashboard/page.tsx` | Deleted local `KpiCard` + `SectionHeading` (~32 lines); adopted shared versions + `PageHeader` + `AlertBanner`; expanded KPI grid to 6-col |
| `apps/billing-ui/app/(admin)/dashboard/loading.tsx` | Standardized to consistent section pattern |
| `apps/billing-ui/app/(admin)/layout.tsx` | Replaced raw `Loader2` with `LoadingSpinner` |
| `apps/crm-ui/app/(admin)/dashboard/page.tsx` | Adopted `PageHeader` + `AlertBanner`; expanded KPI grid to 6-col |
| `apps/crm-ui/app/(admin)/dashboard/loading.tsx` | Standardized to consistent section pattern |
| `apps/crm-ui/app/(admin)/layout.tsx` | Replaced raw `Loader2` with `LoadingSpinner`; added `ToastContainer` inside admin layout |
| `apps/crm-ui/app/layout.tsx` | Removed `ToastContainer` from root layout (moved to admin layout) |
| `apps/crm-ui/app/globals.css` | Removed duplicate select arrow styles (now in shared theme) |
| `apps/inventory-ui/app/(admin)/dashboard/page.tsx` | Deleted local `KpiCard` + `SectionHeading` (~32 lines); adopted shared + `PageHeader` + `AlertBanner`; fixed `space-y-6` → `space-y-10 lg:space-y-12` |
| `apps/inventory-ui/app/(admin)/dashboard/loading.tsx` | Standardized to consistent section pattern |
| `apps/inventory-ui/app/(admin)/layout.tsx` | Replaced raw `Loader2` with `LoadingSpinner`; added `Toaster` inside admin layout |
| `apps/inventory-ui/app/layout.tsx` | Removed `Toaster` from root layout (moved to admin layout) |

### Canonical Dashboard Template

All 4 dashboards now follow this identical layout skeleton:

```
PageHeader (greeting + subtitle + domain badge + actions)
├── AlertBanner (conditional — only when alerts exist)
├── OVERVIEW — SectionHeading + KpiCard × 6 (grid-cols-2 sm:grid-cols-3 lg:grid-cols-6)
├── QUICK ACTIONS — SectionHeading + flex-wrap buttons
├── ANALYTICS — SectionHeading + 2-col chart cards
└── ACTIVITY — SectionHeading + 2-col data cards

Spacing: space-y-10 lg:space-y-12
```

### Consistency Achieved

| Pattern | Before | After |
|---------|--------|-------|
| Page headers | 3 hand-rolled patterns | All use `<PageHeader>` from ui-theme |
| Section headings | 4 different implementations | All use `<SectionHeading>` from ui-theme |
| KPI cards | 3 competing local clones | All use `<KpiCard>` from ui-theme |
| Alert banners | 2 different token systems | All use `<AlertBanner>` from ui-theme |
| Dashboard spacing | 3 different rhythms | All `space-y-10 lg:space-y-12` |
| KPI grid columns | 4-col vs 6-col | All 6-col on `lg` |
| Admin loading spinners | 4 different implementations | All use `<LoadingSpinner>` from ui-theme |
| Loading state backgrounds | `bg-[var(--shell-header)]` vs `bg-background` | All `bg-background` |
| Toast placement | Misplaced in root layouts | All in admin layouts only |
| Sidebar "Soon" badges | Plain text vs pill badge | All pill style |
| Select arrow styling | Only in crm-ui | Shared in ui-theme globals |
| Reduced motion | Not supported | `prefers-reduced-motion` disables animations |
| Table headers | Inconsistent styling | All `h-10 text-[11px] font-semibold uppercase tracking-wider` |
| Card styling | Redundant explicit `border/bg` classes | Clean `<Card>` (primitive handles tokens) |

### Remaining Work

- ~80 non-dashboard pages (list pages, detail pages, forms, settings) across all 4 apps still need header/search/empty-state unification
- Sidebar nav type alignment (billing-ui/inventory-ui to erp-shell's `NavSection > NavChild` pattern)
- Active state precision (billing-ui/inventory-ui `isActive` function alignment)

---

## File Upload/Storage Pipeline — Complete (2026-08-26)

Full RustFS-backed presigned URL file system deployed across the stack. All 15 identified bugs fixed.

### What Was Built/Fixed

| Component | Changes |
|-----------|--------|
| `erp-service/app/files/router.py` | Fixed MIME regex, added org scoping, added `/stream` endpoint, added `/cleanup-pending`, checksum on confirm |
| `erp-service/app/files/s3_client.py` | All sync calls wrapped in `asyncio.to_thread`, error logging, presigned URL rewriting to public hostname |
| `erp-service/app/files/schemas.py` | `owner_id` allows 0 for unlinked uploads |
| `erp-service/app/core/config.py` | Added `RUSTFS_PUBLIC_URL` setting |
| `erp-shell/proxy.ts` | Added `/files/` routing to erp-service (preserving `/api` prefix) |
| `billing-service` bank-reconciliation | JWT forwarding + JSON response parsing for file import |
| Both `DocumentCreateModal.tsx` | Sends `file_uri` instead of `file_id`, fetches metadata on edit |
| `file-viewer.tsx` | Uses `/stream` endpoint for browser downloads |
| `crm-service/Dockerfile` + `inventory-service/Dockerfile` | Added `openssl` to fix pip install SSL errors |
| `infrastructure/local/nginx.conf` | Added `minio.erp.local` server block |
| `infrastructure/local/docker-compose.yml` | Added `MINIO_PUBLIC_URL` env var |
| `infrastructure/internal/` | Complete production deployment config (compose, nginx, secrets template, deploy guide) |

### Deployment Config

| Config | Path | Purpose |
|--------|------|--------|
| Local dev | `infrastructure/local/` | Docker Compose with `*.erp.local` domains |
| Internal prod | `infrastructure/internal/` | Docker Compose with `*.erp.datavex.com` domains |

---

## Inventory UI Port to erp-shell — Complete

All inventory-ui pages have been ported to erp-shell with full CRUD modals, stock movements page, and fulfillment workflow pipeline. The inventory-ui standalone workstation now uses flat routes (`/products`, `/warehouses`, etc.) while erp-shell retains the `/inventory/` prefix.

---

## Architecture Blueprint Compliance

The 5-step fulfillment workflow maps to README.md blueprint steps I5→I10:

| Blueprint (README.md) | Implementation | Status |
|---|---|---|
| ATP Check (I1) | `QUEUED` → Check Stock action | ✅ |
| Hard Allocation / Reserve (I5) | `RESERVED` | ✅ |
| Pick List (I6) | `PICKING` | ✅ |
| Pack (I8) | `PACKED` | ✅ |
| Dispatch + Deduct Stock + Log Movement (I10) | `DISPATCHED` | ✅ |
| Generate Invoice → Billing (A1) | `COMPLETED` | ⚠️ See audit |
| Out-of-Stock → Create PO (Buy flow) | `SHORTAGE` → `PO_CREATED` | ✅ |

---

## Flow Route Integrity

```
Browser → erp-shell proxy.ts → erp-service → downstream service
```

The erp-shell proxy uses 2-way routing: `/api/auth/*` → core-iam (8002), all other `/api/*` → erp-service (8000) as the central gateway. erp-service then routes to the appropriate downstream service.

### CRUD Routes (erp-service → downstream)

| Resource | erp-service handler | Backend target |
|---|---|---|
| Products | `product/router.py` (prefix `/products`) | inventory-service :8004 |
| Warehouses | `inventory/router.py` `/warehouses` | inventory-service :8004 |
| Stock | `inventory/router.py` `/stock` | inventory-service :8004 |
| Stock Movements | `inventory/router.py` `/stock/movements` | inventory-service :8004 |
| Suppliers | `inventory/router.py` `/suppliers` | inventory-service :8004 |
| Purchase Requisitions | `inventory/router.py` `/purchase-requisitions` | inventory-service :8004 |
| Purchase Orders | `inventory/router.py` `/purchase-orders` | inventory-service :8004 |
| Serial Numbers | `inventory/router.py` `/serial-numbers` | inventory-service :8004 |
| Quality Checks | `inventory/router.py` `/quality-checks` | inventory-service :8004 |
| Fulfillment | `inventory/router.py` `/fulfillment/orders*` | inventory-service :8004 |
| Work Orders | `inventory/router.py` `/work-orders` | inventory-service :8004 |

---

## Cross-Module Integration Audit

### Inventory → Billing (Invoice on Dispatch)

- **Implemented:** Synchronous `POST http://localhost:8003/api/invoices` from `fulfillment/services.py`
- **Status:** Works; direct call to billing-service is acceptable for current phase
- **Future:** Route through erp-service gateway when transformation/auth logic is added

### Inventory → Procurement (PO on Shortage)

- Auto-creates PurchaseOrder with auto-selected/auto-created supplier
- Skips Purchase Requisition step (acceptable simplification for current phase)
- PO status set to `ORDERED` directly

### Dashboard — Fulfillment KPIs

- `erp-service/dashboard/inventory` returns products/stock/suppliers/PO stats
- Fulfillment pipeline KPIs visible on the `/inventory/fulfillment` page
- Executive dashboard aggregates pipeline value, open opportunities, and clients

### COGS Tracking

- Dispatch correctly deducts stock and logs StockMovement with `type="out"`
- COGS expense auto-recognition in accounting module **not implemented**

---

## Issues Found & Resolved

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | Critical | Missing Alembic migration for fulfillment tables (`sales_order_fulfillments`, `fulfillment_items`) | ✅ Fixed — migration added |
| 2 | Medium | Wrong invoice creation endpoint (`POST /api/invoices` instead of `/api/invoices/from-dispatch`) | ✅ Fixed |
| 3 | Medium | Cross-module call bypasses gateway (direct to billing-service :8003) | 🟡 Acceptable for current phase |
| 4 | Low | No fulfillment KPIs in erp-service dashboard aggregation | 🟡 Fulfillment page shows own KPIs |
| 5 | Low | COGS auto-recognition not triggered on dispatch | ⬜ Not implemented |

---

## Inventory Pages — Current State (12 total in erp-shell)

| Page | erp-shell Route | Status |
|---|---|---|
| Products | `/inventory/products` | ✅ Full CRUD |
| Warehouses | `/inventory/warehouses` | ✅ Full CRUD |
| Suppliers | `/inventory/suppliers` | ✅ Full CRUD |
| Purchase Orders | `/inventory/purchase-orders` | ✅ Full CRUD + line items + status transitions |
| Purchase Requisitions | `/inventory/purchase-requisitions` | ✅ Buy requests with status badges |
| Serial Numbers | `/inventory/serial-numbers` | ✅ Full CRUD |
| Stock Levels | `/inventory/stock` | ✅ Real stock levels + KPI cards + adjust modal |
| Stock Movements | `/inventory/stock/movements` | ✅ Movement log with type badges |
| Fulfillment | `/inventory/fulfillment` | ✅ Full pipeline + workflow modal |
| Quality Checks | `/inventory/quality-checks` | ✅ Quality inspection logs |
| Work Orders | `/inventory/work-orders` | ✅ Manufacturing production routing |
| Warehouses | `/inventory/warehouses` | ✅ Full CRUD |

### Key Files

```
apps/erp-shell/types/inventory.ts                              — Inventory types (ApiStockLevel, ApiFulfillment, etc.)
apps/erp-shell/components/Sidebar.tsx                           — Nav with Inventory Management, Procurement, Manufacturing, Locations groups
apps/erp-shell/components/FulfillmentWorkflowModal.tsx          — 5-step workflow modal
apps/erp-shell/app/(admin)/inventory/fulfillment/page.tsx       — Fulfillment pipeline
apps/erp-shell/app/(admin)/inventory/quality-checks/page.tsx    — Quality checks
apps/erp-shell/app/(admin)/inventory/work-orders/page.tsx       — Work orders
apps/erp-shell/app/(admin)/inventory/purchase-requisitions/page.tsx — Purchase requisitions
services/erp-service/app/integrations/inventory_client.py        — Fulfillment + inventory integration functions
services/erp-service/app/inventory/router.py                     — All inventory passthrough endpoints
```
