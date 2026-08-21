# Production Infrastructure Plan

## The Idea

Create a `/infrastructure/prod/` directory containing all production-grade infrastructure: hardened Docker Compose, PostgreSQL tuning, backup/restore scripts, TLS termination, monitoring, and deployment guides. This replaces the local dev sandbox with a production-ready setup.

---

## Current State — `/infrastructure/local/`

`/infrastructure/local/` is a **development sandbox**:
- Single PostgreSQL container with default config
- All ports exposed to host
- Default/hardcoded secrets (`development-jwt-secret-key-123`)
- No backups, no TLS, no rate limiting
- No resource limits on containers
- HTTP-only, permissive CORS

This is fine for local development, but production needs a fundamentally different posture.

---

## Proposed Structure

```
infrastructure/prod/
├── docker-compose.yml          # Production compose (hardened)
├── docker-compose.override.yml # Optional per-env overrides (staging vs prod)
├── .env.prod                   # Production secrets (gitignored)
├── .env.prod.example           # Template with placeholder values
│
├── postgres/
│   ├── postgresql.conf         # Tuned PG config (WAL, connections, memory)
│   ├── pg_hba.conf             # Auth rules (no trust, no password from everywhere)
│   ├── init.sql                # DB creation (same as local but production-ready)
│   └── backup.sh               # pg_dump + MinIO sync cron
│
├── nginx/
│   ├── nginx.conf              # Production nginx (TLS termination, rate limiting)
│   └── certs/                  # TLS certs (Let's Encrypt or self-signed for staging)
│
├── minio/
│   ├── data/                   # MinIO persistent storage for backups
│   └── config/                 # MinIO server configuration
│
├── scripts/
│   ├── backup.sh               # Full backup orchestrator (all DBs + MinIO sync)
│   ├── restore.sh              # Restore from MinIO backup
│   ├── seed.sh                 # Production seed (minimal, no test data)
│   ├── health-check.sh         # Extended health verification
│   └── setup-hosts.sh          # Hosts file setup
│
├── monitoring/
│   ├── docker-compose.yml      # Optional: Prometheus + Grafana sidecar
│   └── prometheus.yml          # Scrape config for service metrics
│
└── README.md                   # Production deployment guide
```

---

## Key Differences: Local vs Production

| Aspect | Local | Production |
|--------|-------|-----------|
| **Postgres** | Default config, no tuning | `shared_buffers=256MB`, `work_mem=4MB`, `max_connections=100`, WAL archiving |
| **Secrets** | Hardcoded in `.env.docker` | External secret store or encrypted `.env.prod` (never committed) |
| **TLS** | HTTP only | HTTPS via Let's Encrypt or ACM, HTTP→HTTPS redirect |
| **Ports** | All exposed to host | Only 80/443 exposed; internal services stay on Docker network |
| **Backups** | None | Daily `pg_dumpall` + WAL archiving + MinIO sync |
| **Healthchecks** | Basic | Extended with retry logic, alerting hooks |
| **Restart** | `unless-stopped` | `unless-stopped` + `deploy.resources.limits` (CPU/RAM caps) |
| **Logging** | stdout only | Structured JSON logging + log rotation |
| **Rate Limiting** | None | Nginx `limit_req_zone` on auth and API endpoints |
| **CORS** | Permissive | Locked to production domains only |

---

## Component Details

### Production Docker Compose

Differences from local:
- **No debug ports** — services bind to `127.0.0.1:PORT` or not at all (only nginx exposes 80/443)
- **Resource limits** — `deploy.resources.limits` per service (prevents one bad service from eating all RAM)
- **Read-only filesystem** where possible (`read_only: true` + tmpfs for temp dirs)
- **No default secrets** — reads from `.env.prod` which is gitignored
- **Backup sidecar** — a lightweight alpine container running `backup.sh` on cron
- **Postgres uses a proper config mount** — not just volume, but `postgresql.conf` with tuned settings

### PostgreSQL Configuration (`postgres/postgresql.conf`)

```conf
# Memory
shared_buffers = 256MB          # 25% of RAM for small VM
effective_cache_size = 512MB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL & Recovery
wal_level = replica             # Enable PITR
archive_mode = on
archive_command = 'test ! -f /backups/wal_archive/%f && cp %p /backups/wal_archive/%f'
max_wal_senders = 3
wal_keep_size = 256MB

# Connections
max_connections = 100
superuser_reserved_connections = 3

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 500  # Log slow queries (>500ms)

# Checkpoints
checkpoint_completion_target = 0.9
wal_compression = on
```

