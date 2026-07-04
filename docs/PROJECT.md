# Architecture & Implementation Strategy: Enterprise ERP System

## 1. Executive Summary

This document outlines the architectural blueprint for a highly scalable, enterprise-grade ERP ecosystem. The system bridges existing legacy applications (HRMS, Accounts, Service Desk) with newly engineered modules (CRM, Ecommerce, AI Engine) using a **Polyglot Monorepo** and an **Event-Driven Microservices Architecture**.

To eliminate legacy routing conflicts and ensure independent scalability, the platform utilizes **subdomain-based routing** managed via a unified identity and access management (IAM) layer.

## 2. Core Architectural Principles

| Domain | Strategic Decision | Justification |
| --- | --- | --- |
| **Codebase** | Polyglot Monorepo (Nx / Bazel) | Centralizes CI/CD pipelines and shares type contracts while supporting Node, Python, and Java concurrently. |
| **Routing** | Subdomain Deployment | Isolates module traffic, completely prevents path-matching conflicts for legacy apps, and allows independent scaling per module. |
| **Legacy Integration** | Lift-and-Shift + Containerization | Wraps existing HRMS/Accounts in Docker as black boxes, saving months of rewrite time while modernizing infrastructure. |
| **Asynchronous Data** | Event Broker (Kafka / RabbitMQ) | Decouples modules. For example, the CRM closing a deal emits an event; Accounts listens and generates an invoice without direct API coupling. |
| **Synchronous Data** | gRPC & Protocol Buffers | Ensures strict, cross-language type safety for direct internal microservice-to-microservice API calls. |

## 3. Subdomain & Network Strategy

The ERP abandons traditional path-based gateways (e.g., `/api/hrms`) in favor of DNS-level subdomain routing. This is managed by an Ingress Controller (e.g., NGINX Ingress, AWS ALB).

* **`app.yourdomain.com`**: The Core Workspace (Next.js central dashboard shell).
* **`crm.yourdomain.com`**: The CRM Module UI (`api.crm.yourdomain.com` for backend).
* **`shop.yourdomain.com`**: The Ecommerce Config UI (`api.shop.yourdomain.com` for backend).
* **`hrms.yourdomain.com`**: Legacy HRMS UI (`api.hrms.yourdomain.com` for backend).
* **`ai.yourdomain.com`**: Isolated Python/Ollama engine.

**Strategic Advantages:**

* **Zero Path Conflicts:** Legacy applications maintain their hardcoded relative paths (e.g., `/images/logo.png`) because they operate at the root of their own virtual domain.
* **Isolated Blast Radius:** A massive influx of traffic hitting the Ecommerce subdomain will not consume the ingress resources required for internal HRMS processing.
* **Targeted Security:** Different Web Application Firewalls (WAF) can be applied per subdomain. The AI layer can enforce strict prompt-injection filters, while Ecommerce utilizes standard DDoS protection.

## 4. Security & Authentication

Deploying across subdomains introduces strict browser security constraints that must be handled at the infrastructure level.

* **Single Sign-On (Wildcard Cookies):** Standard `localStorage` cannot bridge subdomains. The central `core-iam-service` authenticates users and issues a secure, `HTTPOnly` JWT cookie scoped to `.yourdomain.com` (with a leading dot). This guarantees the browser automatically attaches the authentication token to requests made to any ERP module.
* **CORS Firewall:** Every backend microservice explicitly configures its Cross-Origin Resource Sharing (CORS) policy to whitelist internal subdomains (e.g., `*.yourdomain.com`) while strictly blocking external traffic to prevent Cross-Site Request Forgery (CSRF).

## 5. UI/UX: The Unified App Shell

To prevent the subdomain architecture from feeling fragmented, the frontend utilizes a **Unified App Shell** pattern.

* The top navigation bar and global sidebar are identically implemented across all frontends via the shared `ui-design-system` package.
* When navigating from the Next.js shell to the legacy Accounts UI, the transition remains visually seamless. Next.js multi-zones or micro-frontend configurations are used to fetch and render subdomain content without jarring page reloads.

## 6. Sub-System Implementation Details

### The CRM (Domain-Driven Design)

The CRM is built entirely from scratch utilizing Domain-Driven Design (DDD).

* **Core Entities:** Customer, Opportunity, and Lead data models are strictly decoupled from external integrations.
* **Ingestion:** Exposes a dedicated webhook endpoint to seamlessly ingest data from the existing legacy Lead Generation application.

### Local AI Execution

The AI Chatbot, Audit Logging, and Recommendation engines are isolated into a dedicated Python-based service (`ai-engine-service`).

* **Privacy by Design:** It runs localized, quantized small language models (e.g., Gemma, Llama).
* **Performance:** Isolating the AI prevents compute-heavy inference tasks from blocking standard transactional ERP operations.

## 7. Monorepo Project Structure

```text
erp-ecosystem/
├── apps/                                  # Frontend Applications (Subdomains)
│   ├── shell-dashboard/                   # app.domain.com (Unified Next.js navigation)
│   ├── crm-ui/                            # crm.domain.com (Brand new React UI)
│   ├── ecommerce-ui/                      # shop.domain.com (Brand new React UI)
│   ├── legacy-hrms-ui/                    # hrms.domain.com (Lift & shift container)
│   └── legacy-accounts-ui/                # accounts.domain.com (Lift & shift container)
│
├── services/                              # Backend Microservices
│   ├── core-iam-service/                  # auth.domain.com (Central Auth, Roles, Tenants)
│   ├── crm-backend/                       # api.crm.domain.com (New DDD architecture)
│   ├── ecommerce-backend/                 # api.shop.domain.com (New inventory/vendor config)
│   ├── ai-engine-service/                 # ai.domain.com (Local LLM inference & chat API)
│   ├── legacy-hrms-api/                   # api.hrms.domain.com (Lift & shift container)
│   ├── legacy-accounts-api/               # api.accounts.domain.com (Lift & shift container)
│   └── legacy-leadgen-api/                # Webhook ingestion from existing lead system
│
├── packages/                              # Shared Logic & Contracts (The Glue)
│   ├── ui-design-system/                  # Shared React components for a unified look
│   ├── rpc-contracts/                     # .proto files for cross-service type safety
│   ├── auth-middleware/                   # JWT validation scripts used by all services
│   └── logger/                            # Centralized audit trail utility
│
├── infrastructure/                        # DevOps & Orchestration
│   ├── docker-compose.yml                 # Local polyglot orchestration
│   ├── k8s/                               # Production Kubernetes/Ingress manifests
│   └── ai-models/                         # Storage for quantized local models
│
├── nx.json                                # Monorepo task orchestration
└── package.json                           # Root dependencies

```