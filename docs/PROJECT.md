# DATAVEX ERP - System Architecture

This document serves as the absolute source of truth for your architecture. It details the system topography, cross-module security, database separation strategy, cost-saving CI/CD pipeline, and the step-by-step scaling roadmap tailored to **Next.js, NestJS, and FastAPI**.

## 1. System Topology & Monorepo Directory Layout

The entire ecosystem is housed inside an **Nx Polyglot Monorepo**. This approach isolates development teams into standalone workspace directories while forcing a strict, shared compilation contract for core authorization layers and design systems.

By standardizing on **TypeScript** (Next.js/NestJS) and **Python** (FastAPI), we maximize AI agent context-awareness and velocity.

```
erp-ecosystem/
├── apps/                                  # FRONTEND CORE CLIENTS (Subdomain Targets)
│   ├── erp-shell/                         # app.erp.local (Next.js 15 App Router - Executive Control / Super Admin Shell)
│   ├── crm-shell/                         # crm.erp.local (Next.js - Maintained by Team A)
│   ├── billing-ui/                        # billing.erp.local (Next.js - Maintained by Team B)
│   ├── inventory-ui/                      # inventory.erp.local (React/Next.js - Maintained by Team C)
│   └── hrms-ui/                           # hrms.erp.local (React/Next.js - Maintained by Team D)
│
├── services/                              # SEMANTIC BACKEND MICROSERVICES (APIs)
│   ├── core-iam/                          # auth.erp.local (NestJS - Global Single Sign-On Engine)
│   ├── billing-service/                   # api.billing.erp.local (NestJS - Invoices & Accounting Ledger)
│   ├── hrms-service/                      # api.hrms.erp.local (NestJS - Payroll & Employee Records)
│   ├── crm-service/                       # api.crm.erp.local (FastAPI - Sales Funnels & Lead Ingestion)
│   ├── inventory-service/                 # api.inventory.erp.local (FastAPI - Logistics & Batch Tracking)
│   └── ai-service/                        # ai.erp.local (FastAPI + Ollama - Quantized Local SLM Inference)
│
├── packages/                              # CENTRAL SECURITY & DESIGN TOKENS (The Glue)
│   ├── auth-middleware/                   # Shared NestJS Guards & Next.js JWT parsing scripts
│   └── ui-theme/                          # Shared Shadcn UI primitives & Tailwind v4 design variables
│
├── infrastructure/                        # ENVIRONMENT ORCHESTRATION ENGINE
│   ├── local/                             # Local Workstation Settings (Nginx + Compose Sandbox)
│   ├── staging-vms/                       # Stage-1 Production Architecture (Caddy Server + High-Perf Compose)
│   └── production-cluster/                # Stage-2 High-Availability Architecture (Kubernetes YAML Manifests)
│
├── nx.json                                # Caching topologies & dependency graphing configurations
└── package.json                           # Central workspace project registry
```

### System Blueprints

