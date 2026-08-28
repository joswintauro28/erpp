# DATAVEX ERP — AI Chatbot Implementation Plan

**Created:** 2026-08-28 · **Status:** Planning

---

## Architecture Decision: Centralized Storage

**Decision:** Store all AI chat data in `erp_db` via erp-service.

**Rationale:**
- erp-service is the central gateway — already calls billing/inventory/CRM services
- AI chat is a cross-cutting concern, not domain-specific
- `module` column provides logical separation (admin/crm/billing/inventory)
- Admin dashboard needs unified view across all modules
- Single DB query vs federating 4 service APIs
- erp-service already owns cross-cutting tables (file_records, notifications, system_settings)

**Alternative considered:** Distributed storage (each service owns its chats) — rejected due to fragmentation, latency, and complexity overhead for a read-heavy, write-light workload.

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
│              erp-service (port 8000)                      │
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
│  │  erp_db (PostgreSQL)                             │    │
│  │  ├── ai_sessions  (id, user_id, module, title)   │    │
│  │  └── ai_messages  (id, session_id, role, content)│    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Backend — AI Service Foundation

**Goal:** Stand up the central AI endpoint with session management and LLM integration.

### Task 1.1: Database Models (erp_db)
- [ ] Create `services/erp-service/app/ai/models.py`
  - `AISession`: id, user_id, module (enum), title, created_at, updated_at
  - `AIMessage`: id, session_id (FK), role (enum: user/assistant/system), content (text), created_at
- [ ] Create Alembic migration for both tables in `erp_db`
- [ ] Register models in erp-service's SQLAlchemy Base

### Task 1.2: LLM Provider Abstraction
- [ ] Create `services/erp-service/app/ai/llm_provider.py`
  - Abstract `LLMProvider` with `async chat(messages, model) -> str`
  - `GroqProvider` using `httpx` + Groq REST API
  - `GeminiProvider` stub for future
  - Factory `get_provider()` based on env config
- [ ] Add env vars to `services/erp-service/app/core/config.py`:
  - `AI_PROVIDER: str = "groq"`
  - `GROQ_API_KEY: str = ""`
  - `GROQ_MODEL: str = "llama-3.1-8b-instant"`
  - `GEMINI_API_KEY: str = ""`

### Task 1.3: Module Context Providers
- [ ] Create `services/erp-service/app/ai/context_providers.py`
  - `BaseContextProvider` — abstract with `async get_context(user_id) -> dict`
  - `CRMContextProvider` — calls crm_client.py for customers, pipeline, leads
  - `BillingContextProvider` — calls billing_client.py for invoices, payments, outstanding
  - `InventoryContextProvider` — calls inventory_client.py for stock, POs, low-stock alerts
  - `AdminContextProvider` — calls core-iam for user count, system health
- [ ] Each provider returns structured dict injected into system prompt

### Task 1.4: AI Router
- [ ] Create `services/erp-service/app/ai/router.py`
  - `POST /api/ai/chat` — `{ message, session_id?, module }`
    - Resolve/create session
    - Load module context
    - Build system prompt + history + user message
    - Call LLM provider
    - Save messages to erp_db
    - Return `{ session_id, response }`
  - `GET /api/ai/sessions` — list user's sessions, filter by module
  - `GET /api/ai/history/{session_id}` — message history
  - `DELETE /api/ai/sessions/{session_id}` — cascade delete
  - `GET /api/ai/suggestions/{module}` — module-specific prompts
- [ ] Wire into erp-service FastAPI app

### Task 1.5: System Prompt Templates
- [ ] Create `services/erp-service/app/ai/prompts.py`
  - Per-module system prompts with role definition
  - Each prompt receives live context data as structured block
  - Guardrails: refuse destructive actions, redirect to UI for mutations
  - Format: INR currency, Indian date format, professional tone

---

## Phase 2: Frontend — Shared AI Chat Component

**Goal:** Build a reusable chat UI in `ui-theme` that any app can embed.

### Task 2.1: AIChat Component
- [ ] Create `packages/ui-theme/src/components/shared/ai-chat.tsx`
  - Props: `module: "admin" | "crm" | "billing" | "inventory"`, `apiBase?: string`
  - State: messages[], sessionId, input, loading
  - Auto-scroll to bottom on new messages
  - Basic markdown rendering (bold, code, lists)
  - Session selector dropdown (past sessions)
  - "New Chat" button
  - Loading skeleton while waiting for response

### Task 2.2: AIChat UI Layout
- [ ] Chat header: module icon + title + session selector
- [ ] Message list: user (right, brand), assistant (left, card), system (centered, muted)
- [ ] Input area: textarea + send button, shift+enter newline
- [ ] Suggestion chips on empty/new sessions
- [ ] Empty state: module-specific welcome + suggestions

### Task 2.3: Export from ui-theme
- [ ] Export `AIChat` and types from `packages/ui-theme/src/index.ts`

---

## Phase 3: Sidebar Integration

