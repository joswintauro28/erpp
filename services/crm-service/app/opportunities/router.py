from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app import database, models
from app.opportunities import schemas, crud
from app.core.deps import get_current_token_payload

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])

# Canonical pipeline stages (S2 -> S9): Discovery -> Quote -> Negotiation -> Closed Won
PIPELINE_STAGES = ["Discovery", "Quote", "Negotiation", "Won", "Lost"]
STAGE_PROBABILITY = {
    "Discovery": "20%",
    "Quote": "40%",
    "Negotiation": "60%",
    "Won": "100%",
    "Lost": "0%",
}

@router.get("", response_model=schemas.OpportunityManagementData)
async def get_opportunities_data(
    db: AsyncSession = Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")
    opportunities = await crud.get_opportunities(db, owner_id=owner_id)

    total = len(opportunities)
    open_count = len([o for o in opportunities if o.stage in ['Discovery', 'Proposal', 'Negotiation']])
    at_risk = len([o for o in opportunities if o.stage == 'Lost'])
    owners_count = len(set(o.owner for o in opportunities if o.owner)) or 1

    summary = {
        "total_opportunities": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }

    return {
        "summary": summary,
        "opportunities": opportunities
    }


@router.post("/{id_str}/stage")
async def update_opportunity_stage(
    id_str: str,
    stage: str = Body(..., embed=True),
    note: str = Body("", embed=True),
    db: AsyncSession = Depends(database.get_db),
    token_payload: dict = Depends(get_current_token_payload),
):
    """Kanban stage progression. Tracks the full stage trail in stage_history
    and auto-adjusts probability per the canonical pipeline."""
    result = await db.execute(
        select(models.Opportunity).filter(models.Opportunity.id_str == id_str)
    )
    opp = result.scalars().first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    if stage not in PIPELINE_STAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage '{stage}'. Must be one of {PIPELINE_STAGES}.",
        )

    # Won/Lost are terminal — no regressing a closed deal back into the funnel.
    if (opp.stage in ("Won", "Lost")) and stage != opp.stage:
        raise HTTPException(
            status_code=409,
            detail=f"Opportunity is already {opp.stage} (terminal stage) and cannot be moved back.",
        )

    history = list(opp.stage_history or [])
    if stage != opp.stage:
        history.append(
            {
                "stage": stage,
                "at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                "by": token_payload.get("user_id") or "user",
                "note": note or None,
            }
        )
        opp.stage_history = history
        opp.stage = stage
        opp.probability = STAGE_PROBABILITY.get(stage, opp.probability)
        opp.updated_at = datetime.utcnow().strftime("%Y-%m-%d")
        await db.commit()
        await db.refresh(opp)

    return opp
