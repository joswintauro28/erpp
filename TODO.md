# DATAVEX ERP — AI Chatbot Implementation Plan

**Created:** 2026-08-28 · **Status:** Phase 1–4 Complete · Phase 5–6 Pending

---

## Architecture Decision: Dedicated AI Service

**Decision:** Create a dedicated `ai-service` microservice for all AI functionality.

**Rationale:**
- **Separation of concerns** — AI logic (LLM orchestration, prompt engineering, session management) is a distinct bounded context from ERP business logic
- **Resource isolation** — LLM calls are CPU/memory intensive; isolating prevents starving the ERP gateway
- **Independent deployment** — Changing prompts or LLM providers doesn't risk breaking core ERP operations
- **Own database** (`erp_ai`) — follows the per-service DB pattern (erp_iam, erp_crm, erp_billing, erp_inventory)
- **Streaming support** — SSE/WebSocket for AI responses gets its own connection lifecycle
- **Scalability** — Can scale AI independently under load (e.g., 50 concurrent chat sessions)
- **Industry pattern** — Matches how companies like Intercom, Linear, Notion separate AI from core services

**Rejected alternative:** Storing AI data in erp_db via erp-service — creates ownership confusion, couples AI lifecycle to ERP, and limits independent scaling.

**Context access:** ai-service calls other services directly via HTTP for live data context (no proxy through erp-service).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (4 apps)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ erp-shell│ │  crm-ui  │ │billing-ui│ │inventory │   │
│  │ (Admin)  │ │  (CRM)   │ │ (Billing)│ │  (Inv)   │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│       └─────────────┴─────┬──────┴─────────────┘          │
│              ┌────────────▼────────────┐                 │
│              │  Shared AIChat component │                 │
│              │  (ui-theme package)      │                 │
│              └────────────┬────────────┘                 │
└───────────────────────────┼─────────────────────────────┘
                            │ POST /api/ai/chat
                            ▼
