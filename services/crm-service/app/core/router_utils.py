def parse_numeric_value(val_str):
    if val_str is None:
        return 0.0
    val_str = str(val_str)
    clean_str = val_str.replace("\u20b9", "").replace("$", "").replace(",", "").strip()
    try:
        return float(clean_str) if clean_str else 0.0
    except ValueError:
        return 0.0

def generic_summary(data, status_field='status', active_vals=None, attention_vals=None):
    total = len(data)
    active = len([d for d in data if getattr(d, status_field, '') in (active_vals or [])])
    attention = len([d for d in data if getattr(d, status_field, '') in (attention_vals or [])])
    
    unique_owners = set()
    for d in data:
        owner = getattr(d, 'owner', None)
        if not owner:
            owner = getattr(d, 'rep', None)
        if owner:
            unique_owners.add(owner)
            
    owners = len(unique_owners)
    return {"total": total, "active": active, "attention": attention, "owners": owners}
