# DATAVEX ERP — Internal Environment Docker Database Seeding Utility
# Runs database seeding scripts inside active Docker containers using the
# "testing" seed profile (edge-case + bulk matrix) by default.

param(
    [string] $Profile = "testing",
    [switch] $FailFast = $true,
    [string[]] $Skip = @(),
    [switch] $PassThru
)

function Test-ShouldSkip {
    param([string] $Name)
    return $( $Name -in $Skip )
}

function Test-ContainerHealthy {
    param([string] $Name)
    $running = docker inspect --format='{{.State.Running}}' $Name 2>$null
    if ($running -ne 'true') { return $false }
    try {
        $health = docker inspect --format='{{.State.Health.Status}}' $Name 2>$null
        if ($health -and $health -ne 'healthy') { return $false }
    } catch { }
    return $true
}

function Invoke-Step {
    param(
        [string] $Label,
        [string] $Container,
        [scriptblock] $ScriptBlock
    )
    Write-Host "[$($script:ordinal)/$($script:total)] Seeding $Label..." -ForegroundColor Yellow
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $ok = $true
    try {
        & $ScriptBlock
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { $ok = $false }
    } catch {
        Write-Host "  $_" -ForegroundColor Red
        $ok = $false
    }
    $sw.Stop()
    $elapsed = $sw.Elapsed
    $timeStr = "$($elapsed.Minutes)m $($elapsed.Seconds)s"
    if ($ok) {
        Write-Host "  OK - $Label seeded in $timeStr" -ForegroundColor Green
        $script:successCount++
    } else {
        Write-Host "  FAIL - $Label seeding failed after $timeStr" -ForegroundColor Red
        $script:failCount++
        if ($FailFast) {
            Write-Host "`n  Aborting due to -FailFast. Remaining steps skipped." -ForegroundColor Red
            exit 1
        }
    }
    Write-Host ""
    if ($PassThru) { [PSCustomObject]@{ Service = $Label; Ok = $ok; Elapsed = $elapsed } }
}

# ── Services definitions ──────────────────────────────────────────────
$services = @(
    @{ Name = 'core-iam';          Container = 'datavex-core-iam';
       Label = 'core-iam (SSO & Permissions)' },
    @{ Name = 'billing-service';   Container = 'datavex-billing-service';
       Label = 'billing-service (Invoices, Payments, Ledgers)' },
    @{ Name = 'crm-service';       Container = 'datavex-crm-service';
       Label = 'crm-service (Leads, Customers, Pipelines)' },
    @{ Name = 'inventory-service'; Container = 'datavex-inventory-service';
       Label = 'inventory-service (Products, Warehouses, Stock)' },
    @{ Name = 'erp-service';       Container = 'datavex-erp-service';
       Label = 'erp-service (Gateway, System Settings, Notifications)' },
    @{ Name = 'ai-service';        Container = 'datavex-ai-service';
       Label = 'ai-service (AI Chat, History, Audit Logs)' }
)

# ── Help / bootstrap ──────────────────────────────────────────────────
if ($Skip -contains '*') { Write-Host "All services skipped via -Skip '*'. Nothing to do."; return }

$script:ordinal   = 0
$script:total     = $services.Count
$script:successCount = 0
$script:failCount    = 0
$script:results   = @()

# ── Header ────────────────────────────────────────────────────────────
Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
Write-Host "|   DATAVEX ERP - Docker Database Seeding      |" -ForegroundColor Cyan
Write-Host "|   Profile: $Profile                          |" -ForegroundColor Cyan
Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
if ($Skip.Count) { Write-Host "Skipping: $($Skip -join ', ')" -ForegroundColor DarkYellow }
$totalTimer = [System.Diagnostics.Stopwatch]::StartNew()
Write-Host ""

