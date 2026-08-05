# DATAVEX ERP — CRM Service (`services/crm-service`) Agent Context

This backend service manages the sales pipelines, interactions, communications, leads, client lists, service feedback, and AI assistant query logs.

## 1. Tech Stack
- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (Sync engine via `create_engine` + `SessionLocal`)
- **Database Target:** `erp_crm` (PostgreSQL)
- **Port:** 8001

## 2. API Design & Authentication
- **Token Verification Only:** No local login or credential storage endpoints. Authentication is delegated to `core-iam` (8002) using the shared `JWT_SECRET`.
- **Data Isolation:** All database models query using an `owner_id` (Integer index) extracted from JWT claims to prevent cross-organization leaking.
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
- **Customer:** Accounts, ARR tracking, and document links.
- **Lead:** Lead scoring and status lifecycle (New -> Qualified -> Converted/Lost).
- **Sales:** Requirements, quotes, and sales orders.
- **Interaction:** Enquiries, site visits, follow-up logs, and tasks.
- **Service:** Complaints and feedback scoring.
- **AI:** Assistant logs and queries.

## 5. Run Commands
- **Run CRM Service:**
  ```bash
  bun nx run crm-service:dev
  ```
