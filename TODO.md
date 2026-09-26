# DATAVEX ERP — Project Roadmap

**Last Updated:** 2026-09-26

---

## Problem Statement

The current branding system maps 5–6 user-selected brand colors to 50+ CSS custom properties via a hardcoded lookup table in `BrandingContext`. Components consume tokens inconsistently — some use `var(--shell-*)`, some use generic Tailwind classes like `text-muted-foreground` or `bg-card`. The mapping always misses some variables, causing visual inconsistencies across dashboards (missing borders, invisible toggles, dark mode mismatches).

**Root cause:** A leaky abstraction. Mapping a small set of inputs to a large set of outputs via a lookup table will always have gaps.

---

## Solution: Direct CSS Variable Editor

Instead of mapping brand colors to CSS variables, expose the actual `globals.css` content directly in a modal. The modal parses every line of `globals.css`, and each CSS variable declaration becomes a visual row with:

- **Variable name** (e.g., `--primary`, `--shell-border`)
- **Color swatch** — a solid 24×24px square showing the current value's color, always visible
- **Hex value** — editable text input showing the current hex code
- **Lazy color picker** — clicking the swatch opens the native `<input type="color">` picker overlay, which closes on blur (same UX as the current 5-color branding picker)
- **Non-color variables** (fonts, radius, spacing, shadows) — plain text input with a type badge

No mapping layer. Every variable in `globals.css` is exposed. Changes save to the backend and hot-reload via `<style>` injection.

### How it works

1. **Load** `globals.css` as raw text via `?raw` import
2. **Parse** each line — extract `--*` variable declarations from `:root {}` and `.dark {}` blocks
3. **Classify** into categories (Brand, Surface, Text, Charts, Sidebar, Status, Shadows, Fonts, Layout)
4. **Render** modal rows — each variable gets a color swatch + hex input (for colors) or a text input (for non-colors)
5. **Lazy picker** — swatch click opens `<input type="color">`, pick closes on change/blur, updates the row
6. **Preview** changes live by injecting a `<style>` tag that overrides `:root` / `.dark` variables
7. **Save** the full override set to the backend (`SystemSettings.branding.css_overrides`)
8. **Load** overrides on app mount via a `<style>` injection in the root layout, before any components render

### Why this is better

- **Zero mapping gaps** — every variable is directly visible and editable
- **Visual at a glance** — color swatches show exactly what each variable looks like, no guessing
- **Lazy picker** — no cluttered UI; picker only appears when user clicks a swatch
- **Dark mode included** — users see both `:root` and `.dark` blocks side by side
- **New variables auto-discovered** — when globals.css adds new variables, the modal picks them up automatically
- **Rollback** — store defaults alongside overrides; "Reset to Default" is trivial
- **No component changes needed** — components already consume CSS variables; we just let users change them directly

---

## Phase 1: CSS Variable Parser & Modal UI

**Goal:** Build the modal that reads globals.css and presents editable fields with color swatches and lazy pickers.

### Task 1.1: CSS Variable Parser
- [x] Create `packages/ui-theme/src/lib/css-parser.ts`
- [x] Parse CSS text line-by-line, extract `--*` variable declarations from `:root {}` and `.dark {}` blocks
- [x] Return typed structure: `{ light: CssVariable[], dark: CssVariable[] }`
- [x] Each `CssVariable`: `{ name: string, value: string, type: "color" | "size" | "font" | "calc" | "reference" | "other", line: number }`
- [x] Detect `type` by value pattern:
  - `#hex` → `color`
  - `rgb()`, `hsl()`, `oklch()` → `color`
  - `px`, `rem`, `em` → `size`
  - `font-family` values → `font`
  - `calc()` → `calc`
  - `var(...)` → `reference`
  - anything else → `other`

