# DATAVEX ERP — One-time Docker Environment Setup
# Run as Administrator to configure hosts and initialize the environment

Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DATAVEX ERP — Docker Setup                 ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker
Write-Host "[1/4] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "  OK - $dockerVersion" -ForegroundColor Green
} catch {
    Write-Error "Docker is not installed or not in PATH. Please install Docker Desktop first."
    exit 1
}

# Step 2: Configure hosts file
Write-Host "[2/4] Configuring hosts file..." -ForegroundColor Yellow
& "$PSScriptRoot\setup-hosts.ps1"

# Step 3: Verify environment file
Write-Host "[3/4] Preparing environment..." -ForegroundColor Yellow
$envFile = "$PSScriptRoot\.env.docker"
if (Test-Path $envFile) {
    Write-Host "  OK - Environment file: $envFile" -ForegroundColor Green
} else {
    Write-Host "  Creating .env.docker from template..." -ForegroundColor Yellow
    Copy-Item "$PSScriptRoot\.env.docker.example" $envFile
    Write-Host "  OK - Created: $envFile" -ForegroundColor Green
}

# Step 4: Verify project structure
Write-Host "[4/4] Verifying Dockerfiles..." -ForegroundColor Yellow
$dockerfiles = @(
    "../../apps/erp-shell/Dockerfile",
    "../../apps/crm-ui/Dockerfile",
    "../../apps/billing-ui/Dockerfile",
    "../../apps/inventory-ui/Dockerfile",
    "../../services/core-iam/Dockerfile",
    "../../services/billing-service/Dockerfile",
    "../../services/erp-service/Dockerfile",
    "../../services/crm-service/Dockerfile",
    "../../services/inventory-service/Dockerfile",
    "../../services/ai-service/Dockerfile"
)

$allOk = $true
foreach ($df in $dockerfiles) {
    $fullPath = Resolve-Path (Join-Path $PSScriptRoot $df) -ErrorAction SilentlyContinue
    if ($fullPath) {
        Write-Host "  OK - $df" -ForegroundColor Green
    } else {
        Write-Warning "  MISSING - $df"
        $allOk = $false
    }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Setup Complete!                            ║" -ForegroundColor Cyan
Write-Host "║                                              ║" -ForegroundColor Cyan
Write-Host "║   Mode A: Subdomain (*.erp.local):           ║" -ForegroundColor Cyan
Write-Host "║     .\docker-build.ps1 up                    ║" -ForegroundColor Cyan
Write-Host "║                                              ║" -ForegroundColor Cyan
Write-Host "║   Mode B: Single-Domain (erp.local):         ║" -ForegroundColor Cyan
Write-Host "║     .\docker-build.ps1 up -Mode prod         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
