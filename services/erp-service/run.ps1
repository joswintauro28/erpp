$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    Write-Error "Virtual environment not found. Create it first or run this from the backend folder after setting up .venv."
}

& $Python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
