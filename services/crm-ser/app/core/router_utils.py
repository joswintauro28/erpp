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
