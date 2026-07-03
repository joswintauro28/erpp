from decimal import Decimal

from fastapi import HTTPException


def as_decimal(value) -> Decimal:
    return Decimal(str(value or 0))


def require_positive_quantity(quantity):
    quantity = as_decimal(quantity)
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
    return quantity


def add_inbound_stock(cursor, owner_id: int, product_id: int, warehouse_id: int, quantity, unit_cost, purchase_order_id=None, batch_id=None):
    quantity = as_decimal(quantity)
    unit_cost = as_decimal(unit_cost)
    
    cursor.execute("SELECT stock, cost_price, costing_method FROM products WHERE id=%s AND owner_id=%s FOR UPDATE", (product_id, owner_id))
    product = cursor.fetchone()
    if not product:
        return
        
    costing_method = product.get("costing_method", "standard")
    current_stock = as_decimal(product.get("stock") or 0)
    current_cost = as_decimal(product.get("cost_price") or 0)
    
    if costing_method == "average":
        new_total_qty = current_stock + quantity
        if new_total_qty > 0:
            new_avg = ((current_stock * current_cost) + (quantity * unit_cost)) / new_total_qty
            cursor.execute("UPDATE products SET cost_price=%s WHERE id=%s", (new_avg, product_id))
            
    elif costing_method == "fifo":
        cursor.execute(
            """
            INSERT INTO fifo_cost_lots 
            (owner_id, product_id, warehouse_id, original_quantity, remaining_quantity, unit_cost, purchase_order_id, batch_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (owner_id, product_id, warehouse_id, quantity, quantity, unit_cost, purchase_order_id, batch_id)
        )


def deduct_outbound_stock(cursor, owner_id: int, product_id: int, quantity) -> Decimal:
    quantity = as_decimal(quantity)
    cursor.execute("SELECT cost_price, costing_method FROM products WHERE id=%s AND owner_id=%s", (product_id, owner_id))
    product = cursor.fetchone()
    if not product:
        return Decimal(0)
        
    costing_method = product.get("costing_method", "standard")
    
    if costing_method in ("standard", "average"):
        return quantity * as_decimal(product.get("cost_price") or 0)
        
    elif costing_method == "fifo":
        cursor.execute(
            """
            SELECT id, remaining_quantity, unit_cost
            FROM fifo_cost_lots
            WHERE product_id=%s AND owner_id=%s AND remaining_quantity > 0
            ORDER BY created_at ASC, id ASC
            FOR UPDATE
            """,
            (product_id, owner_id)
        )
        lots = cursor.fetchall()
        
        remaining = quantity
        total_cogs = Decimal(0)
        
        for lot in lots:
            if remaining <= 0:
                break
            lot_qty = as_decimal(lot["remaining_quantity"])
            deduct = min(lot_qty, remaining)
            lot_cost = as_decimal(lot["unit_cost"])
            
            total_cogs += (deduct * lot_cost)
            remaining -= deduct
            
            cursor.execute(
                "UPDATE fifo_cost_lots SET remaining_quantity = remaining_quantity - %s WHERE id=%s",
                (deduct, lot["id"])
            )
            
        if remaining > 0:
            last_cost = as_decimal(product.get("cost_price") or 0)
            if lots:
                last_cost = as_decimal(lots[-1]["unit_cost"])
            total_cogs += (remaining * last_cost)
            
        return total_cogs
    
    return Decimal(0)


def restore_outbound_stock(cursor, owner_id: int, product_id: int, warehouse_id: int, quantity, cogs_amount) -> None:
    quantity = as_decimal(quantity)
    cogs_amount = as_decimal(cogs_amount)
    
    cursor.execute("SELECT stock, cost_price, costing_method FROM products WHERE id=%s AND owner_id=%s FOR UPDATE", (product_id, owner_id))
    product = cursor.fetchone()
    if not product:
        return
        
    costing_method = product.get("costing_method", "standard")
    current_stock = as_decimal(product.get("stock") or 0)
    current_cost = as_decimal(product.get("cost_price") or 0)
    
    if costing_method == "average":
        new_total = current_stock + quantity
        if new_total > 0:
            new_avg = ((current_stock * current_cost) + cogs_amount) / new_total
            cursor.execute("UPDATE products SET cost_price=%s WHERE id=%s", (new_avg, product_id))
            
    elif costing_method == "fifo":
        unit_cost = cogs_amount / quantity if quantity > 0 else Decimal(0)
        cursor.execute(
            """
            INSERT INTO fifo_cost_lots 
            (owner_id, product_id, warehouse_id, original_quantity, remaining_quantity, unit_cost)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (owner_id, product_id, warehouse_id, quantity, quantity, unit_cost)
        )


