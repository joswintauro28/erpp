from fastapi import APIRouter, HTTPException, Depends

from app.database import conn
from app.schemas.lead import Lead, LeadConvert
from app.auth.permissions import require_permission

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("/")
def get_leads(
    search: str | None = None,
    status: str | None = None,
    source: str | None = None,
    min_score: int | None = None,
    current_user: int = Depends(require_permission('clients.view')),
):
    clauses = ["owner_id = %s"]
    params = [current_user]
    if search:
        clauses.append("(company_name ILIKE %s OR contact_person ILIKE %s OR email ILIKE %s)")
        term = f"%{search}%"
        params.extend([term, term, term])
    if status:
        clauses.append("status = %s")
        params.append(status)
    if source:
        clauses.append("source = %s")
        params.append(source)
    if min_score is not None:
        clauses.append("lead_score >= %s")
        params.append(min_score)

    with conn.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT * FROM leads
            WHERE {' AND '.join(clauses)}
            ORDER BY lead_score DESC, id DESC
            """,
            tuple(params),
        )
        leads = cursor.fetchall()
    return {"data": leads}


@router.get("/analytics")
def lead_analytics(current_user: int = Depends(require_permission('clients.view'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) AS total_leads,
                   COUNT(*) FILTER (WHERE status='Won') AS won_leads,
                   COUNT(*) FILTER (WHERE status='Lost') AS lost_leads,
                   COUNT(*) FILTER (WHERE converted_client_id IS NOT NULL) AS converted_leads,
                   COALESCE(AVG(lead_score),0) AS average_score,
                   COALESCE(SUM(expected_value),0) AS pipeline_value
            FROM leads WHERE owner_id=%s
            """,
            (current_user,),
        )
        summary = cursor.fetchone()
        cursor.execute(
            """
            SELECT status, COUNT(*) AS count, COALESCE(SUM(expected_value),0) AS value
            FROM leads
            WHERE owner_id=%s
            GROUP BY status
            ORDER BY status
            """,
            (current_user,),
        )
        by_status = cursor.fetchall()
        cursor.execute(
            """
            SELECT source, COUNT(*) AS count
            FROM leads
            WHERE owner_id=%s AND source IS NOT NULL
            GROUP BY source
            ORDER BY count DESC
            """,
            (current_user,),
        )
        by_source = cursor.fetchall()
    conversion_rate = 0
    if summary["total_leads"]:
        conversion_rate = round((summary["converted_leads"] / summary["total_leads"]) * 100, 2)
    return {"data": {**summary, "conversion_rate": conversion_rate, "by_status": by_status, "by_source": by_source}}


@router.post("/")
def create_lead(lead: Lead, current_user: int = Depends(require_permission('clients.create'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO leads (company_name, contact_person, email, phone, status, lead_score, assigned_to, source,
                               expected_value, notes, owner_id, gst_number, state, address, website, industry)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING *
            """,
            (lead.company_name, lead.contact_person, lead.email, lead.phone, lead.status, lead.lead_score,
             lead.assigned_to, lead.source, lead.expected_value, lead.notes, current_user,
             lead.gst_number, lead.state, lead.address, lead.website, lead.industry),
        )
        new_lead = cursor.fetchone()
    conn.commit()
    return {"data": new_lead}


@router.get("/{id}")
def get_lead(id: int, current_user: int = Depends(require_permission('clients.view'))):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM leads WHERE id=%s AND owner_id=%s", (id, current_user))
        lead = cursor.fetchone()
    if lead is None:
        raise HTTPException(status_code=404, detail=f"Lead with id {id} not found")
    return {"data": lead}


@router.post("/{id}/convert")
def convert_lead(id: int, payload: LeadConvert, current_user: int = Depends(require_permission('clients.create'))):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM leads WHERE id=%s AND owner_id=%s", (id, current_user))
        lead = cursor.fetchone()
        if lead is None:
            raise HTTPException(status_code=404, detail=f"Lead with id {id} not found")
        if lead.get("converted_client_id"):
            cursor.execute("SELECT * FROM clients WHERE id=%s AND owner_id=%s", (lead["converted_client_id"], current_user))
            return {"data": cursor.fetchone(), "message": "Lead already converted"}

        cursor.execute(
            """
            INSERT INTO clients (name, email, phone, address, gst_number, state, website, industry, notes, owner_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (lead["company_name"], lead["email"], payload.phone or lead.get("phone"), 
             payload.address or lead.get("address"), payload.gst_number or lead.get("gst_number"), 
             payload.state or lead.get("state"), lead.get("website"), lead.get("industry"),
             f"Converted from lead #{id}: {lead.get('contact_person')}\n{lead.get('notes') or ''}", current_user),
        )
        client = cursor.fetchone()
        cursor.execute(
            """
            UPDATE leads
            SET status='Won', converted_client_id=%s, converted_at=CURRENT_TIMESTAMP
            WHERE id=%s AND owner_id=%s
            RETURNING *
            """,
            (client["id"], id, current_user),
        )
        updated_lead = cursor.fetchone()
    conn.commit()
    return {"data": client, "lead": updated_lead, "message": "Lead converted to client"}


@router.put("/{id}")
def update_lead(id: int, lead: Lead, current_user: int = Depends(require_permission('clients.edit'))):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE leads
            SET company_name=%s, contact_person=%s, email=%s, phone=%s, status=%s, lead_score=%s,
                assigned_to=%s, source=%s, expected_value=%s, notes=%s,
                gst_number=%s, state=%s, address=%s, website=%s, industry=%s
            WHERE id=%s AND owner_id=%s
            RETURNING *
            """,
            (lead.company_name, lead.contact_person, lead.email, lead.phone, lead.status, lead.lead_score,
             lead.assigned_to, lead.source, lead.expected_value, lead.notes, 
             lead.gst_number, lead.state, lead.address, lead.website, lead.industry,
             id, current_user),
        )
        updated_lead = cursor.fetchone()
    if updated_lead is None:
        raise HTTPException(status_code=404, detail=f"Lead with id {id} not found")
    conn.commit()
    return {"data": updated_lead}


@router.delete("/{id}")
def delete_lead(id: int, current_user: int = Depends(require_permission('clients.delete'))):
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM leads WHERE id=%s AND owner_id=%s RETURNING *", (id, current_user))
        deleted_lead = cursor.fetchone()
    if deleted_lead is None:
        raise HTTPException(status_code=404, detail=f"Lead with id {id} not found")
    conn.commit()
    return {"message": "Lead deleted"}