### PostgreSQL Auth Rules (`postgres/pg_hba.conf`)

```conf
# TYPE  DATABASE  USER       ADDRESS           METHOD
local   all       postgres                     trust
host    all       all        10.0.0.0/8        scram-sha-256    # Docker network only
host    all       all        172.16.0.0/12     scram-sha-256    # Docker network only
# Reject everything else
host    all       all        0.0.0.0/0         reject
```

### Backup Script (`scripts/backup.sh`)

```bash
#!/bin/bash
# Daily full backup of all 5 databases + WAL archive rotation
# Runs as cron inside the backup sidecar container

BACKUP_DIR="/backups/$(date +%Y/%m/%d)"
RETENTION_DAYS=7

# Dump all databases
for DB in erp_db erp_crm erp_iam erp_billing erp_inventory; do
    pg_dump -U postgres -d "$DB" | gzip > "$BACKUP_DIR/${DB}.sql.gz"
done

# Dump globals (roles, tablespaces)
pg_dumpall -U postgres --globals-only | gzip > "$BACKUP_DIR/globals.sql.gz"

# Compress WAL archive
tar -czf "$BACKUP_DIR/wal_archive.tar.gz" /backups/wal_archive/

# Sync to MinIO (self-hosted S3-compatible storage)
# mc mirror /backups/ minio/erp-backups/ --overwrite

# Prune old backups
find /backups -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
```

### Restore Script (`scripts/restore.sh`)

```bash
#!/bin/bash
# Restore from a specific backup date (from MinIO or local)
# Usage: ./restore.sh 2026/08/21
# Or from MinIO: ./restore.sh 2026/08/21 --remote

BACKUP_DATE=$1
BACKUP_DIR="/backups/$BACKUP_DATE"

# If remote flag, download from MinIO first
if [ "$2" = "--remote" ]; then
    mc mirror minio/erp-backups/$BACKUP_DATE/ /backups/$BACKUP_DATE/
fi

# Restore globals first
gunzip -c "$BACKUP_DIR/globals.sql.gz" | psql -U postgres

# Restore each database
for DB in erp_db erp_crm erp_iam erp_billing erp_inventory; do
    gunzip -c "$BACKUP_DIR/${DB}.sql.gz" | psql -U postgres -d "$DB"
done
```

### Production Nginx (`nginx/nginx.conf`)

Key additions over local:
- **TLS termination** with Let's Encrypt certs
- **HTTP→HTTPS redirect**
- **Rate limiting** on `/api/auth/*` (login brute-force protection)
- **Security headers** (CSP, HSTS, X-Frame-Options)
- **Gzip compression** for API responses
- **Client max body size** limits (prevent upload abuse)

### MinIO Object Storage (`minio/`)

Self-hosted S3-compatible object store running in Docker. Core infrastructure alongside PostgreSQL and RabbitMQ.

- **Endpoint:** `http://minio:9000` (internal Docker network)
- **Console:** `http://minio:9001` (exposed for admin access)
- **Buckets (per-domain isolation):**
  - `crm-assets` — client contracts, RFPs, lead attachments, quotation PDFs
  - `inv-docs` — proof of delivery, GRNs, product images, work order sheets
  - `finance-records` — generated PDF invoices, payment receipts, credit notes
  - `erp-backups` — database dumps (`pg_dump` `.sql.gz`), WAL archives
- **Versioning:** Enabled on all buckets
- **Lifecycle Policies:**
  - `erp-backups` — backups older than 7 days → auto-delete
  - `erp-backups` — WAL archives older than 3 days → auto-delete
- **Erasure Coding:** Default for durability (survives disk failures)
- **Access:** Only `erp-service` has the MinIO client. Other services store file references (IDs/URIs), not file content.
- **Presigned URLs:** Uploads and downloads go directly between client and MinIO. Backend only generates time-limited presigned URLs for auth + audit.

```yaml
# Docker Compose service definition
minio:
  image: minio/minio:latest
  container_name: datavex-minio
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
  volumes:
    - minio_data:/data
  ports:
    - "9000:9000"   # S3 API
    - "9001:9001"   # Web Console
  healthcheck:
    test: ["CMD", "mc", "ready", "local"]
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - erp-network
```

---

## Off-VM Backup Strategy

