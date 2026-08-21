# Changelog

All notable changes to the DATAVEX ERP monorepo are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased] — 2026-08-11

### Added

- **DESIGN.md** — Comprehensive design system documentation covering color tokens, typography, spacing, component specs, accessibility, motion, workstation architecture, conformance checklist, and design-debt register.
- **docs/PENDING_WORK.md section 8** — CRM flow readiness audit with HIGH/MEDIUM priority tags and stage-by-stage status matrix against the PROJECT.md blueprint.
- **Inventory Workstation new modules:**
  - `/fulfillment` — Sales order fulfillment pipeline Kanban (auto-PO on shortage, SO status sync).
  - `/quality-checks` — Quality inspection logs with status chips.
  - `/purchase-requisitions` — Purchase requisition buy requests with status badges.
  - `/work-orders` — Manufacturing production run routing and issue tracking.
  - `/serial-numbers` — Serial tracking with status filter (moved from legacy `/serials`).
- **ERP Shell CRM modules ported from crm-ui:**
  - `/crm/quotations` — CPQ create + approval overlay + convert-to-SO.
  - `/crm/sales-orders` — CRUD + approve/credit-check + release-hold flow.
  - `/crm/lead-discovery` — Search, scrape, import, and pinned leads.
  - `/crm/ai-assistant` — AI assistant chat with real-time DB counters.
  - `/crm/reports` — Analytics hub with conversion metrics.
- **Customer credit limit enforcement** — Per-customer `credit_limit` on CRM Customer record; credit check on SO approval with full exposure breakdown (`outstanding`, `credit_limit`, `available_credit`, `over_limit_amount`, `unlimited`).
- **Real-time notifications** — `NotificationBell` / `NotificationProvider` with type system (INFO, SUCCESS, WARNING, ERROR, ACTION), RabbitMQ consumer integration, and WebSocket updates.
- **Shared UI primitives added to ui-theme:** `Skeleton`, `Tabs`, `Toaster`, `ConfirmDialog`, `Tooltip`, `DropdownMenu`, `Switch`, `Checkbox`, `Avatar`, `Separator`, `Pagination`, `Breadcrumb`, `EmptyState`, `SearchInput`, `LoadingSpinner`, `NotificationBell`, `NotificationProvider`, `KpiCard`, `PageHeader`, `SectionHeading`, `ThemeToggle`.
- **Shared formatters** — `statusVariant(domain, status)` helper in `@datavex/ui-theme/utils/status.ts` replacing ~15 per-page status maps.
- **Font migration** — All workstation apps load `Montserrat`, `Inter`, and `JetBrains Mono` via `next/font/local` variable fonts instead of external CDN.
- **Loading skeletons** — Every page has a branded skeleton loader (`loading.tsx`).
- **Error pages** — 403 (`forbidden`), 404 (`not-found`), 500 (`error`) in all workstations.
- **Multi-step dialog** — Shared `MultiStepDialog` wizard with branded horizontal step indicator and `animate-step-in` animation.
- **Event-driven workflows** — RabbitMQ event bus integration for SO-to-fulfillment ingestion, shortage auto-PO, pending fulfillment auto-resume, and SO status sync from inventory lifecycle.

### Changed

- **Proxy simplified to 2-way gateway** — `erp-shell/proxy.ts` routes only `/api/auth/*` to core-iam (8002) and all other `/api/*` to erp-service (8000). Removed 3-way billing/inventory direct routing; erp-service is now the central API Gateway and Aggregator for all domains.
- **Inventory UI routes flattened** — All routes changed from `/inventory/*` to flat paths (e.g. `/products`, `/warehouses`, `/stock`, `/suppliers`, `/purchase-orders`, `/serial-numbers`). Sidebar restructured into 5 groups: Dashboard, Inventory Management, Procurement, Manufacturing, Locations.
- **Theme token overhaul** — "Refined Crimson and Brushed Gold" standardized across all workstations:
  - Sidebar/header chassis: `#3D1013` (Deep Maroon).
  - Primary brand: `#8C1D24` (Crimson Red).
  - Accent: `#E5B83C` (Milled Brass / Gold).
  - Controls unified to `h-9`, `rounded-md` (6px).
  - Cards and dialogs `rounded-xl` (12px).
  - Added `--shell-info`, `--shell-action`, `--shell-accent-surface`, `--shell-accent-text` tokens.
- **Badge system unified** — Single `Badge` primitive with semantic variants (`success`, `warning`, `danger`, `info`, `neutral`, `default`) replacing ~15 per-page `statusStyles` maps.
- **Control heights standardized** — All inputs, selects, buttons default to `h-9`; compact variant `h-7`.
- **Font references cleaned** — Inline `fontFamily` references in components replaced with standard `font-sans` utility class.
- **Light mode surface contrast** — `--shell-surface-alt`, `--shell-border`, `--shell-muted` values tuned for better readability.
- **CRM module scope clarified** — Marketing (M1) explicitly out of scope. Interaction and Service modules reserved for future Service-Desk module. 12 live entity types + 8 reserved.
- **Document ID standardization** — All services use `[PREFIX]-[YYYYMM]-[NNNN]` format. Clients must not fabricate IDs.
- **Sidebar collapsed width** — Updated to 260px expanded / 64px collapsed across all workstations.

### Fixed

- **Credit check rejection bug** — Removed hard-coded Rs.1,00,000 credit limit default that caused nearly every SO to be rejected. Now fails open when no limit is configured.
- **Billing accounting pages** — Aligned loading states and page styling to shell theme tokens.
- **Gateway wiring bugs** — Fixed CRM passthrough 404s in erp-shell (un-prefixed routes returning empty lists).
- **Theme consistency** — Resolved 8 distinct reds shipped in app code; collapsed to 4 semantic roles (brand, action, header, danger).
- **Radius mismatch** — Buttons (4px) vs inputs (8px) unified to `rounded-md` (6px).
- **Control height drift** — h-8/h-9/h-10 across apps standardized to h-9.
- **Lead-discovery scraper** — Relaxed header generator to prevent 403 errors on target sites.
- **Cross-module event envelopes** — Aligned event payload schemas between CRM, billing, and inventory services.

---

## Previous Notable Commits (pre-changelog)

The following is a summary of earlier notable changes captured from git history:

- `b3fa008` — Standardized document IDs across billing, CRM, and inventory services.
- `aa983b7` — Extended sales and inventory services with event-driven workflows.
- `5aebf58` — Integrated RabbitMQ event bus and expanded service consumers.
- `9f1ea56` — Added fulfillment workflows and updated modals across inventory, CRM, and erp-shell.
- `b2ae9eb` — Updated setup guide instructions.
- `d535516` — Scaffolded billing-service revenue module.
- `d59c4dd` — Improved billing-ui quotations listing page.
