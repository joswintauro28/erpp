# Jump / Public Server — `erp.datavex.ai` routing

> 📖 **Full reference** (architecture, exact file paths on each host, cert
> renewal, verification checklist, do-not-touch list): see
> [`docs/ERP-DOMAIN-ROUTING.md`](../../docs/ERP-DOMAIN-ROUTING.md).

This directory contains the **edge (reverse-proxy) configuration** that makes

```
https://erp.datavex.ai  →  161.248.22.228 (edge nginx, TLS termination)
                       →  172.30.20.19:80 (ERP VM nginx)
                       →  ERP application (single-domain stack)
```

while leaving every existing site on that server (GitLab /
`internal-devrepo.datavex.ai`, etc.) untouched — the change is **one new
server-block file**, selected only for Host/SNI `erp.datavex.ai`.

| File | Purpose |
|------|---------|
| `nginx/erp.datavex.ai.conf` | The vhost to install on the jump server (HTTP → HTTPS redirect + TLS proxy to the ERP VM). |
| `apply-erp-domain.sh` | Two-phase installer: **read-only inspection by default**, `--apply` performs backup → install → `certbot` (Let's Encrypt, HTTP-01) → `nginx -t` gate → reload, with automatic rollback. |

## Run (on the jump server)

```bash
# 1. Copy this directory to the jump server, e.g.:
scp -P 8904 -r infrastructure/jump-server <user>@161.248.22.228:~

# 2. Read-only inspection first (prints includes, existing server blocks,
#    upstream reachability — changes nothing):
ssh -p 8904 <user>@161.248.22.228 'cd ~/jump-server && ./apply-erp-domain.sh'

# 3. Apply (installs the vhost, issues the LE cert, validates, reloads):
ssh -p 8904 <user>@161.248.22.228 'cd ~/jump-server && sudo ./apply-erp-domain.sh --apply --email you@example.com'
```

## Verify (from anywhere)

```bash
curl -sI  http://erp.datavex.ai/     # → 301 https://erp.datavex.ai/
curl -sIL https://erp.datavex.ai/    # → 200 (ERP login/dashboard)
```

## Rollback

The script writes `/root/nginx-erp-backup-<timestamp>.tgz` before any change:

```bash
sudo tar xzf /root/nginx-erp-backup-<timestamp>.tgz -C /
sudo nginx -t && sudo nginx -s reload
```

## Notes

- The ERP VM side is already prepared (`infrastructure/internal/nginx/single-domain.conf`):
  relative redirects keep HTTPS from being downgraded, and the block explicitly
  serves `erp.datavex.ai` as its default server.
- The Let's Encrypt webroot (`/var/www/erp-acme`) is kept in the final config so
  `certbot renew` keeps working (HTTP-01 on port 80).