#### Technical Architecture Blueprint
```mermaid
graph TD
    %% ==========================================
    %% CUSTOM STYLES
    %% ==========================================
    classDef client fill:#ffffff,stroke:#333,stroke-width:2px,shape:rect,color:#333;
    classDef iam fill:#f0ebf8,stroke:#b4a7d6,stroke-width:2px,color:#333;
    classDef marketing fill:#fdf4f5,stroke:#e0a8b4,stroke-width:2px,color:#333;
    classDef sales fill:#eef5fc,stroke:#a4c2f4,stroke-width:2px,color:#333;
    classDef inventory fill:#fdf8e7,stroke:#f1c232,stroke-width:2px,color:#333;
    classDef finance fill:#eef8f2,stroke:#93c47d,stroke-width:2px,color:#333;
    classDef decision fill:#ffffff,stroke:#666,stroke-width:2px,shape:rhombus,color:#333;
    classDef database fill:#e8e8e8,stroke:#555,stroke-width:2px,shape:cylinder,color:#333;
    classDef eventbus fill:#2c3e50,stroke:#000,stroke-width:2px,color:#fff;

    %% ==========================================
    %% CLIENT & SYSTEM GATEWAY
    %% ==========================================
    Client([Web / Mobile / B2B Portals]) --> APIGateway[API Gateway & Load Balancer]
    
    subgraph IAM ["Security & Routing (Cross-Cutting)"]
        APIGateway --> AuthCheck{IAM / RBAC Validation}
        AuthCheck -. "Token Check" .-> DB_IAM[(erp_iam)]
        AuthCheck -- "Authorized Request" --> RouteRequest[Service Router]
    end

    %% ==========================================
    %% CENTRAL EVENT BUS (The Nervous System)
    %% ==========================================
    Kafka((Central Event Bus\nKafka / RabbitMQ)):::eventbus

    %% ==========================================
    %% DOMAIN 1: CRM & SALES
    %% ==========================================
    subgraph CRM ["1. CRM & Order Management (Domain: Sales)"]
        RouteRequest --> M2(Lead Capture)
        M2 --> M3(Lead Scoring & Nurture)
        M3 --> M4{MQL Criteria Met?}
        M4 -- No --> M3
        M4 -- Yes --> S1(Sales Handoff: MQL to SQL)
        
        S1 --> S2(Discovery & Needs Analysis)
        S2 --> S3(Opportunity Creation)
        S3 --> S4(Configure, Price, Quote - CPQ)
        S4 --> S5{Internal Approval Required?}
        S5 -- Yes --> S6(Manager Approval)
        S6 -- Rejected --> S4
        S6 -- Approved --> S7
        S5 -- No --> S7(Quote Sent to Customer)
        
        S7 --> S8{Customer Accepts?}
        S8 -- Negotiate --> S4
        S8 -- Yes --> S9(Contract Signed)
        
        S9 --> O1(Convert Quote to Sales Order)
        O1 --> O2{Finance API: Credit Check}
        O2 -- Fail --> O3(Hold SO / Request Prepayment)
        O3 -.-> O2
        O2 -- Pass --> O4(SO Approved & Logged)
        
        %% CRM Database Interactions
        DB_CRM[(erp_crm)]
        M2 -. "Write Lead" .-> DB_CRM
        S3 -. "Write Opp" .-> DB_CRM
        O4 -. "Persist Order" .-> DB_CRM
    end

    %% Publish SO Created Event
    O4 ===> |"Publish: Order.Approved"| Kafka

    %% ==========================================
    %% DOMAIN 2: INVENTORY & SCM
    %% ==========================================
    subgraph INV ["2. Supply Chain & Fulfillment (Domain: Operations)"]
        Kafka ===> |"Subscribe: Order.Approved"| I1(Available to Promise - ATP Check)
        
        I1 --> I2{In Stock?}
        
        %% Out of Stock Flow (Procure to Pay / Manufacturing)
        I2 -- No --> I3(Run MRP - Material Requirements)
        I3 --> I4{Make or Buy?}
        
        %% Buy Flow
        I4 -- Buy --> P1(Purchase Requisition)
        P1 --> P2(Purchase Order to Vendor)
        P2 --> P3(Goods Receipt Note - GRN)
        P3 --> P4(Quality Check)
        P4 --> P5(Putaway in Warehouse)
        P5 --> I5
        
        %% Make Flow
        I4 -- Make --> M1_Prod(Create Work Order)
        M1_Prod --> M2_Prod(Issue Raw Materials)
        M2_Prod --> M3_Prod(Production Routing)
        M3_Prod --> M4_Prod(Finished Goods to Warehouse)
        M4_Prod --> I5
        
        %% In Stock / Fulfillment Flow
        I2 -- Yes --> I5(Hard Allocation of Stock)
        I5 --> I6(Generate Pick List)
        I6 --> I7(Wave / Batch Picking)
        I7 --> I8(Packing & Weighing)
        I8 --> I9(Generate Shipping Label)
        I9 --> I10([Dispatch & Proof of Delivery])
        
        %% Inventory Database Interactions
        DB_INV[(erp_inventory)]
        I1 -. "Query Stock" .-> DB_INV
        P5 -. "Add Buy Stock" .-> DB_INV
        M4_Prod -. "Add Make Stock" .-> DB_INV
        I5 -. "Reserve Stock" .-> DB_INV
        I10 -. "Deduct Stock" .-> DB_INV
    end

    %% Publish Dispatch & PO Events
    I10 ===> |"Publish: Shipment.Dispatched"| Kafka
    P2 ===> |"Publish: PurchaseOrder.Created"| Kafka

    %% ==========================================
    %% DOMAIN 3: ACCOUNTS & BILLING
    %% ==========================================
    subgraph ACC ["3. Accounts, Billing & GL (Domain: Finance)"]
        Kafka ===> |"Subscribe: Shipment.Dispatched"| A1(Auto-Generate Sales Invoice)
        Kafka ===> |"Subscribe: PurchaseOrder.Created"| AP1(Create Accounts Payable - AP)
        
        %% Billing Flow
        A1 --> A2(Apply Taxes & Discounts)
        A2 --> A3(Invoice Sent to Customer)
        A3 --> A4(Accounts Receivable AR Increased)
        
        A4 --> A5{Payment Received?}
        A5 -- No, Overdue --> A6(Automated Dunning)
        A6 --> A5
        A5 -- Yes --> A7(Payment Gateway / Bank Receipt)
        A7 --> A8(Match Receipt to Invoice - Clearing)
        
        %% General Ledger & Accounting Flow
        A3 -. "Trigger" .-> F2(Recognize Revenue)
        Kafka ===> |"Subscribe: Shipment.Dispatched"| F1(Recognize COGS Expense)
        A8 -. "Trigger" .-> F3(Decrease AR, Increase Cash)
        
        F1 & F2 & F3 --> F4(Bank Reconciliation)
        F4 --> F5(Month-End Close Process)
        F5 --> F6([Live Dashboard: P&L, Balance Sheet])
        
        %% Finance Database Interactions
        DB_BILL[(erp_billing)]
        A1 -. "Persist Invoice" .-> DB_BILL
        A4 -. "Update AR" .-> DB_BILL
        AP1 -. "Update AP" .-> DB_BILL
        A8 -. "Log Payment" .-> DB_BILL
        F5 -. "Update Ledgers" .-> DB_BILL
    end

    %% Apply Classes
    class Client client;
    class APIGateway,AuthCheck,RouteRequest iam;
    class M2,M3,S1,S2,S3,S4,S6,S7,S9,O1 marketing;
    class O1,O3,O4 sales;
    class I1,I3,P1,P2,P3,P4,P5,M1_Prod,M2_Prod,M3_Prod,M4_Prod,I5,I6,I7,I8,I9,I10 inventory;
    class A1,AP1,A2,A3,A4,A6,A7,A8,F1,F2,F3,F4,F5,F6 finance;
    class M4,S5,S8,O2,I2,I4,A5 decision;
    class DB_IAM,DB_CRM,DB_INV,DB_BILL database;
```

