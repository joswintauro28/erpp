# Inventory Automation Test Plan

Use an authenticated API client against a test database. Record the starting product stock before each case.

## Invoice Create

1. Create a product with `stock = 20` and `low_stock_threshold = 10`.
2. Create an invoice with one item using that `product_id` and `quantity = 2`.
3. Verify `products.stock = 18`.
4. Verify one `stock_movements` row exists with `movement_type = 'Out'`, `quantity = 2`, and `invoice_id` equal to the created invoice id.

## Insufficient Stock

1. Create a product with `stock = 1`.
2. Create an invoice item using that `product_id` and `quantity = 2`.
3. Verify the API returns `400`.
4. Verify product stock is still `1`.

## Invoice Update: Increase Quantity

1. Start with an invoice that deducted `quantity = 2`.
2. Update the same product line to `quantity = 5`.
3. Verify only `3` more units are deducted.
4. Verify a second `stock_movements` row exists with `movement_type = 'Out'` and `quantity = 3`.

## Invoice Update: Decrease Quantity

1. Start with an invoice that deducted `quantity = 5`.
2. Update the same product line to `quantity = 2`.
3. Verify `3` units are restored.
4. Verify a reversing `stock_movements` row exists with `movement_type = 'In'` and `quantity = 3`.

## Invoice Delete

1. Start with an invoice that deducted `quantity = 2`.
2. Delete the invoice.
3. Verify `2` units are restored to the product.
4. Verify a reversing `stock_movements` row exists with `movement_type = 'In'`, `quantity = 2`, and the deleted invoice id in `invoice_id`.

## Invoice Status Cancelled

1. Start with an invoice that deducted stock.
2. Set invoice status to `cancelled`.
3. Verify stock is restored once.
4. Repeat the same status update and verify stock does not change again.

## Payment Recording

1. Record a payment against an inventory-backed invoice.
2. Verify product stock does not change.
3. Verify no new `stock_movements` rows are created.

## Low Stock

1. Set a product `stock` at or below `low_stock_threshold`.
2. Call `GET /stock/low-stock`.
3. Verify the product is returned.
4. Increase stock above threshold and verify it is no longer returned.
