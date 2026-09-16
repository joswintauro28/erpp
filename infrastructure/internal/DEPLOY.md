# DATAVEX ERP — Internal Deployment Guide

This guide covers deploying the full DATAVEX ERP stack on an Ubuntu 24.04 VM
for internal/testing use. HTTP only (no SSL). All traffic stays within the
company network.

---

## Prerequisites

Before you start, confirm with the infra team:

| Item | Required | Notes |
|------|----------|-------|
| **VM provisioned** | ✅ | Ubuntu 24.04 Server, ≥4 vCPU, ≥6GB RAM, ≥50GB disk |
| **SSH access** | ✅ | Via ProxyJump through gitlab-vm (port 8904) |
| **Subnet expanded** | ✅ | `/28` or larger — the original `/29` is full |
| **DNS records** | ✅ | `*.erp.datavex.com → VM public IP` (or add to `/etc/hosts`) |
| **Port forwarding** | ✅ | Ports 80 and 443 from public IP → your VM's internal IP |

---

## 1. SSH Into Your VM

```bash
# From your laptop (add to ~/.ssh/config):
# Host vm-jump
#   HostName 161.248.22.228
#   User <jump-host-user>
#   Port 8904
#
# Host datavex-vm
#   HostName <your-vm-internal-ip>
#   User <your-vm-user>
#   ProxyJump vm-jump

ssh datavex-vm
```

---

## 2. Install Docker

```bash
# Remove old snap Docker if present
sudo snap remove docker

# Install Docker Engine (official)
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
exit
```

Verify:
```bash
docker --version      # Docker version 27.x or newer
docker compose version  # Docker Compose v2.x
```

---

## 3. Clone the Repository

```bash
cd ~
git clone <your-repo-url> datavex-erp
cd datavex-erp
```

---

## 4. Configure Environment Variables

```bash
cd infrastructure/internal

# Copy the template
cp .env.docker.example .env.docker

# Edit with production secrets
nano .env.docker   # or vim, code, etc.
```

**Generate strong secrets** (run in a separate terminal):
```bash
# PostgreSQL / RustFS password
openssl rand -base64 32

# JWT secret (used by ALL backend services — must match)
openssl rand -hex 32
```

Replace every `<GENERATE_...>` placeholder in `.env.docker` with the generated
values. **All services share the same JWT_SECRET** — if they differ, login will
fail with 401 Unauthorized.

---

## 5. DNS Setup

Either ask the infra team to create DNS records, or add entries to `/etc/hosts`
on every machine that needs access:

```bash
# Add to /etc/hosts on developer machines (NOT on the VM itself)
# Replace <VM-INTERNAL-IP> with the actual IP
echo "<VM-INTERNAL-IP> app.erp.datavex.com crm.erp.datavex.com billing.erp.datavex.com inventory.erp.datavex.com rustfs.erp.datavex.com" | sudo tee -a /etc/hosts
```

**Note:** If using `/etc/hosts`, the RustFS presigned URLs will include
`rustfs.erp.datavex.com` — this hostname must resolve on the **browser's
machine**, not just the VM. So every developer's laptop needs these entries.

---

## 6. Build and Start the Stack

You can start the stack using either the helper script or native docker compose commands:

### Mode A: Subdomain Routing (`*.erp.datavex.com`)
```bash
cd ~/datavex-erp/infrastructure/internal

# Using helper script:
./docker-build.sh up

# Or using docker compose directly:
docker compose --env-file .env.docker up -d --build
```

### Mode B: Single-Domain Routing (`http://${MAIN_DOMAIN}`)
```bash
cd ~/datavex-erp/infrastructure/internal

# Using helper script:
./docker-build.sh up --mode prod

# Or using docker compose directly:
docker compose -f docker-compose.yml -f docker-compose.prod.yaml --env-file .env.docker up -d --build
```

---

## 7. Verify Everything Is Running

```bash
# Check all container statuses
docker compose --env-file .env.docker ps

# Expected: all containers should show "Up" and healthy
# Containers with healthchecks will show (healthy) after a minute

# Check logs for any errors
docker compose --env-file .env.docker logs --tail=50

# Watch logs in real-time (Ctrl+C to exit)
docker compose --env-file .env.docker logs -f
```

