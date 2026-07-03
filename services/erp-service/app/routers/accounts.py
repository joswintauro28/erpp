from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.database import conn
from app.auth.permissions import require_permission
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter(prefix="/accounts", tags=["Chart of Accounts"])

@router.get("/", response_model=dict)
def get_accounts(
    search: str = "",
    account_type: str = "",
    is_active: Optional[bool] = None,
    current_user: int = Depends(require_permission('accounting.view'))
):
    query = "SELECT * FROM accounts WHERE owner_id=%s"
    params = [current_user]

    if search:
        query += " AND (account_code ILIKE %s OR account_name ILIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])
    
    if account_type:
        query += " AND account_type = %s"
        params.append(account_type)

    if is_active is not None:
        query += " AND is_active = %s"
        params.append(is_active)

    query += " ORDER BY account_type ASC, account_code ASC"

    with conn.cursor() as cursor:
        cursor.execute(query, tuple(params))
        accounts = cursor.fetchall()
        
    return {"data": accounts}


@router.get("/{account_id}", response_model=dict)
def get_account(account_id: int, current_user: int = Depends(require_permission('accounting.view'))):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM accounts WHERE id=%s AND owner_id=%s", (account_id, current_user))
        account = cursor.fetchone()
        
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    return {"data": account}


@router.post("/", response_model=dict)
def create_account(
    payload: AccountCreate,
    current_user: int = Depends(require_permission('accounting.create'))
):
    with conn.cursor() as cursor:
        # Check uniqueness of account_code
        cursor.execute("SELECT id FROM accounts WHERE owner_id=%s AND account_code=%s", (current_user, payload.account_code))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Account code already exists.")
            
        cursor.execute(
            """
            INSERT INTO accounts (
                owner_id, account_code, account_name, account_type, account_category, 
                parent_account_id, description, opening_balance, currency, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                current_user, payload.account_code, payload.account_name, payload.account_type, 
                payload.account_category, payload.parent_account_id, payload.description,
                payload.opening_balance, payload.currency, payload.is_active
            )
        )
        new_account = cursor.fetchone()
        conn.commit()
        
    return {"data": new_account}


@router.put("/{account_id}", response_model=dict)
def update_account(
    account_id: int,
    payload: AccountUpdate,
    current_user: int = Depends(require_permission('accounting.edit'))
):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM accounts WHERE id=%s AND owner_id=%s", (account_id, current_user))
        account = cursor.fetchone()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Prevent changing account_code for system accounts
        if account["is_system"] and payload.account_code is not None and payload.account_code != account["account_code"]:
            raise HTTPException(status_code=400, detail="Cannot change account code for system accounts.")
            
        # Check uniqueness if code is changed
        if payload.account_code is not None and payload.account_code != account["account_code"]:
            cursor.execute("SELECT id FROM accounts WHERE owner_id=%s AND account_code=%s", (current_user, payload.account_code))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Account code already exists.")
                
        updates = []
        params = []
        for key, value in payload.dict(exclude_unset=True).items():
            updates.append(f"{key} = %s")
            params.append(value)
            
        if not updates:
            return {"data": account}
            
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.extend([account_id, current_user])
        
        query = f"UPDATE accounts SET {', '.join(updates)} WHERE id=%s AND owner_id=%s RETURNING *"
        cursor.execute(query, tuple(params))
        updated_account = cursor.fetchone()
        conn.commit()
        
    return {"data": updated_account}


@router.delete("/{account_id}")
def delete_account(account_id: int, current_user: int = Depends(require_permission('accounting.delete'))):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM accounts WHERE id=%s AND owner_id=%s", (account_id, current_user))
        account = cursor.fetchone()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
            
        if account["is_system"]:
            raise HTTPException(status_code=400, detail="Cannot delete a system account.")
            
        # Check if used in ledger_entries (by string name for now)
        cursor.execute("SELECT id FROM ledger_entries WHERE owner_id=%s AND account=%s LIMIT 1", (current_user, account["account_name"]))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Cannot delete account with existing ledger history. Please deactivate it instead.")

        cursor.execute("DELETE FROM accounts WHERE id=%s AND owner_id=%s", (account_id, current_user))
        conn.commit()
        
    return {"detail": "Account deleted successfully"}
