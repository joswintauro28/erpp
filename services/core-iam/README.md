# core-iam — Central Single Sign-On (SSO) & RBAC Engine

The IAM (Identity and Access Management) Service is a high-performance NestJS application running on **port 8002**, serving as the central authentication authority for all workstations.

---

## 1. Tech Stack
- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database ORM**: Prisma Client (compiled to local output folder `@prisma/client-iam`)
- **Database Target**: `erp_iam` (PostgreSQL)
- **Auth Hashing**: `bcryptjs`
- **SSO Access**: Signed JWTs (containing sub, email, role, permissions, organization metadata) + HttpOnly refresh cookies.

---

## 2. Seed Accounts & Dev Roles
Executing `bunx prisma db seed` (dev profile) seeds these standard test accounts. All five are active members of **DATAVEX Industries (org 1)**, and `admin@datavex.com` is also an Organization Owner member of the Eternal / Zomato / Blinkit / District hierarchy (visible in the header Org Switcher):
* **Alex Chen** (`admin@datavex.com` / `Admin@123!`) &rarr; Organization Owner
* **Maya Patel** (`sales@datavex.com` / `Sales@123!`) &rarr; Sales Executive
* **Jordan Kim** (`accounts@datavex.com` / `Acc@123!`) &rarr; Accountant
* **Sam Rivera** (`inventory@datavex.com` / `Inv@123!`) &rarr; Inventory Manager
* **Priya Sharma** (`auditor@datavex.com` / `Aud@123!`) &rarr; Auditor

The `testing` profile (`bun run prisma/seed.ts --profile testing`) additionally seeds a multi-org RBAC matrix: `blinkit-lead@datavex.com` / `Test@123!` (single-org Sales Executive), disabled `inactive@datavex.com` / `Test@123!` (suspended District membership), plus cross-org memberships (Maya → Eternal owner, Jordan → Zomato auditor).

---

## 3. Prisma isolation
To prevent conflicts with other services in the monorepo, Prisma uses a custom output location in `schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/@prisma/client-iam"
}
```
All DB calls are imported from `@prisma/client-iam` instead of the default `@prisma/client`.

---

## 4. Run Scripts
- Dev Server: `bun nx run core-iam:dev` (runs on `http://localhost:8002`)
- Seed / Push Database: `bunx prisma db push` and `bunx prisma db seed` (dev profile; `bun run prisma/seed.ts --profile testing` for the testing profile)
- Docker: Builds via services/core-iam/Dockerfile (Alpine Node 24 runtime, Bun installer, non-root user).