#### Flow & Authentication Blueprint
```mermaid
graph TD

    %% Custom Styles

    classDef marketing fill:#fdf4f5,stroke:#e0a8b4,stroke-width:2px,color:#333;

    classDef sales fill:#eef5fc,stroke:#a4c2f4,stroke-width:2px,color:#333;

    classDef inventory fill:#fdf8e7,stroke:#f1c232,stroke-width:2px,color:#333;

    classDef finance fill:#eef8f2,stroke:#93c47d,stroke-width:2px,color:#333;

    classDef decision fill:#ffffff,stroke:#666,stroke-width:2px,shape:rhombus,color:#333;

    classDef database fill:#f3f3f3,stroke:#999,stroke-width:2px,shape:cylinder,color:#333;



    %% ==========================================

    %% PHASE 1: CRM (Acquisition)

    %% ==========================================

    subgraph CRM ["1. CRM (Lead to Opportunity)"]

        M2(Lead Capture)

        M2 --> M3(Lead Scoring & Nurture)

        M3 --> M4{MQL Criteria Met?}

        M4 -- No --> M3

        M4 -- Yes --> S1(Sales Handoff: MQL to SQL)

        

        S1 --> S2(Discovery & Needs Analysis)

        S2 --> S3(Opportunity Creation)

        S3 --> S4(Configure, Price, Quote - CPQ)

        S4 --> S5{Internal Approval Required?}

        S5 -- Yes --> S6(Manager Approval)

        S6 -- Rejected --> S4

        S6 -- Approved --> S7

        S5 -- No --> S7(Quote Sent to Customer)

        

        S7 --> S8{Customer Accepts?}

        S8 -- Negotiate --> S4

        S8 -- Yes --> S9(Contract Signed)

    end



    %% ==========================================

    %% PHASE 2: SALES & ORDER MANAGEMENT

    %% ==========================================

    subgraph SOM ["2. Order Management (Commitment)"]

        S9 --> O1(Convert Quote to Sales Order - SO)

        O1 --> O2{Finance: Credit Check}

        O2 -- Fail --> O3(Hold SO / Request Prepayment)

        O3 -.-> O2

        O2 -- Pass --> O4(SO Approved & Logged)

        O4 -.-> DB1[(ERP Central Database)]

    end



    %% ==========================================

    %% PHASE 3: INVENTORY, MRP & SUPPLY CHAIN

    %% ==========================================

    subgraph INV ["3. Supply Chain & Fulfillment (Inventory/Production)"]

        O4 --> I1(Available to Promise - ATP Check)

        I1 --> I2{In Stock?}

        

        %% Out of Stock Flow (Procure to Pay / Manufacturing)

        I2 -- No --> I3(Run MRP - Material Requirements Planning)

        I3 --> I4{Make or Buy?}

        

        %% Buy Flow

        I4 -- Buy --> P1(Purchase Requisition - PR)

        P1 --> P2(Purchase Order - PO to Vendor)

        P2 --> P3(Goods Receipt Note - GRN)

        P3 --> P4(Quality Check)

        P4 --> P5(Putaway in Warehouse)

        P5 --> I5

        

        %% Make Flow

        I4 -- Make --> M1_Prod(Create Work Order)

        M1_Prod --> M2_Prod(Issue Raw Materials)

        M2_Prod --> M3_Prod(Production Routing)

        M3_Prod --> M4_Prod(Finished Goods to Warehouse)

        M4_Prod --> I5

        

        %% In Stock / Fulfillment Flow

        I2 -- Yes --> I5(Hard Allocation of Stock)

        I5 --> I6(Generate Pick List)

        I6 --> I7(Wave / Batch Picking)

        I7 --> I8(Packing & Weighing)

        I8 --> I9(Generate Shipping Label & Waybill)

        I9 --> I10([Dispatch & Proof of Delivery])

        I10 -.-> DB1

    end



    %% ==========================================

    %% PHASE 4: ACCOUNTS & BILLING (Invoicing)

    %% ==========================================

    subgraph ACC ["4. Accounts Receivable & Billing (Invoicing)"]

        I10 --> A1(Auto-Generate Sales Invoice)

        A1 --> A2(Apply Taxes & Discounts)

        A2 --> A3(Invoice Sent to Customer)

        A3 --> A4(Accounts Receivable AR Increased)

        

        A4 --> A5{Payment Received?}

        A5 -- No, Overdue --> A6(Automated Dunning / Reminders)

        A6 --> A5

        A5 -- Yes --> A7(Payment Gateway / Bank Receipt)

        A7 --> A8(Match Receipt to Invoice - Clearing)

    end



    %% ==========================================

    %% PHASE 5: GENERAL LEDGER & ACCOUNTING

    %% ==========================================

    subgraph GL ["5. General Ledger & Financials (Reconciliation)"]

        I10 -.-> F1(Recognize COGS Expense)

        A3 -.-> F2(Recognize Revenue)

        A8 -.-> F3(Decrease AR, Increase Cash)

        

        F1 & F2 & F3 --> F4(Bank Reconciliation)

        F4 --> F5(Month-End Close Process)

        F5 --> F6([Live Dashboard: P&L, Balance Sheet, Cash Flow])

        DB1 -.-> F6

    end



    %% Apply Classes

    class M2,M3,S1,S2,S3,S4,S6,S7,S9,O1 marketing;

    class O1,O3,O4 sales;

    class I1,I3,P1,P2,P3,P4,P5,M1_Prod,M2_Prod,M3_Prod,M4_Prod,I5,I6,I7,I8,I9,I10 inventory;

    class O2,A1,A2,A3,A4,A6,A7,A8,F1,F2,F3,F4,F5,F6 finance;

    class M4,S5,S8,O2,I2,I4,A5 decision;

    class DB1 database; 
```


