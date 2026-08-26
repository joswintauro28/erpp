# DATAVEX ERP — File Handling & UI/UX TODO

> **Created:** 2026-08-26
> **Context:** After migrating from base64 file storage to MinIO presigned URLs (Phases 1–7), all file **preview/view** logic in the frontend is broken. Files upload successfully to MinIO, but modals still try to render `file_data` (a base64 `data:` URL that no longer exists). This document tracks every affected location and the plan to fix it.

---

## 1. Executive Summary of the Problem

| What works | What's broken |
|---|---|
| File upload via `FileUpload` → MinIO presigned PUT | Every **preview** and **download** in detail modals reads `record.file_data` (base64) which is now `null`/empty |
| `FileViewer` component (used in DocumentCreateModal) | `FileViewer` calls `/api/files/<id>/download` which returns JSON `{ download_url }`, not a renderable URL |
| `/api/files/<id>/stream` endpoint (302 redirect) | Only used by `FileViewer` download; no modal uses it for inline preview |
| `client_name` scoped object keys | Existing objects still have flat keys (migration script needed) |

**Root cause:** The Phase 4 migration removed base64 columns from CRM models and replaced them with `file_uri` / `file_id` references, but the detail modals were never updated to resolve those references via the MinIO file API.

---

## 2. Affected Files — Broken Preview/Download

### 2.1 DocumentDetailsModal (crm-ui + erp-shell) — CRITICAL

**Files:**
- `apps/crm-ui/app/(admin)/documents/DocumentDetailsModal.tsx`
- `apps/erp-shell/app/(admin)/crm/documents/DocumentDetailsModal.tsx`

**Issue:** The entire preview sidebar (`renderFilePreview`) reads `activeFile.file_data` which is a base64 data URL. With MinIO, this field is empty. The `dataURLtoBlob()` helper, iframe `<src={file_data}>`, and `<img src={file_data}>` all render nothing.

**What needs to change:**
- [ ] Fetch the `FileRecord` by `file_id` from the document record
- [ ] Use `/api/files/<id>/stream` (302 redirect) as the `src` for `<iframe>` (PDFs) and `<img>` (images)
- [ ] Replace `dataURLtoBlob()` download with a direct link to `/api/files/<id>/stream`
- [ ] Replace the "Open in new tab" logic to use `/api/files/<id>/stream`
- [ ] Remove the stale `file_data` fallback path entirely

---

### 2.2 OpportunityDetailModal — Quotation Preview (crm-ui + erp-shell)

**Files:**
- `apps/crm-ui/app/(admin)/opportunities/OpportunityDetailModal.tsx`
- `apps/erp-shell/app/(admin)/crm/opportunities/OpportunityDetailModal.tsx`

**Issue:** `QuoteRow` checks `quote.file_data` for the paperclip icon, attached file section, and download link. The preview overlay (`previewQuote`) renders `file_data` in an iframe/img. All broken.

**What needs to change:**
- [ ] Replace `quote.file_data` checks with `quote.file_id` (check if truthy for icon/attachment section)
- [ ] Download link: change `href={quote.file_data}` → `href=/api/files/${quote.file_id}/stream`
- [ ] Preview overlay: fetch file record, use `/api/files/<id>/stream` as iframe/img src
- [ ] Show file name from `quote.file_name` or fetch from FileRecord `original_name`
- [ ] Handle the case where `file_id` exists but the file record is missing (graceful fallback)

---

### 2.3 SalesOrderDetailsModal (crm-ui + erp-shell)

**Files:**
- `apps/crm-ui/app/(admin)/sales-orders/SalesOrderDetailsModal.tsx`
- `apps/erp-shell/app/(admin)/crm/sales-orders/SalesOrderDetailsModal.tsx`

**Issue:** Lines 259–274 check `record.file_data` for an inline preview (iframe for PDF, img for images) and a download link. Also line 348 uses `!!record.file_data` to determine if an invoice file is attached (controls button disabled state).

**What needs to change:**
- [ ] Replace `record.file_data` existence check → `record.file_id`
- [ ] Preview: use `/api/files/${record.file_id}/stream` as src
- [ ] Download: `href=/api/files/${record.file_id}/stream`
- [ ] Button guard at line 348: change `!!record.file_data` → `!!record.file_id`

---

### 2.4 QuotationDetailsModal (crm-ui + erp-shell)

**Files:**
- `apps/crm-ui/app/(admin)/quotations/QuotationDetailsModal.tsx`
- `apps/erp-shell/app/(admin)/crm/quotations/QuotationDetailsModal.tsx`

