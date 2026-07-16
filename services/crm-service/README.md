# crm-service — Sales and Customer Relationship Management Service

The CRM Service is a modular FastAPI service running on **port 8001**, managing leads pipelines, client registries, site-visits schedules, follow-ups, and client feedback scores.

---

## 1. Tech Stack
- **Framework**: FastAPI (Python 3.13+)
- **Database ORM**: SQLAlchemy 2.0 (via `create_engine` + sync `SessionLocal`)
- **Migrations**: Alembic
- **Database Target**: `erp_crm` (PostgreSQL)

---

## 2. Dynamic Generic CRUD Router
The CRM service contains a generic dynamic REST router allowing automatic CRUD operations on all schema tables without writing boilerplate controllers:
- `GET /api/:entity_type/fields`: Return form field schemas definitions
- `POST /api/:entity_type`: Insert model records
- `PUT /api/:entity_type/:id_str`: Update model records by dynamic string IDs
- `DELETE /api/:entity_type/:id_str`: Delete model records

---

## 3. Run Scripts
- Dev Server: `bun nx run crm-service:dev` (runs on `http://localhost:8001`)
- Migrations: `alembic upgrade head`
- Docker: Builds via services/crm-service/Dockerfile (slim Python builder, isolated `/opt/venv` environment, non-root user, automated Alembic migrations on startup).
