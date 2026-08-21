"""Lead scoring heuristic (M3) and MQL threshold (M4).

Score bands: 0-100. A lead reaching `MQL_SCORE_THRESHOLD` (70) is flagged
`is_mql` and surfaced in the "Lead Qualification" view (S1) for a 1-click
MQL -> SQL handoff that auto-creates an Opportunity.
"""
from datetime import datetime

MQL_SCORE_THRESHOLD = 70

SOURCE_WEIGHTS = {
    "Referral": 30,
    "Partner": 25,
    "Event": 20,
    "Website": 15,
    "Social Media": 12,
    "AI Discovery": 20,
    "Email": 8,
    "Cold Call": 5,
}

STATUS_WEIGHTS = {
    "Qualified": 25,
    "In Progress": 20,
    "New": 10,
    "Contacted": 12,
    "Converted": 30,
    "Lost": 0,
}

VALUE_BANDS = [
    (1000000, 30),
    (500000, 22),
    (200000, 15),
    (50000, 8),
]


def compute_lead_score(
    *,
    source: str = "",
    status: str = "",
    est_value: int | float | str | None = None,
) -> dict:
    """Return {score, tier, is_mql} for a lead's profile attributes."""
    score = 0

    src = (source or "").strip()
    if src in SOURCE_WEIGHTS:
        score += SOURCE_WEIGHTS[src]
    elif src:
        score += 8

    st = (status or "").strip()
    if st in STATUS_WEIGHTS:
        score += STATUS_WEIGHTS[st]
    else:
        score += 5

    try:
        est = float(est_value or 0)
    except (TypeError, ValueError):
        est = 0.0
    for band, pts in VALUE_BANDS:
        if est >= band:
            score += pts
            break
    if 0 < est < 50000:
        score += 3

    score = max(0, min(100, score))

    if score >= MQL_SCORE_THRESHOLD:
        tier = "Hot"
    elif score >= 40:
        tier = "Warm"
    else:
        tier = "Cold"

    return {
        "score": score,
        "tier": tier,
        "is_mql": score >= MQL_SCORE_THRESHOLD,
    }


def apply_lead_score(lead) -> dict:
    """Persist the computed score/tier/is_mql onto a Lead ORM object."""
    result = compute_lead_score(
        source=getattr(lead, "source", ""),
        status=getattr(lead, "status", ""),
        est_value=getattr(lead, "est_value", 0),
    )
    lead.score = result["score"]
    lead.tier = result["tier"]
    lead.is_mql = result["is_mql"]
    if not lead.nurture_status:
        lead.nurture_status = "New"
    if result["is_mql"] and not lead.mql_qualified_at:
        lead.mql_qualified_at = datetime.utcnow().strftime("%Y-%m-%d")
    return result