Docker volumes live on the **host filesystem only**. If the VM is destroyed, corrupted, or the disk fails — all data is lost. Backups must go off-VM.

| Option | Complexity | Cost | Recovery Time |
|--------|-----------|------|---------------|
| **MinIO (self-hosted S3)** | Low | Free (runs in Docker) | Minutes (download + restore) |
| **NFS/EFS mount** | Medium | Depends on provider | Instant (mount + restore) |
| **Second VM + rsync** | Medium | ~$5/mo for a small VM | Minutes (rsync + restore) |

**Recommendation:** Start with **MinIO**. It's a self-hosted S3-compatible object store that runs in Docker — zero external cost, full control over your data, and no vendor lock-in. Add an `mc mirror` sync after each dump. MinIO also supports versioning, lifecycle policies, and erasure coding for durability.

---

## MinIO Object Storage — Architecture

MinIO is positioned as **Core Infrastructure (Cross-Cutting)**, residing on the same architectural plane as PostgreSQL, RabbitMQ, and the API Gateway.

### Per-Domain Bucket Strategy

| Domain | Bucket | Contents |
|--------|--------|----------|
| **CRM** | `crm-assets` | Client contracts, RFPs, lead attachments, quotation PDFs |
| **Inventory** | `inv-docs` | Proof of Delivery (POD), GRNs, product images, work order sheets |
| **Billing** | `finance-records` | Generated PDF invoices, payment receipts, credit notes, bank statements |
| **Infrastructure** | `erp-backups` | Database dumps (`pg_dump` `.sql.gz`), WAL archives |

### Presigned URL Pattern (Zero Backend Overhead)

Binary files never pass through the application servers. The client uploads/downloads directly from MinIO using time-limited presigned URLs.

**Upload Flow:**
1. Client → `POST /api/files/upload-request` (metadata + auth token)
2. Service → validates JWT + RBAC, generates presigned PUT URL (expires in 5 min)
3. Client ← returns presigned URL + file_id
4. Client → `PUT presigned-url` (binary file body directly to MinIO)
5. Client → `POST /api/files/confirm-upload` (file_id, owner_type, owner_id)
6. Service → saves metadata in `file_records` table (`erp_db`)

**Download Flow:**
1. Client → `GET /api/files/:id/download`
2. Service → verifies RBAC, retrieves metadata from `file_records`
3. Service → generates presigned GET URL (expires in 5 min)
4. Client ← 302 Redirect to presigned URL
5. Client → downloads directly from MinIO

### Claim Check Pattern for RabbitMQ

Files never enter RabbitMQ. Events carry URI references only.

```json
{
  "event": "Shipment.Dispatched",
  "order_id": "SO-202608-0001",
  "dispatched_at": "2026-08-21T15:30:00Z",
  "documents": {
    "proof_of_delivery": "s3://inv-docs/pod/SO-202608-0001.pdf"
  }
}
```

Consumers fetch files directly from MinIO using the URI when needed.

### File Registry Schema (`erp_db`)

```sql
CREATE TABLE file_records (
    id              SERIAL PRIMARY KEY,
    bucket          VARCHAR(63) NOT NULL,
    object_key      VARCHAR(1024) NOT NULL,
    uri             VARCHAR(2048) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(127) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64),
    uploader_id     INTEGER NOT NULL,
    owner_type      VARCHAR(50) NOT NULL,    -- 'document', 'quotation', 'sales_order', 'pod', 'invoice'
    owner_id        INTEGER NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Phases

### Phase 1: Infrastructure — MinIO in Docker Compose

**Scope:** Add MinIO to local dev sandbox and production compose.

| Task | Files |
|------|-------|
| Add MinIO service to docker-compose | `infrastructure/local/docker-compose.yml` |
| Add `minio_data` named volume | `infrastructure/local/docker-compose.yml` |
| Add init container to auto-create buckets | `infrastructure/local/docker-compose.yml` |
| Add MinIO env vars | `infrastructure/local/.env.docker` |
| Add `minio` Python client | `services/erp-service/requirements.txt` |

**Buckets auto-created on startup:**
- `crm-assets`
- `inv-docs`
- `finance-records`
- `erp-backups`

**Estimated:** 30 min

---

### Phase 2: erp-service File API

**Scope:** Upload/download endpoints in erp-service using presigned URL pattern.

| Task | Files |
|------|-------|
| Create `app/files/` module | `services/erp-service/app/files/__init__.py` |
| `FileRecord` model (metadata in `erp_db`) | `services/erp-service/app/files/models.py` |
| MinIO client wrapper (presigned URL generation) | `services/erp-service/app/files/minio_client.py` |
| Pydantic schemas | `services/erp-service/app/files/schemas.py` |
| Upload/download/delete endpoints | `services/erp-service/app/files/router.py` |
| Alembic migration for `file_records` table | `services/erp-service/alembic/versions/` |
| Register router in `main.py` | `services/erp-service/app/main.py` |

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/files/upload-request` | Generate presigned PUT URL, return file_id |
| `POST` | `/api/files/confirm-upload` | Confirm upload, save metadata |
| `GET` | `/api/files/:id` | Get file metadata |
| `GET` | `/api/files/:id/download` | 302 redirect to presigned GET URL |
| `DELETE` | `/api/files/:id` | Delete from MinIO + DB |
| `GET` | `/api/files?owner_type=&owner_id=` | List files by owner |

