#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# apply-erp-domain.sh — add the erp.datavex.ai vhost on the PUBLIC/JUMP server
#
#   Traffic path this creates:
#     erp.datavex.ai  →  161.248.22.228 (edge nginx, TLS terminates here)
#                     →  172.30.20.19:80 (ERP VM nginx)  →  ERP application
#
# SAFETY GUARANTEES
#   * Only ONE new file is written (erp.datavex.ai.conf). No existing config
#     file is edited, moved, or deleted — GitLab / internal-devrepo and all
#     other vhosts keep serving exactly as before (nginx picks the new block
#     only for Host/SNI erp.datavex.ai).
#   * Default mode is READ-ONLY inspection. Nothing is written without --apply.
#   * --apply takes a timestamped tarball backup of the nginx config first.
#   * `nginx -t` is a hard gate before every reload; on failure the backup is
#     restored automatically and the script exits non-zero (instant rollback).
#
# USAGE (run ON the jump server, as root or with sudo):
#   ./apply-erp-domain.sh                    # inspect only (safe, read-only)
#   sudo ./apply-erp-domain.sh --apply               # install vhost + LE cert
#   sudo ./apply-erp-domain.sh --apply --email you@example.com
#
# ROLLBACK (manual): restore the newest /root/nginx-erp-backup-*.tgz over /
# then reload nginx.
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

DOMAIN="erp.datavex.ai"
UPSTREAM="172.30.20.19"
UPSTREAM_PORT="80"
ACME_WEBROOT="/var/www/erp-acme"
CONF_NAME="erp.datavex.ai.conf"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$HERE/nginx/$CONF_NAME"

MODE="inspect"
EMAIL=""
for arg in "$@"; do
    case "$arg" in
        --apply) MODE="apply" ;;
        --email=*) EMAIL="${arg#--email=}" ;;
        -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
        *) echo "Unknown argument: $arg (see --help)" >&2; exit 2 ;;
    esac
done

NGINX_BIN=""
NGINX_CONF=""
NGINX_ARGS=()
MASTER_ARGS=""

