# DATAVEX ERP — AI Service (`services/ai-service`) Agent Context

This backend service provides AI-powered chat, session management, and context-aware LLM integration for all DATAVEX ERP workstations.

## 1. Tech Stack
- **Framework:** FastAPI (Python 3.13+)
- **Language:** Python
- **Port:** 8005
- **Database ORM:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`)
- **Migrations:** Alembic (own chain, independent deployment)
- **Database Target:** `erp_ai` (PostgreSQL)
- **LLM Provider:** Pluggable — Groq (default, REST via `httpx`) or Gemini (`google-genai` SDK)
- **Streaming:** Server-Sent Events (SSE) for real-time chat responses

## 2. Authentication & Authorization
- **Claims-Based Verification:** JWT payload decoded from shared `JWT_SECRET` — no DB queries for auth.
- **Data Isolation:** Session and audit rows carry `user_id` **and** `organization_id` (Integer, indexed, from the JWT claims); every list/get/history query filters on both, so users only see their own chats within the active organization. Messages inherit scoping through their session.
- **Auth Pattern:** Token-verification only — no login endpoints, no credential handling. All authentication delegated to core-iam (port 8002).

## 3. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | Send message, receive SSE-streamed response with module-aware context |
| `/api/ai/sessions` | GET | List user's chat sessions |
| `/api/ai/sessions/:id` | DELETE | Delete a chat session |
| `/api/ai/history/:id` | GET | Get session message history |
| `/api/ai/suggestions` | GET | Module-aware prompt suggestions |
| `/api/ai/health` | GET | LLM provider health check |
| `/api/ai/dashboard` | GET | Usage analytics and audit logs |

## 4. Database Models

| Model | Key Fields | Description |
|-------|-----------|-------------|
| `AISession` | id (UUID), user_id, organization_id, module (enum: admin/crm/billing/inventory), title | Chat session metadata |
| `AIMessage` | id, session_id, role, content, token_count | Individual messages (scoped via session) |
| `AIAuditLog` | id, user_id, organization_id, action, details, model_used, tokens_used | Usage audit trail |

## 5. LLM Providers

| Provider | SDK | Default Model | Notes |
|----------|-----|---------------|-------|
| **Groq** | `httpx` (REST) | `llama-3.1-8b-instant` | Default provider, fast inference |
| **Gemini** | `google-genai` | `gemini-2.5-flash` | Optional, requires `GEMINI_API_KEY` |

## 6. Context Providers (call other services for live data)
- `crm_client.py` → `http://crm-service:8001/api` (customers, leads)
- `billing_client.py` → `http://billing-service:8003/api` (invoices, payments)
- `inventory_client.py` → `http://inventory-service:8004/api` (stock, purchase orders)

## 7. Frontend Integration
- All 4 frontend apps route `/api/ai/*` → ai-service (port 8005) via their `proxy.ts`.
- Shared `<AIChat>` component in `@datavex/ui-theme` provides the chat UI.
- Nginx configured with `proxy_buffering off` for SSE streaming support.

## 8. Required Environment Variables
```bash
AI_PROVIDER=groq              # "groq" or "gemini"
GROQ_API_KEY=gsk_xxxxx        # Required if AI_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=xxxxx          # Required if AI_PROVIDER=gemini
CRM_SERVICE_URL=http://crm-service:8001
BILLING_SERVICE_URL=http://billing-service:8003
INVENTORY_SERVICE_URL=http://inventory-service:8004
DATABASE_URL=postgresql+asyncpg://postgres:root@postgres:5432/erp_ai
JWT_SECRET=development-jwt-secret-key-123
```

## 9. Development Commands
```bash
cd services/ai-service
bun nx run ai-service:dev     # Start with auto-reload on port 8005
```

## 10. Docker
- **Dockerfile:** Multi-stage build (python:3.13-slim → venv builder → runner)
- **Healthcheck:** `GET /health` on port 8005
- **Startup:** `alembic upgrade head && uvicorn app.main:app`
