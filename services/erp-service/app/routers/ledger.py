from fastapi import APIRouter, Depends
from app.database import cursor, conn
from app.schemas.ledger import LedgerEntry
from app.auth.permissions import require_permission

router = APIRouter(
    prefix="/ledger",
    tags=["General Ledger"]
)

@router.post("/")
def create_entry(
    entry: LedgerEntry,
    current_user: int = Depends(require_permission('reports.view'))
):

    cursor.execute(
        """
        INSERT INTO ledger_entries
        (
            account,
            description,
            debit,
            credit,
            owner_id
        )
        VALUES (%s,%s,%s,%s,%s)
        RETURNING *
        """,
        (
            entry.account,
            entry.description,
            entry.debit,
            entry.credit,
            current_user
        )
    )

    new_entry = cursor.fetchone()

    conn.commit()

    return {"data": new_entry}

@router.get("/")
def get_entries(
    current_user: int = Depends(require_permission('reports.view'))
):

    cursor.execute(
        """
        SELECT *
        FROM ledger_entries
        WHERE owner_id=%s
        ORDER BY entry_date DESC
        """,
        (current_user,)
    )

    entries = cursor.fetchall()

    return {"data": entries}