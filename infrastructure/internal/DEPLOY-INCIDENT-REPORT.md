# DATAVEX ERP — Deployment Incident Report

**Host:** `datavexerp@datavexerp` (`~/erp/infrastructure/internal`)
**Date:** 2026-10-06 · **Scope:** Docker stack startup + database seeding
**Final status:** ✅ All 14 containers up (13 healthchecks passing; nginx has none) · Seeding 6/6 successful

---

## 1. Summary

Two consecutive problems were hit while bringing the ERP online in
**single-domain (path-based routing)** mode:

1. **Phase 1 — Stack startup failure:** every backend service
   (core-iam, billing, crm, inventory, erp, ai) crash-looped with
   Postgres authentication errors; nginx and all four frontends never
   started because they depend on the failing services.
2. **Phase 2 — Seeding failure:** `./seed-docker.sh` aborted at step 1
   and, after fixing that, at steps 3–5 with three further issues.

All issues were fixed without data loss (the Postgres volume was **not**
wiped — only the `postgres` role's password was reset in place).

---

## 2. Phase 1 — Stack startup failure (`docker-build.sh up --mode single-domain`)

### Symptom

```
✘ datavex-ai-service         Error
✘ datavex-core-iam           Error     ← dependency failure source
✘ datavex-billing-service    Error
✘ datavex-inventory-service  Error
✘ datavex-erp-service        Error
✘ datavex-crm-service        Error
dependency failed to start: container datavex-core-iam is unhealthy
```

Postgres/RabbitMQ/RustFS showed **healthy**, which was misleading —
their healthchecks (`pg_isready`, `rabbitmq-diagnostics`) do not
exercise the credentials the app services use.

### Diagnosis

- Container logs: NestJS/Prisma `P1000: Authentication failed against
  database server` and asyncpg `password authentication failed for user "postgres"`.
- The password in `.env.docker` (64 chars, alphanumeric) was tested over
  TCP from a temp container on `datavex-erp-network` → **failed**.
- The backup file `.env.docker.save` contained a **different** password → also **failed**.
- Conclusion: the `postgres_data` volume was initialized with a
  **third, older password**. `POSTGRES_PASSWORD` only takes effect on
  first initialization of an empty volume; later `.env.docker` edits
  never reach the running database.

### Fixes (Phase 1)

| # | Issue | Fix |
|---|-------|-----|
| 1 | Postgres role password ≠ `.env.docker` | `ALTER USER postgres WITH PASSWORD '<current env value>'` executed via the container's local socket (trust auth). Non-destructive; preserves all data. |
| 2 | `erp_ai` database missing (ai-service's `DATABASE_URL` target; `postgres/init.sql` never created it) | `CREATE DATABASE erp_ai;` + added `CREATE DATABASE erp_ai;` to `postgres/init.sql` so fresh installs work. |
| 3 | `billing-ui` unhealthy — `/billing` returned **404** because the image was built **2026-09-07**, before basePath support (`NEXT_PUBLIC_BASE_PATH`) existed | Rebuilt image: `./docker-build.sh rebuild billing-ui --mode single-domain`. |

### Verification (Phase 1)

- Real TCP auth over the docker network with the current env password: **OK**.
- All 13 containers `(healthy)`; nginx started after its dependencies cleared.
- HTTP through nginx on port 80: `/` → 302 (login redirect),
  `/admin`, `/crm`, `/billing`, `/inventory` → all **200**.

---

## 3. Phase 2 — Seeding failure (`./seed-docker.sh`)

### Error 1 — `sh: 3: bun: not found` (step 1/6, fail-fast abort)

Steps 1–2 compile TS seed scripts with `bun`, which is not installed on
the server. **Fix:** `seed-docker.sh` now prefers host `bun` when
available and otherwise falls back to the same `oven/bun:1.2-alpine`
image the service Dockerfiles use, bind-mounted over the seed dir.
(Override with `BUN_IMAGE=...` if needed.)

### Error 2 — `TypeError: 'organization_id' is an invalid keyword argument for Customer` (step 3)

The `crm-service` and `inventory-service` images were also stale
(**2026-09-07**) and predated the multi-tenant `organization_id`
columns the current seeder writes. **Fix:** rebuilt both images via
`./docker-build.sh rebuild <service> --mode single-domain`.

### Error 3 — `ModuleNotFoundError: No module named 'scripts.seed_lib'` (step 3)

A `docker cp` semantics bug: `docker cp seed_lib container:/app/scripts/`
**renames** the source dir when the destination doesn't exist, producing
`/app/scripts/{__init__.py,orgs.py}` instead of
`/app/scripts/seed_lib/...`. The old images happened to ship
`/app/scripts`, masking this; the rebuilt images do not.
**Fix (steps 3–5):** explicitly create the destination as root and copy
with the `/.` contents convention:

```sh
docker exec -u root datavex-crm-service sh -c \
  'rm -rf /app/scripts/seed_lib && mkdir -p /app/scripts/seed_lib'
docker cp "$DIR/../../scripts/seed_lib/." datavex-crm-service:/app/scripts/seed_lib/
```

### Error 4 — `mkdir: cannot create directory '/app/scripts/seed_lib': Permission denied`

The service containers run as a non-root user; `docker exec` inherits
that user. `docker cp` itself is daemon-side (root) and unaffected.
**Fix:** the `mkdir`/cleanup exec runs with `-u root`; the seed
process itself still runs as the default user (read-only access suffices).

### Verification (Phase 2)

- `./seed-docker.sh` (testing profile): **6/6 steps OK, exit 0, total 0m 44s**.
- Data confirmed in every database:

| Database | Verified rows |
|----------|--------------|
| `erp_iam` | 7 users (admin/sales/accounts/inventory/auditor + org members) |
| `erp_billing` | 575 invoices (500/50/20/5 across orgs; Org 5 intentionally empty) |
| `erp_crm` | 375 customers, 1,140 leads |
| `erp_inventory` | 158 products |
| `erp_ai` | 57 sessions, 114 messages, 57 audit-log entries |

---

## 4. Files changed (uncommitted)

| File | Change |
|------|--------|
| `postgres/init.sql` | Added `CREATE DATABASE erp_ai;` (fresh-install fix) |
| `.gitignore` | Added `.env.docker.save` (contains real secrets; was not ignored) |
| `seed-docker.sh` | Dockerized-bun fallback; deterministic `seed_lib` copy (root mkdir + `/.` convention) in steps 3–5 |
| `docker-build.sh` | chmod +x only (needed to run it) — no content change |

Environment images rebuilt today: `billing-ui`, `crm-service`,
`inventory-service` (all previously stale from 2026-09-07).

---

## 5. Root-cause themes

1. **Stale images.** Three separate failures (billing-ui 404, crm
   `organization_id`, and the `docker cp` rename bug) all stemmed from
   images built on 2026-09-07 running against code/config from 2026-10-06.
   `docker-build.sh up` never rebuilds — `build`/`rebuild` do.
2. **Postgres password only applies on first volume init.** Changing
   `POSTGRES_PASSWORD` in `.env.docker` after first `up` does nothing to
   the existing volume.
3. **Weak healthchecks hid the real failures.** `pg_isready` passes even
   with wrong app credentials; a curl-based check with the real
   credentials would have caught this at the postgres service level.

---

## 6. Recommendations (open items)

1. **Commit the four modified files** once reviewed.
2. **Harden the postgres healthcheck** to authenticate with the real
   password (e.g., `psql -h 127.0.0.1 -U postgres -c 'SELECT 1'` with
   `PGPASSWORD`), so credential drift is visible immediately.
3. **Same fixes for `seed-docker.ps1`** — it still contains the hardcoded
   `bun build` calls and the old `docker cp seed_lib` pattern (matters
   only for Windows hosts).
4. **Add `erp_ai` to the Prisma/AI service migration plan** if more AI
   tables are introduced, so schema and `init.sql` stay in sync.
5. Optionally delete `.env.docker.save` after confirming nothing still
   uses the old password (any external client/script still holding it
   must switch to the values in `.env.docker`).

---

*Generated 2026-10-06 07:13 UTC · Repairs performed on-server via Codebuff*