def is_inventory_tracked(cursor, product_id: int, owner_id: int) -> bool:
    """Return True if this product should affect stock (track_inventory=True or column missing)."""
    cursor.execute(
        "SELECT track_inventory FROM products WHERE id=%s AND owner_id=%s",
        (product_id, owner_id),
    )
    row = cursor.fetchone()
    if row is None:
        return False
    val = row.get("track_inventory")
    # If column not yet migrated or null, default to True (safe fallback)
    return val is not False


def get_main_warehouse(cursor, owner_id: int):
    cursor.execute(
        """
        SELECT * FROM warehouses
        WHERE owner_id=%s AND code='MAIN'
        LIMIT 1
        """,
        (owner_id,),
    )
    warehouse = cursor.fetchone()
    if warehouse:
        return warehouse

    cursor.execute(
        """
        INSERT INTO warehouses (owner_id, name, code, status)
        VALUES (%s, 'Main Warehouse', 'MAIN', 'active')
        RETURNING *
        """,
        (owner_id,),
    )
    return cursor.fetchone()


def assert_warehouse_owned(cursor, warehouse_id: int, owner_id: int):
    cursor.execute(
        "SELECT * FROM warehouses WHERE id=%s AND owner_id=%s",
        (warehouse_id, owner_id),
    )
    warehouse = cursor.fetchone()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse


def assert_product_owned(cursor, product_id: int, owner_id: int, for_update: bool = False):
    suffix = " FOR UPDATE" if for_update else ""
    cursor.execute(
        f"SELECT * FROM products WHERE id=%s AND owner_id=%s{suffix}",
        (product_id, owner_id),
    )
    product = cursor.fetchone()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def ensure_warehouse_stock(cursor, warehouse_id: int, product_id: int, reorder_level=0):
    cursor.execute(
        """
        INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, reorder_level)
        VALUES (%s, %s, 0, %s)
        ON CONFLICT (warehouse_id, product_id) DO NOTHING
        """,
        (warehouse_id, product_id, reorder_level or 0),
    )


def set_warehouse_stock(cursor, warehouse_id: int, product_id: int, quantity, reorder_level=0):
    cursor.execute(
        """
        INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, reorder_level)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (warehouse_id, product_id)
        DO UPDATE SET quantity=EXCLUDED.quantity, reorder_level=EXCLUDED.reorder_level
        """,
        (warehouse_id, product_id, as_decimal(quantity), reorder_level or 0),
    )


def change_warehouse_stock(cursor, warehouse_id: int, product_id: int, delta, prevent_negative=True):
    delta = as_decimal(delta)
    ensure_warehouse_stock(cursor, warehouse_id, product_id)
    cursor.execute(
        """
        SELECT ws.*, p.name AS product_name
        FROM warehouse_stock ws
        JOIN products p ON p.id = ws.product_id
        WHERE ws.warehouse_id=%s AND ws.product_id=%s
        FOR UPDATE
        """,
        (warehouse_id, product_id),
    )
    row = cursor.fetchone()
    new_quantity = as_decimal(row["quantity"]) + delta
    if prevent_negative and new_quantity < 0:
        raise HTTPException(status_code=400, detail=f"Insufficient stock for {row['product_name']}")
    cursor.execute(
        """
        UPDATE warehouse_stock
        SET quantity=%s
        WHERE warehouse_id=%s AND product_id=%s
        """,
        (new_quantity, warehouse_id, product_id),
    )
    return new_quantity


