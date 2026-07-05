$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# Clear Next.js cache to avoid locked database or build state issues
if (Test-Path ".next") {
    Write-Host "Cleaning Next.js build cache..."
    Remove-Item -Recurse -Force ".next"
}

Write-Host "Starting Next.js Frontend with Bun..."
bun run dev