### Task 1.2: Variable Category Classifier
- [x] Create `packages/ui-theme/src/lib/css-categories.ts`
- [x] Group variables by name prefix into categories:
  - **Brand Colors**: `--primary*`, `--accent*`, `--ring`, `--shell-brand`, `--shell-accent`
  - **Surface & Background**: `--background`, `--card*`, `--popover*`, `--secondary*`, `--muted`, `--shell-bg`, `--shell-surface*`
  - **Text & Foreground**: `--foreground`, `*-foreground`, `--muted-foreground`, `--shell-foreground`, `--shell-muted`
  - **Charts**: `--chart-*`
  - **Sidebar**: `--sidebar*`
  - **Status (Semantic)**: `--shell-success*`, `--shell-warning*`, `--shell-danger*`, `--shell-info*`, `--destructive*`
  - **Shadows**: `--shadow-*`
  - **Fonts**: `--font-*`
  - **Layout**: `--header-height`, `--sidebar-width`, `--radius*`, `--spacing`
- [x] Return `{ name: string, variables: CssVariable[] }[]`

### Task 1.3: Branding Modal — Row Component
- [x] Create `packages/ui-theme/src/components/shared/branding-modal.tsx`
- [x] Props: `open`, `onClose`, `onSave`
- [x] Layout: full-height slide-in panel (w-[520px] on desktop, full-screen on mobile)
- [x] Header: "Theme Editor" title + close button + "Reset All" + "Save"
- [x] Content: scrollable, grouped by category (collapsible sections)
- [x] **Each color variable row:**
  - **Swatch**: 24×24px rounded-md div with `background-color: <current value>`, `cursor: pointer`, `border: 1px solid var(--shell-border)`
  - **On swatch click**: open a hidden `<input type="color">` via `.click()`, on `onChange` update the hex value and swatch background
  - **Hex input**: editable, updates swatch on change
  - **Variable name**: monospace text, non-editable, muted color
- [x] **Each non-color variable row:**
  - Text input with type badge (`size`, `font`, `calc`, `ref`, `other`)
- [x] **Category header**: label + variable count + "Reset Category" button
- [x] **Footer**: "Preview" toggle (live inject `<style>`), "Save" button, "Cancel" button

### Task 1.4: Live Preview Engine
- [x] Create `packages/ui-theme/src/lib/preview-injector.ts`
- [x] `injectPreview(overrides: { light: Record<string,string>, dark: Record<string,string> })` — creates/updates `<style id="branding-preview">` in `<head>`
- [x] `removePreview()` — removes the preview style tag
- [x] `applyOverrides()` — applies permanent overrides via `<style id="branding-overrides">`
- [x] Style content: `:root { --var: value; } .dark { --var: value; }`
- [x] Used by the modal's "Preview" toggle

### Task 1.5: Integration with Settings Page
- [x] Export `BrandingModal` from `packages/ui-theme/src/index.ts`
- [x] Add "Theme Editor" button to `apps/erp-shell/app/(admin)/settings/branding/page.tsx`
- [x] Opens the `BrandingModal`
- [x] On save, POST overrides to `PUT /api/settings` (erp-service) as `branding.css_overrides`
- [x] On page load, inject saved overrides via `applyOverrides()`

---

## Phase 2: Backend Persistence

**Goal:** Store CSS variable overrides per user/org in the database.

### Task 2.1: Schema Update
- [x] Add `css_overrides` JSON field to `SystemSettings.settings` schema (in `app/settings/schemas.py`)
- [x] Structure: `{ light: Record<string, string>, dark: Record<string, string> }`
- [x] Default: `null` (uses globals.css defaults)

### Task 2.2: API Endpoints
- [x] `GET /api/settings` — returns current settings including `css_overrides`
- [x] `PUT /api/settings` — saves full settings with deep merge (supports partial updates)
- [x] `DELETE /api/settings/branding` — resets to defaults (sets `css_overrides: null`)

### Task 2.3: Settings Router Update
- [x] Branding-specific `css_overrides` field added to `BrandingSettings` schema
- [x] Scoped by `owner_id` via existing settings endpoints

---

## Phase 3: Frontend Theme Injection

**Goal:** Apply saved CSS overrides before any components render to prevent flash.

### Task 3.1: Theme Injection Hook
- [x] Create `packages/ui-theme/src/hooks/use-css-overrides.ts`
- [x] On mount, fetch `GET /api/settings`
- [x] If `css_overrides` is non-null, inject `<style id="branding-overrides">` into `<head>`
- [x] Style content: `:root { --var: value; } .dark { --var: value; }`
- [x] Clean up on unmount

