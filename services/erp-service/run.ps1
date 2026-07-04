$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    Write-Host "Virtual environment not found in .venv. Falling back to system python..."
    $Python = "python"
}

Write-Host "Starting VexBill ERP Backend with uvicorn..."
& $Python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