**Issue:** Line 288 uses `href={record.file_data}` for a download link on the quotation's attached file.

**What needs to change:**
- [ ] Change `href={record.file_data}` → `href=/api/files/${record.file_id}/stream`
- [ ] Guard against `file_id` being null/0

---

### 2.5 DocumentCreateModal — FileViewer (crm-ui + erp-shell)

**Files:**
- `apps/crm-ui/app/(admin)/documents/DocumentCreateModal.tsx`
- `apps/erp-shell/app/(admin)/crm/documents/DocumentCreateModal.tsx`

**Issue:** `FileViewer` is rendered when `existingFile` is populated. It fetches via `/files?owner_type=document&owner_id=...` which returns `FileRecord` objects. The `FileViewer` component's `downloadFile()` and `openPreview()` already use `/api/files/<id>/stream` (fixed in Phase 1), so **this path mostly works**. But:
- The `existingFile` state is initialized to `null` and only set in the edit branch if `editRecord.file_uri` exists — if the record doesn't have `file_uri`, the viewer never shows.
- The `fileUri` state is set from `editRecord.file_uri` but the backend stores `uri` (s3://...), not a renderable URL.

**What needs to change:**
- [ ] On edit, always attempt to fetch `FileRecord` by `owner_type + owner_id` regardless of `file_uri`
- [ ] Remove the `fileUri` / `setFileUri` state (it's unused for rendering — `FileViewer` handles display)
- [ ] Ensure `existingFile` is populated correctly so the viewer shows when editing a document with an attachment

---

## 3. Shared Component Fixes

### 3.1 FileViewer Component (`packages/ui-theme/src/components/shared/file-viewer.tsx`)

**Current state:** Already updated in Phase 1 to use `/api/files/<id>/stream` for download and preview. **Mostly correct.**

**Remaining issues:**
- [ ] `downloadFile()` creates an `<a>` tag and clicks it — but the browser will navigate to the 302 redirect and download. This works for downloads but the `a.download` attribute may not work cross-origin with presigned URLs. Test and potentially use `fetch()` + `Blob` for reliable downloads.
- [ ] `openPreview()` uses `window.open()` with `/api/files/<id>/stream` — this opens a new tab with the 302 redirect. Works for images but PDFs may not render inline in all browsers. Consider embedding an `<iframe>` in a modal instead.

---

## 4. New Component: FilePreviewModal

**Purpose:** A shared, reusable modal for previewing any file from MinIO. Replace all inline preview hacks (iframe/img with data URLs) with this single component.

**Props:**
```tsx
interface FilePreviewModalProps {
  fileId: number | null;
  fileName?: string;
  mimeType?: string;
  open: boolean;
  onClose: () => void;
}
```

**Behavior:**
- [ ] On open, fetch file metadata from `GET /api/files/:id`
- [ ] Render based on `mime_type`:
  - `image/*` → `<img src=/api/files/:id/stream>` with zoom/pan controls
  - `application/pdf` → `<iframe src=/api/files/:id/stream>` with full-height layout
  - Others → download-only card with file icon + metadata
- [ ] Header shows file name, size, upload date
- [ ] Download button triggers `/api/files/:id/stream` download
- [ ] Keyboard shortcuts: Escape to close, arrow keys for prev/next if multiple files

**Where to place:** `packages/ui-theme/src/components/shared/file-preview-modal.tsx`

---

## 5. UI/UX Improvements

### 5.1 File Attachment Indicators in List Views

**Goal:** Show at a glance which records have attachments without opening them.

- [ ] **Requirements list** (ReqRow) — ✅ Already added (paperclip icon for `req.file_id`)
- [ ] **Quotations list** (QuoteRow) — ✅ Already checks `quote.file_data` → change to `quote.file_id`
- [ ] **Sales Orders list** — Add paperclip icon next to SO number when `record.file_id` is truthy
- [ ] **Documents list** — Add file type icon (PDF/PNG badge) next to document title
- [ ] **Invoice list** (billing-ui) — Add attachment indicator for invoices with linked files

### 5.2 Improved Empty States

**Goal:** When no file is attached, show a clear CTA instead of "No file attached."

- [ ] Replace italic "No file attached." text with a dashed-border upload zone mini-card:
  ```
  ┌─────────────────────────────┐
  │  📎 No file attached        │
  │  [Upload File]              │
  └─────────────────────────────┘
  ```
- [ ] This should trigger the same FileUpload flow inline (no separate dialog needed)

### 5.3 File Preview in Detail Views

**Goal:** Show inline previews without opening new tabs.

- [ ] **DocumentDetailsModal:** Replace the right sidebar preview panel with the new `FilePreviewModal` or an inline `<iframe>/<img>` using `/stream` URLs
- [ ] **SalesOrderDetailsModal:** Show a compact preview card (thumbnail for images, icon + filename for PDFs) instead of the current broken iframe
- [ ] **OpportunityDetailModal quotation section:** Show thumbnail preview for attached quotation files
- [ ] All previews should have a "Full Screen" button that opens `FilePreviewModal`

### 5.4 Upload UX Improvements

- [ ] **Drag-and-drop feedback:** Already improved in the FileUpload revamp ✅
- [ ] **Multiple file support:** Add `multiple` prop usage in modals that currently only allow single file
- [ ] **Replace existing file:** When a file is already attached, show it with a "Replace" button instead of hiding the upload zone
- [ ] **File type validation feedback:** Show accepted types in the drop zone (currently shows raw accept string — clean it up)

### 5.5 Consistent File Handling Pattern

**Goal:** Every modal that deals with files should follow the same pattern:

1. **State:** `fileId: number | null` (not `file_data`, not `file_uri`)
2. **Upload:** `FileUpload` component → `onUpload(record) => setFileId(record.id)`
3. **Display:** Fetch `FileRecord` by ID → show `FileViewer` or inline preview via `/stream`
4. **Download:** `<a href=/api/files/${id}/stream download>` 
5. **Delete:** `DELETE /api/files/${id}` → `setFileId(null)`
6. **Submit:** Include `file_id` in the entity creation/update payload

---

## 6. Backend Considerations

### 6.1 Missing `file_id` in Entity Responses

Some CRM entities (documents, quotations, sales orders) may not return `file_id` in their API responses even though the data exists. Verify:

- [ ] Document model includes `file_id` or `file_uri` in its response schema
- [ ] Quotation model includes `file_id` in its response
- [ ] Sales Order model includes `file_id` in its response
- [ ] Requirement model includes `file_id` in its response (new field added for file uploads)

### 6.2 Cross-Service File Fetching

When billing-service or crm-service needs to display a file uploaded via erp-service:

- [ ] The `GET /api/files/:id/stream` endpoint requires authentication — callers must forward the JWT
- [ ] The billing-service bank reconciliation already handles this (Phase 3 fix) ✅
- [ ] Frontend apps proxy `/api/files/*` through erp-service (port 8000) — verify all proxies route this correctly

### 6.3 MinIO Object Key Migration Script

Existing files have flat keys (`<uuid>_<name>`). New uploads use `<client>/<domain>/<uuid>_<name>`. A one-time migration is needed:

- [ ] Write a Python script that:
  1. Queries all `FileRecord` rows
  2. For each record, resolves the client name from the linked entity (document account, quotation account, etc.)
  3. Constructs the new key: `<client_name>/<owner_type>/<old_key>`
  4. Copies the object in MinIO to the new key (using `copy_object`)
  5. Updates the `object_key` and `uri` in the database
  6. Deletes the old object
  7. Reports success/failure counts
- [ ] Run as a one-time Alembic migration or standalone script in `services/erp-service/scripts/`

---

## 7. Priority Order

| Priority | Task | Impact |
|---|---|---|
| **P0** | Fix DocumentDetailsModal preview (both apps) | Core document management is unusable |
| **P0** | Fix OpportunityDetailModal quotation preview (both apps) | Quotation attachments invisible |
| **P0** | Fix SalesOrderDetailsModal preview + file guard (both apps) | Invoice file previews broken |
| **P0** | Fix QuotationDetailsModal download link (both apps) | Download links point to empty data URLs |
| **P1** | Create shared `FilePreviewModal` component | Eliminates duplicated preview code |
| **P1** | Fix DocumentCreateModal `existingFile` loading | Edit mode doesn't show attached file |
| **P1** | Verify backend entity responses include `file_id` | Frontend can't know what file to fetch |
| **P2** | Add file attachment indicators to all list views | UX improvement |
| **P2** | Improve empty state upload CTAs | UX improvement |
| **P2** | Write MinIO object key migration script | Data consistency for existing files |
| **P3** | File type badges in list views | Visual polish |
| **P3** | Drag-and-drop reorder for multi-file uploads | Power-user feature |
| **P3** | Keyboard shortcuts in FilePreviewModal | Accessibility |

---

## 8. Testing Checklist

After implementing the fixes:

- [ ] Upload a PDF to a Document → open DocumentDetailsModal → preview renders inline
- [ ] Upload an image to a Quotation → open OpportunityDetailModal → preview renders in overlay
- [ ] Upload an invoice file to a Sales Order → open SalesOrderDetailsModal → preview renders
- [ ] Download any attached file → file downloads correctly via presigned URL
- [ ] Edit a Document with an existing attachment → FileViewer shows the file
- [ ] Delete an attached file → preview disappears, upload zone reappears
- [ ] Upload with `clientName` → verify MinIO path is `<client>/<domain>/<uuid>_<name>`
- [ ] Test all 4 frontend apps (erp-shell, crm-ui, billing-ui, inventory-ui)
- [ ] Test in both light and dark themes
- [ ] Test on mobile viewport (responsive layout)

---

# UI/UX AUDIT — Findings & Remediation

> **Source:** Automated pattern analysis + manual code review across 291 TSX files.
> **Full audit:** See `AUDIT_REPO.md` §9.

---

## 10. Error Handling & User Feedback

### 10.1 Silent Error Swallowing (U1 — HIGH)

**Problem:** ~50 catch blocks across all 4 apps silently discard errors. Users perform destructive actions (delete, status change, create) and get no feedback when it fails.

**Affected pages:**
- billing-ui: accounts, expenses, ledger, periods, reports, dunning, credit-notes, debit-notes, invoices
- crm-ui: contacts, customers, documents, leads
- erp-shell: quotations, fulfillment, lead-discovery

**Tasks:**
- [ ] Create `packages/ui-theme/src/lib/error-handler.ts` with `handleError(err, toast?)` utility
- [ ] Replace all silent `catch { }` blocks in billing-ui (15+ occurrences)
- [ ] Replace all silent `catch { }` blocks in crm-ui (8+ occurrences)
- [ ] Replace all silent `catch { }` blocks in erp-shell (10+ occurrences)
- [ ] Replace all `console.error()` calls with toast notifications (20 occurrences)
- [ ] Verify all error states show user-visible feedback

### 10.2 Inconsistent Error Display (U18 — LOW)

**Problem:** 4 different error display patterns: red `destructive` divs, custom `bg-red-50` divs, toast notifications, and console.error.

**Tasks:**
- [ ] Standardize on toast for transient errors (API failures, network issues)
- [ ] Standardize on inline banner for persistent errors (form validation, missing data)
- [ ] Remove all `console.error()` from production pages

---

## 11. Accessibility

### 11.1 Zero Keyboard Navigation (U2 — HIGH)

**Problem:** 0 `onKeyDown`/`onKeyUp`/`onKeyPress` handlers across the entire codebase. No modal supports Escape (except browser default). No table supports arrow keys. No dropdown supports keyboard selection.

**Tasks:**
- [ ] Add Escape key handler to all Dialog/Modal components
- [ ] Add arrow key navigation to all custom select/dropdown components
- [ ] Add Enter/Space handler to all expandable table rows (ReqRow, QuoteRow)
- [ ] Add keyboard activation to all drag-and-drop upload zones
- [ ] Add Tab trapping to all modal dialogs

### 11.2 Missing Focus Styles (U5 — HIGH)

**Problem:** Only 70 elements have `focus:` or `focus-visible:` styles. Most interactive elements have invisible focus indicators in dark theme.

**Tasks:**
- [ ] Add global focus-visible styles in `packages/ui-theme/src/globals.css`:
  ```css
  [role="button"], button, a, input, select, textarea {
    @apply focus-visible:ring-2 focus-visible:ring-[var(--shell-brand)] focus-visible:ring-offset-2;
  }
  ```
- [ ] Audit all custom interactive components for focus styles
- [ ] Test keyboard navigation through all major flows

### 11.3 Missing Skip-to-Content Link (U17 — LOW)

**Tasks:**
- [ ] Add `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>` to all 4 app layouts
- [ ] Add `id="main-content"` to main content area in all layouts

---

## 12. Form UX

### 12.1 Missing Form Validation (U4 — HIGH)

**Problem:** 253 of 281 inputs have no `required`, `pattern`, `minLength`, or `maxLength` attributes. No client-side validation library is used.

**Tasks:**
- [ ] Add `required` attribute to all mandatory form fields across all apps
- [ ] Add `minLength`/`maxLength` to all text inputs
- [ ] Add `min`/`max` to all number inputs
- [ ] Create shared zod validation schemas matching backend DTOs
- [ ] Add real-time validation feedback (red border + message on blur)
- [ ] Disable submit buttons during submission (verify 64/57 ratio — some pages missing)

### 12.2 Inconsistent Submit Button States

**Problem:** Most pages disable the submit button during submission, but the pattern is inconsistent.

**Tasks:**
- [ ] Audit all form submit buttons for `disabled={submitting}` pattern
- [ ] Add loading spinner to all submit buttons during submission
- [ ] Prevent double-click submissions with loading state lock

---

## 13. Design Token Consistency

### 13.1 Hardcoded Hex Colors (U7 — MEDIUM)

**Affected files:**
- `apps/crm-ui/app/(admin)/reports/page.tsx:166,189` — `bg-[#0ea5e9]`, `bg-[#10b981]`
- `apps/erp-shell/app/(admin)/crm/reports/page.tsx:166,189` — same
- `apps/crm-ui/app/(admin)/quotations/QuotationDetailsModal.tsx:146` — `style="color: #10b981"`
- `apps/erp-shell/app/(admin)/crm/quotations/QuotationDetailsModal.tsx:146` — same

**Tasks:**
- [ ] Replace `bg-[#0ea5e9]` → `bg-[var(--shell-info)]`
- [ ] Replace `bg-[#10b981]` → `bg-[var(--shell-success)]`
- [ ] Replace inline `style="color: #10b981"` → `className="text-[var(--shell-success)]"`
- [ ] Add lint rule to prevent hardcoded hex in className/inline styles

### 13.2 Duplicated Color Maps (U6 — MEDIUM)

**Affected files:**
- `stageColors` — duplicated in crm-ui + erp-shell OpportunityDetailModal
- `statusColor()` — duplicated in billing-ui + erp-shell dashboard
- `levelColors` — duplicated in billing-ui + erp-shell dunning
- `frequencyColors` — duplicated in billing-ui + erp-shell recurring-invoices
- `categoryColors` — erp-shell expenses (unique)
- `roleColors` — erp-shell team (unique)

**Tasks:**
- [ ] Create `packages/ui-theme/src/lib/color-maps.ts` with all shared color maps
- [ ] Export `stageColors`, `statusColor`, `levelColors`, `frequencyColors`
- [ ] Replace all local definitions with imports from ui-theme
- [ ] Remove duplicated code from crm-ui and erp-shell

---

## 14. Component Consistency

### 14.1 Inconsistent Page Headers (U3 — HIGH)

**Problem:** 4 different heading styles used across pages. Some use `PageHeader` from ui-theme, most don't.

**Tasks:**
- [ ] Audit all page headings across all 4 apps
- [ ] Replace ad-hoc `<h1>` with `<PageHeader>` from ui-theme for all list/table pages
- [ ] Reserve `text-3xl` for dashboard hero headings only
- [ ] Add `font-heading` consistently to all page titles

### 14.2 Inconsistent Button Usage (U8 — MEDIUM)

**Tasks:**
- [ ] Audit all Button usages and document variant/size guidelines
- [ ] Remove `secondary` variant if identical to `neutral` (only 2 uses)
- [ ] Standardize icon button sizes: `icon-sm` for table actions, `icon` for standalone
- [ ] Create `BUTTON_STANDARDS.md` in packages/ui-theme documenting conventions

### 14.3 Inconsistent Badge Usage (U13 — LOW)

**Tasks:**
- [ ] Audit all Badge usages and map to consistent variants:
  - Success → `neutral` with green text
  - Warning → `outline` with amber text
  - Error → `destructive`
  - Info → `outline`
- [ ] Remove hardcoded Badge colors (should use variants only)

### 14.4 Duplicated SectionHeading (U14 — LOW)

**Tasks:**
- [ ] Remove local `SectionHeading` definition from `billing-ui/dashboard/page.tsx`
- [ ] Ensure all pages import from `@datavex/ui-theme`

---

## 15. Layout & Responsive Design

### 15.1 No Responsive Table Fallback (U12 — MEDIUM)

**Problem:** Tables scroll horizontally on mobile (only 18 have `overflow-x-auto`). No table implements a card-based mobile layout.

**Tasks:**
- [ ] Create `ResponsiveTable` component in ui-theme that:
  - Renders as `<table>` on `md:` and above
  - Renders as stacked cards on `sm:` and below
  - Accepts column definitions with `mobileRender` option
- [ ] Migrate all major list tables to `ResponsiveTable`
- [ ] Test all tables on 375px viewport width

### 15.2 Missing Pagination (U10 — MEDIUM)

**Problem:** Only the aging page has pagination. All other list pages render entire datasets.

**Tasks:**
- [ ] Create shared `PaginatedTable` or `usePagination` hook
- [ ] Implement client-side pagination for pages with < 200 records
- [ ] Implement server-side pagination for pages with > 200 records
- [ ] Add page size selector (10, 25, 50, 100)
- [ ] Add page navigation (prev/next/page numbers)

### 15.3 Missing Loading States (U9 — MEDIUM)

**Problem:** 3 erp-shell routes and 4 billing-ui routes missing `loading.tsx`.

**Tasks:**
- [ ] Add `loading.tsx` with Skeleton placeholders to all missing routes
- [ ] Verify all Suspense boundaries show loading states
- [ ] Create shared skeleton patterns for tables, cards, and forms

---

## 16. Search & Filtering

### 16.1 Inconsistent Search State (U11 — MEDIUM)

**Problem:** 3 different naming conventions for search state: `search`, `searchQuery`, `cfSearchQuery`.

**Tasks:**
- [ ] Standardize on `search` / `setSearch` across all pages
- [ ] Rename `searchQuery` → `search` in billing-ui/aging
- [ ] Rename `cfSearchQuery` → `search` in billing-ui/reports
- [ ] Add debounce (300ms) to all search inputs
- [ ] Add search icon and clear button to all search inputs

### 16.2 Inconsistent Filter Patterns

**Tasks:**
- [ ] Create shared `SearchFilter` component with icon, input, clear button
- [ ] Create shared `StatusFilter` component with dropdown
- [ ] Standardize filter state management pattern across all pages

---

## 17. Spacing & Visual Polish

### 17.1 Inconsistent Spacing Scale (U15 — LOW)

**Tasks:**
- [ ] Document spacing guidelines:
  - `gap-2` — tight inline groups (icon + text)
  - `gap-3` — form fields, list items
  - `gap-4` — card grids, section dividers
  - `space-y-4` — page sections
  - `space-y-6` — major sections
- [ ] Audit and normalize spacing across all pages

### 17.2 Inconsistent Border Radius (U8 supplement)

**Counts:** `rounded-md` 319×, `rounded-full` 283×, `rounded-lg` 250×, `rounded-xl` 168×.

**Tasks:**
- [ ] Standardize: inputs → `rounded-md`, cards → `rounded-xl`, badges → `rounded-full`, buttons → `rounded-md`
- [ ] Audit all Card usages for consistent `rounded-xl`

### 17.3 Missing Skeleton Loading Patterns (U16 supplement)

**Tasks:**
- [ ] Create shared skeleton components: `SkeletonTable`, `SkeletonCard`, `SkeletonForm`
- [ ] Replace all `Loader2 animate-spin` full-page loaders with Skeleton where appropriate
- [ ] Add skeleton loading to all data-fetching pages

---

## 18. Priority Order

| Priority | Task | Impact |
|---|---|---|
| **P0** | Fix silent error swallowing (U1) | Users lose trust when actions fail silently |
| **P0** | Add keyboard navigation to modals (U2) | Accessibility compliance + power users |
| **P0** | Add focus-visible styles globally (U5) | Keyboard users can't see where focus is |
| **P0** | Standardize page headers (U3) | Visual hierarchy inconsistency |
| **P1** | Add form validation (U4) | Prevent bad data + improve UX |
| **P1** | Create shared color maps (U6) | Code duplication + inconsistency |
| **P1** | Fix hardcoded hex colors (U7) | Theme toggle broken for these elements |
| **P1** | Add responsive table fallback (U12) | Mobile unusable for list views |
| **P1** | Add pagination to list views (U10) | Performance + usability with large datasets |
| **P2** | Standardize Button/Badge usage (U8/U13) | Visual consistency |
| **P2** | Add missing loading.tsx files (U9) | Blank screens during navigation |
| **P2** | Standardize search/filter patterns (U11) | UX consistency |
| **P2** | Add skip-to-content link (U17) | Accessibility compliance |
| **P3** | Normalize spacing scale (U15) | Visual polish |
| **P3** | Normalize border radius (U8 supplement) | Visual polish |
| **P3** | Add skeleton loading patterns (U16 supplement) | Perceived performance |
| **P3** | Remove console.error from production (U16) | Code hygiene |
