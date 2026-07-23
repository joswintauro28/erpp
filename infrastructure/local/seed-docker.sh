#!/bin/bash
# DATAVEX ERP — Docker Database Seeding Utility

# Resolve script directory path
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔══════════════════════════════════════════════╗"
echo "║   DATAVEX ERP — Docker Database Seeding      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

containers=(
    "datavex-core-iam"
    "datavex-billing-service"
    "datavex-crm-service"
    "datavex-inventory-service"
)

echo "Checking active Docker containers..."
missing=()
for c in "${containers[@]}"; do
    state=$(docker inspect --format='{{.State.Running}}' "$c" 2>/dev/null)
    if [ "$state" != "true" ]; then
        missing+=("$c")
    fi
done

if [ ${#missing[@]} -ne 0 ]; then
    echo "The following required containers are not running:" >&2
    for m in "${missing[@]}"; do
        echo " - $m" >&2
    done
    echo "Please start the containers first using: ./docker-build.sh up" >&2
    exit 1
fi
echo "  All containers are running! Proceeding with seed..."
echo ""

# Step 1: Seed core-iam
echo "[1/4] Seeding core-iam (SSO & Permissions)..."
docker exec datavex-core-iam bun prisma/seed.ts
if [ $? -eq 0 ]; then
    echo "  OK - core-iam seeded successfully!"
else
    echo "  FAIL - core-iam seeding failed." >&2
fi
echo ""

# Step 2: Seed billing-service
echo "[2/4] Seeding billing-service (Invoices, Payments, Ledgers)..."
docker exec datavex-billing-service bun prisma/seed.ts
if [ $? -eq 0 ]; then
    echo "  OK - billing-service seeded successfully!"
else
    echo "  FAIL - billing-service seeding failed." >&2
fi
echo ""

# Step 3: Seed crm-service
echo "[3/4] Seeding crm-service (Leads, Customers, Pipelines)..."
docker cp "$DIR/../../services/crm-service/scripts" datavex-crm-service:/app/services/crm-service/
if [ $? -eq 0 ]; then
    docker exec -e PYTHONPATH=. datavex-crm-service /opt/venv/bin/python /app/services/crm-service/scripts/seed_data.py
    if [ $? -eq 0 ]; then
        echo "  OK - crm-service seeded successfully!"
    else
        echo "  FAIL - crm-service seeding failed." >&2
    fi
else
    echo "  FAIL - Failed to copy crm-service scripts into container." >&2
fi
echo ""

# Step 4: Seed inventory-service
echo "[4/4] Seeding inventory-service (Products, Warehouses, Stock)..."
docker cp "$DIR/../../services/inventory-service/scripts" datavex-inventory-service:/app/services/inventory-service/
if [ $? -eq 0 ]; then
    docker exec -e PYTHONPATH=. datavex-inventory-service /opt/venv/bin/python /app/services/inventory-service/scripts/seed.py
    if [ $? -eq 0 ]; then
        echo "  OK - inventory-service seeded successfully!"
    else
        echo "  FAIL - inventory-service seeding failed." >&2
    fi
else
    echo "  FAIL - Failed to copy inventory-service scripts into container." >&2
fi
echo ""

echo "╔══════════════════════════════════════════════╗"
echo "║   Database Seeding Process Complete!         ║"
echo "╚══════════════════════════════════════════════╝"
