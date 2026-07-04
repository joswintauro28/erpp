from app.database import conn


PHASE1_SQL = """
-- Client profile additions
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gst_number VARCHAR;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- User profile additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Lead CRM additions
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone VARCHAR;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_value NUMERIC DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_client_id INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;

-- Company settings additions used for GST-ready invoice output and Email Delivery
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS state VARCHAR;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS email VARCHAR;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS smtp_host VARCHAR;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS smtp_port INTEGER;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS smtp_username VARCHAR;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS smtp_password VARCHAR;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS smtp_from_email VARCHAR;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS razorpay_key_id VARCHAR;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS razorpay_key_secret VARCHAR;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS razorpay_webhook_secret VARCHAR;

-- Branding settings additions for Email Templates
ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS invoice_email_subject VARCHAR;
ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS invoice_email_body TEXT;

-- Invoice lifecycle, GST, and settlement additions
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_total NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_treatment VARCHAR DEFAULT 'intrastate';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS inventory_applied BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS warehouse_id INTEGER;
-- Assign main warehouse to existing invoices (deferred — handled in _seed_rbac after warehouse creation)

ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS stock NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS uses_batch_tracking BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS uses_serial_tracking BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS costing_method VARCHAR DEFAULT 'standard';
UPDATE products SET track_inventory = TRUE WHERE track_inventory IS NULL;
UPDATE products SET costing_method = 'standard' WHERE costing_method IS NULL;
-- Backfill cost_price from selling price for legacy products that have no cost_price set yet.
-- This gives a meaningful inventory valuation immediately. Users should edit products to set real cost prices.
UPDATE products SET cost_price = price WHERE COALESCE(cost_price, 0) = 0 AND COALESCE(price, 0) > 0;

CREATE TABLE IF NOT EXISTS fifo_cost_lots (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    original_quantity NUMERIC NOT NULL,
    remaining_quantity NUMERIC NOT NULL,
    unit_cost NUMERIC NOT NULL,
    purchase_order_id INTEGER,
    batch_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fifo_cost_lots_product_id ON fifo_cost_lots(product_id);
CREATE INDEX IF NOT EXISTS idx_fifo_cost_lots_warehouse_id ON fifo_cost_lots(warehouse_id);

ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS warehouse_id INTEGER;
ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS source_warehouse_id INTEGER;
ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS destination_warehouse_id INTEGER;

UPDATE invoices
SET invoice_number = COALESCE(invoice_number, 'INV-' || LPAD(id::TEXT, 5, '0')),
    issue_date = COALESCE(issue_date, created_at::DATE, CURRENT_DATE),
    subtotal = CASE WHEN COALESCE(subtotal, 0) = 0 THEN amount ELSE subtotal END,
    total = CASE WHEN COALESCE(total, 0) = 0 THEN amount ELSE total END,
    balance_due = CASE WHEN COALESCE(balance_due, 0) = 0 THEN GREATEST(amount - COALESCE(paid_amount, 0), 0) ELSE balance_due END
WHERE invoice_number IS NULL OR COALESCE(total, 0) = 0 OR COALESCE(balance_due, 0) = 0;

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    gst_rate NUMERIC NOT NULL DEFAULT 18,
    taxable_amount NUMERIC NOT NULL DEFAULT 0,
    cgst NUMERIC NOT NULL DEFAULT 0,
    sgst NUMERIC NOT NULL DEFAULT 0,
    igst NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cogs NUMERIC DEFAULT 0;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_product_id_fkey'
    ) THEN
        ALTER TABLE invoice_items
            ADD CONSTRAINT invoice_items_product_id_fkey
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
    END IF;
END $$;

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, gst_rate, taxable_amount, total)
SELECT id, 'Invoice total', 1, amount, 0, amount, amount
FROM invoices i
WHERE NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_id VARCHAR;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider VARCHAR DEFAULT 'manual';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS invoice_id INTEGER;
ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS payment_links (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    razorpay_link_id VARCHAR,
    short_url TEXT,
    amount NUMERIC NOT NULL,
    status VARCHAR DEFAULT 'created',
    reference_id VARCHAR,
    provider_payload JSONB,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    recipient VARCHAR NOT NULL,
    subject TEXT NOT NULL,
    status VARCHAR NOT NULL,
    error TEXT,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    quote_number VARCHAR,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    status VARCHAR DEFAULT 'draft',
    subtotal NUMERIC DEFAULT 0,
    cgst NUMERIC DEFAULT 0,
    sgst NUMERIC DEFAULT 0,
    igst NUMERIC DEFAULT 0,
    tax_total NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    amount NUMERIC,
    notes TEXT,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL
);

-- Ensure all columns exist if the table was previously created with fewer columns
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quote_number VARCHAR;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'draft';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cgst NUMERIC DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sgst NUMERIC DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS igst NUMERIC DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_total NUMERIC DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE quotations ALTER COLUMN amount DROP NOT NULL;

UPDATE quotations
SET quote_number = COALESCE(quote_number, 'QT-' || LPAD(id::TEXT, 5, '0'))
WHERE quote_number IS NULL;

CREATE TABLE IF NOT EXISTS quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    gst_rate NUMERIC NOT NULL DEFAULT 18,
    taxable_amount NUMERIC NOT NULL DEFAULT 0,
    cgst NUMERIC NOT NULL DEFAULT 0,
    sgst NUMERIC NOT NULL DEFAULT 0,
    igst NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Make existing ON CONFLICT(owner_id) settings endpoints reliable on old databases.
DELETE FROM company_settings a USING company_settings b WHERE a.owner_id = b.owner_id AND a.id > b.id;
DELETE FROM branding_settings a USING branding_settings b WHERE a.owner_id = b.owner_id AND a.id > b.id;
DELETE FROM notification_settings a USING notification_settings b WHERE a.owner_id = b.owner_id AND a.id > b.id;
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_owner_id_uidx ON company_settings(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS branding_settings_owner_id_uidx ON branding_settings(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS notification_settings_owner_id_uidx ON notification_settings(owner_id);

CREATE TABLE IF NOT EXISTS ai_conversations (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR DEFAULT 'New Conversation',
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    user_id INTEGER,
    action VARCHAR NOT NULL,
    entity_type VARCHAR NOT NULL,
    entity_id VARCHAR,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_owner_id ON audit_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warehouses_owner_id ON warehouses(owner_id);

CREATE TABLE IF NOT EXISTS warehouse_stock (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0,
    reorder_level NUMERIC DEFAULT 0,
    UNIQUE(warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse_id ON warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product_id ON warehouse_stock(product_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER,
    supplier_id INTEGER,
    po_number VARCHAR(100),
    status VARCHAR(50),
    expected_date DATE,
    notes TEXT,
    total NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_owner_id ON purchase_orders(owner_id);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity NUMERIC,
    unit_cost NUMERIC,
    total NUMERIC
);

ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS received_quantity NUMERIC DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON purchase_order_items(product_id);

CREATE TABLE IF NOT EXISTS product_batches (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER,
    product_id INTEGER REFERENCES products(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    batch_number VARCHAR(100),
    manufacture_date DATE,
    expiry_date DATE,
    quantity NUMERIC,
    purchase_price NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_batches_owner_id ON product_batches(owner_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_warehouse_id ON product_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON product_batches(expiry_date);

CREATE TABLE IF NOT EXISTS product_serials (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER,
    product_id INTEGER REFERENCES products(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    serial_number VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available',
    sold_invoice_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_serials_owner_id ON product_serials(owner_id);
CREATE INDEX IF NOT EXISTS idx_product_serials_product_id ON product_serials(product_id);
CREATE INDEX IF NOT EXISTS idx_product_serials_warehouse_id ON product_serials(warehouse_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_serials_owner_serial_uidx ON product_serials(owner_id, serial_number);

CREATE TABLE IF NOT EXISTS recurring_invoices (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly','monthly','quarterly','yearly')),
    start_date DATE NOT NULL,
    next_run_date DATE NOT NULL,
    end_date DATE NULL,
    auto_email BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_generated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_owner_id ON recurring_invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_run_date ON recurring_invoices(next_run_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_is_active ON recurring_invoices(is_active);

CREATE TABLE IF NOT EXISTS workflow_logs (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    workflow_type VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_owner_id ON workflow_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_type_date ON workflow_logs(workflow_type, executed_at);

ALTER TABLE workflow_logs ADD COLUMN IF NOT EXISTS quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE;
ALTER TABLE workflow_logs ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE workflow_logs ALTER COLUMN invoice_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS workflow_settings (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    send_upcoming_invoice_reminders BOOLEAN DEFAULT TRUE,
    upcoming_reminder_days INTEGER DEFAULT 3,
    send_due_today_reminders BOOLEAN DEFAULT TRUE,
    send_overdue_reminders BOOLEAN DEFAULT TRUE,
    overdue_reminder_frequency_days INTEGER DEFAULT 7,
    auto_email_recurring_invoices BOOLEAN DEFAULT TRUE,
    notify_low_stock BOOLEAN DEFAULT TRUE,
    send_low_stock_email BOOLEAN DEFAULT FALSE,
    send_quotation_expiry_reminders BOOLEAN DEFAULT TRUE,
    send_quotation_expiry_email BOOLEAN DEFAULT TRUE,
    quotation_expiry_days INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    restock_items BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'issued',
    issue_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_owner_id ON credit_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);

CREATE TABLE IF NOT EXISTS credit_note_items (
    id SERIAL PRIMARY KEY,
    credit_note_id INTEGER NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    invoice_item_id INTEGER NOT NULL REFERENCES invoice_items(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name VARCHAR(255),
    original_quantity NUMERIC(12,2) NOT NULL,
    returned_quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    line_total NUMERIC(12,2) NOT NULL
);

ALTER TABLE credit_note_items ADD COLUMN IF NOT EXISTS cogs NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_credit_note_items_cn_id ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product_id ON credit_note_items(product_id);

CREATE TABLE IF NOT EXISTS debit_notes (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    debit_note_number VARCHAR(50) UNIQUE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'issued',
    issue_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_debit_notes_owner_id ON debit_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_invoice_id ON debit_notes(invoice_id);

-- RBAC & Team Management Additions
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    status VARCHAR DEFAULT 'active',
    invited_by INTEGER REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role_id ON organization_members(role_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Client Portal Additions
CREATE TABLE IF NOT EXISTS client_portal_access (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR DEFAULT 'active',
    last_login TIMESTAMP,
    invited_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, user_id)
);

CREATE TABLE IF NOT EXISTS client_portal_invitations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    token VARCHAR UNIQUE NOT NULL,
    status VARCHAR DEFAULT 'pending',
    expires_at TIMESTAMP,
    accepted_at TIMESTAMP,
    invited_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    gst_number VARCHAR(100),
    address TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_owner_id ON suppliers(owner_id);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increase','decrease')),
    quantity NUMERIC NOT NULL,
    reason VARCHAR(255) NOT NULL,
    notes TEXT,
    adjusted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_owner_id ON stock_adjustments(owner_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_id ON stock_adjustments(product_id);

-- Phase 2: Add warehouse_id to invoices (backfill with main warehouse per owner)
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id);

-- Clean up duplicate organization members and ensure unique constraint is present
DELETE FROM organization_members a 
USING organization_members b 
WHERE a.organization_id = b.organization_id 
  AND a.user_id = b.user_id 
  AND a.id > b.id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_org_user_unique'
    ) THEN
        ALTER TABLE organization_members
            ADD CONSTRAINT organization_members_org_user_unique
            UNIQUE (organization_id, user_id);
    END IF;
END $$;
"""


