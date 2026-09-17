# DATAVEX ERP — Project Roadmap

**Last Updated:** 2026-09-16

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
- [ ] Create `packages/ui-theme/src/lib/css-parser.ts`
- [ ] Parse CSS text line-by-line, extract `--*` variable declarations from `:root {}` and `.dark {}` blocks
- [ ] Return typed structure: `{ light: CssVariable[], dark: CssVariable[] }`
- [ ] Each `CssVariable`: `{ name: string, value: string, type: "color" | "size" | "font" | "calc" | "reference" | "other", line: number }`
- [ ] Detect `type` by value pattern:
  - `#hex` → `color`
  - `rgb()`, `hsl()`, `oklch()` → `color`
  - `px`, `rem`, `em` → `size`
  - `font-family` values → `font`
  - `calc()` → `calc`
  - `var(...)` → `reference`
  - anything else → `other`

### Task 1.2: Variable Category Classifier
- [ ] Create `packages/ui-theme/src/lib/css-categories.ts`
- [ ] Group variables by name prefix into categories:
  - **Brand Colors**: `--primary*`, `--accent*`, `--ring`, `--shell-brand`, `--shell-accent`
  - **Surface & Background**: `--background`, `--card*`, `--popover*`, `--secondary*`, `--muted`, `--shell-bg`, `--shell-surface*`
  - **Text & Foreground**: `--foreground`, `*-foreground`, `--muted-foreground`, `--shell-foreground`, `--shell-muted`
  - **Charts**: `--chart-*`
  - **Sidebar**: `--sidebar*`
  - **Status (Semantic)**: `--shell-success*`, `--shell-warning*`, `--shell-danger*`, `--shell-info*`, `--destructive*`
  - **Shadows**: `--shadow-*`
  - **Fonts**: `--font-*`
  - **Layout**: `--header-height`, `--sidebar-width`, `--radius*`, `--spacing`
- [ ] Return `{ name: string, variables: CssVariable[] }[]`

### Task 1.3: Branding Modal — Row Component
- [ ] Create `packages/ui-theme/src/components/shared/branding-modal.tsx`
- [ ] Props: `open`, `onClose`, `onSave`
- [ ] Layout: full-height slide-in panel (w-[480px] on desktop, full-screen on mobile)
- [ ] Header: "Theme Editor" title + close button + "Reset All" + "Save"
- [ ] Content: scrollable, grouped by category (accordion or collapsible sections)
- [ ] **Each color variable row:**
  ```
  ┌──────────────────────────────────────────────────────┐
  │ [■■■■]  --primary          #f2470c        [input]   │
  │  swatch   variable name     hex value      text     │
  └──────────────────────────────────────────────────────┘
  ```
  - **Swatch**: 24×24px rounded-md div with `background-color: <current value>`, `cursor: pointer`, `border: 1px solid var(--shell-border)`
  - **On swatch click**: open a hidden `<input type="color">` via `.click()`, on `onChange` update the hex value and swatch background
  - **Hex input**: editable, updates swatch on change
  - **Variable name**: monospace text, non-editable, muted color
- [ ] **Each non-color variable row:**
  ```
  ┌──────────────────────────────────────────────────────┐
  │  --font-sans         "Plus Jakarta Sans"   [font]   │
  │  variable name       value                  badge    │
  └──────────────────────────────────────────────────────┘
  ```
  - Text input with type badge (`px`, `rem`, `font`, `calc`, `ref`)
- [ ] **Category header**: label + variable count + "Reset Category" button
- [ ] **Footer**: "Preview" toggle (live inject `<style>`), "Save" button, "Cancel" button

### Task 1.4: Live Preview Engine
- [ ] Create `packages/ui-theme/src/lib/preview-injector.ts`
- [ ] `injectPreview(overrides: { light: Record<string,string>, dark: Record<string,string> })` — creates/updates `<style id="branding-preview">` in `<head>`
- [ ] `removePreview()` — removes the preview style tag
- [ ] Style content: `:root { --var: value; } .dark { --var: value; }`
- [ ] Used by the modal's "Preview" toggle

### Task 1.5: Integration with Settings Page
- [ ] Add "Theme Editor" button to `apps/erp-shell/app/(admin)/settings/branding/page.tsx`
- [ ] Opens the `BrandingModal`
- [ ] On save, POST overrides to `PUT /api/settings/branding` (erp-service)
- [ ] On page load, inject saved overrides as `<style>` tag in root layout

---

## Phase 2: Backend Persistence

**Goal:** Store CSS variable overrides per user/org in the database.

### Task 2.1: Schema Update
- [ ] Add `css_overrides` JSON field to `SystemSettings.settings` schema (in `app/settings/schemas.py`)
- [ ] Structure: `{ light: Record<string, string>, dark: Record<string, string> }`
- [ ] Default: `null` (uses globals.css defaults)

### Task 2.2: API Endpoints
- [ ] `GET /api/settings/branding` — returns current CSS overrides
- [ ] `PUT /api/settings/branding` — saves CSS overrides
- [ ] `DELETE /api/settings/branding` — resets to defaults (sets `css_overrides: null`)

### Task 2.3: Settings Router Update
- [ ] Add branding-specific endpoints to `apps/erp-service/app/settings/router.py`
- [ ] Scope by `owner_id` (same as existing settings)