**Estimated:** 2 hours

---

### Phase 3: Frontend File Components

**Scope:** Shared upload/viewer components in `@datavex/ui-theme`.

| Task | Files |
|------|-------|
| `<FileUpload>` component (drag-and-drop, progress, preview) | `packages/ui-theme/src/components/file-upload.tsx` |
| `<FileViewer>` component (PDF iframe, image zoom, download) | `packages/ui-theme/src/components/file-viewer.tsx` |
| Export new components | `packages/ui-theme/src/index.ts` |

**`<FileUpload>` props:**
- `accept: string` — allowed MIME types
- `maxSize: number` — max file size in bytes
- `bucket: string` — target bucket (`crm-assets`, `inv-docs`, `finance-records`)
- `ownerType: string` — entity type
- `ownerId: number` — entity ID
- `onUpload: (fileRecord: FileRecord) => void` — callback after confirm
- `multiple: boolean` — allow multiple files

**`<FileViewer>` props:**
- `fileId: number` — file record ID
- `fileName: string` — display name
- `mimeType: string` — determines render method
- `mode: 'preview' | 'download'` — render inline or as download link

**Estimated:** 2 hours

---

### Phase 4: Migrate Existing Base64 Data

**Scope:** Move all base64 file data from PostgreSQL VARCHAR columns to MinIO.

| Service | Migration | What |
|---------|-----------|------|
| crm-service | `scripts/migrate_files_to_minio.py` | Decode `Document.file_data` base64 → upload to `crm-assets` → store file_id |
| crm-service | `scripts/migrate_quotation_files.py` | Extract `file_data`/`file_name` from quotation `notes` JSON → upload to `crm-assets` → store file_id |
| crm-service | `scripts/migrate_sales_order_files.py` | Decode `SalesOrder.file_data` base64 → upload to `crm-assets` → store file_id |
| billing-service | `scripts/migrate_bank_statements.py` | If any bank statement files were stored, migrate to `finance-records` |

**Migration script pattern:**
```python
# For each record with file_data IS NOT NULL:
# 1. Decode base64 to bytes
# 2. Upload to MinIO via presigned URL (or direct upload from script)
# 3. Create file_record in erp_db
# 4. Update business record: set file_id, clear file_data
```

**Estimated:** 2 hours

---

### Phase 5: Update Backend Services

**Scope:** Business services store file references, not file content.

**5.1 crm-service**

| Task | Files |
|------|-------|
| Add `file_id` columns to Document, SalesOrder, Sale models | `app/documents/models.py`, `app/sales_orders/models.py`, `app/sales/models.py` |
| Remove `file_data`, `file_name`, `files` columns | Same files (after migration) |
| Update schemas to accept `file_id` | `app/documents/schemas.py`, `app/sales_orders/schemas.py` |
| Remove file packing from quotation notes JSON | `app/quotations/router.py` |
| Add endpoint: list files by owner | New `app/files/router.py` (or call erp-service) |
| Alembic migrations | `alembic/versions/` |

**5.2 billing-service**

| Task | Files |
|------|-------|
| Bank reconciliation: upload file to MinIO before parsing | `src/bank-reconciliation/bank-reconciliation.service.ts` |
| Store file_id on import batch | Prisma schema update |
| Add `attachment_file_id` to Quotation model | Prisma schema update |

**5.3 inventory-service**

No file handling needed currently. Products, stock, POs, and work orders don't have file attachments yet. Skip for now.

**Estimated:** 3 hours

---

### Phase 6: Update Frontend Apps