detect_nginx() {
    MASTER_ARGS="$(ps -eo args | grep -E "nginx: master" | grep -v grep | head -1 || true)"
    if [[ -z "$MASTER_ARGS" ]]; then
        echo "!! No nginx master process found on this host." >&2
        return 1
    fi
    # e.g. "nginx: master process /usr/sbin/nginx -c /etc/nginx/nginx.conf"
    NGINX_BIN="$(awk '{for (i=1;i<=NF;i++) if ($i=="process") {print $(i+1); exit}}' <<<"$MASTER_ARGS")"
    [[ -x "$NGINX_BIN" ]] || NGINX_BIN="$(command -v nginx || true)"
    if [[ -z "$NGINX_BIN" ]]; then
        echo "!! Could not determine the nginx binary from: $MASTER_ARGS" >&2
        return 1
    fi
    # Extract -c (config) and -p (prefix) so GitLab-omnibus-style launches
    # (relative config paths / non-default prefixes) resolve correctly.
    local conf prefix
    conf="$(grep -oE -- '-c[= ][^ ]+' <<<"$MASTER_ARGS" | head -1 | sed -E 's/^-c[= ]//' || true)"
    prefix="$(grep -oE -- '-p[= ][^ ]+' <<<"$MASTER_ARGS" | head -1 | sed -E 's/^-p[= ]//' || true)"
    if [[ -z "$conf" && -n "$prefix" && -f "${prefix%/}/conf/nginx.conf" ]]; then
        # No explicit -c (e.g. GitLab omnibus) → nginx defaults to
        # conf/nginx.conf under the -p prefix.
        conf="${prefix%/}/conf/nginx.conf"
    fi
    if [[ -n "$conf" && -n "$prefix" && "$conf" != /* ]]; then
        conf="${prefix%/}/$conf"
    fi
    NGINX_CONF="$conf"
    NGINX_ARGS=()
    [[ -n "$prefix" ]] && NGINX_ARGS+=( -p "$prefix" )
    [[ -n "$NGINX_CONF" ]] && NGINX_ARGS+=( -c "$NGINX_CONF" )
    echo "nginx binary : $NGINX_BIN"
    echo "master args  : $MASTER_ARGS"
    [[ -n "$NGINX_CONF" ]] && echo "main conf    : $NGINX_CONF" || echo "main conf    : (default compiled-in path)"
}

nginx_T() {
    "$NGINX_BIN" -T "${NGINX_ARGS[@]}" 2>&1 || true
}

nginx_test() {
    "$NGINX_BIN" -t "${NGINX_ARGS[@]}"
}

nginx_reload() {
    "$NGINX_BIN" -s reload "${NGINX_ARGS[@]}"
}

TARGET_PATH=""
TARGET_LINK=""

determine_target() {
    local dump="$1"
    # 1) Prefer an actual sites-enabled include found in the running config
    #    (covers /etc/nginx/sites-enabled/* on Debian AND custom layouts such
    #    as GitLab-omnibus' /etc/gitlab/nginx/sites-enabled/*.conf).
    local cand dir
    cand="$(grep -oE 'include[[:space:]]+[^;]*sites-enabled[^;]*' <<<"$dump" | head -1 | awk '{print $2}' || true)"
    if [[ -n "$cand" ]]; then
        dir="$(dirname "$cand")"
        if [[ -d "$dir" ]]; then
            if [[ -d "${dir%/sites-enabled}/sites-available" ]]; then
                TARGET_PATH="${dir%/sites-enabled}/sites-available/$CONF_NAME"
                TARGET_LINK="$dir/$CONF_NAME"
            else
                TARGET_PATH="$dir/$CONF_NAME"
            fi
            echo "target file  : $TARGET_PATH"
            return 0
        fi
    fi
    # 2) A conf.d include in the running config → its directory.
    cand="$(grep -oE 'include[[:space:]]+[^;]*conf\.d[^;]*' <<<"$dump" | head -1 | awk '{print $2}' || true)"
    if [[ -n "$cand" ]]; then
        dir="$(dirname "$cand")"
        if [[ -d "$dir" ]]; then
            TARGET_PATH="$dir/$CONF_NAME"
            echo "target file  : $TARGET_PATH"
            return 0
        fi
    fi
    # 3) Conventional Debian/Ubuntu layout (or unparseable dump → the
    #    post-install assertion catches a vhost nginx did not pick up).
    local empty_dump=0
    [[ -z "$dump" ]] && empty_dump=1
    if [[ -d /etc/nginx/sites-available && -d /etc/nginx/sites-enabled ]] \
       && { grep -qE 'include\s+[^;]*sites-enabled' <<<"$dump" || [[ "$empty_dump" -eq 1 ]]; }; then
        TARGET_PATH="/etc/nginx/sites-available/$CONF_NAME"
        TARGET_LINK="/etc/nginx/sites-enabled/$CONF_NAME"
    elif [[ -d /etc/nginx/conf.d ]] \
       && { grep -qE 'include\s+[^;]*conf\.d' <<<"$dump" || [[ "$empty_dump" -eq 1 ]]; }; then
        TARGET_PATH="/etc/nginx/conf.d/$CONF_NAME"
    else
        echo "!! No usable include directory found (no sites-enabled / conf.d include" >&2
        echo "   in the running config). Refusing to edit the main config file." >&2
        echo "   Manual step: add an include for a new directory yourself, or re-run" >&2
        echo "   this script after doing so." >&2
        return 1
    fi
    echo "target file  : $TARGET_PATH"
}

inspect() {
    echo "══════════════════════════════════════════════════════════════"
    echo " READ-ONLY INSPECTION — nothing will be changed"
    echo "══════════════════════════════════════════════════════════════"
    detect_nginx || true
    echo
    echo "── include directives in the running config ──"
    nginx_T | grep -E '^\s*include\s' | sort -u || true
    echo
    echo "── server_name / listen blocks (existing sites) ──"
    nginx_T | grep -E '^\s*(server_name|listen)\s' || true
    echo
    echo "── candidate config dirs ──"
    for d in /etc/nginx/conf.d /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/gitlab/nginx/sites-enabled; do
        [[ -d "$d" ]] && { echo "$d:"; ls -la "$d" | sed 's/^/    /'; } || echo "$d: (absent)"
    done
    echo
    echo "── where a new vhost would be installed (dry preview) ──"
    determine_target "$(nginx_T)" || echo "(no target could be determined)"
    echo
    echo "── certificate tooling ──"
    command -v certbot >/dev/null 2>&1 && echo "certbot: $(certbot --version 2>&1)" || echo "certbot: NOT installed (apply mode will try: apt-get install -y certbot)"
    [[ -d "/etc/letsencrypt/live/$DOMAIN" ]] && echo "cert for $DOMAIN: EXISTS" || echo "cert for $DOMAIN: not yet issued"
    echo
    echo "── upstream reachability: $UPSTREAM:$UPSTREAM_PORT ──"
    local up
    if up="$(curl -sSI -m 5 -H "Host: $DOMAIN" "http://$UPSTREAM:$UPSTREAM_PORT/" 2>&1)"; then
        echo "$up" | head -5
        echo "   (302 → /admin means the ERP VM nginx answered correctly)"
    else
        echo "   !! upstream NOT reachable from this box:"
        echo "$up" | head -3
    fi
    echo
    echo "── current external behaviour of $DOMAIN (before change) ──"
    curl -sSI -m 6 -H "Host: $DOMAIN" http://127.0.0.1/ | head -5 || true
    echo
    echo "── sanity: existing $DOMAIN-adjacent site (must stay unchanged) ──"
    curl -sSI -m 6 -H "Host: internal-devrepo.datavex.ai" http://127.0.0.1/ | head -5 || true
    echo
    echo "Done. Re-run with --apply to install the new vhost."
}

write_interim() {
    # HTTP-only interim config (used when the cert does not exist yet), so the
    # domain starts working over HTTP immediately and certbot can validate.
    cat > "$TARGET_PATH" <<INTERIM
# --- managed by apply-erp-domain.sh (interim: cert not yet issued) ---
map \$http_upgrade \$erp_connection_upgrade {
    default upgrade;
    ''      close;
}
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 100m;

    location /.well-known/acme-challenge/ {
        root $ACME_WEBROOT;
    }

    location / {
        proxy_pass http://$UPSTREAM:$UPSTREAM_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        \$erp_connection_upgrade;
        proxy_buffering    off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
# --- end interim ---
INTERIM
}

rollback() {
    echo "!! Rolling back to backup: $BACKUP" >&2
    # Remove the newly added file(s) first (tar restore never deletes files
    # created after the backup was taken), then restore the originals.
    rm -f "$TARGET_PATH" "$TARGET_LINK" 2>/dev/null || true
    tar xzf "$BACKUP" -C / 2>/dev/null || true
    nginx_test && nginx_reload || true
    echo "Rollback complete." >&2
}

apply() {
    if [[ "$EUID" -ne 0 ]]; then
        echo "Apply mode must run as root:  sudo $0 --apply [--email you@x.com]" >&2
        exit 1
    fi
    [[ -f "$TEMPLATE" ]] || { echo "!! Template not found: $TEMPLATE" >&2; exit 1; }
    detect_nginx

    local dump; dump="$(nginx_T)"
    determine_target "$dump"

    if [[ -f "$TARGET_PATH" ]]; then
        echo "!! $TARGET_PATH already exists — inspect it manually instead of overwriting." >&2
        exit 1
    fi

    echo "── pre-flight upstream check ──"
    curl -sSI -m 5 -H "Host: $DOMAIN" "http://$UPSTREAM:$UPSTREAM_PORT/" >/dev/null \
        || { echo "!! ERP VM ($UPSTREAM:$UPSTREAM_PORT) not reachable — aborting before any change." >&2; exit 1; }

    echo "── backing up existing nginx config ──"
    BACKUP="/root/nginx-erp-backup-$(date +%Y%m%d-%H%M%S).tgz"
    # Back up every directory that matters here: the include tree we are
    # writing into, the main config tree, and /etc/gitlab (omnibus) if present.
    local bdir
    for bdir in "$(dirname "$TARGET_PATH")" "$(dirname "${TARGET_LINK:-$TARGET_PATH}")" \
                "$(dirname "${NGINX_CONF:-/nonexistent}")" /etc/gitlab /etc/nginx; do
        [[ -n "$bdir" && -d "$bdir" ]] && tar rf "${BACKUP%.tgz}.tar" "$bdir" 2>/dev/null || true
    done
    [[ -f "${BACKUP%.tgz}.tar" ]] && gzip -f "${BACKUP%.tgz}.tar"
    echo "backup: $BACKUP"

    mkdir -p "$ACME_WEBROOT"
    local cert="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

    echo "── stage 1: install HTTP vhost ──"
    write_interim
    # Debian/Ubuntu layouts need the sites-enabled symlink to be loaded.
    if [[ -n "$TARGET_LINK" ]]; then
        if [[ -L "$TARGET_LINK" ]]; then
            : # already a symlink (e.g. prior partial run) — leave it as-is
        elif [[ -e "$TARGET_LINK" ]]; then
            echo "!! $TARGET_LINK exists and is not a symlink — aborting (will not replace it)." >&2
            rollback; exit 1
        else
            ln -s "$TARGET_PATH" "$TARGET_LINK"
        fi
    fi
    if ! nginx_test; then
        echo "!! nginx -t failed on interim config." >&2
        rollback; exit 1
    fi
    nginx_reload

    echo "── verification after stage 1 (assert the new vhost took effect) ──"
    # nginx reload is asynchronous — retry briefly before declaring failure.
    local v=""
    local attempt
    for attempt in 1 2 3 4 5; do
        v="$(curl -sSI -m 6 -H "Host: $DOMAIN" http://127.0.0.1/ 2>&1 || true)"
        grep -qiE "erp\.datavex\.ai|/admin" <<<"$v" && break
        sleep 1
    done
    echo "$v" | head -6
    if ! grep -qiE "erp\.datavex\.ai|/admin" <<<"$v"; then
        echo "!! The new vhost did NOT take effect — the response above is still" >&2
        echo "   coming from the old catch-all. Likely cause: the file landed in a" >&2
        echo "   directory nginx does not include." >&2
        rollback; exit 1
    fi

    if [[ ! -f "$cert" ]]; then
        echo "── stage 2: issue Let's Encrypt certificate for $DOMAIN ──"
        if ! command -v certbot >/dev/null 2>&1; then
            echo "certbot not found — attempting install (apt)…"
            DEBIAN_FRONTEND=noninteractive apt-get update -qq && \
            DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot || true
        fi
        if command -v certbot >/dev/null 2>&1; then
            local email_args=(--register-unsafely-without-email)
            [[ -n "$EMAIL" ]] && email_args=(--email "$EMAIL")
            if certbot certonly --webroot -w "$ACME_WEBROOT" -d "$DOMAIN" \
                 --agree-tos --non-interactive "${email_args[@]}"; then
                echo "certificate issued."
            else
                echo "!! certbot failed — keeping HTTP-only vhost (domain still works over HTTP)."
                echo "   Re-run after fixing:  sudo $0 --apply"
            fi
        else
            echo "!! certbot could not be installed — keeping HTTP-only vhost."
        fi
    fi

    if [[ -f "$cert" ]]; then
        echo "── stage 3: install final vhost (HTTP→HTTPS redirect + TLS) ──"
        cp "$TEMPLATE" "$TARGET_PATH"
        chmod 644 "$TARGET_PATH"
        if ! nginx_test; then
            echo "!! nginx -t failed on final config." >&2
            rollback; exit 1
        fi
        nginx_reload
    else
        echo "── stage 3 skipped (no certificate yet) — interim HTTP vhost stays active ──"
    fi

    # Give the asynchronous reload a moment before the final checks.
    sleep 1
    echo
    echo "══════════════════════════════════════════════════════════════"
    echo " FINAL VERIFICATION"
    echo "══════════════════════════════════════════════════════════════"
    echo "── $DOMAIN over HTTP ──"
    curl -sSI -m 6 -H "Host: $DOMAIN" http://127.0.0.1/ | head -6 || true
    echo "── $DOMAIN over HTTPS (SNI) ──"
    curl -skSI -m 6 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" | head -6 || true
    echo "── existing site unchanged: internal-devrepo.datavex.ai ──"
    curl -sSI -m 6 -H "Host: internal-devrepo.datavex.ai" http://127.0.0.1/ | head -6 || true
    echo
    echo "Done. From outside, verify with:"
    echo "  curl -sI http://$DOMAIN/            # → 301 https://$DOMAIN/"
    echo "  curl -sIL https://$DOMAIN/          # → 200 ERP login/dashboard"
    echo "Rollback: tar xzf $BACKUP -C / && nginx -t && nginx -s reload"
}

if [[ "$MODE" == "inspect" ]]; then
    inspect
else
    apply
fi
