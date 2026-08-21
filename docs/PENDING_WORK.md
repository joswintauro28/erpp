# DATAVEX ERP — Pending Work Backlog

Items identified during the Accounts & Billing audit that are deferred for future implementation. These are ordered by category.

---

## 1. Event Broker / Message Queue Integration

**Status: 🔴 Not started**
**Depends on: Infrastructure decision (RabbitMQ vs RabbitMQ vs Redis Streams)**

All flows below are currently approximated via synchronous REST calls. A central event bus should replace these once deployed.

- [ ] **Order.Approved → Inventory** — When a sales order is approved in CRM, publish event so inventory can run ATP check
- [ ] **Shipment.Dispatched → Billing** — When inventory dispatches stock, publish event so billing auto-generates the invoice (A1)
- [x] **Shipment.Dispatched → COGS** — Same event triggers COGS expense recognition (F1)

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

- [x] **Actual P&L Calculation (F6)** — Current reports use hardcoded percentages. Needs real period-based aggregation from invoices, expenses, and ledger entries
- [x] **Cash Flow Statement** — Missing from reports entirely. Needs to be computed from operating/investing/financing activities
- [x] **Bank Reconciliation (F4)** — CSV/XLSX statement import with auto-matching by reference ID, amount, and date
- [x] **Month-End Close Process (F5)** — Ledger locking, cut-off dates, close checklist with sign-off workflow
- [x] **Revenue Recognition Schedule (F2)** — Deferred revenue tracking for subscription/prepaid invoices, accrual vs cash basis
- [x] **COGS Tracking (F1)** — Pull product cost price from inventory-service on invoice creation to compute per-invoice COGS

- [x] **AR Aging Report** — Bucketed balance-due report (Current / 30 / 60 / 90+ days overdue)

---

## 5. Double-Entry Accounting

- [ ] **Auto-Post Ledger on Payment (F3)** — When a payment is recorded, auto-create LedgerEntry rows (DR Cash/Bank, CR Accounts Receivable)
- [x] **Auto-Post Ledger on Invoice Creation** — DR Accounts Receivable, CR Revenue
- [x] **Auto-Post Ledger on Expense** — DR Expense account, CR Cash/Bank
- [x] **Auto-Post Ledger on Credit/Debit Notes** — Reverse or adjust prior ledger entries

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

---

## 8. CRM — Flow Readiness & Credit Check (CRM audit 2026-08-11)

**Status:** Core order-to-cash spine works end-to-end; the items below are the known gaps, prioritized **HIGH → MEDIUM**.

### Done (2026-08-11)

- [x] **Credit check (O2) fixed & enhanced** — removed the hard-coded ₹1,00,000 default that rejected nearly every sales order. Now follows standard ERP practice: per-customer `credit_limit` on the CRM Customer record, fail-open when no limit is configured, full exposure breakdown returned (`outstanding`, `credit_limit`, `available_credit`, `over_limit_amount`, `unlimited`). Verified live end-to-end (approve / hold / unlimited paths).

### Stage-by-stage readiness vs the `docs/PROJECT.md` blueprint

| Stage | Status |
|-------|--------|
| M2–S4 (lead capture → quote) | ✅ (M1 Marketing is **out of scope** per requirements) |
| S5/S6 discount approval, S7 send, S8 accept | ✅ |
| S9 Contract signed | ⚠️ MEDIUM — no contract entity; flow currently ends at quote acceptance |
| O1 quote→SO, O2 credit, O3 hold, O4 approve | ✅ |
| Order.Approved → ATP → fulfillment → dispatch | ✅ (wired; see `AUDIT_REPO.md`) |
| Dispatch → auto-invoice + COGS | ✅ |
| Payment → AR clearing, dunning, recon, close | ✅ (billing) |
| I3/I4 MRP make-or-buy | ⚠️ MEDIUM — buy/auto-PO works; manufacturing (work orders) missing |
| P3 GRN / P4 quality check | ⚠️ MEDIUM — PO "received" only; no formal goods-receipt / QC step |

### 🔴 HIGH — reliability & integration blockers

- [ ] **H4 — Silent event loss (retry/DLQ missing).** Every RabbitMQ consumer catches exceptions and acks anyway; a poisoned `shipment.dispatched` or `invoice.paid` event silently stalls the SO (never reaches Delivered/Paid) with no trace. **Single biggest risk to the planned flow.**
- [ ] **H2/H3 — erp-shell CRM gateway 404s.** Shell mutations hit non-existent gateway routes (un-prefixed `/customers`, `/sales-orders`, …) and `/crm/quotations` passthrough returns an empty list. The CRM workstation (crm-shell) is unaffected; the executive shell's CRM views are partially broken.

### 🟡 MEDIUM — flow completeness

- [ ] **Prepayment path (O3).** When the credit check fails, the SO goes on Hold but there is no "request prepayment / advance → auto-release hold" workflow — only manual re-approval (now enabled from the UI).
- [ ] **Credit-check bypass on invoice-sync.** SOs that jump straight to Paid/Invoiced via the `billing.invoice.created/paid` RabbitMQ events skip the credit check (marked "Not Checked"). Decide whether to enforce the check on every path.
- [ ] **Contracts (S9).** No contract/renewal entity in CRM; renewals only exist as billing recurring invoices.
- [ ] **Manufacturing (I3/I4 make flow).** No work-order module — make-to-order items dead-end at ATP.
- [ ] **GRN / quality check (P3/P4).** Formal goods-receipt and QC steps not implemented.

### 📌 Out of scope / re-scoped per requirements

- **Marketing (M1)** — campaigns, web forms, mass email, landing pages, ROI: **explicitly not required**; removed from all diagrams and agent contexts.
- **Interaction (enquiries, site visits, follow-ups, tasks, communications, visit plans) & Service (complaints, feedback)** — not part of `crm-service`; will be delivered as a separate **Service-Desk** module.

---

## Notes

This backlog was created on 2026-07-18 after the Accounts & Billing audit across erp-shell, billing-ui, erp-service, and billing-service. Section 8 (CRM Flow Readiness) was added 2026-08-11 after the CRM capability review and credit-check fix. Items are added as they are identified — section 8 carries explicit HIGH/MEDIUM priority tags.
