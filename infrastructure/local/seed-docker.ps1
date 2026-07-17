# DATAVEX ERP — Docker Database Seeding Utility
# Runs database seeding scripts inside the active docker containers

Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DATAVEX ERP — Docker Database Seeding      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verify Docker containers are running
$containers = @(
    "datavex-core-iam",
    "datavex-billing-service",
    "datavex-crm-service",
    "datavex-inventory-service"
)

Write-Host "Checking active Docker containers..." -ForegroundColor Yellow
$missing = @()
foreach ($c in $containers) {
    $state = docker inspect --format='{{.State.Running}}' $c 2>$null
    if ($state -ne "true") {
        $missing += $c
    }
}

if ($missing.Count -gt 0) {
    Write-Host "The following required containers are not running:" -ForegroundColor Red
    foreach ($m in $missing) {
        Write-Host " - $m" -ForegroundColor Red
    }
    Write-Host "Please start the containers first using: .\docker-build.ps1 up" -ForegroundColor Red
    exit 1
}
Write-Host "  All containers are running! Proceeding with seed..." -ForegroundColor Green
Write-Host ""

# Step 1: Seed core-iam
Write-Host "[1/4] Seeding core-iam (SSO & Permissions)..." -ForegroundColor Yellow
docker exec datavex-core-iam bun prisma/seed.ts
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - core-iam seeded successfully!" -ForegroundColor Green
} else {
    Write-Host "  FAIL - core-iam seeding failed." -ForegroundColor Red
}
Write-Host ""

# Step 2: Seed billing-service
Write-Host "[2/4] Seeding billing-service (Invoices, Payments, Ledgers)..." -ForegroundColor Yellow
docker exec datavex-billing-service bun prisma/seed.ts
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - billing-service seeded successfully!" -ForegroundColor Green
} else {
    Write-Host "  FAIL - billing-service seeding failed." -ForegroundColor Red
}
Write-Host ""

# Step 3: Seed crm-service
Write-Host "[3/4] Seeding crm-service (Leads, Customers, Pipelines)..." -ForegroundColor Yellow
# Copy scripts folder from host to container
docker cp "$PSScriptRoot\..\..\services\crm-service\scripts" datavex-crm-service:/app/services/crm-service/
if ($LASTEXITCODE -eq 0) {
    docker exec -e PYTHONPATH=. datavex-crm-service /opt/venv/bin/python /app/services/crm-service/scripts/seed_data.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK - crm-service seeded successfully!" -ForegroundColor Green
    } else {
        Write-Host "  FAIL - crm-service seeding failed." -ForegroundColor Red
    }
} else {
    Write-Host "  FAIL - Failed to copy crm-service scripts into container." -ForegroundColor Red
}
Write-Host ""

# Step 4: Seed inventory-service
Write-Host "[4/4] Seeding inventory-service (Products, Warehouses, Stock)..." -ForegroundColor Yellow
# Copy scripts folder from host to container
docker cp "$PSScriptRoot\..\..\services\inventory-service\scripts" datavex-inventory-service:/app/services/inventory-service/
if ($LASTEXITCODE -eq 0) {
    docker exec -e PYTHONPATH=. datavex-inventory-service /opt/venv/bin/python /app/services/inventory-service/scripts/seed.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK - inventory-service seeded successfully!" -ForegroundColor Green
    } else {
        Write-Host "  FAIL - inventory-service seeding failed." -ForegroundColor Red
    }
} else {
    Write-Host "  FAIL - Failed to copy inventory-service scripts into container." -ForegroundColor Red
}
Write-Host ""

Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Database Seeding Process Complete!         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