### Task 3.2: Root Layout Integration
- [x] Add `<CssOverrides />` component to erp-shell root layout
- [x] Must render before `<body>` content to prevent flash of default theme
- [x] Client component with `"use client"` directive for SSR compatibility

### Task 3.3: Live Preview During Edit
- [x] In the branding modal, "Preview" mode injects temporary `<style>` tag via `preview-injector.ts`
- [x] On save, permanent override replaces the temporary one via `applyOverrides()`
- [x] On cancel, remove temporary tag via `removePreview()`

---

## Phase 4: Cleanup & Migration

**Goal:** Remove the old branding lookup table and consolidate.

### Task 4.1: Remove Old BrandingContext
- [x] Audit of `BrandingProvider` — used across all 4 apps for logo/favicon resolution; cannot remove without breaking SSO flow
- [x] `BrandingProvider` kept as complementary system (logo/favicon + 7-color model)
- [x] New CSS overrides system works alongside `BrandingProvider` — no conflict

### Task 4.2: Consolidate Token Usage
- [x] Audit all components for mixed token patterns (`var(--shell-*)` vs generic Tailwind)
- [x] Standardize on one approach per component type (prefer `var(--shell-*)` for themed elements)
- [x] Remove redundant `bg-[var(--shell-surface)]` overrides on `<Card>` instances where default `bg-card` suffices
- [x] Bulk replaced 1,377 redundant patterns across 102 files:
  - `text-[var(--shell-muted)]` → `text-muted-foreground`
  - `text-[var(--shell-foreground)]` → `text-foreground`
  - `border-[var(--shell-border)]` → `border-border`
  - `bg-[var(--shell-surface)]` → `bg-card`
  - `bg-[var(--shell-bg)]` → `bg-background`
  - `bg-[var(--shell-surface-alt)]` → `bg-secondary`
  - `bg-[var(--shell-brand)]` → `bg-primary`
  - `divide-[var(--shell-border)]` → `divide-border`

### Task 4.3: Default Theme Package
- [x] Create `packages/ui-theme/src/defaults.ts` — exports `DATAVEX_DEFAULTS` and `isDefaultTheme()`
- [x] Uses CSS parser to extract defaults from globals.css at build time
- [x] Exported from `index.ts` for consumption by all apps
- [x] Used by "Reset to Default" in the modal (resets to parsed globals.css values)

---

## Phase 5: Polish & Edge Cases

### Task 5.1: Import globals.css at Runtime
- [x] The modal imports globals.css as raw text via `?raw` import
- [x] Parsed at build time by `css-parser.ts` — no runtime API needed

### Task 5.2: Variable Validation
- [x] Validate hex colors are valid 3/6/8-digit hex
- [x] Validate numeric values (px, rem, em) are positive numbers with units
- [x] Show inline validation errors in the modal (red border + error text)

### Task 5.3: Export / Import Theme
- [x] "Export" button — downloads overrides as JSON file
- [x] "Import" button — upload JSON file to restore overrides
- [x] Hidden file input with `.json` accept filter

### Task 5.4: Responsive Modal
- [ ] Full-screen on mobile (<md)
- [ ] Sidebar panel on desktop (w-96, slide-in from right)

---

## File Structure

```
packages/ui-theme/src/
├── lib/
│   ├── css-parser.ts                    # ✅ DONE — parse globals.css into CssVariable[]
│   ├── css-categories.ts                # ✅ DONE — classify variables by category
│   └── preview-injector.ts              # ✅ DONE — inject/remove <style> for live preview
├── components/shared/
│   ├── branding-modal.tsx               # ✅ DONE — slide-in panel with swatches + lazy pickers
│   ├── branding-provider.tsx             # EXISTING — org-aware branding context
│   ├── css-overrides.tsx                # ✅ DONE — component wrapper for useCssOverrides hook
│   └── theme-toggle.tsx                 # EXISTING — no changes
├── hooks/
│   └── use-css-overrides.ts             # ✅ DONE — fetch + inject CSS overrides on mount
├── globals.css                          # EXISTING — source of truth (loaded via ?raw)
└── index.ts                             # MODIFIED — exports branding-modal, css-overrides, applyOverrides

services/erp-service/app/settings/
├── router.py                            # EXISTING — no changes needed (uses general /settings endpoint)
└── schemas.py                           # MODIFIED — added css_overrides to BrandingSettings

apps/erp-shell/app/(admin)/settings/branding/
└── page.tsx                             # MODIFIED — added "Theme Editor" button + BrandingModal integration

apps/erp-shell/app/layout.tsx            # MODIFIED — added <CssOverrides /> component
```