def _seed_rbac():
    with conn.cursor() as cursor:
        # 1. Seed Permissions
        permissions = [
            ("clients.view", "View Clients", "clients"), ("clients.create", "Create Clients", "clients"), 
            ("clients.edit", "Edit Clients", "clients"), ("clients.delete", "Delete Clients", "clients"),
            ("clients.manage", "Manage Clients", "clients"),
            ("invoices.view", "View Invoices", "invoices"), ("invoices.create", "Create Invoices", "invoices"),
            ("invoices.edit", "Edit Invoices", "invoices"), ("invoices.delete", "Delete Invoices", "invoices"), 
            ("invoices.send", "Send Invoices", "invoices"),
            ("quotations.view", "View Quotations", "quotations"), ("quotations.create", "Create Quotations", "quotations"), 
            ("quotations.edit", "Edit Quotations", "quotations"), ("quotations.delete", "Delete Quotations", "quotations"),
            ("products.view", "View Products", "products"), ("products.create", "Create Products", "products"), 
            ("products.edit", "Edit Products", "products"), ("products.delete", "Delete Products", "products"),
            ("stock.view", "View Stock", "inventory"), ("stock.manage", "Manage Stock", "inventory"),
            ("inventory.warehouses.view", "View Warehouses", "inventory"),
            ("inventory.warehouses.manage", "Manage Warehouses", "inventory"),
            ("purchase_orders.view", "View Purchase Orders", "purchase_orders"),
            ("purchase_orders.create", "Create Purchase Orders", "purchase_orders"),
            ("purchase_orders.manage", "Manage Purchase Orders", "purchase_orders"),
            ("inventory.batch.manage", "Manage Batches", "inventory"),
            ("inventory.serial.manage", "Manage Serials", "inventory"),
            ("expenses.view", "View Expenses", "expenses"), ("expenses.create", "Create Expenses", "expenses"), 
            ("expenses.edit", "Edit Expenses", "expenses"),
            ("payments.view", "View Payments", "payments"), ("payments.create", "Create Payments", "payments"),
            ("payments.edit", "Edit Payments", "payments"), ("payments.delete", "Delete Payments", "payments"),
            ("reports.view", "View Reports", "reports"),
            ("audit_logs.view", "View Audit Logs", "audit"),
            ("workflow.manage", "Manage Workflow", "workflow"),
            ("settings.manage", "Manage Settings", "settings"),
            ("users.manage", "Manage Users", "users"),
            ("suppliers.view", "View Suppliers", "suppliers"),
            ("suppliers.create", "Create Suppliers", "suppliers"),
            ("suppliers.manage", "Manage Suppliers", "suppliers"),
            ("inventory.valuation.view", "View Inventory Valuation", "inventory"),
            ("stock.adjust", "Adjust Stock", "inventory")
        ]
        for p in permissions:
            cursor.execute("INSERT INTO permissions (code, name, module) VALUES (%s, %s, %s) ON CONFLICT (code) DO NOTHING", p)

        # 2. Seed Roles
        roles = [
            ("Organization Owner", "Full administrative access", True),
            ("Accountant", "Access to invoices, payments, expenses, reports", True),
            ("Sales Executive", "Access to clients, quotations, invoices", True),
            ("Inventory Manager", "Access to products and stock", True),
            ("Auditor", "Read-only access across the platform", True),
            ("Employee", "Basic employee access", True),
            ("Client Portal User", "External client portal access", True)
        ]
        for r in roles:
            cursor.execute("INSERT INTO roles (name, description, is_system_role) VALUES (%s, %s, %s) ON CONFLICT (name) DO NOTHING", r)

        # 3. Map Role Permissions
        cursor.execute("SELECT id, name FROM roles")
        roles_map = {r['name']: r['id'] for r in cursor.fetchall()}
        
        cursor.execute("SELECT id, code FROM permissions")
        perms_map = {p['code']: p['id'] for p in cursor.fetchall()}

        def assign_perms(role_name, perm_codes):
            role_id = roles_map.get(role_name)
            if not role_id: return
            for code in perm_codes:
                perm_id = perms_map.get(code)
                if perm_id:
                    cursor.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (role_id, perm_id))

        all_perms = list(perms_map.keys())
        assign_perms("Organization Owner", all_perms)
        assign_perms("Accountant", [p for p in all_perms if p.startswith(("invoices.", "payments.", "expenses.", "reports.", "clients.view")) or p in ("products.view", "stock.view", "inventory.warehouses.view", "purchase_orders.view", "suppliers.view", "inventory.valuation.view")])
        assign_perms("Sales Executive", [p for p in all_perms if p.startswith(("clients.", "quotations.", "invoices.")) and not p.endswith(".delete")])
        assign_perms("Inventory Manager", [p for p in all_perms if p.startswith(("products.", "stock.", "inventory.", "purchase_orders.", "suppliers."))])
        assign_perms("Auditor", [p for p in all_perms if p.endswith(".view") or p == "inventory.valuation.view"])
        assign_perms("Employee", ["clients.view", "products.view"])
        assign_perms("Client Portal User", ["invoices.view", "payments.view"])

        # 4. Migrate Existing Users
        cursor.execute("SELECT id, email FROM users")
        existing_users = cursor.fetchall()
        owner_role_id = roles_map.get("Organization Owner")
        
        for u in existing_users:
            uid = u['id']
            # Create organization ensuring id matches user_id
            cursor.execute("INSERT INTO organizations (id, name, owner_id) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING", 
                          (uid, f"{u['email'].split('@')[0]}'s Organization", uid))
            # Assign user to organization as owner
            cursor.execute("""
                INSERT INTO organization_members (organization_id, user_id, role_id) 
                VALUES (%s, %s, %s) ON CONFLICT (organization_id, user_id) DO NOTHING
            """, (uid, uid, owner_role_id))