## 2. Universal Role-Based Access Control (RBAC) & SSO

To implement strict multi-department boundaries—where the **Super Admin** sees everything, but standard workers are sandboxed inside their explicit subdomains—the platform utilizes a **Zero-Trust Token Strategy**.

### The Authentication Architecture

1. **Domain Isolation Problem:** Standard browser `localStorage` is completely locked to individual subdomains. An application at `crm.erp.local` cannot natively look inside the local storage of `billing.erp.local`.
2. **The Solution (Shared Wildcard Cookies):** The `core-iam` NestJS service acts as the centralized validator. When a user submits credentials, `core-iam` validates the hash, appends the user's Department and Role to the payload, and signs a JSON Web Token (JWT).
3. **Cookie Broadcasting:** The server appends this token to a secure, browser-managed cookie using a root domain marker: `Domain=.erp.local`. Because of the preceding dot, the browser automatically transmits this token alongside every background HTTP network call targeting any functional subdomain.
4. **The Security Guardrail:** Every microservice backend wraps its routing engines inside a unified guard layer imported from `packages/auth-middleware`. This intercepts incoming requests, decodes the token, and drops unauthorized traffic with a `403 Forbidden` response.

## 3. The Database Architecture Strategy: Database-per-Service

To build a system that can be maintained by multiple independent teams, deploy via subdomains, and scale from a single machine up to Kubernetes, you must avoid the **"Shared Database Trap."** If all your teams and microservices connect to a single, giant PostgreSQL database with shared tables, you lose all the benefits of your multi-module architecture. A bad query or database migration by the CRM team could instantly lock tables and crash the Billing and Inventory systems.

