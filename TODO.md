# DATAVEX ERP — File Handling & UI/UX TODO

> **Created:** 2026-08-26
> **Last verified:** 2026-08-27
> **Status:** ALL TASKS COMPLETE ✅

---

## 1. Executive Summary

All file preview/download issues have been resolved. All UI/UX audit findings have been addressed. Shared components have been created for consistency.

---

## 2. File Preview/Download Fixes — ALL DONE ✅

### 2.1 DocumentDetailsModal (crm-ui + erp-shell)

- [x] Removed `dataURLtoBlob()` helper entirely
- [x] Preview uses `/api/files/<id>/stream` for iframe (PDFs) and img (images)
- [x] Download uses `/api/files/<id>/stream` direct link
- [x] "Open in new tab" uses `/api/files/<id>/stream`
- [x] File list construction uses `file_id` instead of `file_data`

### 2.2 OpportunityDetailModal (crm-ui + erp-shell)

- [x] `quote.file_data` → `quote.file_id` for all checks
- [x] Paperclip icon shows when `quote.file_id` is truthy
- [x] Download/preview use `/api/files/${id}/stream`
- [x] Escape key handler on modal
- [x] Enter/Space keyboard support on expandable rows

### 2.3 SalesOrderDetailsModal (crm-ui + erp-shell)

- [x] `record.file_data` → `record.file_id` for existence check
- [x] Preview/download use `/api/files/${id}/stream`
- [x] Button guard `!!record.file_data` → `!!record.file_id`

### 2.4 QuotationDetailsModal (crm-ui + erp-shell)

- [x] Download `href` uses `/api/files/${record.file_id}/stream`
- [x] Guarded against null `file_id`

### 2.5 DocumentCreateModal (crm-ui + erp-shell)

- [x] `existingFile` loaded by `owner_type + owner_id`
- [x] FileViewer component uses `/api/files/<id>/stream`

---

## 3. Shared Components Created — ALL DONE ✅

### 3.1 FilePreviewModal (`packages/ui-theme/src/components/shared/file-preview-modal.tsx`)

- [x] Fetches metadata from `GET /api/files/:id`
- [x] Renders `image/*` → `<img>`, `application/pdf` → `<iframe>`, others → download card
- [x] Header shows file name, size, download button
- [x] Escape key to close
- [x] Zoom controls for images (ZoomIn/ZoomOut/Reset buttons)
- [x] Keyboard zoom: `+`/`-` to zoom, `0` to reset
- [x] Exported from ui-theme

### 3.2 SearchFilter (`packages/ui-theme/src/components/shared/search-filter.tsx`)

- [x] Debounced input (300ms default)
- [x] Search icon + clear button
- [x] Consistent styling across all apps
- [x] Exported from ui-theme

### 3.3 StatusFilter (`packages/ui-theme/src/components/shared/status-filter.tsx`)

- [x] Dropdown with consistent styling
- [x] Focus-visible ring for accessibility
- [x] Exported from ui-theme

### 3.4 Skeleton Patterns (`packages/ui-theme/src/components/shared/skeleton-patterns.tsx`)

- [x] `SkeletonTable` — table with header + N rows
- [x] `SkeletonCardGrid` — card grid with N cards
- [x] `SkeletonForm` — form with N input fields
- [x] `SkeletonPageHeader` — page header with title + subtitle + action
- [x] Exported from ui-theme

### 3.5 Error Handler (`packages/ui-theme/src/lib/error-handler.ts`)

- [x] `handleError(err, title?)` — extracts readable message + shows toast
- [x] `extractError(err, fallback?)` — returns readable string without toast
- [x] Exported from ui-theme

### 3.6 Color Maps (`packages/ui-theme/src/lib/color-maps.ts`)

- [x] `stageColors` — CRM pipeline stages
- [x] `statusColor()` — billing/payment statuses
- [x] `levelColors` — dunning escalation levels
- [x] `frequencyColors` — recurring invoice frequencies
- [x] Exported from ui-theme

### 3.7 File Helpers (`packages/ui-theme/src/lib/file-helpers.ts`)

- [x] `fetchFileRecord(ownerType, ownerId)` — fetches FileRecord by owner
- [x] `resolveFileIdFromFileUri(fileUri)` — parses s3:// URI
- [x] Exported from ui-theme

---

## 4. UI/UX Audit Fixes — ALL DONE ✅

### 4.1 Error Handling (U1 — HIGH)

- [x] 90 files across all 4 apps import and use `handleError()`
- [x] 0 `console.error()` remaining in production pages
- [x] 0 `console.log()` remaining in production pages
- [x] All silent `catch {}` blocks replaced with `handleError(err)` → toast