**Goal:** Add AI Assistant section at bottom of every sidebar.

### Task 3.1: Sidebar AI Section
- [ ] `apps/erp-shell/components/Sidebar.tsx` — pinned bottom section, remove `soon: true`
- [ ] `apps/crm-ui/components/Sidebar.tsx` — same pattern
- [ ] `apps/billing-ui/components/Sidebar.tsx` — add section (currently missing)
- [ ] `apps/inventory-ui/components/Sidebar.tsx` — add section (currently missing)
- [ ] Visual separator (border-top) from main nav
- [ ] Collapsed state: Sparkles icon only

### Task 3.2: AI Assistant Pages
- [ ] `apps/erp-shell/app/(admin)/ai-assistant/page.tsx` → `<AIChat module="admin" />`
- [ ] `apps/crm-ui/app/(admin)/ai-assistant/page.tsx` → `<AIChat module="crm" />`
- [ ] `apps/billing-ui/app/(admin)/ai-assistant/page.tsx` → `<AIChat module="billing" />`
- [ ] `apps/inventory-ui/app/(admin)/ai-assistant/page.tsx` → `<AIChat module="inventory" />`

---

## Phase 4: Module Context Integration

**Goal:** Make the AI aware of live data from each module.

### Task 4.1: CRM Context
- [ ] Fetch: active customer count, pipeline value, top 5 open opps, recent leads, tier distribution
- [ ] Source: crm_client.py → crm-service `/api/customers`, `/api/leads`, `/api/opportunities`

### Task 4.2: Billing Context
- [ ] Fetch: outstanding total, overdue count, recent payments, revenue trend, GST summary
- [ ] Source: billing_client.py → billing-service `/api/invoices`, `/api/payments/metrics`

### Task 4.3: Inventory Context
- [ ] Fetch: product count, low-stock alerts, pending POs, warehouse summary, recent movements
- [ ] Source: inventory_client.py → inventory-service `/api/stock`, `/api/purchase-orders`

### Task 4.4: Admin Context
- [ ] Fetch: user count, system health, recent activity
- [ ] Source: core-iam API + erp-service internal queries

---

## Phase 5: Advanced Features

### Task 5.1: Conversation Memory
- [ ] Load last N messages from session for context window
- [ ] Summarize older messages to stay within token limits
- [ ] Persistent sessions across page reloads

### Task 5.2: Smart Suggestions
- [ ] Module-specific suggestion chips (static + dynamic based on context)
- [ ] Dynamic: after viewing an invoice, suggest "Draft payment reminder"

### Task 5.3: Data-Aware Responses
- [ ] Resolve entity IDs from context for inline links
- [ ] Format monetary values consistently (INR with commas)
- [ ] Include clickable links to relevant pages

### Task 5.4: Rate Limiting & Security
- [ ] Rate limit: 30 requests/minute per user
- [ ] Sanitize input (strip HTML, limit 4000 chars)
- [ ] Validate module against user permissions
- [ ] Log all interactions for audit

---

## Phase 6: Polish & Production Readiness

### Task 6.1: Loading & Error States
- [ ] Streaming response with typing indicator
- [ ] Graceful errors (API key missing, LLM timeout, rate limit)
- [ ] Retry button on failed messages

### Task 6.2: Mobile Responsive
- [ ] Full-screen chat on mobile (<md)
- [ ] Touch-friendly input and scroll

### Task 6.3: Accessibility
- [ ] ARIA labels, keyboard navigation, screen reader support

### Task 6.4: Analytics
- [ ] Track: messages/session, response time, module usage, token consumption

---

## File Structure

```
services/erp-service/app/ai/
├── __init__.py
├── router.py              # API endpoints
├── schemas.py             # Pydantic request/response models
├── models.py              # SQLAlchemy AISession, AIMessage (erp_db)
├── llm_provider.py        # LLM abstraction (Groq, Gemini)
├── context_providers.py   # Per-module context fetchers
├── prompts.py             # System prompt templates
└── crud.py                # Database operations

packages/ui-theme/src/components/shared/
├── ai-chat.tsx            # Shared chat UI component

apps/*/app/(admin)/ai-assistant/
├── page.tsx               # Renders <AIChat module="..." />
└── loading.tsx            # Skeleton loading state
```

---

## Dependencies

| Dependency | Purpose | Install |
|---|---|---|
| `httpx` | LLM API calls (already in erp-service) | Already present |
| `react-markdown` | Markdown rendering in chat | `bun add react-markdown` |
| Alembic migration | Session/message tables | Create new |

---

## Success Criteria

- [ ] User can open AI chat from any of 4 workstations
- [ ] Chat context is module-aware (CRM data for CRM, billing for billing, etc.)
- [ ] Sessions persist across page reloads (stored in erp_db)
- [ ] Responses grounded in actual data (not hallucinated)
- [ ] Mobile-responsive chat UI
- [ ] < 3s first-token latency
- [ ] All 4 apps compile clean

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
