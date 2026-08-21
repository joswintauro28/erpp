# DATAVEX ERP — Docker Build & Start Helper
# Run from repository root or from infrastructure/local/

param(
    [ValidateSet("build", "up", "down", "rebuild", "logs", "ps", "prune")]
    [string]$Command = "up",

    [string[]]$Service = @(),

    [switch]$Detach = $true,

    [switch]$NoCache = $false
)

$composeFile = Join-Path $PSScriptRoot "docker-compose.yml"
$envFile = Join-Path $PSScriptRoot ".env.docker"

if (-not (Test-Path $composeFile)) {
    Write-Error "docker-compose.yml not found at $composeFile"
    exit 1
}

$baseArgs = @(
    "-f", $composeFile,
    "--env-file", $envFile
)

if ($Service.Count -gt 0) {
    $baseArgs += $Service
}

switch ($Command) {
    "build" {
        $buildArgs = @("build")
        if ($NoCache) { $buildArgs += "--no-cache" }
        & docker compose @baseArgs @buildArgs
    }
    "up" {
        $upArgs = @("up")
        if ($Detach) { $upArgs += "-d" }
        & docker compose @baseArgs @upArgs
    }
    "down" {
        & docker compose @baseArgs down --volumes --remove-orphans
    }
    "rebuild" {
        & docker compose @baseArgs build --no-cache
        & docker compose @baseArgs up -d
    }
    "logs" {
        & docker compose @baseArgs logs -f
    }
    "ps" {
        & docker compose @baseArgs ps
    }
    "prune" {
        & docker compose @baseArgs down --volumes --rmi all --remove-orphans
    }
}
