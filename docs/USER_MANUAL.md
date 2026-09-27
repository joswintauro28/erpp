# DATAVEX ERP â€” User Manual

## Complete Platform Guide for All Roles

---

# Table of Contents

1. [Platform Introduction](#1-platform-introduction)
2. [How Login & Access Works](#2-how-login--access-works-all-roles)
3. [Module-by-Module User Manual](#3-module-by-module-user-manual)
   - [3.1 Executive Shell â€” Central Administration & Governance](#31-executive-shell--central-administration--governance)
   - [3.2 CRM Workstation â€” Sales Pipeline & Account Hub](#32-crm-workstation--sales-pipeline--account-hub)
   - [3.3 Billing Workstation â€” Invoicing, GST & Financials](#33-billing-workstation--invoicing-gst--financials)
   - [3.4 Inventory Workstation â€” Logistics, Warehouses & Procurement](#34-inventory-workstation--logistics-warehouses--procurement)
   - [3.5 Enterprise AI Copilot â€” Context-Grounded Operations](#35-enterprise-ai-copilot--context-grounded-operations)
4. [Cross-Workstation Workflows (End-to-End)](#4-cross-workstation-workflows-end-to-end)
   - [4.1 The Complete Lead-to-Cash & Fulfillment Journey](#41-the-complete-lead-to-cash--fulfillment-journey)
   - [4.2 How a Sales Order Triggers Credit Check & Billing](#42-how-a-sales-order-triggers-credit-check--billing)
   - [4.3 How Procurement Restocks Low Inventory (Make vs. Buy)](#43-how-procurement-restocks-low-inventory-make-vs-buy)
   - [4.4 How Warehouse Dispatch Triggers Accounts Receivable](#44-how-warehouse-dispatch-triggers-accounts-receivable)
5. [Notifications & System Activity](#5-notifications--system-activity)
6. [Frequently Asked Questions (FAQ)](#6-frequently-asked-questions-faq)
7. [Glossary](#7-glossary)
8. [Copyright & Legal](#8-copyright--legal-footer)

---

# 1. Platform Introduction

DATAVEX Enterprise Resource Planning (ERP) is a connected, industrial-grade business management suite engineered for modern commercial, distribution, and manufacturing enterprises. It unites business executives, sales representatives, accountants, warehouse operators, and logistics teams into one coordinated system â€” ensuring every phase of commerce, from the initial prospect enquiry through to payment clearing and delivery, is frictionless, automated, and auditable.

DATAVEX ERP is built by **DATAVEX Technologies** to eliminate siloed spreadsheets, disjointed point solutions, and paper trails by providing a unified operational command center.

## What DATAVEX ERP enables

The platform orchestrates the complete enterprise trade lifecycle:

1. A sales representative captures leads, scores prospects, and generates customized Configure-Price-Quote (CPQ) proposals.
2. A formal Sales Order is approved, automatically verifying client credit limits against accounts receivable before locking in commitments.
3. The inventory system checks stock availability (Available-to-Promise) and initiates automated purchase requisitions or manufacturing work orders for out-of-stock items.
4. Warehouse teams execute wave picking, serial number verification, quality inspections, packaging, and shipping manifest dispatching.
5. Finance and accounting teams issue GST-compliant multi-tier tax invoices, process payments, adjust balances via credit/debit notes, and perform bank reconciliations.
6. Executives monitor real-time gross revenue velocity, inventory risk tallies, and cross-departmental KPIs.
7. An intelligent AI Copilot answers complex operational questions, extracts cross-module reports, and assists users directly in their daily workflow.

## The workstations

DATAVEX ERP consists of **four role-dedicated web workstations**, unified by a single sign-on security system and an embedded AI Copilot:

| Workstation | Who it serves | What it does |
|---|---|---|
| **Executive Shell** | Organization Owners & Super Admins | System governance, team identity provisioning, cross-organization analytics, and global audit trails |
| **CRM Workstation** | Sales Executives & Account Managers | Lead capture, conversion scoring, customer accounts, credit limit rules, CPQ quotations, and sales orders |
| **Billing Workstation** | Accountants & Financial Auditors | Invoices, GST calculation (CGST/SGST/IGST), payments, refunds, credit/debit notes, recurring subscriptions, and aging AR |
| **Inventory Workstation** | Inventory Managers & Warehouse Crew | Product catalog, multi-warehouse bin tracking, stock adjustments, purchase requisitions, POs, serial tracking, QC, and fulfillment Kanban |
| **Login Portal** | All roles | The unified entry point that authenticates credentials and routes users directly to their designated workstation |

## The system user roles

| Role | Workstation used | Key Responsibilities |
|---|---|---|
| **Organization Owner / Admin** | Executive Shell (Access to all portals) | Complete organizational control, user provisioning, global auditing, and multi-domain supervision |
| **Sales Executive** | CRM Workstation | Prospecting, lead qualification, proposal authoring, and sales order creation |
| **Accountant** | Billing Workstation | Invoicing, payment settlements, tax compliance, dunning management, and ledger adjustments |
| **Inventory Manager** | Inventory Workstation | Warehouse stock oversight, supplier purchase orders, inspection quality checks, and dispatch Kanban |
| **Auditor** | Billing & Inventory Workstations (Read-Only) | Transactional compliance, general ledger inspection, stock audits, and financial reporting verification |

## One login for everyone

Every team member accesses DATAVEX ERP through the **same Login page**. The system verifies your credentials, evaluates your cryptographic claims and role permissions, and takes you directly to the workstation designed for your daily responsibilities. You never need separate credentials or disconnected bookmarks â€” one account provides access to all authorized resources.

---

# 2. How Login & Access Works (all roles)

DATAVEX ERP utilizes an enterprise **Zero-Trust Central Single Sign-On (SSO)** engine governed by `core-iam`. Business microservices verify your cryptographic token independently, ensuring rapid page loads and high security across all portals.

## Signing in

1. Open the DATAVEX ERP **Login page** (`http://erp.local/login` or port `3000`).
2. Enter your work **email address** (e.g., `admin@datavex.com`, `sales@datavex.com`, `accounts@datavex.com`).
3. Enter your **password**.
4. Click **Sign In**.

The system securely verifies your identity, assigns your session token, and **automatically routes you to your designated workstation**:
- Administrators and Owners land on the **Executive Shell** (`/dashboard`).
- Sales Executives are routed to the **CRM Workstation** (`/crm/dashboard`).
- Accountants and Auditors arrive at the **Billing Workstation** (`/billing/dashboard`).
- Inventory Managers arrive at the **Inventory Workstation** (`/inventory/dashboard`).

## Switching organizations

If your account belongs to more than one organization, the **organization switcher chip** in the top header of every workstation shows the organization you are currently working in.

1. Click the chip to see every organization you are a member of.
2. Select the organization you want to work in.
3. Your session is re-issued instantly for the new organization — no sign-out or re-login is needed.

All dashboards, records, and branding (logo and colors) refresh to the selected organization immediately. You will only ever see organizations your administrator has granted you membership in, and data never crosses organization boundaries.

## Where your credentials come from

- **Administrator-provisioned accounts:** Your Organization Owner or Super Administrator sets up internal employee profiles in the Executive Shell under **Team Management**. You will receive your initial email and temporary password directly from them.
- **Seed demonstration accounts:** For staging environments or initial training, standard preconfigured credentials (such as `admin@datavex.com`, `sales@datavex.com`, `accounts@datavex.com`, `inventory@datavex.com`, `auditor@datavex.com`) may be provided by your infrastructure team.

## Session duration

- Your sign-in session remains active for **24 hours**.
- If you switch tabs, close the browser, or move between workstations within the domain during this window, your session persists seamlessly.
- After 24 hours (or upon token expiry), the system will prompt you to authenticate once more to protect corporate data.

## Signing out

1. Click on your profile avatar or the **Sign Out** button in the top navigation header or sidebar footer.
2. The system clears your local authentication token and invalidates your session cookie.
3. You are safely redirected back to the Login page.

Always sign out when leaving an unattended or shared terminal.

## Forgotten credentials & account status

- **Forgot your password?** End-users cannot reset passwords directly in the UI. Reach out to your **Organization Owner / Super Administrator**, who can set a new password in the Team Management console.
- **Account deactivated?** If an account has been suspended or marked inactive by an administrator, login attempts will be rejected. Contact your system administrator to restore access.

## A note on security

> [!SECURITY]
> Never share your login credentials or authentication tokens with anyone.

- Role-Based Access Control (RBAC) is enforced at both the user interface level and every backend API gateway endpoint.
- You will only be permitted to view and interact with data permitted under your assigned role.
- The **Organization Owner / Super Administrator** is the only role with unrestricted visibility and cross-workstation management authority.

---

# 3. Module-by-Module User Manual

This section details **who uses each workstation**, **its core responsibilities**, **step-by-step procedures**, and **screen-by-screen feature breakdowns**.

---

## 3.1 Executive Shell â€” Central Administration & Governance

**Users:** Organization Owners, Directors, Super Administrators

**Workstation:** Executive Shell (`/` or Port 3000)

**What it does:** The Executive Shell provides top-level command and control over the entire DATAVEX ERP ecosystem. It acts as an enterprise performance aggregator, user provisioning terminal, and audit oversight deck.

### 1. Executive Dashboard

The Executive Dashboard provides an immediate overview of business health:
- **Revenue Velocity:** Real-time metrics tracking monthly gross turnover, outstanding accounts receivable, and collection efficiency.
- **Sales Pipeline Health:** Total count of active opportunities, weighted value of proposals, and hot lead conversion rates.
- **Supply Risk Counter:** Dynamic count of SKUs that have breached minimum safety stock levels across all warehouse sites.
- **Operational Activity Stream:** Feed of high-value business events (large quotations accepted, bulk shipments dispatched, overdue invoices).

### 2. Team & User Provisioning (`/team`)

The central user registry where administrators create and maintain team access:
- **View team roster:** Complete directory of users showing name, email, department, assigned role, and account status.
- **Add a new team member:**
  1. Click **Add Team Member** in the top action bar.
  2. Enter the employee's **Full Name** and company **Email Address**.
  3. Assign an **Access Role** (`Organization Owner`, `Sales Executive`, `Accountant`, `Inventory Manager`, `Auditor`).
  4. Specify an initial password complying with complexity rules (minimum 8 characters, uppercase, lowercase, numeric).
  5. Click **Create User**. The account is immediately ready for login.
- **Manage user accounts:**
  - Update user roles when employee job duties change.
  - Deactivate user access immediately if an employee leaves the company or a terminal is compromised.

### 3. Organization Settings & Audit Trails (`/settings`)

- **Company Profile:** Update registered company name, tax registration (GSTIN/VAT), currency defaults, and contact addresses.
- **Audit Logs:** Immutable audit ledger tracking critical administrative actions: login attempts, role promotions, credit note approvals, manual inventory ledger overrides, and mass data exports.

---

## 3.2 CRM Workstation â€” Sales Pipeline & Account Hub

**Users:** Sales Executives, Account Managers, Business Development Representatives

**Workstation:** CRM Workstation (`/crm` or Port 3001)

**What it does:** The CRM Workstation governs the top of the commercial funnel. It manages prospective leads from discovery to qualification, maintains client directories, oversees credit limits, drafts CPQ proposals, and converts closed deals into formal Sales Orders.

### 1. Sales Dashboard (`/crm/dashboard`)

Your daily sales command center:
- **Pipeline Stage Visualizer:** Interactive Kanban and stage strip displaying leads categorized by progression stage.
- **Key Performance Indicators:** Total pipeline value, open opportunities count, win/loss ratio, and average sales cycle length.
- **High-Priority Leads ("Hot Leads"):** Prioritized list of prospective deals requiring immediate sales follow-up.
- **AI Sales Recommendations:** Automated insights flagging stalled deals or recommending discount structures based on client history.

### 2. Lead Discovery & Qualification (`/crm/leads`)

- **Lead Repository:** Searchable list of all prospects, filterable by stage, industry, source, and assigned sales owner.
- **Create a New Lead:**
  1. Click **New Lead**.
  2. Input company name, primary contact person, email, telephone, and acquisition channel (Web, Referral, Exhibition, Cold Outreach).
  3. Enter estimated annual budget and requirements.
  4. Save the lead record.
- **Automated Lead Scoring:** The system calculates an engagement score based on prospect size, requirements clarity, and response speed. Leads scoring above 70 are eligible for promotion to **Sales Qualified Lead (SQL)**.
- **Stage Progression:**
  - Advance leads through stages: `New` $\rightarrow$ `Contacted` $\rightarrow$ `Qualified` $\rightarrow$ `Proposal Sent` $\rightarrow$ `Converted` (or `Lost`).

### 3. Customer Account Directory (`/crm/customers`)

- **Customer 360 Profile:** Full company history including contact directory, associated quotations, previous orders, and lifetime purchase value.
- **Credit Limit Management:**
  - Configure the authorized credit ceiling for each corporate client.
  - The credit limit is evaluated in real time during Sales Order submission against the client's unpaid billing balance.

### 4. CPQ Quotation Builder (`/crm/quotations`)

Create transparent, multi-line sales proposals:
1. Click **Create Quotation**.
2. Select the target **Customer** and configure the quotation validity window.
3. Add catalog items, specifying quantity, base unit price, and applicable discount percentages.
4. The system calculates subtotals, tax provisions, and final net amounts.
5. If the proposed discount exceeds policy thresholds (e.g., > 15%), an automated internal manager approval flag is triggered.
6. Proposals support revisions (`v1.0`, `v2.0`) and state tracking (`Draft`, `Sent`, `Accepted`, `Rejected`, `Expired`).

### 5. Sales Orders (`/crm/sales-orders`)

> [!IMPORTANT]
> Converting an accepted quotation into a Sales Order initiates the physical fulfillment and billing chain across the ERP.

- **Convert Quotation to Order:** Click **Convert to Sales Order** on any accepted quotation.
- **Automated Credit Check:**
  - The CRM service queries the Billing service to check the customer's current outstanding balance against their authorized credit limit.
  - If the credit ceiling is exceeded, the order is placed on **Credit Hold**, requiring finance authorization or partial upfront prepayment.
  - If the credit check passes, the order is set to **Approved** and published to the central event stream for warehouse allocation.

---

## 3.3 Billing Workstation â€” Invoicing, GST & Financials

**Users:** Accountants, Financial Controllers, Billing Clerks, Auditors

**Workstation:** Billing Workstation (`/billing` or Port 3002)

**What it does:** The Billing Workstation handles accounts receivable, tax compliance, customer billing, payment reconciliation, credit adjustments, and recurring subscription contracts.

### 1. Financial Dashboard (`/dashboard` or `/billing/dashboard`)

Summary of cash flows and receivable health:
- **Total Revenue Collected:** Cumulative month-to-date and year-to-date gross receipts.
- **Outstanding Accounts Receivable:** Total invoiced amounts currently awaiting settlement.
- **Overdue Invoices:** High-risk aged balances requiring dunning outreach.
- **Revenue Trend Sparklines:** Multi-month sales receipts and settlement velocity graphs.

### 2. Tax Invoicing (`/billing/invoices`)

- **View All Invoices:** Searchable, status-filtered ledger of customer tax invoices.
- **Create an Invoice:**
  1. Click **New Invoice**.
  2. Select the customer and provide payment term parameters (Net 15, Net 30, Due Upon Receipt).
  3. Add line items, specifying description, quantity, unit rate, and applicable tax class.
  4. Save as `Draft` or click `Issue Invoice` to freeze details and dispatch to the client.
- **GST Compliance Engine:**
  - Automatically assesses customer tax registration and location:
    - **Intra-State Transactions:** Splits liability evenly into Central GST (CGST) and State GST (SGST).
    - **Inter-State Transactions:** Applies integrated tax as Integrated GST (IGST).
- **Invoice Balance Tracking:**
  - Dynamically calculates remaining balances: $\text{Balance Due} = \text{Total Amount} - \text{Paid Amount}$.
  - Status lifecycle: `Draft` $\rightarrow$ `Issued` $\rightarrow$ `Partially Paid` $\rightarrow$ `Paid` $\rightarrow$ `Overdue`.

### 3. Payment Collections & Refunds (`/billing/payments`)

- **Log Customer Settlement:**
  1. Open the invoice or click **Record Payment**.
  2. Enter the settlement amount, date, and payment mode (Bank Wire, Cheque, Credit Card, UPI, Cash).
  3. Record the transaction or reference ID.
  4. Save. The payment is matched, the invoice balance is updated, and the status flips to `Paid` once zero balance is achieved.
- **Process Refunds:**
  - Execute full or partial payment refunds with mandatory reason logging.
  - The system reverses the invoice settlement status and re-opens the balance due.

### 4. Credit & Debit Notes (`/billing/credit-notes`, `/billing/debit-notes`)

- **Credit Notes:** Issue commercial adjustments against existing invoices for returned/damaged goods or agreed rate renegotiations. The credit amount automatically credits the invoice balance.
- **Debit Notes:** Issue supplemental charges for additional freight, handling fees, or upward corrections.

### 5. Recurring Invoices (`/billing/recurring-invoices`)

- Set up automated billing templates for recurring client retainers or scheduled service contracts.
- Choose frequency intervals (Weekly, Monthly, Quarterly, Annually) and define scheduled end dates.

---

## 3.4 Inventory Workstation â€” Logistics, Warehouses & Procurement

**Users:** Inventory Managers, Warehouse Supervisors, Quality Inspectors, Procurement Officers

**Workstation:** Inventory Workstation (`/inventory` or Port 3004)

**What it does:** The Inventory Workstation provides end-to-end visibility of physical goods: SKU cataloging, multi-facility stock counts, supplier procurement, purchase order management, unit serial tracking, quality checks, and order fulfillment.

### 1. Logistics Dashboard (`/dashboard` or `/inventory/dashboard`)

Operational snapshot of all warehousing locations:
- **Total Catalog SKUs & Active Warehouses.**
- **Overall Stock Valuation.**
- **Critical Low Stock Alerts:** SKUs requiring replenishment before backorders occur.
- **Pending Purchase Orders & Inbound Shipments.**

### 2. Product Catalog (`/products`)

- **Manage Master Catalog:** Configure SKU codes, barcodes, unit designations, purchase cost, list sales price, and tax category.
- **Control Flags:** Designate whether items require unique **Serial Tracking** (for high-value serialized equipment) or **Batch Numbering** (for perishable goods).

### 3. Warehouses & Multi-Site Stock (`/warehouses`, `/stock`, `/stock/movements`)

- **Warehouse Registry:** Maintain multiple distribution centers, regional depots, and floor bins.
- **Stock Grid:** View real-time physical availability, allocated reservations, and Available-to-Promise (ATP) quantities per SKU per site.
- **Calibrated Stock Adjustments:**
  - Perform manual inventory increases or write-downs (`ADJUST_UP`, `ADJUST_DOWN`).
  - Mandatory requirement to record reason codes (e.g., Audit Discrepancy, Damaged in Facility, Expired Batch) and reference numbers.
- **Stock Movement Ledger:** Complete chronological history of every unit moving in, out, or transferred between facilities.

### 4. Procurement & Supplier POs (`/suppliers`, `/purchase-requisitions`, `/purchase-orders`)

- **Supplier Directory:** Manage approved vendor contacts, GST identifiers, lead times, and payment terms.
- **Purchase Requisitions:** Internal requests to buy materials when stock hits reorder thresholds.
- **Purchase Orders (POs):**
  1. Create a PO linked to a chosen vendor.
  2. Add line items, agreed unit purchase costs, and anticipated dock delivery dates.
  3. Approve and issue the PO.
  4. Track status through lifecycle: `Draft` $\rightarrow$ `Ordered` $\rightarrow$ `Partially Received` $\rightarrow$ `Received`.

### 5. Serial Numbers & Quality Inspection (`/serial-numbers`, `/quality-checks`)

- **Serial Tracking:** Trace serialized items from supplier receipt to warehouse shelf, quality quarantine, and customer dispatch.
- **Quality Checks (QC):** Log staged inspection routines on inbound shipments before inventory is released for sales allocation.

### 6. Order Fulfillment Kanban (`/fulfillment`)

The physical operations pipeline for warehouse packaging and dispatch:
- **Pending Pick:** Newly approved Sales Orders waiting for aisle pick lists.
- **Picking:** Warehouse operators actively pulling goods from bins using wave picking.
- **Packing & Weighing:** Units boxed, weighed, measured, and verified against serial numbers.
- **Dispatched:** Shipping waybills and bills of lading generated; carrier handover completed.

---

## 3.5 Enterprise AI Copilot â€” Context-Grounded Operations

**Users:** All authenticated users across all workstations

**Access:** Dedicated Full-Page Studio (`/ai-assistant`) or Floating Copilot via **`Ctrl + J`**

**What it does:** The DATAVEX AI Copilot is an integrated assistant capable of inspecting cross-service data, calculating metrics, and providing guidance grounded in real-time database records.

### 1. How to launch the Copilot

- **Global Keyboard Shortcut:** Press **`Ctrl + J`** from any screen in any workstation to slide out the floating assistant.
- **Floating Action Button:** Click the golden AI spark badge in the lower corner of the interface.
- **Dedicated AI Studio:** Navigate to `/ai-assistant` for deep research sessions with complete chat history drawers and expanded data tables.

### 2. What you can ask the Copilot

The Copilot securely communicates with backend microservices (CRM, Billing, and Inventory) using your active authentication session:

- *"Identify all customers who currently have overdue invoices exceeding \$5,000."*
- *"Which warehouse items have breached their reorder safety point this week?"*
- *"Summarize our top 5 revenue-generating clients for the current quarter."*
- *"Draft a follow-up email for quotation Q-1048 explaining payment terms."*

### 3. Streaming and audit logs

- Responses are streamed using Server-Sent Events (SSE) for instantaneous feedback.
- All AI queries are recorded in an audit log, preserving data privacy and regulatory compliance.

---

# 4. Cross-Workstation Workflows (End-to-End)

The workstations in DATAVEX ERP work as an interconnected network. The procedures below illustrate how data flows smoothly across departments.

## 4.1 The Complete Lead-to-Cash & Fulfillment Journey

This is the standard end-to-end journey of an order through DATAVEX ERP:

1. **Lead Qualification.** A Sales Executive captures a prospect in the CRM Workstation. The lead is evaluated and promoted to a Qualified Opportunity.
2. **Quotation (CPQ).** The sales rep compiles a proposal with product line items and standard pricing, transmitting it to the customer.
3. **Acceptance & Sales Order Conversion.** The customer accepts the quote. The sales rep clicks **Convert to Sales Order**.
4. **Credit Ceiling Check.** The CRM service queries the Billing service in real time to verify that the customer's unpaid balance plus order value does not exceed their credit limit.
5. **Inventory Allocation.** The approved order reaches the Inventory Workstation, where goods are reserved against physical stock.
6. **Procurement or Work Order (if required).** If stock is insufficient, the system prompts a Purchase Requisition for buy-in items or a Work Order for in-house manufacturing.
7. **Picking, Packing & Dispatch.** Warehouse personnel pick items via wave pick lists, perform serial number scans, pack the shipment, and mark it **Dispatched** on the Fulfillment Kanban.
8. **Invoicing.** The Billing Workstation generates the tax invoice with automated CGST/SGST or IGST tax allocations.
9. **Payment & Ledger Reconciliation.** The customer settles via electronic transfer. The accountant records the payment, zeroing out the invoice balance and posting entries to the general ledger.

> [!AUTOMATIC ACTION]
> Approving a Sales Order automatically validates customer credit with Billing, reserves stock in Inventory, and notifies warehouse fulfillment without manual phone calls or paper handoffs.

## 4.2 How a Sales Order Triggers Credit Check & Billing

1. A sales proposal is accepted by the customer.
2. The sales rep initiates **Convert to Sales Order** in the CRM Workstation.
3. The system queries `GET /api/customers/:id/credit-check` on the Billing Service.
4. If the customer has exceeded their credit ceiling, the order status switches to **Credit Hold**, requesting finance clearance or prepayment.
5. Once cleared, the Sales Order transitions to **Approved**, generating an automated draft invoice in the Billing Workstation.

## 4.3 How Procurement Restocks Low Inventory (Make vs. Buy)

1. When a product's available quantity drops below its defined safety stock threshold, an automated alert appears on the Inventory Dashboard.
2. The inventory manager initiates a **Purchase Requisition** for vendor-supplied items or a **Work Order** for manufactured goods.
3. For purchased items, an authorized Purchase Order (PO) is sent to the supplier.
4. When goods arrive at the loading bay, warehouse staff log a **Goods Receipt Note (GRN)**.
5. Inbound items undergo mandatory **Quality Inspection (QC)** and serial number registration before being placed into bin storage, immediately clearing backorders.

## 4.4 How Warehouse Dispatch Triggers Accounts Receivable

1. Warehouse crew package an order and mark it as **Dispatched** on the Fulfillment Kanban.
2. The system registers a permanent stock movement record (`Type: OUT`).
3. The draft invoice in the Billing Workstation is automatically updated with the shipping date and carrier waybill reference.
4. Accounts receivable for the customer is officially incremented, and automated payment terms (e.g., Net 30) begin counting down toward settlement.

---

# 5. Notifications & System Activity

Timely cross-department communication ensures no operational step is missed.

## Where to find notifications

- **Top Navigation Bell Icon:** Visible across all workstations. Unread items are highlighted with a badge.
- **Workstation Activity Feeds:** Found on each workstation's dashboard, displaying recent operational transitions relevant to that role.

## Types of notifications each role receives

| Role | Notifications Received |
|---|---|
| **Organization Owner** | Critical administrative alerts, high-value orders approved, organization reconfigurations |
| **Sales Executive** | Quotation approvals/rejections, credit check pass/fail flags, order fulfillment milestones |
| **Accountant** | Invoices entering overdue status, unallocated incoming bank settlements, credit note requests |
| **Inventory Manager** | Stock safety threshold breaches, inbound supplier PO dock deliveries, newly allocated sales orders |
| **Auditor** | Manual inventory write-downs, unusual discount overrides, off-cycle ledger adjustments |

---

# 6. Frequently Asked Questions (FAQ)

### For all users

**1. How do I reset my password?**  
Password updates are managed centrally by your Organization Owner / Super Administrator. Contact your administrator to receive a replacement password.

**2. How long does my login session remain active?**  
Your sign-in session remains valid for 24 hours. After this period, you will be prompted to log in again.

**3. Can I access multiple workstations?**  
Organization Owners and Super Administrators can access all four workstations freely. Role-specific users (e.g., Sales Executives or Accountants) are routed directly to their designated workspace to keep daily tasks focused.

**4. What should I do if an API error or 'Service Unavailable' message appears?**  
Refresh your browser. If the issue persists, verify that your computer is connected to the internal corporate network and contact IT support to ensure all microservice containers are operational.

### For sales executives

**5. Why is my Sales Order marked as "Credit Hold"?**  
The customer has reached or exceeded their approved credit limit, or has overdue outstanding invoices. Contact the finance/billing department to review the customer's account before the order can be released.

**6. Can I apply a custom discount to a quotation?**  
Yes. However, discounts exceeding your organization's margin policy (typically over 15%) will automatically trigger a manager review flag before the proposal can be finalized.

### For accountants

**7. How does the system determine whether to apply CGST/SGST or IGST?**  
The billing engine automatically evaluates the customer's registered state and GSTIN against your organization's operating jurisdiction. Intra-state sales split into CGST + SGST; inter-state sales apply IGST.

**8. How do I rectify an invoice that was issued with incorrect amounts?**  
Issue a **Credit Note** to offset the incorrect amount or balance, or issue a **Debit Note** for supplementary charges. Issued tax invoices remain immutable for regulatory audit compliance.

### For inventory managers

**9. How do I record broken or expired stock?**  
Navigate to **Stock Movements**, select **Adjust Stock**, choose `ADJUST_DOWN`, and select the required reason code (e.g., *Damaged Goods* or *Expired Stock*). The adjustment is logged in the permanent audit ledger.

**10. When does an order show up in the Fulfillment Kanban?**  
An order appears under "Pending Pick" as soon as the Sales Order passes financial credit approval and stock allocation is completed.

---

# 7. Glossary

| Term | Definition |
|---|---|
| **ATP (Available to Promise)** | The uncommitted portion of inventory that sales teams can promise for customer delivery. |
| **CPQ (Configure, Price, Quote)** | An integrated workflow for assembling complex product orders, pricing, volume discounts, and quotations. |
| **Credit Hold** | An automated block on a Sales Order when a customer's unpaid balance breaches their authorized credit ceiling. |
| **Dunning** | Automated reminders and escalation procedures sent to customers regarding overdue invoice balances. |
| **GRN (Goods Receipt Note)** | An official warehouse document acknowledging physical delivery of goods from a supplier against a Purchase Order. |
| **GSTIN** | Goods and Services Tax Identification Number used for tax assessment in intra-state and inter-state trade. |
| **Immutable Ledger** | A transactional database record that cannot be edited or erased once committed, ensuring complete audit integrity. |
| **Kanban** | A visual card-based workflow used on the warehouse floor to track orders from picking and packing to carrier dispatch. |
| **Make vs. Buy** | The decision logic determining whether an out-of-stock item is manufactured via a Work Order or purchased via a Supplier PO. |
| **MRN / PO / SO** | Standard abbreviations: Material Requisition Note (MRN), Purchase Order (PO), and Sales Order (SO). |
| **RBAC** | Role-Based Access Control, governing workstation navigation and API endpoint permissions. |
| **UOM (Unit of Measure)** | The standard measurement unit assigned to a product catalog item (e.g., Pieces, Kilograms, Liters, Boxes). |
| **Wave Picking** | A warehouse picking strategy that aggregates items across multiple orders to minimize transit trips through aisles. |

---

# 8. Copyright & Legal Footer

> Â© 2026 DATAVEX Technologies. All rights reserved.  
> DATAVEX ERP is a proprietary product of DATAVEX Technologies. Unauthorized copying, distribution, modification, or deployment of this manual or the DATAVEX software platform is strictly prohibited.  
<!-- "> Official Portal: [http://erp.local](http://erp.local) | Support: `admin@datavex.com`" -->
