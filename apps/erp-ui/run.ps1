$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# Clear Next.js cache first to avoid stale type validation errors or Turbopack database locks
if (Test-Path ".next") {
    Write-Host "Cleaning Next.js build cache..."
    Remove-Item -Recurse -Force ".next"
}

Write-Host "Starting VexBill ERP Frontend with Bun..."
bun run dev