---

## Phase 3: Frontend Theme Injection

**Goal:** Apply saved CSS overrides before any components render to prevent flash.

### Task 3.1: Theme Injection Hook
- [ ] Create `packages/ui-theme/src/hooks/use-css-overrides.ts`
- [ ] On mount, fetch `GET /api/settings/branding`
- [ ] If `css_overrides` is non-null, inject `<style id="branding-overrides">` into `<head>`
- [ ] Style content: `:root { --var: value; } .dark { --var: value; }`
- [ ] Clean up on unmount

### Task 3.2: Root Layout Integration
- [ ] Add `<CssOverrides />` component to all 4 app root layouts
- [ ] Must render before `<body>` content to prevent flash of default theme
- [ ] Use `next/script` or inline `<head>` injection for SSR compatibility

### Task 3.3: Live Preview During Edit
- [ ] In the branding modal, "Preview" mode injects temporary `<style>` tag
- [ ] On save, permanent override replaces the temporary one
- [ ] On cancel, remove temporary tag

---

## Phase 4: Cleanup & Migration

**Goal:** Remove the old branding lookup table and consolidate.

### Task 4.1: Remove Old BrandingContext
- [ ] Delete `apps/erp-shell/contexts/BrandingContext.tsx`
- [ ] Remove `brandColors` mapping logic
- [ ] Remove `BrandColor` type definition
- [ ] Remove `BrandingProvider` from all root layouts
- [ ] Keep the `SystemSettings` model and API — just change what data it stores

### Task 4.2: Consolidate Token Usage
- [ ] Audit all components for mixed token patterns (`var(--shell-*)` vs generic Tailwind)
- [ ] Standardize on one approach per component type (prefer `var(--shell-*)` for themed elements)
- [ ] Remove redundant `bg-[var(--shell-surface)]` overrides on `<Card>` instances where default `bg-card` suffices (after confirming `--card` is correctly themed)

### Task 4.3: Default Theme Package
- [ ] Ship a "DATAVEX Default" preset in `packages/ui-theme/src/defaults.ts`
- [ ] This is the fallback when no overrides are saved
- [ ] Used by "Reset to Default" in the modal

---

## Phase 5: Polish & Edge Cases

### Task 5.1: Import globals.css at Runtime
- [ ] The modal needs the raw CSS text to parse — import `globals.css` as a raw string
- [ ] Use `?raw` import in Next.js: `import cssText from "@datavex/ui-theme/src/globals.css?raw"`
- [ ] Alternatively, serve the CSS as an API endpoint from erp-service

### Task 5.2: Variable Validation
- [ ] Validate hex colors are valid 3/6-digit hex
- [ ] Validate numeric values (px, rem) are positive numbers
- [ ] Show inline validation errors in the modal

### Task 5.3: Export / Import Theme
- [ ] "Export" button — download overrides as JSON file
- [ ] "Import" button — upload JSON file to restore overrides
- [ ] Useful for sharing themes across deployments

### Task 5.4: Responsive Modal
- [ ] Full-screen on mobile (<md)
- [ ] Sidebar panel on desktop (w-96, slide-in from right)

---

## File Structure

```
packages/ui-theme/src/
├── lib/
│   ├── css-parser.ts                    # NEW — parse globals.css into CssVariable[]
│   ├── css-categories.ts                # NEW — classify variables by category
│   └── preview-injector.ts              # NEW — inject/remove <style> for live preview
├── components/shared/
│   ├── branding-modal.tsx               # NEW — slide-in panel with swatches + lazy pickers
│   └── theme-toggle.tsx                 # EXISTING — no changes
├── hooks/
│   └── use-css-overrides.ts             # NEW — fetch + inject CSS overrides on mount
├── defaults.ts                          # NEW — default theme preset for "Reset"
└── globals.css                          # EXISTING — source of truth (loaded via ?raw)

services/erp-service/app/settings/
├── router.py                            # MODIFY — add branding CRUD endpoints
└── schemas.py                           # MODIFY — add css_overrides to settings schema

apps/*/app/(admin)/settings/branding/
└── page.tsx                             # MODIFY — add "Theme Editor" button

apps/*/app/layout.tsx                    # MODIFY — add <CssOverrides /> component
```

---

## Current Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: CSS Variable Parser & Modal | ⬜ Not Started | Core modal + parser |
| Phase 2: Backend Persistence | ⬜ Not Started | Store overrides in DB |
| Phase 3: Frontend Theme Injection | ⬜ Not Started | Apply overrides on load |
| Phase 4: Cleanup & Migration | ⬜ Not Started | Remove old branding system |
| Phase 5: Polish & Edge Cases | ⬜ Not Started | Validation, export, responsive |

---

## Effort Estimate

| Phase | Effort | Dependencies |
|-------|--------|-------------|
| Phase 1: Parser & Modal | 3–4 days | None |
| Phase 2: Backend | 1 day | Phase 1 |
| Phase 3: Injection | 1–2 days | Phase 2 |
| Phase 4: Cleanup | 1 day | Phase 3 |
| Phase 5: Polish | 1–2 days | Phase 3 |
| **Total** | **7–10 days** | |

---

## Previously Completed Work

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
