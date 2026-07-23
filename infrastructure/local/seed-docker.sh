#!/bin/bash
# DATAVEX ERP — Docker Database Seeding Utility
# Runs database seeding scripts inside active Docker containers.

set -o pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Defaults ──────────────────────────────────────────────────────────
FAIL_FAST=true
SKIP=()

# ── Argument parsing ──────────────────────────────────────────────────
usage() {
    echo "Usage: $0 [--fail-fast|--no-fail-fast] [--skip SERVICE,...] [--help]"
    echo ""
    echo "Options:"
    echo "  --fail-fast        Stop on first failure (default: on)"
    echo "  --no-fail-fast     Continue on failure"
    echo "  --skip NAME,...    Skip one or more services (comma-separated)"
    echo "  --help             Show this help"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --fail-fast)    FAIL_FAST=true; shift ;;
        --no-fail-fast) FAIL_FAST=false; shift ;;
        --skip)         IFS=',' read -ra SKIP <<< "$2"; shift 2 ;;
        --skip=*)       IFS=',' read -ra SKIP <<< "${1#*=}"; shift ;;
        --help)         usage ;;
        *)              echo "Unknown argument: $1"; usage ;;
    esac
done

# ── Helpers ───────────────────────────────────────────────────────────
now_ms() { date +%s%3N; }

should_skip() {
    local name="$1"
    for s in "${SKIP[@]}"; do
        [[ "$s" == "$name" ]] && return 0
    done
    return 1
}

container_healthy() {
    local name="$1"
    local running
    running=$(docker inspect --format='{{.State.Running}}' "$name" 2>/dev/null)
    [[ "$running" != "true" ]] && return 1
    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null)
    if [[ -n "$health" && "$health" != "healthy" ]]; then
        return 1
    fi
    return 0
}

ORDINAL=0
TOTAL=4
SUCCESS_COUNT=0
FAIL_COUNT=0

run_step() {
    local label="$1"
    shift
    ((ORDINAL++))
    echo "[$ORDINAL/$TOTAL] Seeding $label..."
    local start_ms end_ms elapsed_sec elapsed_min elapsed_str rc
    start_ms=$(now_ms)
    "$@"
    rc=$?
    end_ms=$(now_ms)
    elapsed_ms=$(( end_ms - start_ms ))
    elapsed_sec=$(( elapsed_ms / 1000 ))
    elapsed_min=$(( elapsed_sec / 60 ))
    elapsed_sec=$(( elapsed_sec % 60 ))
    printf -v elapsed_str "%dm %ds" "$elapsed_min" "$elapsed_sec"
    if [[ $rc -eq 0 ]]; then
        echo -e "  \e[32mOK\e[0m - $label seeded in $elapsed_str"
        ((SUCCESS_COUNT++))
    else
        echo -e "  \e[31mFAIL\e[0m - $label seeding failed after $elapsed_str" >&2
        ((FAIL_COUNT++))
        if [[ "$FAIL_FAST" == "true" ]]; then
            echo -e "\n  \e[31mAborting due to --fail-fast. Remaining steps skipped.\e[0m" >&2
            exit 1
        fi
    fi
    echo ""
}

# ── Skip-all guard ────────────────────────────────────────────────────
for s in "${SKIP[@]}"; do
    if [[ "$s" == "*" ]]; then
        echo "All services skipped via --skip '*'. Nothing to do."
        exit 0
    fi
done