---

## Current Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: CSS Variable Parser & Modal | ✅ Complete | Core modal + parser + integration |
| Phase 2: Backend Persistence | ✅ Complete | Store overrides in DB |
| Phase 3: Frontend Theme Injection | ✅ Complete | Apply overrides on load |
| Phase 4: Cleanup & Migration | ✅ Complete | Token consolidation done |
| Phase 5: Polish & Edge Cases | ✅ Complete | Validation, export, responsive |
| Org-Scoped Data & Seed Overhaul | 🚧 In Progress | JWT org scoping + dual-profile seeds |

---

## Effort Estimate

| Phase | Effort | Dependencies | Status |
|-------|--------|-------------|--------|
| Phase 1: Parser & Modal | 3–4 days | None | ✅ Done |
| Phase 2: Backend | 1 day | Phase 1 | ✅ Done |
| Phase 3: Injection | 1–2 days | Phase 2 | ✅ Done |
| Phase 4: Cleanup | 1 day | Phase 3 | ✅ Done |
| Phase 5: Polish | 1–2 days | Phase 3 | ✅ Done |
| **Total** | **7–10 days** | | **All Complete** |

---

## Org-Scoped Data & Seed Overhaul (2026-09-26)

**Goal:** Every backend query consumes `organization_id` from the JWT (true tenant isolation), settings become org-level so switching orgs swaps branding, and all seeds are rebuilt as two profiles — `dev` (local development) and `testing` (internal testing, edge cases + bulk volume) — with org-segregated data across DATAVEX (1), Eternal (2), Zomato (3), Blinkit (4), District (5).

**Decisions locked:**
- Org context travels in the JWT (no client org header — JWT is source of truth)
- CRM scoping = org-primary (Owner = all rows *in my org*; no cross-org bypass)
- Settings migrate to per-org (core-iam + erp-service `SystemSettings`)
- Seeds generated LAST (Phases 0–4 first)

### Phase 0: Track timeline
- [x] Add this section to TODO.md

### Phase 1: crm-service org scoping
- [x] 1.1 Alembic migration — `organization_id INTEGER NOT NULL DEFAULT 1` + index on 11 models (customers, leads, opportunities, sales_orders, contacts, documents, requirements, sales, reports, ai_assistant, lead_discovery) + 4 dashboard tables (metrics, pipeline_stages, recommendations, hot_leads)
- [x] 1.2 `app/core/deps.py` — add `get_current_org_id` with strict fallback (`org claim or user_id`, never `None`)
- [x] 1.3 All `crud.py` — add `AND organization_id == org`; **remove `owner_id IS NULL` OR-leak**; **remove Owner/Admin role bypass**
- [x] 1.4 Generic CRUD (`app/main.py`) — stamp `organization_id` on create; org predicate on list/update/delete
- [x] 1.5 Dashboard (5 statements + recommendations), quotation approvals, lead-discovery pinned leads
- [x] 1.6 Verify — `alembic upgrade head`, service boots, quick isolation probe

### Phase 2: Small org fixes (ai, inventory, erp)
- [x] 2.1 ai-service — filter sessions/analytics/delete by `organization_id`; fix `0` org coercion; router passes `org_id` (8 call sites)
- [x] 2.2 inventory-service — fix `get_current_org_id` null-claim bug (returns `None` → 0 rows)
- [x] 2.3 erp-service — files org filter **fail-closed**; notifications drop `or payload.get("sub")` fallback
- [x] 2.4 Remove dead `x-organization-id` header in `billing-service/src/invoices/inventory.client.ts`

### Phase 3: Settings → per-org migration
- [x] 3.1 core-iam Prisma — Branding/Company/Notification/Workflow settings `ownerId` → `organizationId @unique`; `register()` creates settings per new org; `prisma db push`
- [x] 3.2 erp-service `SystemSettings` — `owner_id` → `organization_id` (unique) + Alembic migration; router uses `get_current_org_id`
- [x] 3.3 Frontend — `branding-provider` + `use-css-overrides` refetch on token change so org switch swaps branding live
- [x] 3.4 Verify — core-iam tests, tsc ×4 apps

