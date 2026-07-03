from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.database import conn
from app.schemas.expense import Expense
from app.auth.permissions import require_permission
from app.services.audit import log_action

router = APIRouter(prefix="/expenses", tags=["Expenses"])

def _execute(sql: str, params: tuple, fetch=True):
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            if fetch:
                return cursor.fetchall()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def _fetchone(sql: str, params: tuple):
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchone()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def create_expense(expense: Expense, current_user: int = Depends(require_permission('expenses.create'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO expenses (vendor, category, amount, status, owner_id, expense_number, payment_method, expense_date, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
            """, (expense.vendor, expense.category, expense.amount, expense.status, current_user, expense.expense_number, expense.payment_method, expense.expense_date, expense.notes))
            new_expense = cursor.fetchone()
            
            # Auto-generate expense_number if missing
            if not expense.expense_number:
                exp_num = f"EXP-{str(new_expense['id']).zfill(5)}"
                cursor.execute("UPDATE expenses SET expense_number = %s WHERE id = %s", (exp_num, new_expense['id']))
                new_expense['expense_number'] = exp_num
            
            conn.commit()
            log_action(
                current_user,
                current_user,
                "create",
                "expense",
                new_expense["id"],
                f"Expense created: {new_expense.get('expense_number') or new_expense['id']}",
                {"vendor": new_expense.get("vendor"), "amount": new_expense.get("amount"), "category": new_expense.get("category")},
            )
            return {"data": new_expense}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
def get_expenses(current_user: int = Depends(require_permission('expenses.view'))):
    return {"data": _execute("SELECT * FROM expenses WHERE owner_id=%s ORDER BY COALESCE(expense_date, created_at::date) DESC", (current_user,))}

@router.put("/{expense_id}")
def update_expense(expense_id: int, expense: Expense, current_user: int = Depends(require_permission('expenses.edit'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE expenses 
                SET vendor=%s, category=%s, amount=%s, status=%s, expense_number=%s, payment_method=%s, expense_date=%s, notes=%s
                WHERE id=%s AND owner_id=%s RETURNING *
            """, (expense.vendor, expense.category, expense.amount, expense.status, expense.expense_number, expense.payment_method, expense.expense_date, expense.notes, expense_id, current_user))
            updated = cursor.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="Expense not found")
            conn.commit()
            log_action(
                current_user,
                current_user,
                "update",
                "expense",
                expense_id,
                f"Expense updated: {updated.get('expense_number') or expense_id}",
                {"vendor": updated.get("vendor"), "amount": updated.get("amount"), "category": updated.get("category")},
            )
            return {"data": updated}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, current_user: int = Depends(require_permission('expenses.delete'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM expenses WHERE id=%s AND owner_id=%s RETURNING *", (expense_id, current_user))
            deleted = cursor.fetchone()
            if not deleted:
                raise HTTPException(status_code=404, detail="Expense not found")
            conn.commit()
            log_action(
                current_user,
                current_user,
                "delete",
                "expense",
                expense_id,
                f"Expense deleted: {deleted.get('expense_number') or expense_id}",
                {"vendor": deleted.get("vendor"), "amount": deleted.get("amount"), "category": deleted.get("category")},
            )
            return {"detail": "Expense deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
def expense_summary(current_user: int = Depends(require_permission('expenses.view'))):
    row = _fetchone("SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE owner_id=%s", (current_user,))
    return {"total_expenses": float(row["total"])}
