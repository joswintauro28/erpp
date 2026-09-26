# DATAVEX ERP — Billing Service (`services/billing-service`) Agent Context

This backend service manages invoices, payments, quotations, ledger entries, and financial tracking.

## 1. Tech Stack
- **Framework:** NestJS 11
- **Language:** TypeScript
- **Port:** 8003
- **Database ORM:** Prisma Client (default `@prisma/client`)
- **Database Target:** `erp_billing` (PostgreSQL)

## 2. API Design & Patterns
- **Auth Pattern:** Claims-based JWT verification using the shared `JWT_SECRET`. No database check is performed for session queries; standard route parameters are validated via `AuthGuard` and permissions via `PermissionsGuard` based on the JWT payload.
- **Snake Case Conversion:** All responses are automatically converted from camelCase to snake_case via the global `SnakeCaseInterceptor`.
- **Response Scope:** All query methods filter records using `organizationId` (`organization_id` in database) to enforce multi-tenant data isolation.

## 3. Document Numbering Standard
- **Format:** `[PREFIX]-[YYYYMM]-[NNNN]` (regex `^[A-Z]{2,4}-\d{6}-\d{4}$`), e.g. `INV-202608-0001`.
- **Prefixes:** Invoices/Vendor Bills `INV`, Quotations `QT`, Credit Notes `CN`, Debit Notes `DN`. Payments display as `PAY-YYYYMM-{id:04d}`.
- **Generation:** `DocumentNumberService` (`src/common/document-number.service.ts`, global module) auto-generates numbers via `next(prefix, table, column, organizationId, date)` — MAX-based per prefix+month, scoped by `organization_id`, never reusing deleted numbers. Client-supplied numbers are honored only when they match `DOCUMENT_ID_RE`.
- **DTO validation:** `invoiceNumber`, `quotationNumber`, `creditNoteNumber`, `debitNoteNumber` fields use `@Matches(DOCUMENT_ID_RE)`.
- **Event consumers:** Dispatched/vendor-bill invoices no longer carry client-generated numbers; the Invoices service assigns them.

## 4. Modules & Schema Models
- **Models:** Invoice (with InvoiceItem), Payment, CreditNote, DebitNote, Quotation, RecurringInvoice.
- **Endpoints:**
  - `GET/POST/PUT/DELETE /invoices` (with GST calculation CGST/SGST/IGST, balance enforcement)
  - `GET/POST /payments` (auto-updates invoice paid amount and status)
  - `GET/POST/PUT/DELETE /invoices/quotations` (includes conversion to invoice)
  - `GET/POST /invoices/credit-notes` (adjusts/cancels invoice balance)
  - `GET/POST /invoices/debit-notes` (increases invoice balance)
  - `/dashboard/billing` (revenue trends, overdue metrics, recent activity)

## 5. Database & Dev Commands
- **Database Push:**
  ```bash
  bunx prisma db push
  ```
- **Prisma Client Generation:**
  ```bash
  bunx prisma generate
  ```
- **Run Service:**
  ```bash
  bun nx run billing-service:dev
  ```