# ── Container health pre-check ────────────────────────────────────────
Write-Host "Checking active Docker containers..." -ForegroundColor Yellow
$involved = $services | Where-Object { -not (Test-ShouldSkip $_.Name) }
$missing = @()
foreach ($svc in $involved) {
    if (-not (Test-ContainerHealthy $svc.Container)) {
        $missing += $svc
    }
}
if ($missing.Count) {
    Write-Host "The following required containers are not healthy:" -ForegroundColor Red
    foreach ($m in $missing) { Write-Host " - $($m.Container)" -ForegroundColor Red }
    Write-Host "Please start them first using: .\docker-build.ps1 up" -ForegroundColor Red
    $totalTimer.Stop()
    exit 1
}
Write-Host "  All containers are healthy! Proceeding with seed..." -ForegroundColor Green
Write-Host ""

# ── Seeding steps ─────────────────────────────────────────────────────
# Step 1: core-iam (compile seed.ts on host with bun, copy .js to container, run with node)
$script:ordinal++
if (-not (Test-ShouldSkip 'core-iam')) {
    Invoke-Step -Label $services[0].Label -Container $services[0].Container -ScriptBlock {
        $seedDir = Resolve-Path "$PSScriptRoot\..\..\services\core-iam"
        Push-Location $seedDir
        try {
            bun build prisma/seed.ts --outfile prisma/seed.js --target node --format cjs --external "@prisma/client-iam" --external "bcryptjs" 2>&1
            if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "compilation failed (exit $LASTEXITCODE)" }
            docker exec datavex-core-iam sh -c "npx prisma db push --accept-data-loss --skip-generate 2>&1"
            if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "prisma db push failed (exit $LASTEXITCODE)" }
            docker cp prisma/seed.js datavex-core-iam:/app/services/core-iam/prisma/seed.js 2>&1
            if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "docker cp failed (exit $LASTEXITCODE)" }
            docker exec -e SEED_PROFILE=$Profile datavex-core-iam node prisma/seed.js 2>&1
            if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "seed script failed (exit $LASTEXITCODE)" }
        } finally {
            Remove-Item prisma/seed.js -ErrorAction SilentlyContinue
            Pop-Location
        }
    }
} else { $script:ordinal--; $script:total-- }

# Step 2: billing-service (compile seed.ts on host with bun, copy .js to container, run with node)
$script:ordinal++
if (-not (Test-ShouldSkip 'billing-service')) {
    Invoke-Step -Label $services[1].Label -Container $services[1].Container -ScriptBlock {
        $seedDir = Resolve-Path "$PSScriptRoot\..\..\services\billing-service"
        Push-Location $seedDir
        try {
            bun build prisma/seed.ts --outfile prisma/seed.js --target node --format cjs --external "@prisma/client" --external "xlsx" 2>&1
            if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "compilation failed (exit $LASTEXITCODE)" }
            docker exec datavex-billing-service sh -c "npx prisma db push --accept-data-loss --skip-generate 2>&1"
            if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "prisma db push failed (exit $LASTEXITCODE)" }
            docker cp prisma/seed.js datavex-billing-service:/app/services/billing-service/prisma/seed.js 2>&1
            if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "docker cp failed (exit $LASTEXITCODE)" }
            docker exec -e SEED_PROFILE=$Profile datavex-billing-service node prisma/seed.js 2>&1
            if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "seed script failed (exit $LASTEXITCODE)" }
        } finally {
            Remove-Item prisma/seed.js -ErrorAction SilentlyContinue
            Pop-Location
        }
    }
} else { $script:ordinal--; $script:total-- }

# Step 3: crm-service
$script:ordinal++
if (-not (Test-ShouldSkip 'crm-service')) {
    Invoke-Step -Label $services[2].Label -Container $services[2].Container -ScriptBlock {
        docker cp "$PSScriptRoot\..\..\scripts\seed_lib" datavex-crm-service:/app/scripts/ 2>&1
        docker cp "$PSScriptRoot\..\..\services\crm-service\scripts" datavex-crm-service:/app/services/crm-service/ 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "docker cp failed" }
        docker exec -e PYTHONPATH=. datavex-crm-service /opt/venv/bin/alembic upgrade head 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "alembic upgrade head failed (exit $LASTEXITCODE)" }
        docker exec -e PYTHONPATH=. -e SEED_PROFILE=$Profile datavex-crm-service /opt/venv/bin/python /app/services/crm-service/scripts/seed.py --profile $Profile 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "seed script failed (exit $LASTEXITCODE)" }
    }
} else { $script:ordinal--; $script:total-- }

