#!/bin/bash
# DATAVEX ERP — Add hosts file entries for local subdomain routing
# Run this script with sudo once before starting Docker

hosts_entries=(
    "127.0.0.1 app.erp.local"
    "127.0.0.1 crm.erp.local"
    "127.0.0.1 billing.erp.local"
    "127.0.0.1 inventory.erp.local"
)

hosts_path="/etc/hosts"

if [ "$EUID" -ne 0 ]; then
    echo "Warning: This script requires root privileges." >&2
    echo "Please run as root: sudo $0" >&2
    exit 1
fi

added=0
for entry in "${hosts_entries[@]}"; do
    if ! grep -Fq "$entry" "$hosts_path"; then
        echo "$entry" >> "$hosts_path"
        echo "  [+] Added: $entry"
        added=$((added + 1))
    else
        echo "  [SKIP] Already exists: $entry"
    fi
done

if [ "$added" -eq 0 ]; then
    echo -e "\nAll hosts entries already configured. No changes made."
else
    echo -e "\nAdded $added entries to hosts file. DNS should resolve immediately."
fi

echo -e "\nDATAVEX ERP subdomains ready:"
echo "  http://app.erp.local        → Executive Shell"
echo "  http://crm.erp.local        → CRM Workstation"
echo "  http://billing.erp.local    → Billing Workstation"
echo "  http://inventory.erp.local  → Inventory Workstation"