# ── Header ────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════╗"
echo "║   DATAVEX ERP — Docker Database Seeding      ║"
echo "╚══════════════════════════════════════════════╝"
if [[ ${#SKIP[@]} -gt 0 ]]; then
    echo -e "Skipping: \e[33m${SKIP[*]}\e[0m"
fi

TOTAL_START=$(now_ms)

# ── Container health pre-check ────────────────────────────────────────
echo "Checking active Docker containers..."
MISSING=false
for triplet in \
    "datavex-core-iam" \
    "datavex-billing-service" \
    "datavex-crm-service" \
    "datavex-inventory-service"; do
    should_skip "$triplet" && continue
    if ! container_healthy "$triplet"; then
        echo -e "  \e[31m$triplet is not healthy\e[0m" >&2
        MISSING=true
    fi
done
if [[ "$MISSING" == "true" ]]; then
    echo -e "\e[31mPlease start missing containers first using: ./docker-build.sh up\e[0m" >&2
    exit 1
fi
echo -e "  \e[32mAll containers are healthy! Proceeding with seed...\e[0m"
echo ""

# ── Seeding steps ─────────────────────────────────────────────────────

# Step 1: core-iam (compile seed.ts on host, run seed.js with node inside container)
if ! should_skip "core-iam"; then
    run_step "core-iam (SSO & Permissions)" \
        sh -c "
            SEED_DIR=\"$DIR/../../services/core-iam\"
            cd \"\$SEED_DIR\" && \
            npx tsc prisma/seed.ts --module commonjs --target es2022 && \
            docker exec datavex-core-iam sh -c 'npx prisma db push --accept-data-loss --skip-generate 2>&1' && \
            docker cp \"\$SEED_DIR/prisma/seed.js\" datavex-core-iam:/app/services/core-iam/prisma/seed.js && \
            docker exec datavex-core-iam node prisma/seed.js && \
            rm -f \"\$SEED_DIR/prisma/seed.js\"
        "
fi

# Step 2: billing-service (compile seed.ts on host, run seed.js with node inside container)
if ! should_skip "billing-service"; then
    run_step "billing-service (Invoices, Payments, Ledgers)" \
        sh -c "
            SEED_DIR=\"$DIR/../../services/billing-service\"
            cd \"\$SEED_DIR\" && \
            npx tsc prisma/seed.ts --module commonjs --target es2022 && \
            docker exec datavex-billing-service sh -c 'npx prisma db push --accept-data-loss --skip-generate 2>&1' && \
            docker cp \"\$SEED_DIR/prisma/seed.js\" datavex-billing-service:/app/services/billing-service/prisma/seed.js && \
            docker exec datavex-billing-service node prisma/seed.js && \
            rm -f \"\$SEED_DIR/prisma/seed.js\"
        "
fi

# Step 3: crm-service (FastAPI, seed.py)
if ! should_skip "crm-service"; then
    run_step "crm-service (Leads, Customers, Pipelines)" \
        sh -c "
            docker cp '$DIR/../../services/crm-service/scripts' datavex-crm-service:/app/services/crm-service/ && \
            docker exec -e PYTHONPATH=. datavex-crm-service /opt/venv/bin/python /app/services/crm-service/scripts/seed.py
        "
fi

# Step 4: inventory-service (FastAPI, seed.py)
if ! should_skip "inventory-service"; then
    run_step "inventory-service (Products, Warehouses, Stock)" \
        sh -c "
            docker cp '$DIR/../../services/inventory-service/scripts' datavex-inventory-service:/app/services/inventory-service/ && \
            docker exec -e PYTHONPATH=. datavex-inventory-service /opt/venv/bin/python /app/services/inventory-service/scripts/seed.py
        "
fi

TOTAL_END=$(now_ms)
TOTAL_MS=$(( TOTAL_END - TOTAL_START ))
TOTAL_SEC=$(( TOTAL_MS / 1000 ))
TOTAL_MIN=$(( TOTAL_SEC / 60 ))
TOTAL_SEC=$(( TOTAL_SEC % 60 ))
printf -v TOTAL_STR "%dm %ds" "$TOTAL_MIN" "$TOTAL_SEC"

# ── Summary ───────────────────────────────────────────────────────────
TOTAL_COUNT=$(( SUCCESS_COUNT + FAIL_COUNT ))
echo "╔══════════════════════════════════════════════╗"
echo "║   Seeding Complete!                          ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Succeeded: $SUCCESS_COUNT / $TOTAL_COUNT   Total: $TOTAL_STR   ║"
if [[ $FAIL_COUNT -gt 0 ]]; then
    echo -e "║  \e[31mFAILURES: $FAIL_COUNT service(s) failed!\e[0m         ║"
fi
echo "╚══════════════════════════════════════════════╝"

[[ $FAIL_COUNT -gt 0 ]] && exit 1
exit 0