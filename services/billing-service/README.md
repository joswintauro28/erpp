# billing-service — Billing and Accounting Microservice

The Billing Service is a modular NestJS business domain running on **port 8003**, managing invoices, quotations, credit/debit adjustments, payment operations, and recurring invoice schedules.

---

## 1. Tech Stack
- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database ORM**: Prisma Client (default client `@prisma/client`)
- **Database Target**: `erp_billing` (PostgreSQL)
- **Response Format**: Automated conversion to snake_case via custom global `SnakeCaseInterceptor`.

---

## 2. API Endpoints
- `GET /invoices`: Full list of invoices with CGST/SGST/IGST tax rates calculations.
- `POST /payments`: Add invoice payments (automatically updates invoice paid amount and status).
- `POST /invoices/quotations/:id/convert`: Convert active quotations into finalized invoices.
- `POST /invoices/credit-notes`: Invoices credit adjustments.
- `GET /dashboard/billing`: Historical statistics aggregation (revenue, outstanding balances, payment status counts).

---

## 3. Run Scripts
- Dev Server: `bun nx run billing-service:dev` (runs on `http://localhost:8003`)
- Database Schema Deploy: `bunx prisma db push` and `bunx prisma generate`
- Docker: Builds via services/billing-service/Dockerfile (Alpine Node 24 builder, Bun package manager, production deps pruner, non-root user).