**Scope:** Replace base64 upload/preview with MinIO-backed components.

**6.1 erp-shell (admin shell)**

| Modal | Changes |
|-------|---------|
| `DocumentCreateModal.tsx` | Replace `FileReader.readAsDataURL()` with `<FileUpload>` |
| `DocumentDetailsModal.tsx` | Replace base64 preview with `<FileViewer>` |
| `QuotationCreateModal.tsx` | Replace `FileReader.readAsDataURL()` with `<FileUpload>` |
| `QuotationDetailsModal.tsx` | Replace base64 preview with `<FileViewer>` |
| `SalesOrderCreateModal.tsx` | Replace `FileReader.readAsDataURL()` with `<FileUpload>` |
| `SalesOrderDetailsModal.tsx` | Replace base64 preview with `<FileViewer>` |
| `OpportunityDetailModal.tsx` | Replace base64 preview with `<FileViewer>` |

**6.2 crm-ui**

| Task | Files |
|------|-------|
| Add `<FileUpload>` to create/edit modals that need attachments | Relevant modals |
| Add `<FileViewer>` to detail views | Relevant modals |

**6.3 billing-ui**

| Task | Files |
|------|-------|
| Bank reconciliation import: use `<FileUpload>` component | Bank reconciliation page |
| Add `<FileViewer>` for imported statement previews | Bank reconciliation page |

**6.4 inventory-ui**

No file handling needed currently. Skip for now.

**Estimated:** 4 hours

---

### Phase 7: Cleanup + Column Removal

**Scope:** Remove all legacy base64 file storage code.

| Task | Files |
|------|-------|
| Drop `file_data` / `file_name` / `files` columns from crm-service models | Alembic migrations |
| Remove `FileReader.readAsDataURL()` usage from all frontend code | 7+ modal files in erp-shell |
| Remove base64 preview logic from all detail modals | 5+ modal files in erp-shell |
| Update seed scripts to use file_ids instead of inline data | `services/crm-service/scripts/seed.py` |
| Remove dead branding upload buttons (or wire them up) | `apps/erp-shell/app/(admin)/settings/branding/page.tsx` |
| Update AGENTS.md documentation | `AGENTS.md`, `services/*/AGENTS.md` |

**Estimated:** 1 hour

---

### Phase Summary

| Phase | Scope | Estimated |
|-------|-------|-----------|
| **1** | MinIO in docker-compose | 30 min |
| **2** | erp-service file API (presigned URLs) | 2 hours |
| **3** | Frontend shared components (`<FileUpload>`, `<FileViewer>`) | 2 hours |
| **4** | Migrate existing base64 data to MinIO | 2 hours |
| **5** | Update backend services (store references, not content) | 3 hours |
| **6** | Update frontend apps (use new components) | 4 hours |
| **7** | Cleanup + column removal + docs | 1 hour |
| **Total** | | **~14.5 hours** |

---

## Open Questions

1. **Target VM specs** — how much RAM/CPU does the production VM have? (affects PG tuning)
2. **TLS** — do you have a domain + SSL certs, or should I set up Let's Encrypt?
3. **Backup destination** — MinIO (self-hosted), NFS, or a second VM?
4. **Managed Postgres** — are you open to using something like AWS RDS / DigitalOcean Managed DB instead of self-hosted Postgres in Docker? (dramatically simplifies backups and HA)
5. **File size limit** — 10MB per file, or different?
6. **Thumbnail generation** — auto-generate thumbnails for images, or just serve originals?
7. **Virus scanning** — ClamAV integration now or later?
8. **File versioning** — version history needed, or just latest?

---

## VM Network Context

The production deployment targets an AlmaLinux hypervisor with Ubuntu 24.04 VMs on an internal `172.30.20.x` subnet. Key constraints:

- **Subnet is full** — `/29` with 6 usable IPs, all occupied. Must expand to `/28` or create a separate NAT network before deploying new VMs.
- **macvtap networking** — VMs are reachable from the subnet but **not from the AlmaLinux host itself**. All management goes through VNC console or the gitlab jump box (`161.248.22.228:8904`).
- **Firewall concerns** — firewalld was disabled on the host. Must be re-enabled with only necessary ports (80, 443, 8904) open before any production deployment.
- **No TLS** — VNC and internal traffic are unencrypted. Must add TLS termination at nginx layer.
- **Credentials** — all passwords are currently in plaintext documentation. Must rotate and move to a secrets manager before going live.