┌─────────────────────────────────────────────────────────┐
│              ai-service (FastAPI, port 8005)              │
│  ┌─────────────────────────────────────────────────┐    │
│  │  /api/ai/*                                       │    │
│  │  ├── POST /chat          (send message)          │    │
│  │  ├── GET  /sessions      (list user sessions)    │    │
│  │  ├── GET  /history/:id   (session messages)      │    │
│  │  ├── DELETE /sessions/:id (delete session)       │    │
│  │  └── GET  /suggestions   (module-aware prompts)  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Context Providers (call other services)         │    │
│  │  ├── crm_client.py      → crm-service (8001)    │    │
│  │  ├── billing_client.py  → billing-service (8003) │    │
│  │  └── inventory_client.py→ inventory-service(8004)│    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  LLM Provider (pluggable)                       │    │
│  │  ├── Groq (llama-3.1-8b-instant) — default      │    │
│  │  └── Gemini — optional                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  erp_ai (PostgreSQL)                             │    │
│  │  ├── ai_sessions  (id, user_id, module, title)   │    │
│  │  └── ai_messages  (id, session_id, role, content)│    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Other Services (called by ai-service)       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │erp-service│ │crm-svc   │ │billing-  │ │inventory-│   │
│  │ (8000)    │ │ (8001)   │ │svc(8003) │ │svc (8004)│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Backend — AI Service Foundation

**Goal:** Stand up the ai-service with session management, LLM integration, and module context.

### Task 1.1: Project Scaffold
- [x] Create `services/ai-service/` directory structure
- [x] `pyproject.toml` with dependencies (fastapi, uvicorn, sqlalchemy, asyncpg, alembic, httpx, pydantic-settings)
- [x] `app/main.py` — FastAPI app with CORS, lifespan, router mount
- [x] `app/core/config.py` — Settings class (JWT_SECRET, DB_URL, LLM keys)
- [x] `app/core/database.py` — AsyncSession factory for `erp_ai`
- [x] `app/core/deps.py` — `get_current_user_id` dependency (JWT decode)
- [x] `.env.example` — all required env vars with safe placeholders

### Task 1.2: Database Models + Migration
- [x] `app/models.py` — SQLAlchemy models:
  - `AISession`: id (UUID), user_id (int), module (enum: admin/crm/billing/inventory), title (str), created_at, updated_at
  - `AIMessage`: id (UUID), session_id (FK→AISession), role (enum: user/assistant/system), content (text), created_at
- [x] Alembic init + migration for `erp_ai` database
- [x] Seed system prompt messages per module

### Task 1.3: Pydantic Schemas
- [x] `app/schemas.py` — Request/response models:
  - `ChatRequest`: message, session_id?, module
  - `ChatResponse`: session_id, message (assistant response)
  - `SessionResponse`: id, title, module, message_count, created_at
  - `HistoryResponse`: messages[] with role, content, created_at

### Task 1.4: LLM Provider Abstraction
- [x] `app/llm/base.py` — Abstract `LLMProvider` with `async chat(messages, model) -> str`
- [x] `app/llm/groq.py` — Groq REST API via httpx (default provider)
- [x] `app/llm/gemini.py` — Gemini stub for future
- [x] `app/llm/factory.py` — `get_provider()` based on `AI_PROVIDER` env var
- [x] Env vars: `AI_PROVIDER`, `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`

### Task 1.5: Module Context Providers
- [x] `app/context/base.py` — Abstract `ContextProvider` with `async get_context(user_id) -> dict`
- [x] `app/context/crm.py` — Calls crm-service: customers, pipeline, leads
- [x] `app/context/billing.py` — Calls billing-service: invoices, payments, outstanding
- [x] `app/context/inventory.py` — Calls inventory-service: stock, POs, low-stock alerts
- [x] `app/context/admin.py` — Calls core-iam + other services for cross-module KPIs
- [x] Each provider returns structured dict for prompt injection
- [x] HTTP clients: `app/context/clients.py` — crm_client, billing_client, inventory_client

### Task 1.6: System Prompt Templates
- [x] `app/prompts.py` — Per-module system prompts:
  - `ADMIN_PROMPT` — cross-module overview, system health
  - `CRM_PROMPT` — customer insights, pipeline analysis, lead scoring
  - `BILLING_PROMPT` — invoice management, payment tracking, GST
  - `INVENTORY_PROMPT` — stock levels, procurement, fulfillment
- [x] Each prompt: role definition, context format, guardrails, INR formatting, Indian date format

### Task 1.7: CRUD Operations
- [x] `app/crud.py` — Database operations:
  - `create_session(user_id, module, title?) -> AISession`
  - `get_session(session_id, user_id) -> AISession?`
  - `list_sessions(user_id, module?) -> list[AISession]`
  - `delete_session(session_id, user_id) -> bool`
  - `add_message(session_id, role, content) -> AIMessage`
  - `get_history(session_id, limit=50) -> list[AIMessage]`

### Task 1.8: AI Router
- [x] `app/router.py` — Endpoints:
  - `POST /api/ai/chat` — Send message, get AI response (streaming-ready)
  - `GET /api/ai/sessions` — List user's sessions (filterable by module)
  - `GET /api/ai/history/{session_id}` — Message history
  - `DELETE /api/ai/sessions/{session_id}` — Delete session + messages
  - `GET /api/ai/suggestions/{module}` — Module-specific suggestion chips
- [x] Wire router into `main.py`

---

## Phase 2: Frontend — Shared AI Chat Component

**Goal:** Build a reusable chat UI in `ui-theme` that any app can embed.

### Task 2.1: AIChat Component
- [x] Create `packages/ui-theme/src/components/shared/ai-chat.tsx`
  - Props: `module: "admin" | "crm" | "billing" | "inventory"`, `apiBase?: string`
  - State: messages[], sessionId, input, loading
  - Auto-scroll to bottom on new messages
  - Basic markdown rendering (bold, code, lists)
  - Session selector dropdown (past sessions)
  - "New Chat" button
  - Loading skeleton while waiting for response

### Task 2.2: AIChat UI Layout
- [x] Chat header: module icon + title + session selector
- [x] Message list: user (right, brand), assistant (left, card), system (centered, muted)
- [x] Input area: textarea + send button, shift+enter newline
- [x] Suggestion chips on empty/new sessions
- [x] Empty state: module-specific welcome + suggestions

### Task 2.3: Export from ui-theme
- [x] Export `AIChat` and types from `packages/ui-theme/src/index.ts`

---

## Phase 3: Sidebar Integration

**Goal:** Add AI Assistant section at bottom of every sidebar.

### Task 3.1: Sidebar AI Section
- [x] `apps/erp-shell/components/Sidebar.tsx` — pinned bottom section, remove `soon: true`
- [x] `apps/crm-ui/components/Sidebar.tsx` — same pattern
- [x] `apps/billing-ui/components/Sidebar.tsx` — add section (currently missing)
- [x] `apps/inventory-ui/components/Sidebar.tsx` — add section (currently missing)
- [x] Visual separator (border-top) from main nav
- [x] Collapsed state: Sparkles icon only

### Task 3.2: AI Assistant Pages
- [x] `apps/erp-shell/app/(admin)/ai-assistant/page.tsx` → `<AIChat module="admin" />`
- [x] `apps/crm-ui/app/(admin)/ai-assistant/page.tsx` → `<AIChat module="crm" />`
- [x] `apps/billing-ui/app/(admin)/ai-assistant/page.tsx` → `<AIChat module="billing" />`
- [x] `apps/inventory-ui/app/(admin)/ai-assistant/page.tsx` → `<AIChat module="inventory" />`

---

## Phase 4: Module Context Integration

**Goal:** Make the AI aware of live data from each module.

### Task 4.1: CRM Context
- [x] Fetch: active customer count, pipeline value, top 5 open opps, recent leads, tier distribution
- [x] Source: ai-service calls crm-service `/api/customers`, `/api/leads`, `/api/opportunities`

### Task 4.2: Billing Context
- [x] Fetch: outstanding total, overdue count, recent payments, revenue trend, GST summary
- [x] Source: ai-service calls billing-service `/api/invoices`, `/api/payments/metrics`

### Task 4.3: Inventory Context
- [x] Fetch: product count, low-stock alerts, pending POs, warehouse summary, recent movements
- [x] Source: ai-service calls inventory-service `/api/stock`, `/api/purchase-orders`

### Task 4.4: Admin Context
- [x] Fetch: user count, system health, recent activity
- [x] Source: ai-service calls core-iam + other services for aggregated KPIs

---

## Phase 5: Advanced Features

### Task 5.1: Conversation Memory
- [ ] Load last N messages from session for context window
- [ ] Summarize older messages to stay within token limits
- [x] Persistent sessions across page reloads

### Task 5.2: Smart Suggestions
- [ ] Module-specific suggestion chips (static + dynamic based on context)
- [ ] Dynamic: after viewing an invoice, suggest "Draft payment reminder"

### Task 5.3: Data-Aware Responses
- [ ] Resolve entity IDs from context for inline links
- [ ] Format monetary values consistently (INR with commas)
- [ ] Include clickable links to relevant pages

### Task 5.4: Rate Limiting & Security
- [ ] Rate limit: 30 requests/minute per user
- [x] Sanitize input (strip HTML, limit 4000 chars)
- [ ] Validate module against user permissions
- [ ] Log all interactions for audit

---

## Phase 6: Polish & Production Readiness

### Task 6.1: Loading & Error States
- [ ] Streaming response with typing indicator
- [x] Graceful errors (API key missing, LLM timeout, rate limit)
- [ ] Retry button on failed messages

### Task 6.2: Mobile Responsive
- [ ] Full-screen chat on mobile (<md)
- [x] Touch-friendly input and scroll

### Task 6.3: Accessibility
- [ ] ARIA labels, keyboard navigation, screen reader support

### Task 6.4: Analytics
- [ ] Track: messages/session, response time, module usage, token consumption

---

## File Structure

```
services/ai-service/                          # NEW — FastAPI, port 8005
├── app/
│   ├── __init__.py
│   ├── main.py                               # FastAPI app entry
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                         # Settings (JWT_SECRET, DB, LLM keys)
│   │   ├── database.py                       # SQLAlchemy AsyncSession for erp_ai
│   │   └── deps.py                           # get_current_user_id (JWT decode)
│   ├── models.py                             # AISession, AIMessage (SQLAlchemy)
│   ├── schemas.py                            # Pydantic request/response models
│   ├── crud.py                               # Database operations
│   ├── router.py                             # /api/ai/* endpoints
│   ├── prompts.py                            # System prompt templates per module
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── base.py                           # Abstract LLMProvider
│   │   ├── groq.py                           # Groq REST API (default)
│   │   └── gemini.py                         # Gemini stub
│   └── context/
│       ├── __init__.py
│       ├── base.py                           # Abstract ContextProvider
│       ├── clients.py                        # HTTP clients for other services
│       ├── crm.py                            # CRM context provider
│       ├── billing.py                        # Billing context provider
│       ├── inventory.py                      # Inventory context provider
│       └── admin.py                          # Admin cross-module context
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── pyproject.toml
├── requirements.txt
├── .env.example
└── .env

packages/ui-theme/src/components/shared/
├── ai-chat.tsx                               # Shared chat UI component

apps/*/app/(admin)/ai-assistant/
├── page.tsx                                  # Renders <AIChat module="..." />
└── loading.tsx                               # Skeleton loading state

