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
- **Multi-Organization:** Users may hold active memberships in multiple organizations (incl. parent/child hierarchy via `Organization.parentId`). `User.activeOrganizationId` persists the selected org across logins/refreshes; `POST /api/auth/organizations/:id/switch` re-issues the access token with the target org's claims.
- **RBAC:** Guards routes using `@Permissions(...codes)` custom decorator and `PermissionsGuard`.
- **Shared Secret:** Shares the global `JWT_SECRET` configured across all backend services to validate tokens issued by this engine.

## 3. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login (email + password) |
| `/api/auth/register` | POST | User registration |
| `/api/auth/refresh` | POST | Token refresh via HttpOnly cookie |
| `/api/auth/logout` | POST | Clear refresh cookie |
| `/api/auth/users/me` | GET | Current user profile (includes `organizations[]` memberships) |
| `/api/auth/organizations` | GET | List caller's active organization memberships + active org id |
| `/api/auth/organizations/:id/switch` | POST | Switch active organization (re-issues access token) |
| `/api/auth/users` | GET | List all users (admin) |
| `/api/auth/users` | POST | Create user |
| `/api/auth/users/:id/status` | PUT | Toggle user active/inactive |
| `/api/auth/users/:id/role` | PUT | Change user role |
| `/api/auth/users/:id` | DELETE | Delete user |
| `/api/auth/roles` | GET | List all roles |
| `/api/auth/permissions` | GET | List all permissions |
| `/api/auth/roles/:id/permissions` | PUT | Update role permissions |

## 3. Database & Dev Commands
- **Database Push:** Deploy schema to `erp_iam`
  ```bash
  bunx prisma db push
  ```
- **Seeding Users & Permissions (dual-profile: `dev` default, `testing` for the multi-org RBAC matrix):**
  ```bash
  bunx prisma db seed                       # dev profile
  bun run prisma/seed.ts --profile testing  # testing profile
  ```
  Seeds 5 organizations (DATAVEX 1, Eternal 2, Zomato 3, Blinkit 4, District 5 — Zomato/Blinkit/District are children of Eternal), the 5 dev accounts as org-1 members, admin membership in every org, and per-org Company/Branding/Notification/Workflow settings. The testing profile adds `blinkit-lead@datavex.com` / `inactive@datavex.com` (`Test@123!`) and cross-org memberships.
- **Run Service:**
  ```bash
  bun nx run core-iam:dev
  ```