Each core domain folder in your project owns its own data store completely:

* The **CRM service** can only read/write to the **CRM database**.
* The **Billing service** can only read/write to the **Billing database**.
* If the CRM service needs information about an invoice, it is **strictly forbidden** from querying the Billing database directly. It must ask the Billing service for that data via an API call (gRPC/REST) or an Asynchronous Event.

### The Database Allotments

You will need **5 separate logical databases** (which can be hosted on a single server engine locally, but split apart in production):

1. `erp_iam` (Core IAM): Stores global users, password hashes, organizations, tenants, master roles, and global system metadata (PostgreSQL via Prisma).
2. `erp_crm`: Stores leads, clients, sales pipelines, opportunities, and sales orders (PostgreSQL via SQLAlchemy 2.0).
3. `erp_billing`: Stores invoices, quotations, payments, receipts, and the general accounting ledger (PostgreSQL via Prisma).
4. `erp_inventory`: Stores product catalogs, warehouse locations, stock levels, batches, and serial tracking numbers (PostgreSQL via SQLModel).
5. `erp_hrms`: Stores employee files, payroll history, attendance logs, and internal department structures (PostgreSQL via Prisma).

---

### How to Maintain Databases Across the Scaling Lifecycle

You will structure your code so that databases are grouped logically for your teams but orchestrated universally based on your deployment stage.

```
[Local: 1 Postgres Container with 5 Databases] ──> [Cloud Stage 1: 1 Managed RDS Instance with 5 Schemas] ──> [Cloud Stage 2: Independent Isolated DB Instances]
```

#### Step 1: Local Development Setup (Zero Cost, One Command)

To make local development easy for your developers, they should not have to spin up 5 separate database servers on their laptops. Instead, you run **one single PostgreSQL container** that hosts 5 distinct, isolated databases inside it.

You define this directly in your local orchestration setup (`infrastructure/local/docker-compose.yml`):

```yaml
version: '3.8'

services:
  erp-postgres-local:
    image: postgres:16-alpine
    container_name: erp_postgres_local
    environment:
      POSTGRES_USER: erp_master
      POSTGRES_PASSWORD: local_secure_password
      # We use a custom initialization script to create all 5 databases on startup
    volumes:
      - ./init-multiple-databases.sh:/docker-entrypoint-initdb.d/init-multiple-databases.sh
      - erp_local_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  erp_local_data:
```

