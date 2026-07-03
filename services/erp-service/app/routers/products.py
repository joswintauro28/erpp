from fastapi import APIRouter, HTTPException, Depends
from app.database import cursor, conn
from app.schemas.product import Product
from app.auth.permissions import require_permission
from app.services.audit import log_action
from app.services.inventory import sync_main_stock_for_product

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


@router.get("/")
def get_products(
    current_user: int = Depends(require_permission('products.view'))
):
    cursor.execute(
        """
        SELECT *,
        COALESCE(
            CASE 
                WHEN costing_method = 'fifo' THEN (
                    SELECT COALESCE(SUM(remaining_quantity * unit_cost), 0) 
                    FROM fifo_cost_lots 
                    WHERE product_id = products.id
                )
                ELSE (stock * cost_price)
            END, 
            0
        ) as inventory_value
        FROM products
        WHERE owner_id=%s
        ORDER BY id ASC
        """,
        (current_user,)
    )
    products = cursor.fetchall()
    return {"data": products}


@router.post("/")
def create_product(
    product: Product,
    current_user: int = Depends(require_permission('products.create'))
):
    cursor.execute(
        """
        INSERT INTO products
        (name, category, sku, price, cost_price, stock, low_stock_threshold,
         uses_batch_tracking, uses_serial_tracking, track_inventory, costing_method, owner_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING *
        """,
        (
            product.name,
            product.category,
            product.sku,
            product.price,
            product.cost_price,
            product.stock if product.track_inventory else 0,
            product.low_stock_threshold,
            product.uses_batch_tracking,
            product.uses_serial_tracking,
            product.track_inventory,
            product.costing_method,
            current_user,
        )
    )
    new_product = cursor.fetchone()
    # Only sync warehouse stock for inventory-tracked products
    if product.track_inventory:
        sync_main_stock_for_product(cursor, current_user, new_product["id"])

    conn.commit()
    log_action(
        current_user,
        current_user,
        "create",
        "product",
        new_product["id"],
        f"Product created: {new_product.get('name')}",
        {"product_name": new_product.get("name"), "sku": new_product.get("sku")},
    )
    return {"data": new_product}


@router.get("/{id}")
def get_product(
    id: int,
    current_user: int = Depends(require_permission('products.view'))
):
    cursor.execute(
        """
        SELECT * FROM products
        WHERE id=%s AND owner_id=%s
        """,
        (id, current_user)
    )
    product = cursor.fetchone()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"data": product}


@router.put("/{id}")
def update_product(
    id: int,
    product: Product,
    current_user: int = Depends(require_permission('products.edit'))
):
    cursor.execute(
        """
        UPDATE products
        SET name=%s,
            category=%s,
            sku=%s,
            price=%s,
            cost_price=%s,
            stock=%s,
            low_stock_threshold=%s,
            uses_batch_tracking=%s,
            uses_serial_tracking=%s,
            track_inventory=%s,
            costing_method=%s
        WHERE id=%s AND owner_id=%s
        RETURNING *
        """,
        (
            product.name,
            product.category,
            product.sku,
            product.price,
            product.cost_price,
            product.stock if product.track_inventory else 0,
            product.low_stock_threshold,
            product.uses_batch_tracking,
            product.uses_serial_tracking,
            product.track_inventory,
            product.costing_method,
            id,
            current_user,
        )
    )
    updated_product = cursor.fetchone()
    if updated_product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.track_inventory:
        sync_main_stock_for_product(cursor, current_user, id)
    conn.commit()
    log_action(
        current_user,
        current_user,
        "update",
        "product",
        id,
        f"Product updated: {updated_product.get('name')}",
        {"product_name": updated_product.get("name"), "sku": updated_product.get("sku")},
    )
    return {"data": updated_product}


@router.delete("/{id}")
def delete_product(
    id: int,
    current_user: int = Depends(require_permission('products.delete'))
):
    cursor.execute(
        """
        DELETE FROM products
        WHERE id=%s AND owner_id=%s
        RETURNING *
        """,
        (id, current_user)
    )
    deleted_product = cursor.fetchone()
    if deleted_product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    conn.commit()
    log_action(
        current_user,
        current_user,
        "delete",
        "product",
        id,
        f"Product deleted: {deleted_product.get('name')}",
        {"product_name": deleted_product.get("name"), "sku": deleted_product.get("sku")},
    )
    return {"message": "Product deleted"}