### Health Check Endpoints

You can verify individual services:

```bash
# Core IAM
curl http://localhost:8002/api/health

# ERP Service
curl http://localhost:8000/health

# From your laptop (after DNS is set up)
curl http://app.erp.datavex.com
```

---

## 8. Seed Initial Data

After all containers are healthy, run the database seeds:

```bash
# ERP Business Data
docker compose --env-file .env.docker exec erp-service python scripts/seed.py

# IAM Users + Permissions
docker compose --env-file .env.docker exec core-iam bunx prisma db seed
```

### Default Login Accounts

| Name | Email | Password | Role |
|------|-------|----------|------|
| Alex Chen | admin@datavex.com | Admin@123! | Organization Owner |
| Maya Patel | sales@datavex.com | Sales@123! | Sales Executive |
| Jordan Kim | accounts@datavex.com | Acc@123! | Accountant |
| Sam Rivera | inventory@datavex.com | Inv@123! | Inventory Manager |
| Priya Sharma | auditor@datavex.com | Aud@123! | Auditor |

> **Change these passwords before sharing access with anyone else.**

---

## 9. Access the Application

Open a browser and navigate to:

### Mode A (Subdomains)
| URL | Workstation |
|-----|-------------|
| `http://app.erp.datavex.com` | Executive Shell (main dashboard) |
| `http://crm.erp.datavex.com` | CRM Workstation |
| `http://billing.erp.datavex.com` | Billing Workstation |
| `http://inventory.erp.datavex.com` | Inventory Workstation |

### Mode B (Single-Domain)
| URL | Workstation |
|-----|-------------|
| `http://${MAIN_DOMAIN}` | Executive Shell |
| `http://${MAIN_DOMAIN}/crm` | CRM Workstation |
| `http://${MAIN_DOMAIN}/billing` | Billing Workstation |
| `http://${MAIN_DOMAIN}/inventory` | Inventory Workstation |

Login with any account from the table above. The SSO flow will redirect
you to the correct workstation based on your role.

---

## Common Operations

### View Logs

```bash
# All services
docker compose --env-file .env.docker logs -f

# Single service
docker compose --env-file .env.docker logs -f erp-service
docker compose --env-file .env.docker logs -f core-iam
```

### Restart a Single Service

```bash
docker compose --env-file .env.docker restart erp-service
```

### Stop Everything

```bash
docker compose --env-file .env.docker down
```

### Stop and Destroy All Data

```bash
# WARNING: This deletes all PostgreSQL databases and RustFS files
docker compose --env-file .env.docker down -v
```

### Update After Git Pull

```bash
cd ~/datavex-erp
git pull

cd infrastructure/internal

# Rebuild changed images
docker compose --env-file .env.docker build

# Recreate containers with new images
docker compose --env-file .env.docker up -d
```

### Check Disk Usage

```bash
docker system df
```

### Clean Up Unused Docker Resources

```bash
# Remove stopped containers, unused networks, dangling images
docker system prune

# More aggressive (also removes unused build cache)
docker system prune -a
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check why it failed
docker compose --env-file .env.docker logs <service-name>

# Common causes:
# - Wrong JWT_SECRET (services can't verify tokens)
# - PostgreSQL not ready yet (check depends_on / healthcheck)
# - Port already in use (another service on the same port)
```

### "Connection Refused" Between Services

```bash
# Verify all containers are on the same network
docker network inspect datavex-erp-network

# Test connectivity from inside a container
docker compose --env-file .env.docker exec erp-service curl http://postgres:5432
```

### 401 Unauthorized on Login

- Most likely cause: **JWT_SECRET mismatch** between core-iam and other services.
- All services MUST use the same `JWT_SECRET` value from `.env.docker`.
- After changing it: `docker compose --env-file .env.docker down && up -d`

### RustFS Uploads Fail

- Check RustFS is healthy: `docker compose --env-file .env.docker logs minio`
- Verify `RUSTFS_PUBLIC_URL` resolves from the browser's machine
- If using `/etc/hosts`, ensure `rustfs.erp.datavex.com` is listed there

### Slow First Build

First `docker compose build` downloads all base images and installs dependencies.
Subsequent builds use Docker layer caching and are much faster.