Your services will connect to their respective databases using localized environment strings:
* **CRM**: `postgresql://erp_master:local_secure_password@erp-postgres-local:5432/erp_crm`
* **Billing**: `postgresql://erp_master:local_secure_password@erp-postgres-local:5432/erp_billing`

#### Step 2: Production Setup without Kubernetes (Stage 1 VMs)

When you move to a single cloud Virtual Machine using Docker Compose + Caddy, **do not run your production databases inside Docker containers.** If the container crashes or the VM disk runs out of space, you risk corrupting your core ERP data.

* **The Setup**: Provision **one managed cloud database instance** (like AWS RDS or DigitalOcean Managed Databases).
* **The Division**: Inside this single managed instance, create your 5 isolated databases. This keeps your costs low (you only pay for one database server instance) while maintaining total code isolation between your microservice folders.

#### Step 3: Production Setup with Kubernetes (Stage 2 High-Scale)

When your traffic grows and you scale up to a Kubernetes cluster, you can scale your data tier independently to save money:

* Your **Billing** and **IAM** databases require absolute transactional integrity, so you keep them on a highly available, multi-AZ PostgreSQL setup.
* If your **CRM** or **Inventory** data grows massively due to high logging volumes, you can migrate that specific database onto a dedicated, storage-optimized database instance without touching or disrupting your core billing cluster.

---

### How the Super Admin Views Everything Without Shared Databases

If the databases are completely separated, how does the Super Admin see metrics from all departments at once on the central dashboard (`app.yourdomain.com`)?

You have two clean options to implement this:

#### Option A: API Aggregation (Best for Real-Time Operational Views)

When the Super Admin opens the dashboard, the central frontend backend (`erp-shell`) performs safe, parallel, read-only internal network requests (using high-speed gRPC or lightweight internal REST) to each individual service:

```
                  ┌──> [IAM Service] ──────> Reads erp_iam
                  │
[Super Admin] ────┼──> [CRM Service] ──────> Reads erp_crm
  Dashboard       │
                  └──> [Billing Service] ──> Reads erp_billing
```

The central gateway dynamically stitches these independent responses together into a single user interface view. This ensures no service database is exposed directly to foreign code components.

#### Option B: Event-Driven Analytics (Best for Historical Metrics & Charts)

If your Super Admin dashboard needs to show complex historical data (like a chart of *Sales Closed vs. Inventory Used* over the last 12 months), making multiple live API calls will slow down your application.

1. You introduce a lightweight event-streaming layer (like **RabbitMQ** or **Kafka**) or a simple webhook network.
2. Every time a transaction occurs (e.g., the Billing service generates an invoice, or the CRM team wins a lead), the service publishes a lightweight message packet like `{"event": "INVOICE_CREATED", "amount": 5000}` to the message pipeline.
3. A small background utility process reads these messages and syncs them down to a dedicated read-only analytical database or data store owned exclusively by the Super Admin workspace. This gives your executives instant data visualization speeds without putting any read loads on your production operational databases.

## 4. Cost-Saving CI/CD Pipeline (Build Cost Optimization)

To scale this multi-team setup without incurring massive cloud compute bills or causing compilation lines to freeze during simple deployments, your deployment system leverages **Nx Incremental Delta Hashing**.

### The Continuous Integration Workflow

Every single pull request or merge event targeting the deployment branch executes a lean validation loop:

```bash
# 1. Bring in matching monorepo locks cleanly
npm ci

# 2. Execute testing processes ONLY on code segments modified by the current commit
npx nx affected --target=test --base=origin/main --head=HEAD

# 3. Build only the specific modules containing modifications
npx nx affected --target=build --base=origin/main --head=HEAD --parallel=3
```

### The Optimization Framework

- **Remote Workspace Caching:** Nx tracks a unique hash fingerprint of your folder structures, files, and environment settings. If Team A pushes code that alters files exclusively within `services/crm-service`, Nx instantly flags all other 6 services as unchanged. It bypasses compilation for those services entirely and references pre-compiled code fragments from a shared remote cache.
- **Targeted Image Building:** The build runner only spins up a containerization step for the explicitly modified folder. A new image tag is generated and pushed to your image registry, saving hours of unnecessary machine processing time and dramatically lowering your infrastructure expenses.