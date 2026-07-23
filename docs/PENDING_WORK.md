# DATAVEX ERP — Pending Work Backlog

Items identified during the Accounts & Billing audit that are deferred for future implementation. These are ordered by category.

---

## 1. Event Broker / Message Queue Integration

**Status: 🔴 Not started**
**Depends on: Infrastructure decision (Kafka vs RabbitMQ vs Redis Streams)**

All flows below are currently approximated via synchronous REST calls. A central event bus should replace these once deployed.

- [ ] **Order.Approved → Inventory** — When a sales order is approved in CRM, publish event so inventory can run ATP check
- [ ] **Shipment.Dispatched → Billing** — When inventory dispatches stock, publish event so billing auto-generates the invoice (A1)
- [ ] **Shipment.Dispatched → COGS** — Same event triggers COGS expense recognition (F1)
- [ ] **PurchaseOrder.Created → AP** — When inventory creates a PO, publish event so billing creates the Accounts Payable entry (AP1)
- [ ] **Invoice.Paid → CRM/Notification** — When payment clears, notify CRM and notification service

---

## 2. Email & Notifications

**Status: 🔴 Not started**
**Depends on: SMTP / email service provider selection**

- [ ] **Send Invoice to Customer (A3)** — Email invoice as PDF when status changes to `sent`
- [ ] **Automated Dunning (A6)** — Scheduled job that sends overdue reminders at 7/14/30 days past due with escalation
- [ ] **Send Quotation to Customer** — Email quote as PDF when status changes to `sent`
- [ ] **Payment Receipt** — Email receipt on successful payment recording
- [ ] **Purchase Order Notifications** — Notify supplier/vendor contacts when PO is created
- [ ] **Credit/Debit Note Notifications** — Notify customer when notes are issued

---

## 3. Payment Gateway Integration

**Status: 🔴 Not started**
**Depends on: Payment processor selection (Razorpay / Stripe / PayPal / BillDesk)**

- [ ] **Payment Gateway API Integration (A7)** — Implement one-click checkout / payment link generation
- [ ] **Webhook Handler** — Handle payment success/failure callbacks from gateway
- [ ] **Payment Link in Invoice Email** — Include gateway payment link in invoice emails
- [ ] **Refund via Gateway** — Process refunds through the gateway API instead of manual recording
- [ ] **Bank Receipt Upload** — Allow manual bank receipt upload for non-gateway payments

---

## 4. Reports & Financial Closing

- [ ] **Actual P&L Calculation (F6)** — Current reports use hardcoded percentages. Needs real period-based aggregation from invoices, expenses, and ledger entries
- [ ] **Cash Flow Statement** — Missing from reports entirely. Needs to be computed from operating/investing/financing activities
- [ ] **Bank Reconciliation (F4)** — CSV/XLSX statement import with auto-matching by reference ID, amount, and date
- [ ] **Month-End Close Process (F5)** — Ledger locking, cut-off dates, close checklist with sign-off workflow
- [ ] **Revenue Recognition Schedule (F2)** — Deferred revenue tracking for subscription/prepaid invoices, accrual vs cash basis
- [ ] **COGS Tracking (F1)** — Pull product cost price from inventory-service on invoice creation to compute per-invoice COGS
- [x] **AR Aging Report** — Bucketed balance-due report (Current / 30 / 60 / 90+ days overdue)

---

## 5. Double-Entry Accounting

- [ ] **Auto-Post Ledger on Payment (F3)** — When a payment is recorded, auto-create LedgerEntry rows (DR Cash/Bank, CR Accounts Receivable)
- [ ] **Auto-Post Ledger on Invoice Creation** — DR Accounts Receivable, CR Revenue
- [ ] **Auto-Post Ledger on Expense** — DR Expense account, CR Cash/Bank
- [ ] **Auto-Post Ledger on Credit/Debit Notes** — Reverse or adjust prior ledger entries

---

## 6. Billing Workstation (billing-ui) Enhancements

**Status: 🟡 Planned**
**Depends on: Backend should be stable first**

- [ ] **Create Invoice Form** — Wire the "Create Invoice" button to a modal/form that POSTs to `/api/invoices`
- [ ] **Create Quotation Form** — Wire the "Create Quotation" button
- [ ] **Record Payment Form** — Wire the "Record Payment" button to POST `/api/payments`
- [ ] **Create Credit/Debit Note Forms** — Wire create buttons
- [ ] **Create Recurring Schedule Form** — Wire create button
- [ ] **Invoice Status Actions** — Mark as paid, cancel, send from invoice detail page
- [ ] **Invoice Edit** — PUT endpoint for invoice updates
- [ ] **Recurring Invoice Pause/Resume** — Wire to backend PUT endpoint
- [ ] **Download PDF** — Generate and download invoice/quotation PDFs

---

## 7. Infrastructure & DevOps

- [ ] **Cron Job / Scheduler Setup** — Deploy `@nestjs/schedule` for recurring invoice generation and dunning jobs
- [ ] **Healthcheck Consolidation** — Standardize healthcheck endpoints across all services
- [ ] **Stale DB Table Cleanup** — `erp_db` still has legacy `invoices`, `payments`, `credit_notes`, `debit_notes`, `invoice_items` tables that are never used (data now lives in `erp_billing`)
- [ ] **Docker Healthchecks** — Custom HTTP healthchecks for all containers (already planned in infrastructure/local)

---

## Notes

This backlog was created on 2026-07-18 after the Accounts & Billing audit across erp-shell, billing-ui, erp-service, and billing-service. Items are added as they are identified — no priority ordering within categories.
