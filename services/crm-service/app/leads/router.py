from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import database, models
from app.leads import schemas, crud

router = APIRouter(prefix="/api/leads", tags=["leads"])

SOURCE_WEIGHTS = {
    "Referral": 30,
    "Partner": 25,
    "Event": 20,
    "Website": 15,
    "Social Media": 12,
    "Cold Call": 5,
    "Email": 8,
}

STATUS_WEIGHTS = {
    "Qualified": 25,
    "In Progress": 20,
    "New": 10,
    "Contacted": 12,
    "Converted": 30,
    "Lost": 0,
}


def _score_lead(lead) -> dict:
    score = 0
    source = (lead.source or "").strip()
    if source in SOURCE_WEIGHTS:
        score += SOURCE_WEIGHTS[source]
    elif source:
        score += 8

    status = (lead.status or "").strip()
    if status in STATUS_WEIGHTS:
        score += STATUS_WEIGHTS[status]
    else:
        score += 5

    try:
        est = float(lead.est_value or 0)
    except (TypeError, ValueError):
        est = 0.0
    if est >= 1000000:
        score += 30
    elif est >= 500000:
        score += 22
    elif est >= 200000:
        score += 15
    elif est >= 50000:
        score += 8
    elif est > 0:
        score += 3

    score = min(100, max(0, score))

    if score >= 70:
        tier = "Hot"
    elif score >= 40:
        tier = "Warm"
    else:
        tier = "Cold"

    return {
        "id": lead.id,
        "id_str": lead.id_str,
        "name": lead.name,
        "company": lead.company,
        "source": lead.source,
        "est_value": lead.est_value,
        "status": lead.status,
        "owner": lead.owner,
        "score": score,
        "tier": tier,
    }


@router.get("/scoring")
async def get_lead_scores(db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.Lead))
    leads = result.scalars().all()
    scored = [_score_lead(l) for l in leads]
    scored.sort(key=lambda s: s["score"], reverse=True)
    hot = [s for s in scored if s["tier"] == "Hot"]
    warm = [s for s in scored if s["tier"] == "Warm"]
    cold = [s for s in scored if s["tier"] == "Cold"]
    return {
        "summary": {
            "total": len(scored),
            "hot": len(hot),
            "warm": len(warm),
            "cold": len(cold),
            "avg_score": round(sum(s["score"] for s in scored) / len(scored), 1) if scored else 0,
        },
        "leads": scored,
    }


@router.post("/{id_str}/score")
async def score_single_lead(id_str: str, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.Lead).filter(models.Lead.id_str == id_str))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _score_lead(lead)

@router.get("", response_model=schemas.LeadManagementData)
async def get_leads_data(db: AsyncSession = Depends(database.get_db)):
    leads = await crud.get_leads(db)

    total = len(leads)
    open_count = len([l for l in leads if l.status in ['New', 'Qualified', 'In Progress']])
    at_risk = len([l for l in leads if l.status == 'Lost'])
    owners_count = len(set(l.owner for l in leads if l.owner)) or 1

    summary = {
        "total_leads": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }

    return {
        "summary": summary,
        "leads": leads
    }