apps/*/proxy.ts                               # Add /api/ai/* → ai-service (8005)
```

---

## Proxy Routing (frontend)

All 4 frontend apps add this to their `proxy.ts`:

```ts
// /api/ai/* → ai-service (port 8005)
{ source: '/api/ai/:path*', destination: 'http://localhost:8005/api/ai/:path*' },
```

---

## Dependencies

### ai-service (Python)
| Package | Purpose | Version |
|---|---|---|
| `fastapi` | Web framework | >=0.115 |
| `uvicorn[standard]` | ASGI server | >=0.34 |
| `sqlalchemy[asyncio]` | ORM | >=2.0 |
| `asyncpg` | PostgreSQL async driver | >=0.30 |
| `alembic` | Migrations | >=1.14 |
| `httpx` | HTTP client (LLM + service calls) | >=0.28 |
| `pydantic-settings` | Config management | >=2.0 |

### Frontend (shared)
| Package | Purpose | Install |
|---|---|---|
| `react-markdown` | Markdown rendering in chat | `bun add react-markdown` |

---

## Environment Variables

```bash
# ai-service .env
DATABASE_URL=postgresql+asyncpg://datavex:datavex@localhost:5432/erp_ai
JWT_SECRET=development-jwt-secret-key-123
AI_PROVIDER=groq
GROQ_API_KEY=gsk_xxxxx
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=
CRM_SERVICE_URL=http://localhost:8001
BILLING_SERVICE_URL=http://localhost:8003
INVENTORY_SERVICE_URL=http://localhost:8004
```

---

## Nx Registration

Add to `nx.json` and root `package.json` workspaces:

```json
// nx.json — projects
"ai-service": { "tags": ["backend", "python", "ai"] }
```

```json
// package.json — scripts
"dev:ai": "bun nx run ai-service:dev"
```

---

## Success Criteria

- [x] User can open AI chat from any of 4 workstations
- [x] Chat context is module-aware (CRM data for CRM, billing for billing, etc.)
- [x] Sessions persist across page reloads (stored in erp_ai DB)
- [ ] Responses grounded in actual data (not hallucinated)
- [ ] Mobile-responsive chat UI
- [ ] < 3s first-token latency
- [x] All 4 apps compile clean
- [x] ai-service has own DB (erp_ai), own Alembic chain, independent deployment

---

## Effort Estimate

| Phase | Effort | Dependencies |
|---|---|---|
| Phase 1: Backend Foundation | 2–3 days | None |
| Phase 2: Shared UI Component | 1–2 days | Phase 1 |
| Phase 3: Sidebar Integration | 0.5 day | Phase 2 |
| Phase 4: Module Context | 1–2 days | Phase 1 |
| Phase 5: Advanced Features | 2–3 days | Phase 2 + 4 |
| Phase 6: Polish | 1–2 days | All above |
| **Total** | **8–12 days** | |

---

## Docker Infrastructure Audit — 2026-08-29

**Scope:** Full audit of all Docker infrastructure (compose, Dockerfiles, env, build/seed scripts) across 10 services.

### Issues Found & Fixed

#### 1. Proxy Configuration — Root Cause of Build Failure ✅ FIXED
**Problem:** `.env.docker` had `HTTP_PROXY=http://http.docker.internal:3128` uncommented. Docker Desktop's built-in proxy is unreliable for Docker builds — it causes TLS errors on Alpine CDN and connection-refused on Debian repos, preventing `dumb-init` and `openssl` from being installed.

**Why previous builds worked:** Docker layer caching meant `apk add`/`apt-get` steps were never re-executed. `--no-cache` forced fresh downloads, which hit the broken proxy.

**Fix:** Commented out proxy settings in `.env.docker` with clear documentation. Builds now use direct connections.

**Files changed:** `infrastructure/local/.env.docker`

#### 2. PYTHONPATH Missing from FastAPI Dockerfiles ✅ FIXED
**Problem:** Only `ai-service/Dockerfile` had `PYTHONPATH` set. The other 3 FastAPI services (`erp-service`, `inventory-service`, `crm-service`) were missing it, which could cause Alembic to fail finding the `app` module during `alembic upgrade head`.

**Fix:** Added `PYTHONPATH="/app/services/<service-name>"` to all 3 Dockerfiles.

**Files changed:** `services/erp-service/Dockerfile`, `services/inventory-service/Dockerfile`, `services/crm-service/Dockerfile`

#### 3. openssl Missing from erp-service Builder ✅ FIXED
**Problem:** `erp-service/Dockerfile` didn't install `openssl` in the builder stage, unlike all other Python services. Some pip packages (like `cryptography`) need openssl headers to build.

**Fix:** Added `apt-get install -y --no-install-recommends openssl` to erp-service's builder stage.

**Files changed:** `services/erp-service/Dockerfile`

#### 4. Missing `app/ai_assistant` Module in crm-service ✅ FIXED (prior session)
**Problem:** CRM seed script imported `from app.ai_assistant.models import AIAssistantLog` but the module didn't exist, causing `ModuleNotFoundError`.

**Fix:** Created `services/crm-service/app/ai_assistant/__init__.py` and `models.py` with the `AIAssistantLog` model matching the existing `ai_logs` table schema.

**Files changed:** `services/crm-service/app/ai_assistant/__init__.py`, `services/crm-service/app/ai_assistant/models.py`, `services/crm-service/app/models.py`, `services/crm-service/scripts/seed.py`

### Status of Other Items

| Item | Status | Notes |
|------|--------|-------|
| `dumb-init` in Dockerfiles | ⚠️ Environment | Not a code issue — was proxy blocking Alpine CDN |
| Frontend Dockerfile deduplication | 💡 Optimization | All 4 copy identical monorepo package.jsons |
| Docker Bake file | 💡 Optimization | Could replace parallel compose builds |
| Resource limits (mem/cpus) | 💡 Hardening | No limits set — one service could starve others |
| Python version consistency | ⚠️ Note | erp/crm = 3.12, ai/inventory = 3.13 (intentional) |
| NestJS services use `dumb-init` | ✅ OK | FastAPI doesn't need it (uvicorn handles signals) |

### Files Changed in This Audit

```
infrastructure/local/.env.docker                    # Proxy commented out, documented
services/erp-service/Dockerfile                      # +PYTHONPATH, +openssl builder
services/inventory-service/Dockerfile                # +PYTHONPATH
services/crm-service/Dockerfile                      # +PYTHONPATH
services/crm-service/app/ai_assistant/__init__.py    # New module (created in prior session)
services/crm-service/app/ai_assistant/models.py      # AIAssistantLog model (prior session)
services/crm-service/app/models.py                   # Registered AIAssistantLog import (prior session)
services/crm-service/scripts/seed.py                 # Fixed TRUNCATE + create_all (prior session)
services/ai-service/alembic/env.py                   # Added settings import + URL override (prior session)
```