### 4.2 Keyboard Navigation (U2 — HIGH)

- [x] Escape key handler on OpportunityDetailModal (both apps)
- [x] Enter/Space + `tabIndex` + `role="button"` on expandable rows
- [x] Escape key on FilePreviewModal
- [x] Tab trapping handled natively by shadcn Dialog

### 4.3 Focus Styles (U5 — HIGH)

- [x] Global `focus-visible:ring-2 focus-visible:ring-[var(--shell-brand)]` in `globals.css`
- [x] Applies to all buttons, links, inputs, selects, textareas, role="button", tabindex elements

### 4.4 Skip-to-Content (U17 — LOW)

- [x] `<a href="#main-content" className="skip-to-content">` in all 4 app admin layouts
- [x] `id="main-content"` on `<main>` element in all 4 layouts
- [x] CSS in globals.css: sr-only → visible on focus

### 4.5 Loading States (U9 — MEDIUM)

- [x] 0 routes missing `loading.tsx` across all 4 apps
- [x] 14 new skeleton loading files created
- [x] 4 new shared skeleton pattern components

### 4.6 Search Consistency (U11 — MEDIUM)

- [x] `searchQuery` → `search` in billing-ui/aging + erp-shell/aging
- [x] `cfSearchQuery` → `search` in billing-ui/reports
- [x] 0 inconsistent search state naming remaining
- [x] Shared `SearchFilter` component with debounce created

### 4.7 Design Tokens (U6/U7 — MEDIUM)

- [x] `stageColors` deduplicated — imported from shared `color-maps.ts`
- [x] `bg-[#0ea5e9]` → `bg-[var(--shell-info)]` in Progress bars
- [x] `bg-[#10b981]` → `bg-[var(--shell-success)]` in Progress bars
- [x] Inline `style="color: #10b981"` → `var(--shell-success)` in QuotationDetailsModal
- [x] 0 hardcoded hex colors remaining in `bg-[#...]` classNames
- [x] Fallback `stageColors` defaults use theme variables

### 4.8 Button/Badge Standards (U8/U13)

- [x] `BUTTON_STANDARDS.md` created in `packages/ui-theme/`
- [x] Documents variant/size guidelines, patterns, and rules

### 4.9 Spacing & Border Radius (U15/U8 supplement)

- [x] Spacing/border-radius guidelines documented in `globals.css` comments
- [x] Standardized radius: inputs → `rounded-md`, cards → `rounded-xl`, badges → `rounded-full`

---

## 5. Backend — ALL DONE ✅

### 5.1 Cross-Service File Fetching

- [x] billing-service bank reconciliation JWT forwarding (Phase 3)
- [x] Frontend apps proxy `/api/files/*` through erp-service

### 5.2 MinIO Migration Script

- [x] `services/erp-service/scripts/migrate_minio_keys.py` created
- [x] Queries all FileRecords, resolves client name from linked entities
- [x] Copies objects to `<client>/<type>/<key>` paths in MinIO
- [x] Updates database records, deletes old objects
- [x] Reports migration statistics

### 5.3 Entity Response Verification

- [x] CRM entities use `file_uri` column (s3://...) — backend stores URI, not file_id
- [x] Frontend resolves `file_id` via `/api/files?owner_type=X&owner_id=Y` endpoint
- [x] `fetchFileRecord()` helper provided for frontend use

---

## 6. Verification Matrix

| Check | Result |
|---|---|
| `file_data` references in detail modals | 0 (except interface definition) |
| `dataURLtoBlob` usage | 0 (removed) |
| `/api/files/<id>/stream` in modals | All 4 detail modal types |
| `handleError` usage | 90 files across all 4 apps |
| `console.error` in production | 0 |
| `console.log` in production | 0 |
| `searchQuery`/`cfSearchQuery` inconsistency | 0 |
| Missing `loading.tsx` files | 0 |
| `stageColors` duplication | 0 (imported from ui-theme) |
| Hardcoded `bg-[#...]` | 0 |
| Skip-to-content links | 4 (all admin layouts) |
| Keyboard handlers | Escape + Enter/Space + zoom |
| Shared components created | 7 (FilePreviewModal, SearchFilter, StatusFilter, SkeletonPatterns, ErrorHandler, ColorMaps, FileHelpers) |
| Migration script | Created at `services/erp-service/scripts/migrate_minio_keys.py` |
| Button/Badge documentation | Created at `packages/ui-theme/BUTTON_STANDARDS.md` |
