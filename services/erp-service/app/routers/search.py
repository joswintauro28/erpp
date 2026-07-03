from fastapi import APIRouter, Depends
from typing import Dict, List, Any
from app.database import conn
from app.auth.permissions import require_permission

router = APIRouter(prefix="/search", tags=["Search"])

def _many(sql: str, params: tuple) -> List[Dict[str, Any]]:
    with conn.cursor() as cursor:
        cursor.execute(sql, params)
        return cursor.fetchall()

@router.get("/global")
def global_search(q: str = "", current_user: int = Depends(require_permission('reports.view'))):
    if not q or len(q.strip()) < 2:
        return {"clients": [], "quotations": [], "invoices": [], "products": [], "stock": []}

    term = f"%{q.strip()}%"
    exact_term = q.strip().lower()

    # 1. Clients Search
    clients = _many("""
        SELECT id, name, email, phone 
        FROM clients 
        WHERE owner_id=%s AND (name ILIKE %s OR email ILIKE %s OR phone ILIKE %s)
        ORDER BY CASE WHEN lower(name) = %s THEN 1 ELSE 2 END, created_at DESC
        LIMIT 5
    """, (current_user, term, term, term, exact_term))

    # 2. Quotations Search
    quotations = _many("""
        SELECT q.id, q.quote_number, c.name AS client_name, q.total, q.status 
        FROM quotations q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.owner_id=%s AND (q.quote_number ILIKE %s OR c.name ILIKE %s)
        ORDER BY CASE WHEN lower(q.quote_number) = %s THEN 1 ELSE 2 END, q.created_at DESC
        LIMIT 5
    """, (current_user, term, term, exact_term))

    # 3. Invoices Search
    invoices = _many("""
        SELECT i.id, i.invoice_number, c.name AS client_name, i.total, i.status 
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        WHERE i.owner_id=%s AND (i.invoice_number ILIKE %s OR c.name ILIKE %s)
        ORDER BY CASE WHEN lower(i.invoice_number) = %s THEN 1 ELSE 2 END, i.created_at DESC
        LIMIT 5
    """, (current_user, term, term, exact_term))

    # 4. Products Search
    products = _many("""
        SELECT id, name, sku, price, stock 
        FROM products 
        WHERE owner_id=%s AND (name ILIKE %s OR sku ILIKE %s)
        ORDER BY CASE WHEN lower(sku) = %s OR lower(name) = %s THEN 1 ELSE 2 END, created_at DESC
        LIMIT 5
    """, (current_user, term, term, exact_term, exact_term))

    # 5. Stock Search (Using stock_movements joined with products, or just products)
    # The requirement says: Stock - Product name, sku. We can just return products with stock count.
    stock = _many("""
        SELECT id, name, sku, stock 
        FROM products 
        WHERE owner_id=%s AND (name ILIKE %s OR sku ILIKE %s)
        ORDER BY CASE WHEN lower(sku) = %s OR lower(name) = %s THEN 1 ELSE 2 END, created_at DESC
        LIMIT 5
    """, (current_user, term, term, exact_term, exact_term))

    return {
        "clients": clients,
        "quotations": quotations,
        "invoices": invoices,
        "products": products,
        "stock": stock
    }
