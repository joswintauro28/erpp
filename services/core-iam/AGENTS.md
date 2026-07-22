# DATAVEX ERP — Central IAM Service (`services/core-iam`) Agent Context

This service provides central SSO, Authentication, and Role-Based Access Control (RBAC) across the DATAVEX ERP ecosystem.

## 1. Tech Stack
- **Framework:** NestJS 11
- **Language:** TypeScript
- **Port:** 8002
- **Database ORM:** Prisma Client (generated to `@prisma/client-iam` to avoid naming conflicts with other services)
- **Database Target:** `erp_iam` (PostgreSQL)
- **Password Hashing:** `bcryptjs`

## 2. SSO & Auth Flow
- **Signed JWT Claims:** `sub` (userId), `email`, `role`, `permissions[]`, `organization_id`, `organization_name`.
- **Refresh Strategy:** Secure HttpOnly refresh cookies.
- **RBAC:** Guards routes using `@Permissions(...codes)` custom decorator and `PermissionsGuard`.
- **Shared Secret:** Shares the global `JWT_SECRET` configured across all backend services to validate tokens issued by this engine.

## 3. Database & Dev Commands
- **Database Push:** Deploy schema to `erp_iam`
  ```bash
  bunx prisma db push
  ```
- **Seeding Users & Permissions:**
  ```bash
  bunx prisma db seed
  ```
- **Run Service:**
  ```bash
  bun nx run core-iam:dev
  ```
