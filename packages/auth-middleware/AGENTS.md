# DATAVEX ERP — Auth Middleware Package (`packages/auth-middleware`) Agent Context

This central package provides shared authentication configurations, types, and clients for DATAVEX ERP frontend applications.

## 1. Key Features
- **JWT Auth Client:** Implements `setAccessToken`, `getAccessToken`, token refresh workflows, and automated intercepts on 401 Unauthorized errors.
- **Typed HTTP Client:** Exposes a configured `api` instance (`api.get`, `api.post`, `api.put`, etc.) using standard types.
- **Shared Types:** Exposes `User`, `ApiError`, and `ApiClientError` to reduce duplicate declarations.

## 2. Package Usage
- **Package Name:** `@datavex/auth-middleware`
- **Dependency registration:** All Next.js UI workstations register this workspace dependency in their local `package.json` file:
  ```json
  "dependencies": {
    "@datavex/auth-middleware": "workspace:*"
  }
  ```
- **Usage Reference:** Frontend workstations re-export type files via their local config:
  ```typescript
  export type { ApiError, ApiClientError } from "@datavex/auth-middleware";
  ```
