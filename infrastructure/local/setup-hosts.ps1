# DATAVEX ERP — Add hosts file entries for local subdomain routing
# Run this script as Administrator once before starting Docker

$hostsEntries = @(
    "127.0.0.1 app.erp.local",
    "127.0.0.1 crm.erp.local",
    "127.0.0.1 billing.erp.local",
    "127.0.0.1 inventory.erp.local"
)

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsContent = Get-Content -Path $hostsPath -Raw

$needsElevation = $false
try {
    $testFile = [System.IO.File]::OpenWrite($hostsPath)
    $testFile.Close()
} catch {
    $needsElevation = $true
}

if ($needsElevation) {
    Write-Warning "This script requires Administrator privileges."
    Write-Host "Please run PowerShell as Administrator and try again."
    exit 1
}

$added = 0
foreach ($entry in $hostsEntries) {
    if ($hostsContent -notmatch [regex]::Escape($entry)) {
        Add-Content -Path $hostsPath -Value $entry
        Write-Host "  [+] Added: $entry"
        $added++
    } else {
        Write-Host "  [SKIP] Already exists: $entry"
    }
}

if ($added -eq 0) {
    Write-Host "`nAll hosts entries already configured. No changes made."
} else {
    Write-Host "`nAdded $added entries to hosts file. DNS should resolve immediately."
}

Write-Host "`nDATAVEX ERP subdomains ready:"
Write-Host "  http://app.erp.local        → Executive Shell"
Write-Host "  http://crm.erp.local        → CRM Workstation"
Write-Host "  http://billing.erp.local    → Billing Workstation"
Write-Host "  http://inventory.erp.local  → Inventory Workstation"
