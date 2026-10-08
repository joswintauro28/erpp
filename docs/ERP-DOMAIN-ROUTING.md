# `erp.datavex.ai` Public Routing — Configuration Reference

> **Purpose:** Single source of truth for how the ERP became reachable at
> `https://erp.datavex.ai`, exactly which files were touched **on which host**,
> how to inspect/re-apply/verify/roll back, and what must never be modified.
> Implemented 2026-10-07. Companion tooling lives in
> [`infrastructure/jump-server/`](../infrastructure/jump-server/README.md).

---

## 1. Architecture — two nginx layers, two machines

```
Browser
  │  https://erp.datavex.ai
  ▼
A record → 161.248.22.228  ── EDGE / jump server (GitLab-omnibus host "gitlab")
  │                            nginx terminates TLS (Let's Encrypt cert)
  │                            proxy_pass → 172.30.20.19:80
  ▼
172.30.20.19:80  ──────────── ERP VM (datavexerp@datavexerp)
  │                            container `datavex-nginx` running
  │                            infrastructure/internal/nginx/single-domain.conf
  │                            basePath routing: /admin /crm /billing /inventory
  ▼
Docker ERP stack (14 containers, healthy)
```

Key facts:

| Item | Value |
|------|-------|
| Edge IP | `161.248.22.228` (hostname `gitlab`, SSH port **8904**, user `deenet`) |
| ERP VM IP | `172.30.20.19` (repo at `/home/datavexerp/erp`, branch `production`) |
| Edge nginx | `/opt/gitlab/embedded/sbin/nginx -p /var/opt/gitlab/nginx` (GitLab-omnibus) |
| Edge main conf | `/var/opt/gitlab/nginx/conf/nginx.conf` |
| Edge extension point | `nginx['custom_nginx_config'] = "include /etc/gitlab/nginx/sites-enabled/*.conf;"` in `/etc/gitlab/gitlab.rb` (already existed — **not added by us**) |
| VM nginx config | `infrastructure/internal/nginx/single-domain.conf`, mounted into container `datavex-nginx` |
| DNS | A record `erp.datavex.ai → 161.248.22.228` (pre-existing, untouched) |
| TLS cert | Let's Encrypt `CN=erp.datavex.ai`, valid 2026-10-07 → 2027-01-05 |

---

## 2. What was changed, and WHERE

### 2.1 EDGE server (`161.248.22.228`) — two new files, zero edits