def _ensure_main_warehouses():
    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO warehouses (owner_id, name, code, status)
            SELECT o.id, 'Main Warehouse', 'MAIN', 'active'
            FROM organizations o
            WHERE NOT EXISTS (
                SELECT 1 FROM warehouses w
                WHERE w.owner_id = o.id AND w.code = 'MAIN'
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, reorder_level)
            SELECT w.id, p.id, COALESCE(p.stock, 0), COALESCE(p.low_stock_threshold, 0)
            FROM warehouses w
            JOIN products p ON p.owner_id = w.owner_id
            WHERE w.code = 'MAIN'
            ON CONFLICT (warehouse_id, product_id) DO NOTHING
            """
        )
        # Backfill existing invoices with main warehouse
        cursor.execute(
            """
            UPDATE invoices i
            SET warehouse_id = w.id
            FROM warehouses w
            WHERE w.owner_id = i.owner_id AND w.code = 'MAIN'
              AND i.warehouse_id IS NULL
            """
        )



def _backfill_invoice_warehouse_id():
    """Set warehouse_id on existing invoices that don't have one yet (uses MAIN warehouse per org)."""
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE invoices i
            SET warehouse_id = w.id
            FROM warehouses w
            WHERE w.owner_id = i.owner_id
              AND w.code = 'MAIN'
              AND i.warehouse_id IS NULL
        """)
    conn.commit()


def ensure_phase1_schema():
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SET LOCAL lock_timeout = '10s'")
            cursor.execute("SET LOCAL statement_timeout = '60s'")
            cursor.execute(PHASE1_SQL)
        _seed_rbac()
        _ensure_main_warehouses()
        _backfill_invoice_warehouse_id()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
