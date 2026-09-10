# DATAVEX ERP — Docker Build & Start Helper (PowerShell)
# Usage: .\docker-build.ps1 [-Command] <up|build|down|restart|rebuild|logs|ps|prune> [[-Service] <name>] [-Mode <subdomain|single-domain|prod>] [-NoCache]

param(
    [ValidateSet("up", "build", "down", "restart", "rebuild", "logs", "ps", "prune")]
    [string]$Command = "up",

    [string[]]$Service = @(),

    [ValidateSet("subdomain", "single-domain", "prod")]
    [string]$Mode = "subdomain",

    [switch]$Detach = $true,

    [switch]$NoCache = $false
)

$composeFile = Join-Path $PSScriptRoot "docker-compose.yml"
$envFile = Join-Path $PSScriptRoot ".env.docker"

if (-not (Test-Path $envFile)) {
    Write-Warning "Environment file not found at $envFile"
    Write-Warning "Copying .env.docker.example to .env.docker..."
    Copy-Item (Join-Path $PSScriptRoot ".env.docker.example") $envFile
}

$baseArgs = @(
    "-f", $composeFile,
    "--env-file", $envFile
)

# Append single-domain override when -Mode single-domain or -Mode prod
if ($Mode -eq "single-domain" -or $Mode -eq "prod") {
    $overrideFile = Join-Path $PSScriptRoot "docker-compose.prod.yaml"
    if (-not (Test-Path $overrideFile)) {
        Write-Error "docker-compose.prod.yaml not found at $overrideFile"
        exit 1
    }
    $baseArgs += @("-f", $overrideFile)
    Write-Host "  [MODE] single-domain (path-based routing at http://erp.local)" -ForegroundColor Cyan
} else {
    Write-Host "  [MODE] subdomain (routing at *.erp.local)" -ForegroundColor Cyan
}

if ($Service.Count -gt 0) {
    $serviceArgs = $Service
} else {
    $serviceArgs = @()
}

switch ($Command) {
    "build" {
        $buildArgs = @("compose") + $baseArgs + @("build")
        if ($NoCache) { $buildArgs += "--no-cache" }
        $buildArgs += $serviceArgs
        & docker $buildArgs
    }
    "up" {
        $upArgs = @("compose") + $baseArgs + @("up")
        if ($Detach) { $upArgs += "-d" }
        $upArgs += $serviceArgs
        & docker $upArgs
    }
    "down" {
        $downArgs = @("compose") + $baseArgs + @("down")
        & docker $downArgs
    }
    "restart" {
        $restartArgs = @("compose") + $baseArgs + @("restart") + $serviceArgs
        & docker $restartArgs
    }
    "rebuild" {
        Write-Host "Rebuilding and restarting services..." -ForegroundColor Cyan
        $buildArgs = @("compose") + $baseArgs + @("build")
        if ($NoCache) { $buildArgs += "--no-cache" }
        $buildArgs += $serviceArgs
        & docker $buildArgs
        if ($LASTEXITCODE -eq 0) {
            $upArgs = @("compose") + $baseArgs + @("up", "-d") + $serviceArgs
            & docker $upArgs
        }
    }
    "logs" {
        $logsArgs = @("compose") + $baseArgs + @("logs", "-f") + $serviceArgs
        & docker $logsArgs
    }
    "ps" {
        $psArgs = @("compose") + $baseArgs + @("ps")
        & docker $psArgs
    }
    "prune" {
        & docker builder prune -f
        & docker image prune -f
    }
}
