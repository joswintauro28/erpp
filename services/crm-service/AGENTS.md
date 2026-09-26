# DATAVEX ERP — CRM Service (`services/crm-service`) Agent Context

This backend service manages the sales pipeline: leads, opportunities, requirements, quotations, sales orders, customer/account registry, contacts, documents, reports, lead discovery, and AI assistant logs.

**Out of scope here:** Marketing campaigns (M1) are **not required** by the product requirements, so there is no campaign/email/landing-page functionality. Enquiries, site visits, follow-ups, tasks, communications, visit plans, complaints and feedback are **not implemented in this service** — they will be delivered as a separate **Service-Desk** module.

## 1. Tech Stack
- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`)
- **Database Target:** `erp_crm` (PostgreSQL)
- **Port:** 8001

## 2. API Design & Authentication
- **Token Verification Only:** No local login or credential storage endpoints. Authentication is delegated to `core-iam` (8002) using the shared `JWT_SECRET`.
- **Data Isolation:** All database models query using `organization_id` (Integer index, NOT NULL) extracted from JWT claims (`get_current_org_id`) to enforce strict multi-tenant isolation. No cross-organization bypass.
- **Dynamic CRUD:** Includes generic endpoints (`/api/:entity_type`) that support CRUD operations dynamically based on schema definitions.
- **Interactive OpenAPI Documentation:** Exposes Swagger UI (`http://localhost:8001/docs`), ReDoc (`http://localhost:8001/redoc`), and OpenAPI spec (`http://localhost:8001/openapi.json`) with Bearer JWT authorization.

## 3. Document Numbering Standard
- **Format:** `[PREFIX]-[YYYYMM]-[NNNN]` (regex `^[A-Z]{2,4}-\d{6}-\d{4}$`), e.g. `SO-202608-0001`. Customers use `CUST-NNNN` (no month).
- **Prefixes:** `CUST` (customers), `CO` (contacts), `DO` (documents), `LD` (leads), `OP` (opportunities), `RE` (requirements), `SO` (sales orders), `SA` (sales), `RP` (reports), `AI` (AI assistant logs).
- **Generation:** `app/core/idgen.py` (`next_document_id` / `next_customer_id`) — MAX-based per prefix+month, never reuses deleted numbers. Generic `/api/{entity_type}` create and the sales-orders router always assign server-side `id_str` (client-supplied values are ignored). Sales orders default `so_no = id_str` when not supplied.
- **Frontend contract:** Clients must NOT send legacy IDs (`SO-{Date.now()...}`, `RE-...`, `QT-...`); omit them and let the backend generate.
- **Quotations:** `app/quotations/router.py` forwards to billing-service; `quotationNumber` is only forwarded when it matches the canonical regex, otherwise billing auto-generates `QT-YYYYMM-NNNN`.

## 4. Modules & Endpoints
- **Dashboard (`GET /api/dashboard`):** Pipeline value, open opportunities, pipeline stages, hot leads, and recommendations.
- **Customer:** Accounts, ARR, tier, **credit limit** (drives the billing credit check on SO approval), status, owner.
- **Lead:** Lead scoring / MQL qualification and status lifecycle (New -> Qualified -> Converted/Lost); 1-click MQL -> SQL handoff auto-creates an Opportunity.
- **Sales:** Requirements, quotations (proxied to billing + CPQ discount-approval overlay), and sales orders (credit check -> stock check -> publish to inventory pipeline).
- **Interaction *(planned — Service-Desk)*:** Enquiries, site visits, follow-up logs, and tasks — **not yet implemented**; will ship in the Service-Desk module.
- **Service *(planned — Service-Desk)*:** Complaints and feedback scoring — **not yet implemented**; will ship in the Service-Desk module.
- **AI:** Assistant logs and queries.

## 5. Run Commands
- **Run CRM Service:**
  ```bash
  bun nx run crm-service:dev
  ```