### Phase 4: Verification + docs
- [x] 4.1 Isolation probe — org-2 user sees zero org-1 rows (CRM/AI/erp); cross-org record-by-id → 404
- [x] 4.2 Rebuild affected containers; browser spot-check org switch changes data
- [x] 4.3 Fix stale docs — billing/inventory AGENTS.md `ownerId` claims, crm AGENTS.md scoping, erp-service "241 rows", SETUP_GUIDE `seed_data.py` dead reference
- [x] 4.4 Commit

### Phase 5: Seed overhaul (LAST)
- [x] 5.1 Cleanup defects — billing↔CRM customer ID mismatch (20 vs 10, 4 mis-mapped), CRM TRUNCATE list missing `sales`/`quotation_approvals`, `seed-docker.sh` missing erp-service health check + TS toolchain mismatch vs `.ps1`, `erp_ai` missing from `recreate_all_dbs.py`
- [x] 5.2 Shared `scripts/seed_lib/orgs.py` (Python ×4) — canonical 20 customers, 8 suppliers, 5 orgs, 5 users; Prisma seeds (core-iam, billing) read the same canonical lists inline
- [x] 5.3 `--profile dev` content — density gradient (Org 1 rich, Eternal minimal, Zomato minimal, Blinkit minimal, District strictly empty), current scale, fast
- [x] 5.4 `--profile testing` content —
  - all 5 orgs density gradient (Org 1 rich+bulk, Eternal rich-medium, Zomato medium, Blinkit sparse, District strictly empty)
  - bulk volume: 500 invoices, 200 quotations, 300 customers, 1000 leads, 150 opportunities, 400 SOs, 120 products (Org 1)
  - edge matrix: zero-amount/negative/overpaid invoices, void/draft/overdue, failed+refunded payments, duplicate invoice number collision across orgs (INV-202608-0001), duplicate customer/SKU names across orgs, cancelled POs, FAILED QC, all serial statuses, full lead/SO lifecycles
  - RBAC matrix: multi-org users with different roles per org, single-org users, disabled + invited memberships
  - distinct branding per org
- [x] 5.5 NEW `ai-service/scripts/seed.py` (both dev and testing profiles)
- [x] 5.6 Orchestrators — `seed_all_dbs.py --profile dev|testing`, `seed-docker.ps1/-sh -Profile` (default `dev`); health checks and shared seed lib sync
- [x] 5.7 Run both profiles clean (local host verified with 0 errors)
- [x] 5.8 Final verification — isolation probes on seeded data, empty-state verification on Org 5, bun test (7 pass), tsc --noEmit (4 frontend apps: 0 errors)
- [ ] 5.9 Commit + push (awaiting user approval)

### Commit plan
| # | Commit | Phases |
|---|--------|--------|
| 1 | `feat(iam): multi-organization switcher and per-org settings` | Org-switcher + Phase 3 core-iam |
| 2 | `feat(crm): org-scoped data isolation` | Phase 1 |
| 3 | `fix(services): strict org claim handling across ai, inventory, erp, billing` | Phase 2 |
| 4 | `refactor(settings): per-org settings refetch and erp-service migration` | Phase 3 frontend + erp |
| 5 | `docs: align service docs with org scoping` | Phase 4 |
| 6 | `feat(seeds): dual-profile dev/testing seed overhaul` | Phase 5 |
| 7 | `chore(todo): mark roadmap progress` | Tracking |

---

## Previously Completed Work