def sync_main_stock_for_product(cursor, owner_id: int, product_id: int):
    main = get_main_warehouse(cursor, owner_id)
    cursor.execute(
        "SELECT stock, low_stock_threshold FROM products WHERE id=%s AND owner_id=%s",
        (product_id, owner_id),
    )
    product = cursor.fetchone()
    if product:
        set_warehouse_stock(
            cursor,
            main["id"],
            product_id,
            product.get("stock") or 0,
            product.get("low_stock_threshold") or 0,
        )


def record_stock_movement(
    cursor,
    owner_id: int,
    product_id: int,
    movement_type: str,
    quantity,
    location: str,
    reference: str,
    invoice_id=None,
    warehouse_id=None,
    source_warehouse_id=None,
    destination_warehouse_id=None,
):
    cursor.execute(
        """
        INSERT INTO stock_movements
            (product_id, invoice_id, movement_type, quantity, location, reference, owner_id,
             warehouse_id, source_warehouse_id, destination_warehouse_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            product_id,
            invoice_id,
            movement_type,
            quantity,
            location,
            reference,
            owner_id,
            warehouse_id,
            source_warehouse_id,
            destination_warehouse_id,
        ),
    )
    return cursor.fetchone()


def apply_fifo_batches(cursor, owner_id: int, product_id: int, warehouse_id: int, quantity):
    remaining = require_positive_quantity(quantity)
    cursor.execute(
        """
        SELECT uses_batch_tracking FROM products
        WHERE id=%s AND owner_id=%s
        """,
        (product_id, owner_id),
    )
    product = cursor.fetchone()
    if not product or not product.get("uses_batch_tracking"):
        return []

    cursor.execute(
        """
        SELECT *
        FROM product_batches
        WHERE owner_id=%s AND product_id=%s AND warehouse_id=%s AND COALESCE(quantity, 0) > 0
        ORDER BY expiry_date NULLS LAST, manufacture_date NULLS LAST, created_at ASC, id ASC
        FOR UPDATE
        """,
        (owner_id, product_id, warehouse_id),
    )
    batches = cursor.fetchall()
    deductions = []
    for batch in batches:
        if remaining <= 0:
            break
        available = as_decimal(batch["quantity"])
        deduct = min(available, remaining)
        cursor.execute(
            "UPDATE product_batches SET quantity = quantity - %s WHERE id=%s",
            (deduct, batch["id"]),
        )
        deductions.append({"batch_id": batch["id"], "batch_number": batch["batch_number"], "quantity": deduct})
        remaining -= deduct

    if remaining > 0:
        raise HTTPException(status_code=400, detail="Insufficient batch stock")
    return deductions


def mark_serials_sold(cursor, owner_id: int, product_id: int, warehouse_id: int, invoice_id: int, quantity):
    quantity = require_positive_quantity(quantity)
    if quantity != quantity.to_integral_value():
        raise HTTPException(status_code=400, detail="Serial-tracked quantities must be whole numbers")
    count = int(quantity)
    cursor.execute(
        """
        SELECT uses_serial_tracking FROM products
        WHERE id=%s AND owner_id=%s
        """,
        (product_id, owner_id),
    )
    product = cursor.fetchone()
    if not product or not product.get("uses_serial_tracking"):
        return []

    cursor.execute(
        """
        SELECT id, serial_number
        FROM product_serials
        WHERE owner_id=%s AND product_id=%s AND warehouse_id=%s AND status='available'
        ORDER BY created_at ASC, id ASC
        LIMIT %s
        FOR UPDATE
        """,
        (owner_id, product_id, warehouse_id, count),
    )
    serials = cursor.fetchall()
    if len(serials) < count:
        raise HTTPException(status_code=400, detail="Insufficient available serial numbers")

    serial_ids = [s["id"] for s in serials]
    cursor.execute(
        """
        UPDATE product_serials
        SET status='sold', sold_invoice_id=%s
        WHERE id = ANY(%s)
        """,
        (invoice_id, serial_ids),
    )
    return serials


def restore_sold_serials(cursor, owner_id: int, product_id: int, warehouse_id: int, invoice_id: int, quantity):
    quantity = require_positive_quantity(quantity)
    if quantity != quantity.to_integral_value():
        raise HTTPException(status_code=400, detail="Serial-tracked quantities must be whole numbers")
    count = int(quantity)
    cursor.execute(
        """
        SELECT id
        FROM product_serials
        WHERE owner_id=%s AND product_id=%s AND sold_invoice_id=%s AND status='sold'
        ORDER BY id DESC
        LIMIT %s
        FOR UPDATE
        """,
        (owner_id, product_id, invoice_id, count),
    )
    serials = cursor.fetchall()
    if not serials:
        return []
    serial_ids = [s["id"] for s in serials]
    cursor.execute(
        """
        UPDATE product_serials
        SET status='available', warehouse_id=%s, sold_invoice_id=NULL
        WHERE id = ANY(%s)
        """,
        (warehouse_id, serial_ids),
    )
    return serials


def mark_specific_serials_sold(cursor, owner_id: int, product_id: int, warehouse_id: int, invoice_id: int, serial_ids: list):
    """Mark explicitly chosen serials as sold. Validates ownership, warehouse, and availability."""
    if not serial_ids:
        return []
    count = len(serial_ids)
    # Validate all serials belong to product+warehouse+org and are available
    cursor.execute(
        """
        SELECT id, serial_number
        FROM product_serials
        WHERE owner_id=%s AND product_id=%s AND warehouse_id=%s AND status='available'
          AND id = ANY(%s)
        FOR UPDATE
        """,
        (owner_id, product_id, warehouse_id, serial_ids),
    )
    valid = cursor.fetchall()
    if len(valid) != count:
        invalid_count = count - len(valid)
        raise HTTPException(
            status_code=400,
            detail=f"{invalid_count} selected serial(s) are unavailable, wrong warehouse, or do not belong to this product",
        )
    cursor.execute(
        """
        UPDATE product_serials
        SET status='sold', sold_invoice_id=%s
        WHERE id = ANY(%s)
        """,
        (invoice_id, serial_ids),
    )
    return valid


def apply_specific_batch_allocations(cursor, owner_id: int, product_id: int, warehouse_id: int, allocations: list):
    """Deduct explicitly specified batch quantities. Returns list of {batch_id, quantity} deducted."""
    if not allocations:
        return []
    total_allocated = Decimal("0")
    results = []
    for alloc in allocations:
        batch_id = alloc["batch_id"]
        qty = as_decimal(alloc["quantity"])
        cursor.execute(
            """
            SELECT id, batch_number, quantity
            FROM product_batches
            WHERE id=%s AND owner_id=%s AND product_id=%s AND warehouse_id=%s
            FOR UPDATE
            """,
            (batch_id, owner_id, product_id, warehouse_id),
        )
        batch = cursor.fetchone()
        if batch is None:
            raise HTTPException(status_code=400, detail=f"Batch {batch_id} not found or wrong warehouse")
        available = as_decimal(batch["quantity"])
        if available < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Batch {batch['batch_number']}: requested {qty} but only {available} available",
            )
        cursor.execute(
            "UPDATE product_batches SET quantity = quantity - %s WHERE id=%s",
            (qty, batch_id),
        )
        results.append({"batch_id": batch_id, "batch_number": batch["batch_number"], "quantity": qty})
        total_allocated += qty
    return results


def restore_specific_batch_allocations(cursor, owner_id: int, product_id: int, warehouse_id: int, allocations: list):
    """Restore stock to specific batches on credit note / invoice reversal."""
    if not allocations:
        return []
    for alloc in allocations:
        batch_id = alloc["batch_id"]
        qty = as_decimal(alloc["quantity"])
        cursor.execute(
            """
            UPDATE product_batches
            SET quantity = quantity + %s
            WHERE id=%s AND owner_id=%s AND product_id=%s
            """,
            (qty, batch_id, owner_id, product_id),
        )
    return allocations
