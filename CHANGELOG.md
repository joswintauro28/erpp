# Changelog

All notable changes to the DATAVEX ERP monorepo are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased] — 2026-08-26

### Added

- **File upload/storage pipeline (Phase 1-7 complete):** Full MinIO-backed presigned URL file system with upload, download, streaming, organization-scoped access, and pending-record cleanup.
- **`GET /api/files/:id/stream` endpoint** — 302 redirect to presigned MinIO URL for browser-native file downloads (fixes JSON-wrapping issue of `/download`).
- **`POST /api/files/cleanup-pending` endpoint** — TTL-based garbage collection of abandoned pending upload records (30-minute window).
- **`MINIO_PUBLIC_URL` config** — New `erp-service` setting to rewrite presigned URLs from internal Docker hostname to publicly-reachable MinIO domain.
- **`infrastructure/internal/`** — Complete internal/production deployment config with real domain names (`*.erp.datavex.com`), production secrets template, nginx config, and step-by-step deployment guide (`DEPLOY.md`).
- **MinIO nginx reverse proxy** — `minio.erp.local` server block in local nginx config, making presigned URLs reachable from browsers in Docker Compose.
- **Organization ID scoping on all file endpoints** — Prevents cross-tenant IDOR attacks by filtering `file_records` by `organization_id`.
- **`asyncio.to_thread` wrapping on all MinIO SDK calls** — Prevents event loop blocking on synchronous `minio` Python SDK operations.

### Changed

- **`erp-shell/proxy.ts`** — Added `/files/` → erp-service routing (preserving `/api` prefix), fixing 404 errors for file operations from the executive shell.
- **`billing-service` bank reconciliation `importFileById()`** — Now forwards the caller's JWT to erp-service and parses the JSON response to fetch actual file bytes from MinIO (was: no auth header + raw bytes parsing).
- **`DocumentCreateModal` (erp-shell + crm-ui)** — Sends `file_uri` instead of `file_id` to match the CRM Document model's `file_uri` column. Fetches existing file metadata on edit to populate `FileViewer`.
- **`FileViewer`** — Download/preview now uses `/api/files/{id}/stream` endpoint (302 redirect) instead of the JSON-wrapping `/download` endpoint.
- **MIME type validation** — `router.py` regex changed from `image/*` (literal string match, rejected all images) to `image/[a-z0-9.+_-]+` (matches real MIME types like `image/png`, `image/jpeg`).
- **`file_records` owner_id validation** — Changed from `gt=0` to `ge=0` in Pydantic schema to allow `ownerId=0` placeholder for unlinked uploads (e.g. bank statement import, new quotation attachments).
- **Setup hosts scripts** — Added `minio.erp.local` to both `.sh` and `.ps1` host entry scripts.

### Fixed

- **CRITICAL: MIME regex rejected all image uploads** — `image/*` in regex matched the literal string `"image/*"" not `image/png` or `image/jpeg`. All image uploads returned 400.
- **CRITICAL: erp-shell proxy 404 on file endpoints** — erp-shell stripped `/api` prefix then sent to erp-service, but the file router expected `/api/files/*`. All file calls from the executive shell returned 404.
- **CRITICAL: Cross-tenant IDOR on file endpoints** — No `organization_id` filtering. Any authenticated user could enumerate/download/delete any other tenant's files by guessing file IDs.
- **CRITICAL: File attachment contract mismatch** — Frontend sent `file_id` but CRM Document model expects `file_uri`. Uploads consumed MinIO storage and `file_records` rows, but no business record ever referenced them.
- **CRITICAL: confirm-upload never set checksum** — `checksum_sha256` stayed `NULL` after confirmation. The cleanup endpoint used `IS NULL` to find pending records, meaning it would delete ALL confirmed uploads.
- **CRITICAL: billing-service bank reconciliation import broken** — No JWT header forwarded to erp-service (401), and raw bytes parsed instead of JSON (corrupted data).
- **HIGH: Sync MinIO SDK calls blocked event loop** — `presigned_put_object`, `presigned_get_object`, `stat_object`, `remove_object` were synchronous, blocking FastAPI's async event loop.
- **HIGH: `delete_object` silently swallowed S3Errors** — Errors logged nowhere, orphaned objects in MinIO with no trace.
- **HIGH: No streaming/redirect endpoint for browser downloads** — `/download` returned JSON `{download_url: ...}` instead of the actual file. Browsers got JSON instead of the file content.
- **HIGH: `ownerId={0}` failed Pydantic validation** — 4 upload components used `ownerId={0}` but schema had `gt=0`. All these uploads returned 422.
- **HIGH: Editing documents showed dead FileViewer** — No metadata fetched on edit, so the FileViewer branch was always empty.
- **MEDIUM: No pending upload cleanup mechanism** — Abandoned uploads (user starts upload, never confirms) accumulated indefinitely in `file_records` and MinIO.
- **MEDIUM: Cleanup endpoint had no org scoping** — One tenant's cleanup could delete another tenant's pending records.
- **Docker: crm-service and inventory-service missing `openssl`** — Builder stage lacked `apt-get install openssl`, causing SSL errors during `pip install` through Docker Desktop proxy.

### Added

- **DESIGN.md** — Comprehensive design system documentation covering color tokens, typography, spacing, component specs, accessibility, motion, workstation architecture, conformance checklist, and design-debt register.

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
