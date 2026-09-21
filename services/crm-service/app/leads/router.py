from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app import database, models
from app.leads import schemas, crud
from app.core.deps import get_current_token_payload

router = APIRouter(prefix="/api/leads", tags=["leads"])


def _score_lead(lead) -> dict:
    # Single source of truth for scoring: app/leads/scoring.py (M3/M4).
    from app.leads.scoring import compute_lead_score

    result = compute_lead_score(
        source=getattr(lead, "source", ""),
        status=getattr(lead, "status", ""),
        est_value=getattr(lead, "est_value", 0),
    )
    return {
        "id": lead.id,
        "id_str": lead.id_str,
        "name": lead.name,
        "company": lead.company,
        "source": lead.source,
        "est_value": lead.est_value,
        "status": lead.status,
        "owner": lead.owner,
        "score": result["score"],
        "tier": result["tier"],
        "is_mql": result["is_mql"],
    }


@router.get("/scoring")
async def get_lead_scores(
    db: AsyncSession = Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")
    stmt = select(models.Lead)
    if owner_id is not None:
        stmt = stmt.filter(models.Lead.owner_id == owner_id)
    result = await db.execute(stmt)
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
async def get_leads_data(
    db: AsyncSession = Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")
    leads = await crud.get_leads(db, owner_id=owner_id)

    total = len(leads)
    open_count = len([l for l in leads if l.status in ['New', 'Qualified', 'In Progress']])
    at_risk = len([l for l in leads if l.status == 'Lost'])
    owners_count = len(set(l.owner for l in leads if l.owner)) or 1
    mql_count = len([l for l in leads if getattr(l, "is_mql", False)])
    sql_count = len([l for l in leads if (l.nurture_status or "") == "SQL"])

    summary = {
        "total_leads": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
        "mql": mql_count,
        "sql": sql_count,
    }

    return {
        "summary": summary,
        "leads": leads
    }


@router.post("/{id_str}/qualify")
async def qualify_mql_lead(
    id_str: str,
    db: AsyncSession = Depends(database.get_db),
    token_payload: dict = Depends(get_current_token_payload),
):
    """S1 handoff: 1-click MQL -> SQL conversion that auto-creates an Opportunity.

    Only leads that reached the MQL threshold may be qualified. The lead is
    marked nurture_status=SQL and a linked Opportunity (stage Discovery) is
    created from its profile.
    """
    from app.leads.scoring import apply_lead_score, MQL_SCORE_THRESHOLD

    result = await db.execute(select(models.Lead).filter(models.Lead.id_str == id_str))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    apply_lead_score(lead)
    if not lead.is_mql:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Lead score is {lead.score} — the MQL threshold is {MQL_SCORE_THRESHOLD}. "
                "Nurture the lead further before qualifying it."
            ),
        )

    lead.nurture_status = "SQL"
    lead.status = "Qualified"
    lead.mql_qualified_at = lead.mql_qualified_at or datetime.utcnow().strftime("%Y-%m-%d")

    from app.opportunities.models import Opportunity
    from app.core.idgen import next_document_id

    opp_id_str = await next_document_id(db, Opportunity, "OP")
    opp = Opportunity(
        id_str=opp_id_str,
        name=lead.company or lead.name,
        account=lead.company or lead.name,
        value=str(lead.est_value or 0),
        probability="60%",
        stage="Discovery",
        owner=lead.owner or "Unassigned",
        updated_at=datetime.utcnow().strftime("%Y-%m-%d"),
        lead_id_str=lead.id_str,
        discovery_notes=(
            f"Qualified from MQL lead {lead.id_str} ({lead.name}). "
            f"Source: {lead.source or 'n/a'}. Score: {lead.score}/100."
        ),
        stage_history=[
            {
                "stage": "Discovery",
                "at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                "by": token_payload.get("user_id") or "system",
            }
        ],
    )
    db.add(opp)
    await db.commit()
    await db.refresh(lead)
    await db.refresh(opp)

    return {
        "lead": lead,
        "opportunity": opp,
        "message": f"Lead {lead.id_str} qualified to SQL — opportunity {opp_id_str} created.",
    }


@router.post("/{id_str}/recalculate-score")
async def recalculate_lead_score(
    id_str: str,
    db: AsyncSession = Depends(database.get_db),
):
    """Re-run the scoring heuristic and persist it."""
    from app.leads.scoring import apply_lead_score

    result = await db.execute(select(models.Lead).filter(models.Lead.id_str == id_str))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    apply_lead_score(lead)
    await db.commit()
    await db.refresh(lead)
    return _score_lead(lead)
