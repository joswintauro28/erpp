import os
import re

ROUTER_MAP = {
    "accounting.py": "reports",
    "dashboard.py": "reports",
    "emails.py": "invoices",
    "eway_bills.py": "invoices",
    "leads.py": "clients",
    "ledger.py": "reports",
    "notifications.py": "settings",
    "recurring_invoices.py": "invoices",
    "search.py": "reports",
    "credit_notes.py": "invoices",
    "debit_notes.py": "invoices"
}

def get_perm_for_method(method: str, module: str):
    method = method.upper()
    if module in ["reports", "audit_logs"]:
        return f"{module}.view"
    if module == "stock":
        return f"{module}.manage" if method != "GET" else f"{module}.view"
    if module in ["workflow", "settings"]:
        return f"{module}.manage"
    
    if method == "GET":
        return f"{module}.view"
    elif method == "POST":
        return f"{module}.create"
    elif method == "PUT":
        return f"{module}.edit"
    elif method == "DELETE":
        return f"{module}.delete"
    return f"{module}.view"

def process_file(filepath, module):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Replace import
    if "from app.auth.oauth2 import get_current_user" in content:
        content = content.replace(
            "from app.auth.oauth2 import get_current_user",
            "from app.auth.permissions import require_permission"
        )
    elif "from app.auth.oauth2 import get_current_user" not in content and "get_current_user" in content:
        # maybe it's imported differently
        pass
        
    # 2. Find all route definitions
    lines = content.split('\n')
    out_lines = []
    current_method = None
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Detect route
        route_match = re.search(r'@router\.(get|post|put|delete)\(', line)
        if route_match:
            current_method = route_match.group(1).upper()
            
        if "Depends(get_current_user)" in line and current_method:
            perm = get_perm_for_method(current_method, module)
            line = line.replace("Depends(get_current_user)", f"Depends(require_permission('{perm}'))")
            # If it's a multi-line parameter
            
        out_lines.append(line)
        i += 1
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines))

print("Starting refactor...")
base_dir = "app/routers"
for filename, module in ROUTER_MAP.items():
    path = os.path.join(base_dir, filename)
    if os.path.exists(path):
        process_file(path, module)
        print(f"Processed {filename}")
    else:
        print(f"Not found {filename}")
print("Done.")