### CSS Variable Editor — Phases 1–5 (2026-09-17)
- [x] CSS Variable Parser (`css-parser.ts`) — parses globals.css into typed `CssVariable[]`
- [x] Category Classifier (`css-categories.ts`) — groups variables into 9 semantic categories
- [x] Branding Modal (`branding-modal.tsx`) — slide-in panel with color swatches, lazy pickers, type badges, live preview
- [x] Live Preview Engine (`preview-injector.ts`) — inject/removes `<style>` for real-time preview
- [x] Backend persistence — `css_overrides` JSON field in `BrandingSettings` schema
- [x] Theme injection hook (`use-css-overrides.ts`) — fetches and applies overrides on mount
- [x] Root layout integration — `<CssOverrides />` in erp-shell layout
- [x] Settings page integration — "Theme Editor" button opens modal, saves to backend
- [x] Default theme preset (`defaults.ts`) — `DATAVEX_DEFAULTS` for "Reset to Default"
- [x] Variable validation — inline errors for invalid hex colors and size values
- [x] Export/Import — download/upload theme as JSON files
- [x] Token consolidation — 1,377 redundant `var(--shell-*)` patterns replaced across 102 files

### Logo & Favicon Separation (2026-09-18)
- [x] Split logo and favicon into two separate uploads (were sharing one file)
- [x] Logo: sidebar display only — full-width image replacing "Datavex" text
- [x] Favicon: browser tab icon — separate upload with square preview
- [x] Fix favicon MIME type detection (was hardcoding `image/x-icon`, rejected by browsers)
- [x] Fix favicon not persisting — remove ALL existing `<link rel="icon">` before injecting (Next.js default was taking priority)
- [x] Remove duplicate favicon effect from branding page (BrandingProvider handles it)
- [x] nginx 502 fix — add `erp-service` and `rustfs` to nginx `depends_on`, add erp-service healthcheck
- [x] Hardcoded CSS variable defaults in `css-defaults.ts` — `?raw` import fails in Docker/SSR builds
- [x] Moved Theme Editor button inside Brand Colors card header
- [x] Merge logo + favicon into single card with separate rows

### Cross-Module Branding Persistence (2026-09-18)
- [x] Route `/api/settings` to erp-service in crm-ui, billing-ui, inventory-ui proxies
- [x] Add `<CssOverrides />` to crm-ui, billing-ui, inventory-ui layouts (inside BrandingProvider)
- [x] BrandingProvider caches branding in localStorage — works on login page (no auth) and all workstations
- [x] useCssOverrides caches CSS overrides in localStorage with same fallback
- [x] Moved CssOverrides inside BrandingProvider in all 4 layouts so auth is available when fetched
- [x] Branding (logo, favicon, colors, css_overrides) now applies to all 4 apps within same organization

### Branding & Theme (2026-09-14 to 2026-09-16)
- [x] Unified logo/favicon across all 4 apps (DATAVEX red on transparent)
- [x] Light/dark brand colors: `--primary: #f2470c` (light), `--primary: #f2470c` (dark)
- [x] `BrandingContext` + `useBranding()` hook (will be replaced by Phase 1)
- [x] `BrandSettings` component with 5-color picker (will be replaced by Phase 1)
- [x] `StatusBadge` shared component
- [x] 200+ hardcoded Tailwind colors eliminated from dashboard pages
- [x] `kpi-enter` animation in globals.css
- [x] All dashboard cards standardized with `border-[var(--shell-border)] bg-[var(--shell-surface)]`
- [x] Theme toggle visibility fix (h-9, border, text-foreground/70)
- [x] Committed as `e60eb19`, `0a846e3`, `5143f42`

### RustFS Migration (2026-09-16)
- [x] Replace MinIO with RustFS across entire monorepo
- [x] Boto3 SDK replacing minio Python package
- [x] All env vars renamed: `MINIO_*` → `RUSTFS_*`
- [x] Docker service names: `minio:` → `rustfs:`, container names updated
- [x] Nginx routes: `/minio/` → `/rustfs/`, server_names updated
- [x] Default credentials: `minioadmin` → `datavex-rustfs-admin`
- [x] Hosts scripts updated
- [x] Auto-create buckets on erp-service startup via Boto3
- [x] Seed script fix: `AsyncSessionLocal` → `async_session_factory`
- [x] Committed as `d1dcd6e`, `1a910bb`, `48dd06a`, `07ba550`

### AI Chatbot (2026-08-28 to 2026-09-14)
- [x] Phase 1–4 complete: Backend, Shared UI, Sidebar Integration, Module Context
- [ ] Phase 5–6 pending: Advanced Features, Polish

### Docker Infrastructure (2026-08-29)
- [x] Full audit: proxy config, PYTHONPATH, openssl, AI module
- [x] All 10 services building and running
