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

## 3. Modules & Endpoints
- **Dashboard (`GET /api/dashboard`):** Pipeline value, open opportunities, pipeline stages, hot leads, and recommendations.
- **Customer:** Accounts, ARR tracking, and document links.
- **Lead:** Lead scoring and status lifecycle (New -> Qualified -> Converted/Lost).
- **Sales:** Requirements, quotes, and sales orders.
- **Interaction:** Enquiries, site visits, follow-up logs, and tasks.
- **Service:** Complaints and feedback scoring.
- **AI:** Assistant logs and queries.

## 4. Run Commands
- **Run CRM Service:**
  ```bash
  bun nx run crm-service:dev
  ```