| # | Path on edge host | Repo source | What it does |
|---|-------------------|-------------|--------------|
| 1 | `/etc/gitlab/nginx/sites-available/erp.datavex.ai.conf` | `infrastructure/jump-server/nginx/erp.datavex.ai.conf` | The vhost: port-80 ACME webroot + `301 https://`, port-443 TLS termination with `proxy_pass http://172.30.20.19:80` (Host/X-Real-IP/X-Forwarded-For/X-Forwarded-Proto/Upgrade headers, `proxy_buffering off`, 300s timeouts). |
| 2 | `/etc/gitlab/nginx/sites-enabled/erp.datavex.ai.conf` | — (symlink to #1) | Makes nginx load the vhost via the pre-existing `sites-enabled/*.conf` include. |

Also created (support files, not nginx config):

- `/var/www/erp-acme/` — ACME HTTP-01 webroot (required for **renewals**).
- `/etc/letsencrypt/live/erp.datavex.ai/` — LE cert + renewal config
  (`authenticator = webroot`, `webroot_path = /var/www/erp-acme`).
- Backup: `/root/nginx-erp-backup-20261007-054428.tgz`.

**No existing edge file was edited.** The vhost matches only `server_name erp.datavex.ai` (Host on :80, SNI on :443), so every other site on the box keeps its old behavior; the GitLab default_server catch-all still handles unknown hosts.

### 2.2 ERP VM (`172.30.20.19`) — one repo file, +11/−1

`infrastructure/internal/nginx/single-domain.conf` (running via `datavex-nginx`):

```diff
 http {
+    # after `resolver 127.0.0.11 valid=5s;`
+    absolute_redirect off;          # relative Location headers → no HTTPS→HTTP downgrade
+
     server {
         listen 80 default_server;
-        server_name _;
+        server_name erp.datavex.ai _;   # explicit name for the edge-proxied Host
```

- `absolute_redirect off` — the edge terminates TLS and forwards plain HTTP; without this, nginx would emit `Location: http://host/...` and bounce users out of HTTPS.
- `server_name erp.datavex.ai _;` — documents/selects the domain (block was already `default_server`, so behavior for other Hosts is unchanged).
- Applied with `docker exec datavex-nginx nginx -t && docker exec datavex-nginx nginx -s reload`.

**Nothing else on the VM was changed** (compose files, `.env.docker`, app config untouched).

### 2.3 Repo tooling (untracked/new)

```
infrastructure/jump-server/
├── README.md                  # short runbook
├── apply-erp-domain.sh        # installer/inspector (see §4)
└── nginx/erp.datavex.ai.conf  # canonical vhost template (byte-identical to edge file)
```

---

## 3. How to access each host

**From the ERP VM** (no `sshaskpass`/`sshpass` installed — use askpass):

```bash
# one-time helper (delete after use)
mkdir -p /tmp/askpass && printf '#!/bin/sh\necho deenet\n' > /tmp/askpass/pass.sh && chmod 700 /tmp/askpass/pass.sh

SSH_ASKPASS=/tmp/askpass/pass.sh SSH_ASKPASS_REQUIRE=force setsid \
  ssh -p 8904 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/tmp/askpass/known_hosts \
      -o PreferredAuthentications=password,keyboard-interactive -o PubkeyAuthentication=no \
      deenet@161.248.22.228
```

`deenet` is in **sudo + docker** on the edge. Sudo commands over SSH:
`sudo -S -p "" bash -s` with the password (`deenet`) piped first.

---

## 4. Day-to-day commands

### Inspect (read-only, safe)
```bash
# copy tooling once
scp -P 8904 -r infrastructure/jump-server datavexerp@161.248.22.228:~   # from VM, adjust user as needed
ssh -p 8904 deenet@161.248.22.228 'cd ~/jump-server && ./apply-erp-domain.sh'
```
Prints: nginx binary/main-conf detection (handles the omnibus `-p` prefix), include dirs, all existing `listen`/`server_name` blocks, upstream reachability to `172.30.20.19:80`, cert presence, and a dry preview of where the vhost would land. **Writes nothing.**

### Apply (only if the vhost is ever missing)
```bash
ssh -p 8904 deenet@161.248.22.228 'cd ~/jump-server && sudo ./apply-erp-domain.sh --apply'
```
Pipeline: pre-flight upstream check → timestamped tarball backup (`/root/nginx-erp-backup-*.tgz`) → interim HTTP vhost + symlink → `nginx -t` → reload → **assert vhost took effect** (5×1s retries; failure ⇒ automatic rollback) → `certbot certonly --webroot -w /var/www/erp-acme` (fail-soft: keeps HTTP-only rather than breaking) → install final template → `nginx -t` → reload → final verification incl. `internal-devrepo` regression check.
Refuses to run if `erp.datavex.ai.conf` already exists (inspect instead of overwrite).

### Verify (from anywhere)
```bash
curl -sI  http://erp.datavex.ai/            # → 301 https://erp.datavex.ai/
curl -sIL https://erp.datavex.ai/           # → 200, final /admin, "DATAVEX | Command Center"
curl -sIL https://erp.datavex.ai/crm        # → 200   (same for /billing /inventory /admin/login)
curl -sI  https://internal-devrepo.datavex.ai/   # GitLab still fine (302/301)
```
Last full check (2026-10-07) — all passed:

| Check | Result |
|---|---|
| `http://erp.datavex.ai` | `301 → https://erp.datavex.ai/` |
| `https://erp.datavex.ai/` | 200, title *DATAVEX | Command Center*, final URL `/admin` |
| `/admin`, `/admin/login`, `/crm`, `/billing`, `/inventory` | 200 |
| `POST /admin/api/auth/login` via public HTTPS | 200 |
| Cert | `CN=erp.datavex.ai`, Let's Encrypt, → 2027-01-05 |
| internal-devrepo / tradeos / workpilot / cureconnect | unchanged (301/200/200/307) |
| Unknown Host | GitLab catch-all 301 (as before) |
| VM containers | 14/14 healthy |

### Certificate renewal
- `certbot.timer` is active on the edge; renewal is HTTP-01 via webroot `/var/www/erp-acme`, which the vhost permanently serves on port 80.
- Dry-run (note the flags — default dry-run sleeps ~400s randomly):
  ```bash
  sudo certbot renew --dry-run --cert-name erp.datavex.ai --no-random-sleep-on-renew
  ```
  Last result: `DRYRUN_RC=0`, “all simulated renewals succeeded”.
- Cert was registered **without an email** — fine, but renewals still work.

### Rollback
```bash
sudo tar xzf /root/nginx-erp-backup-<timestamp>.tgz -C /
# delete the two added files if the tar restore didn't (restore never deletes):
sudo rm -f /etc/gitlab/nginx/sites-{available,enabled}/erp.datavex.ai.conf
sudo nginx -t && sudo nginx -s reload          # remember omnibus prefix if needed
```
(`apply-erp-domain.sh --apply` does this automatically on any `nginx -t` failure.)

---

## 5. Do NOT touch (edge)

Other tenants on `161.248.22.228`, each with its own LE cert in `/etc/letsencrypt/{live,archive}/`:

- `internal-devrepo.datavex.ai` — GitLab, **default_server catch-all**
- `tradeos.datavex.ai`
- `workpilot.datavex.ai`
- `cureconnect.sunshinemanipal.com`
- `/etc/gitlab/gitlab.rb` (beyond its pre-existing `custom_nginx_config` include) and any GitLab-managed conf.

Rule of thumb: **only ever add/remove our own `erp.datavex.ai.conf`**; never edit a shared file, always gate with `nginx -t`.

---

## 6. Known out-of-scope issue (flagged, intentionally NOT changed)

`infrastructure/internal/.env.docker` still has
`MAIN_DOMAIN=erp.datavex.com` / `COOKIE_DOMAIN=erp.datavex.com` (old domain).
Consequence: SSO refresh-cookie scoping and role-based workstation redirect
links are built for `erp.datavex.com`, not `.ai`. Routing/TLS works regardless
(logins succeed over public HTTPS), but cross-workstation SSO handoff
(`?token=` redirects to `localhost:300x` / old domain) may misbehave until
these are aligned with `erp.datavex.ai`. Changing it affects app config, not
nginx — deliberately left alone per the “reverse-proxy only” scope.

---

## 7. Reuse checklist (next time / new domain)

1. **DNS**: point the new A record at `161.248.22.228`.
2. **Copy** `infrastructure/jump-server/` to the edge; edit `DOMAIN`/`UPSTREAM`
   in `apply-erp-domain.sh` and the `server_name`/cert paths in
   `nginx/<domain>.conf` (or add a second template file).
3. **Inspect** (`./apply-erp-domain.sh`), confirm upstream reachability.
4. **Apply** (`sudo ./apply-erp-domain.sh --apply`) — backup, interim vhost,
   `nginx -t` gate, assertion, cert, final vhost, verification, auto-rollback.
5. **VM side**: if the app needs relative redirects or an explicit
   `server_name`, mirror the §2.2 edits in `single-domain.conf`, then
   `docker exec datavex-nginx nginx -t && ... nginx -s reload`.
6. **Verify** with the §4 checklist, including the *other* sites' regression
   checks.
7. **Never** edit another project's vhost or `gitlab.rb` for our routing.