# Step 4: inventory-service
$script:ordinal++
if (-not (Test-ShouldSkip 'inventory-service')) {
    Invoke-Step -Label $services[3].Label -Container $services[3].Container -ScriptBlock {
        docker cp "$PSScriptRoot\..\..\scripts\seed_lib" datavex-inventory-service:/app/scripts/ 2>&1
        docker cp "$PSScriptRoot\..\..\services\inventory-service\scripts" datavex-inventory-service:/app/services/inventory-service/ 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "docker cp failed" }
        docker exec -e PYTHONPATH=. datavex-inventory-service /opt/venv/bin/alembic upgrade head 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "alembic upgrade head failed (exit $LASTEXITCODE)" }
        docker exec -e PYTHONPATH=. -e SEED_PROFILE=$Profile datavex-inventory-service /opt/venv/bin/python /app/services/inventory-service/scripts/seed.py --profile $Profile 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "seed script failed (exit $LASTEXITCODE)" }
    }
} else { $script:ordinal--; $script:total-- }

# Step 5: erp-service
$script:ordinal++
if (-not (Test-ShouldSkip 'erp-service')) {
    Invoke-Step -Label $services[4].Label -Container $services[4].Container -ScriptBlock {
        docker cp "$PSScriptRoot\..\..\scripts\seed_lib" datavex-erp-service:/app/scripts/ 2>&1
        docker cp "$PSScriptRoot\..\..\services\erp-service\scripts" datavex-erp-service:/app/services/erp-service/ 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "docker cp failed" }
        docker exec -e PYTHONPATH=. datavex-erp-service /opt/venv/bin/alembic upgrade head 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "alembic upgrade head failed (exit $LASTEXITCODE)" }
        docker exec -e PYTHONPATH=. -e SEED_PROFILE=$Profile datavex-erp-service /opt/venv/bin/python /app/services/erp-service/scripts/seed.py --profile $Profile 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "seed script failed (exit $LASTEXITCODE)" }
    }
} else { $script:ordinal--; $script:total-- }

# Step 6: ai-service
$script:ordinal++
if (-not (Test-ShouldSkip 'ai-service')) {
    Invoke-Step -Label $services[5].Label -Container $services[5].Container -ScriptBlock {
        docker cp "$PSScriptRoot\..\..\services\ai-service\scripts" datavex-ai-service:/app/services/ai-service/ 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "docker cp failed" }
        docker exec -e PYTHONPATH=. datavex-ai-service /opt/venv/bin/alembic upgrade head 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "alembic upgrade head failed (exit $LASTEXITCODE)" }
        docker exec -e PYTHONPATH=. -e SEED_PROFILE=$Profile datavex-ai-service /opt/venv/bin/python /app/services/ai-service/scripts/seed.py --profile $Profile 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "seed script failed (exit $LASTEXITCODE)" }
    }
} else { $script:ordinal--; $script:total-- }

$totalTimer.Stop()
$total = $totalTimer.Elapsed
$totalStr = "$($total.Minutes)m $($total.Seconds)s"

# ── Summary ───────────────────────────────────────────────────────────
Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
Write-Host "|   Seeding Complete!                          |" -ForegroundColor Cyan
Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
Write-Host "|  Succeeded: $($script:successCount) / $($script:successCount + $script:failCount)   Total: $totalStr   " -ForegroundColor Cyan
if ($script:failCount -gt 0) {
    Write-Host "|  FAILURES: $($script:failCount) service(s) failed!" -ForegroundColor Red
}
Write-Host "+----------------------------------------------+" -ForegroundColor Cyan

if ($script:failCount -gt 0) { exit 1 }
