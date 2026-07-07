import sys
sys.path.append('.')

"""
Seed script for ERP backend.

Creates complete demo data across all 20 tables:
  - Users (6) + Organization + Role assignments
  - Clients, leads, products, invoices, payments, credit/debit notes for EACH user
  - Per-user settings (company, branding, notification, workflow)

Usage:
    python -m scripts.seed

Idempotent: safe to re-run (skips existing data).
"""

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone

import sqlalchemy as sa

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

async def seed():
    from app.core.permissions import seed_system_permissions
    from app.core.security import hash_password
    from app.database import async_session_factory, engine
    from app.models import Base
    from app.models.client import Client, Lead
    from app.models.invoice import (
        CreditNote,
        DebitNote,
        Invoice,
        InvoiceItem,
        Payment,
    )
    from app.models.organization import (
        Organization,
        OrganizationMember,
        Role,
    )
    from app.models.product import Product
    from app.models.settings import (
        BrandingSetting,
        CompanySetting,
        NotificationSetting,
        WorkflowSettings,
    )
    from app.models.user import User
    from app.services.client import ClientService
    from app.services.invoice import InvoiceService
    from app.services.product import ProductService

    log.info("Ensuring all database tables exist …")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("Tables OK")

    async with async_session_factory() as db:
        log.info("Checking if users table already contains data …")
        existing_user = await db.execute(sa.select(User).limit(1))
        if existing_user.scalar_one_or_none():
            log.info("Users already exist — skipping seed")
            return

        # ------------------------------------------------------------------ #
        # 1. Seed system permissions + roles
        # ------------------------------------------------------------------ #
        log.info("Seeding permissions & roles …")
        await seed_system_permissions(db)
        await db.flush()

        # Load role map (name → id)
        roles_result = await db.execute(sa.select(Role))
        role_map: dict[str, Role] = {r.name: r for r in roles_result.scalars().all()}

        # ------------------------------------------------------------------ #
        # 2. Users
        # ------------------------------------------------------------------ #
        log.info("Creating users …")

        now = datetime.now(timezone.utc)
        today = date.today()

        users_data = [
            ("admin@datavex.com", "Admin@123!", "Alex Chen", True),
            ("sales@datavex.com", "Sales@123!", "Maya Patel", True),
            ("accounts@datavex.com", "Acc@123!", "Jordan Kim", True),
            ("inventory@datavex.com", "Inv@123!", "Sam Rivera", True),
            ("auditor@datavex.com", "Aud@123!", "Priya Sharma", True),
            ("admin@example.com", "password123", "System Admin", True),
        ]
        users: list[User] = []
        for email, pw, name, active in users_data:
            u = User(
                email=email,
                password_hash=hash_password(pw),
                full_name=name,
                is_active=active,
                last_login=now - timedelta(days=abs(hash(email) % 14 + 1)),
                created_at=now - timedelta(days=abs(hash(email) % 30 + 10)),
            )
            db.add(u)
            users.append(u)
        await db.flush()

        admin, sales, accounts, inventory_mgr, auditor, system_admin = users

        # ------------------------------------------------------------------ #
        # 3. Organization
        # ------------------------------------------------------------------ #
        log.info("Creating organization …")
        org = Organization(name="DATAVEX Industries", owner_id=admin.id, created_at=now - timedelta(days=90))
        db.add(org)
        await db.flush()

        # ------------------------------------------------------------------ #
        # 4. Organization Members
        # ------------------------------------------------------------------ #
        log.info("Assigning organization members …")
        member_data = [
            (admin.id, "Organization Owner"),
            (sales.id, "Sales Executive"),
            (accounts.id, "Accountant"),
            (inventory_mgr.id, "Inventory Manager"),
            (auditor.id, "Auditor"),
            (system_admin.id, "Organization Owner"),
        ]
        for uid, role_name in member_data:
            role = role_map.get(role_name)
            db.add(OrganizationMember(
                organization_id=org.id,
                user_id=uid,
                role_id=role.id if role else None,
                status="active",
                created_at=now - timedelta(days=abs(hash(str(uid)) % 80 + 10)),
            ))
        await db.flush()

        # Instantiate services
        client_svc = ClientService(db)
        product_svc = ProductService(db)
        inv_svc = InvoiceService(db)

        # ------------------------------------------------------------------ #
        # 5. Core Data Generation (Iterative per user)
        # ------------------------------------------------------------------ #
        log.info("Generating localized and realistic ERP datasets for each user …")
        for u in users:
            log.info(f" -> Seeding records for {u.email} ({u.full_name})")

            # 5a. Settings
            cs = CompanySetting(
                owner_id=u.id,
                company_name=f"{u.full_name}'s Enterprise LLC",
                email=u.email,
                phone="+91-80-4567-8900",
                address="42, Industrial Layout, Whitefield, Bangalore — 560066",
                state="Karnataka",
                gst_number="29AABCD1234E1Z5",
                website=f"https://{u.email.split('@')[0]}.datavex.com" if "datavex.com" in u.email else "https://example.com",
                industry="Industrial Automation & Electronics",
            )
            db.add(cs)
            
            bs = BrandingSetting(
                owner_id=u.id,
                logo_url="/brand/logo.svg",
                primary_color="#96282E" if "admin" in u.email else "#1E3A8A",
                accent_color="#CBA052" if "admin" in u.email else "#F59E0B",
                invoice_footer="Thank you for your business! Payment due within 15 days.",
                payment_terms="Net 15 — 2% discount if paid within 7 days",
            )
            db.add(bs)
            
            ns = NotificationSetting(
                owner_id=u.id,
                invoice_notifications=True,
                payment_reminders=True,
                low_stock_alerts=True,
                weekly_reports=True,
            )
            db.add(ns)
            
            ws = WorkflowSettings(
                owner_id=u.id,
                send_upcoming_invoice_reminders=True,
                send_overdue_reminders=True,
                notify_low_stock=True,
            )
            db.add(ws)

            # 5b. Clients (5 per user)
            user_clients = []
            clients_templates = [
                ("TechNova Solutions", "contact@technova.in", "Karnataka", "29AABCT1234A1Z5"),
                ("GreenLeaf Industries", "procure@greenleaf.in", "Maharashtra", "27AABCG1234A1Z5"),
                ("Apex Construction Co.", "info@apexconst.com", "Maharashtra", "27AABCA1234A1Z5"),
                ("BluePeak Software", "billing@bluepeak.dev", "Telangana", "36AABCB1234A1Z5"),
                ("Urban Spice Foods", "orders@urbanspice.in", "Tamil Nadu", "33AABCU1234A1Z5"),
            ]
            for c_name, c_email, c_state, c_gst in clients_templates:
                c = await client_svc.create_client(
                    owner_id=u.id,
                    name=f"{c_name} ({u.full_name.split()[0]})",
                    email=f"{u.email.split('@')[0]}.{c_email}",
                    phone="+91-80-4123-4567",
                    address=f"Office of {c_name}, Electronic City, Bangalore",
                    gst_number=c_gst,
                    state=c_state,
                    notes="Premium enterprise account",
                )
                c.created_at = now - timedelta(days=30)
                user_clients.append(c)
            await db.flush()

            # 5c. Leads (4 per user)
            leads_templates = [
                ("Quantum Dynamics", 450000.00, "Qualified", "Web lead - high interest"),
                ("Orion Analytics", 280000.00, "Contacted", "Awaiting follow-up call"),
                ("Zenith Healthcare", 800000.00, "Negotiation", "Requires custom API integrations"),
                ("Prism Digital Media", 550000.00, "Proposal", "Proposal sent - awaiting CFO approval"),
            ]
            for l_name, expected, status, notes in leads_templates:
                ld = Lead(
                    owner_id=u.id,
                    company_name=f"{l_name} ({u.full_name.split()[0]})",
                    email=f"info@{l_name.lower().replace(' ', '')}.in",
                    phone="+91-124-456-7890",
                    expected_value=expected,
                    status=status,
                    notes=notes,
                    created_at=now - timedelta(days=20),
                )
                db.add(ld)
            await db.flush()

            # 5d. Products (6 per user)
            user_products = []
            products_templates = [
                ("Sensor Kit v2", "SKU-IND-001", "Electronics", 12500.00, 8200.00, 48),
                ("Hydraulic Assembly", "SKU-HYD-002", "Machinery", 45000.00, 32000.00, 12),
                ("Titanium Fasteners", "SKU-TIT-003", "Hardware", 2500.00, 1400.00, 200),
                ("Circuit Board R3", "SKU-CIR-004", "Electronics", 8200.00, 5100.00, 75),
                ("Pressure Gauge", "SKU-DPG-010", "Instruments", 7200.00, 4500.00, 30),
                ("Conveyor Belt 2m", "SKU-CNV-012", "Machinery", 22000.00, 15000.00, 10),
            ]
            for p_name, sku, cat, price, cost, stock in products_templates:
                p = await product_svc.create_product(
                    owner_id=u.id,
                    name=p_name,
                    sku=f"{sku}-{u.full_name.split()[0][:3].upper()}",
                    category=cat,
                    price=price,
                    cost_price=cost,
                    stock=stock,
                    low_stock_threshold=5,
                    track_inventory=True,
                    uses_batch_tracking=False,
                    uses_serial_tracking=False,
                    costing_method="standard",
                )
                user_products.append(p)
            await db.flush()

            # 5e. Invoices (5 per user)
            user_invoices = []
            invoices_templates = [
                # (client_idx, status, issue_days_ago, due_days_ago, notes, items_list)
                (0, "paid", 30, 15, "PMC Q1 maintenance", [(0, 3), (3, 2)]),
                (1, "paid", 20, 5, "Initial tooling and supplies", [(1, 1), (2, 20)]),
                (2, "sent", 10, -5, "Phase 2 delivery and setup", [(0, 5), (4, 4)]),
                (3, "sent", 5, 10, "Maintenance hardware replenishment", [(2, 10), (3, 5)]),
                (4, "draft", 2, 28, "Custom quote draft - awaiting client review", [(1, 2), (5, 1)]),
            ]
            for idx, (cli_idx, status, issue_back, due_back, note_text, items_spec) in enumerate(invoices_templates):
                client = user_clients[cli_idx]
                issue = today - timedelta(days=issue_back)
                due = today - timedelta(days=due_back) if due_back >= 0 else today + timedelta(days=abs(due_back))
                
                inv = await inv_svc.create_invoice(
                    owner_id=u.id,
                    client_id=client.id,
                    invoice_number=f"INV-{u.full_name.split()[0][:3].upper()}-{(idx + 1):04d}",
                    status=status,
                    issue_date=issue,
                    due_date=due,
                    gst_treatment="intrastate",
                    place_of_supply=client.state,
                    notes=note_text,
                    items_data=[
                        {
                            "product_id": user_products[p_idx].id,
                            "description": f"{user_products[p_idx].name} x {qty}",
                            "quantity": qty,
                            "unit_price": user_products[p_idx].price,
                            "gst_rate": 18,
                        }
                        for p_idx, qty in items_spec
                    ]
                )
                inv.created_at = now - timedelta(days=issue_back)
                user_invoices.append(inv)
            await db.flush()

            # 5f. Payments (Fully pay invoice 0 and 1)
            for inv_idx in [0, 1]:
                inv = user_invoices[inv_idx]
                pmt = Payment(
                    owner_id=u.id,
                    invoice_id=inv.id,
                    amount=float(inv.total),
                    payment_method="Bank Transfer",
                    payment_date=inv.issue_date + timedelta(days=5),
                    reference_id=f"PAY-{inv.invoice_number}-FULL",
                    notes="Payment cleared successfully",
                    status="completed",
                    created_at=inv.created_at + timedelta(days=5),
                )
                db.add(pmt)
                inv.paid_amount = float(inv.total)
                inv.balance_due = 0.00

            # 5g. Credit Note for invoice 1
            cn = CreditNote(
                owner_id=u.id,
                invoice_id=user_invoices[1].id,
                credit_note_number=f"CN-{u.full_name.split()[0][:3].upper()}-001",
                amount=500.00,
                reason="Minor shipping adjustment",
                status="issued",
                issue_date=today - timedelta(days=15),
                created_at=now - timedelta(days=15),
            )
            db.add(cn)

            # 5h. Debit Note for invoice 2
            dn = DebitNote(
                owner_id=u.id,
                invoice_id=user_invoices[2].id,
                debit_note_number=f"DN-{u.full_name.split()[0][:3].upper()}-001",
                amount=1200.00,
                reason="Urgent freight delivery surcharge",
                status="issued",
                issue_date=today - timedelta(days=8),
                created_at=now - timedelta(days=8),
            )
            db.add(dn)

        # ------------------------------------------------------------------ #
        # 6. Commit & Summary
        # ------------------------------------------------------------------ #
        await db.commit()

        # Counts
        tables = {
            "users": User,
            "clients": Client,
            "leads": Lead,
            "products": Product,
            "invoices": Invoice,
            "invoice_items": InvoiceItem,
            "payments": Payment,
            "credit_notes": CreditNote,
            "debit_notes": DebitNote,
            "organizations": Organization,
            "organization_members": OrganizationMember,
            "company_settings": CompanySetting,
            "branding_settings": BrandingSetting,
            "notification_settings": NotificationSetting,
            "workflow_settings": WorkflowSettings,
        }
        total_rows = 0
        for label, model in tables.items():
            cnt = (await db.execute(sa.select(sa.func.count()).select_from(model))).scalar() or 0
            total_rows += cnt
            log.info("  %-24s %3s rows", label, cnt)

        log.info("━" * 40)
        log.info("Seeding complete — %d total rows inserted.", total_rows)

if __name__ == "__main__":
    asyncio.run(seed())
