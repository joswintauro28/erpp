from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.database import cursor, conn
from app.schemas.stock import StockMovement
from app.auth.permissions import require_permission, current_actual_user_id
from app.services.audit import log_action
from app.services.inventory import (
    apply_fifo_batches,
    change_warehouse_stock,
    get_main_warehouse,
    is_inventory_tracked,
    record_stock_movement,
)

router = APIRouter(
    prefix="/stock",
    tags=["Stock"]
)


# ─── Stock Movements ─────────────────────────────────────────────────────────

@router.post("/")
def create_stock_movement(
    stock: StockMovement,
    current_user: int = Depends(require_permission('stock.manage'))
):
    movement_type = stock.movement_type.lower()
    if movement_type not in ("in", "out"):
        raise HTTPException(status_code=400, detail="Movement type must be In or Out")

    try:
        cursor.execute("SELECT id, name, stock FROM products WHERE id=%s AND owner_id=%s FOR UPDATE", (stock.product_id, current_user))
        product = cursor.fetchone()
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")
        if movement_type == "out" and product["stock"] < stock.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        warehouse = get_main_warehouse(cursor, current_user)

        stock_change = stock.quantity if movement_type == "in" else -stock.quantity
        if movement_type == "out":
            change_warehouse_stock(cursor, warehouse["id"], stock.product_id, -stock.quantity, prevent_negative=True)
            apply_fifo_batches(cursor, current_user, stock.product_id, warehouse["id"], stock.quantity)
        else:
            change_warehouse_stock(cursor, warehouse["id"], stock.product_id, stock.quantity, prevent_negative=False)

        cursor.execute(
            "UPDATE products SET stock = stock + %s WHERE id=%s AND owner_id=%s",
            (stock_change, stock.product_id, current_user)
        )
        movement = record_stock_movement(
            cursor,
            current_user,
            stock.product_id,
            stock.movement_type,
            stock.quantity,
            stock.location or warehouse["name"],
            stock.reference,
            invoice_id=stock.invoice_id,
            warehouse_id=warehouse["id"],
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    return {"data": movement}


@router.get("/")
def get_stock_movements(
    current_user: int = Depends(require_permission('stock.view'))
):
    cursor.execute(
        """
        SELECT
            sm.*,
            p.name AS product_name,
            p.sku,
            w.name AS warehouse_name,
            sw.name AS source_warehouse_name,
            dw.name AS destination_warehouse_name
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        LEFT JOIN warehouses w ON sm.warehouse_id = w.id
        LEFT JOIN warehouses sw ON sm.source_warehouse_id = sw.id
        LEFT JOIN warehouses dw ON sm.destination_warehouse_id = dw.id
        WHERE sm.owner_id=%s
        ORDER BY sm.id DESC
        """,
        (current_user,)
    )
    movements = cursor.fetchall()
    return {"data": movements}


@router.get("/low-stock")
def get_low_stock_products(
    current_user: int = Depends(require_permission('stock.view'))
):
    cursor.execute(
        """
        SELECT * FROM products
        WHERE owner_id=%s AND track_inventory IS NOT FALSE
          AND stock <= COALESCE(low_stock_threshold, 10)
        ORDER BY stock ASC, name ASC
        """,
        (current_user,)
    )
    products = cursor.fetchall()
    return {"data": products}


# ─── Available Serials for Invoice Selection ──────────────────────────────────

@router.get("/serials/available")
def get_available_serials(
    product_id: int,
    warehouse_id: Optional[int] = None,
    current_user: int = Depends(require_permission('stock.view'))
):
    """Return available serials for a product in a warehouse (for manual selection during invoicing)."""
    try:
        with conn.cursor() as c:
            if warehouse_id:
                c.execute(
                    """
                    SELECT id, serial_number, created_at
                    FROM product_serials
                    WHERE owner_id=%s AND product_id=%s AND warehouse_id=%s AND status='available'
                    ORDER BY created_at ASC
                    """,
                    (current_user, product_id, warehouse_id),
                )
            else:
                # If no warehouse specified, get all available for this product
                c.execute(
                    """
                    SELECT ps.id, ps.serial_number, ps.created_at, ps.warehouse_id, w.name AS warehouse_name
                    FROM product_serials ps
                    LEFT JOIN warehouses w ON ps.warehouse_id = w.id
                    WHERE ps.owner_id=%s AND ps.product_id=%s AND ps.status='available'
                    ORDER BY ps.created_at ASC
                    """,
                    (current_user, product_id),
                )
            return {"data": c.fetchall()}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Available Batches for Invoice Selection ──────────────────────────────────

@router.get("/batches/available")
def get_available_batches(
    product_id: int,
    warehouse_id: Optional[int] = None,
    current_user: int = Depends(require_permission('stock.view'))
):
    """Return available batches with stock for a product (for manual allocation during invoicing)."""
    try:
        with conn.cursor() as c:
            if warehouse_id:
                c.execute(
                    """
                    SELECT id, batch_number, manufacture_date, expiry_date, quantity, purchase_price
                    FROM product_batches
                    WHERE owner_id=%s AND product_id=%s AND warehouse_id=%s AND quantity > 0
                    ORDER BY COALESCE(expiry_date, '9999-12-31') ASC, id ASC
                    """,
                    (current_user, product_id, warehouse_id),
                )
            else:
                c.execute(
                    """
                    SELECT pb.id, pb.batch_number, pb.manufacture_date, pb.expiry_date,
                           pb.quantity, pb.purchase_price, pb.warehouse_id, w.name AS warehouse_name
                    FROM product_batches pb
                    LEFT JOIN warehouses w ON pb.warehouse_id = w.id
                    WHERE pb.owner_id=%s AND pb.product_id=%s AND pb.quantity > 0
                    ORDER BY COALESCE(pb.expiry_date, '9999-12-31') ASC, pb.id ASC
                    """,
                    (current_user, product_id),
                )
            return {"data": c.fetchall()}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Stock Adjustments ────────────────────────────────────────────────────────

class StockAdjustmentPayload(BaseModel):
    product_id: int
    warehouse_id: Optional[int] = None
    adjustment_type: str = Field(..., pattern="^(increase|decrease)$")
    quantity: float = Field(..., gt=0)
    reason: str = Field(..., min_length=1)
    notes: Optional[str] = None


@router.post("/adjustments")
def create_stock_adjustment(
    payload: StockAdjustmentPayload,
    current_user: int = Depends(require_permission('stock.adjust'))
):
    """Manual stock adjustment with full audit trail. Blocks service products."""
    try:
        with conn.cursor() as c:
            # Validate product ownership
            c.execute("SELECT id, name, stock, track_inventory, cost_price FROM products WHERE id=%s AND owner_id=%s FOR UPDATE",
                      (payload.product_id, current_user))
            product = c.fetchone()
            if product is None:
                raise HTTPException(status_code=404, detail="Product not found")

            # Block service products from stock adjustments
            if product.get("track_inventory") is False:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product '{product['name']}' is a service product and does not track inventory"
                )

            # Resolve warehouse
            if payload.warehouse_id:
                c.execute("SELECT id, name FROM warehouses WHERE id=%s AND owner_id=%s",
                          (payload.warehouse_id, current_user))
                warehouse = c.fetchone()
                if warehouse is None:
                    raise HTTPException(status_code=404, detail="Warehouse not found")
            else:
                warehouse = get_main_warehouse(c, current_user)

            # Check sufficient stock for decrease
            from app.services.inventory import add_inbound_stock, deduct_outbound_stock
            if payload.adjustment_type == "decrease":
                if product["stock"] < payload.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot decrease stock by {payload.quantity}: only {product['stock']} available"
                    )
                stock_delta = -payload.quantity
                change_warehouse_stock(c, warehouse["id"], payload.product_id, -payload.quantity, prevent_negative=True)
                deduct_outbound_stock(c, current_user, payload.product_id, payload.quantity)
            else:
                stock_delta = payload.quantity
                change_warehouse_stock(c, warehouse["id"], payload.product_id, payload.quantity, prevent_negative=False)
                add_inbound_stock(c, current_user, payload.product_id, warehouse["id"], payload.quantity, product.get("cost_price", 0))

            # Update product stock
            c.execute(
                "UPDATE products SET stock = stock + %s WHERE id=%s AND owner_id=%s",
                (stock_delta, payload.product_id, current_user)
            )

            # Log stock movement
            actor = current_actual_user_id.get() or current_user
            record_stock_movement(
                c,
                current_user,
                payload.product_id,
                "In" if payload.adjustment_type == "increase" else "Out",
                payload.quantity,
                warehouse["name"],
                f"Adjustment: {payload.reason}",
                warehouse_id=warehouse["id"],
            )

            # Save adjustment record
            c.execute(
                """
                INSERT INTO stock_adjustments
                    (owner_id, product_id, warehouse_id, adjustment_type, quantity, reason, notes, adjusted_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (current_user, payload.product_id, warehouse["id"], payload.adjustment_type,
                 payload.quantity, payload.reason, payload.notes, actor),
            )
            adjustment = c.fetchone()
        conn.commit()
        log_action(current_user, actor, "stock_adjusted", "product", payload.product_id,
                   f"Stock {payload.adjustment_type}d by {payload.quantity}: {payload.reason}",
                   {"adjustment_type": payload.adjustment_type, "quantity": payload.quantity,
                    "reason": payload.reason, "warehouse": warehouse["name"]})
        return {"data": adjustment}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/adjustments")
def get_stock_adjustments(
    product_id: Optional[int] = None,
    current_user: int = Depends(require_permission('stock.view'))
):
    """List all stock adjustments for the organisation."""
    try:
        with conn.cursor() as c:
            if product_id:
                c.execute(
                    """
                    SELECT sa.*, p.name AS product_name, p.sku, w.name AS warehouse_name,
                           u.email AS adjusted_by_email
                    FROM stock_adjustments sa
                    JOIN products p ON sa.product_id = p.id
                    LEFT JOIN warehouses w ON sa.warehouse_id = w.id
                    LEFT JOIN users u ON sa.adjusted_by = u.id
                    WHERE sa.owner_id=%s AND sa.product_id=%s
                    ORDER BY sa.created_at DESC
                    """,
                    (current_user, product_id),
                )
            else:
                c.execute(
                    """
                    SELECT sa.*, p.name AS product_name, p.sku, w.name AS warehouse_name,
                           u.email AS adjusted_by_email
                    FROM stock_adjustments sa
                    JOIN products p ON sa.product_id = p.id
                    LEFT JOIN warehouses w ON sa.warehouse_id = w.id
                    LEFT JOIN users u ON sa.adjusted_by = u.id
                    WHERE sa.owner_id=%s
                    ORDER BY sa.created_at DESC
                    """,
                    (current_user,),
                )
            return {"data": c.fetchall()}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
