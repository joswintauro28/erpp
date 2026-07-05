# DATAVEX ERP

Full-stack ERP system with a FastAPI backend and Next.js frontend.

## Structure

```
apps/
└── erp-shell/    # Next.js 16 frontend (Turbopack)

services/
└── erp-service/  # FastAPI backend (Python 3.12)

docs/             # Documentation
scripts/          # Build/deploy scripts
infrastructure/   # Deployment configs
```

## Quick Start

**Backend** (`services/erp-service/`):
```
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend** (`apps/erp-shell/`):
```
bun run dev
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.10, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | FastAPI, SQLAlchemy (async), Alembic, PostgreSQL |
| Auth | JWT access tokens (15 min) + refresh token cookies (7 day) |
| Proxy | Next.js rewrites `/api/*` → `http://127.0.0.1:8000` |
