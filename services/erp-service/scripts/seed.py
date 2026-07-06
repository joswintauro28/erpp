import sys
sys.path.append('.')

"""
Seed script for ERP backend.

Creates complete demo data across all 20 tables:
  - Users (5) + Organization + Role assignments
  - 10 clients with GST data
  - 5 leads in various stages
  - 12 products with stock/costing
  - 10 invoices with line items (varied statuses)
  - Payments, credit notes, debit notes
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

# ---------------------------------------------------------------------------
# Imports -- lazy within main async function to avoid circular issues
# ---------------------------------------------------------------------------

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
        Invitation,
        Organization,
        OrganizationMember,
        Permission,
        Role,
        RolePermission,
    )
    from app.models.product import Product
    from app.models.refresh_token import RefreshToken
    from app.models.settings import (
        BrandingSetting,
        CompanySetting,
        NotificationSetting,
        WorkflowSettings,
    )
    from app.models.user import User
    from app.repositories.user import UserRepository
    from app.services.client import ClientService
    from app.services.invoice import InvoiceService
    from app.services.product import ProductService

    # ------------------------------------------------------------------ #
    # 1. Create tables (if not already present via alembic)
    # ------------------------------------------------------------------ #
    log.info("Ensuring all metadata tables exist …")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("Tables OK")

    async with async_session_factory() as db:
        # ------------------------------------------------------------------ #
        # 2. Seed system permissions + roles
        # ------------------------------------------------------------------ #
        log.info("Seeding permissions & roles …")
        await seed_system_permissions(db)
        await db.flush()

        # Load role map (name → id)
        roles_result = await db.execute(sa.select(Role))
        role_map: dict[str, Role] = {r.name: r for r in roles_result.scalars().all()}

        # ------------------------------------------------------------------ #
        # 3. Users
        # ------------------------------------------------------------------ #
        log.info("Creating users …")

        existing_user = await db.execute(sa.select(User).limit(1))
        if existing_user.scalar_one_or_none():
            log.info("Users already exist — skipping seed")
            return

        now = datetime.now(timezone.utc)
        today = date.today()

        users_data = [
            ("admin@datavex.com", "Admin@123!", "Alex Chen", True),
            ("sales@datavex.com", "Sales@123!", "Maya Patel", True),
            ("accounts@datavex.com", "Acc@123!", "Jordan Kim", True),
            ("inventory@datavex.com", "Inv@123!", "Sam Rivera", True),
            ("auditor@datavex.com", "Aud@123!", "Priya Sharma", True),
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

        admin, sales, accounts, inventory_mgr, auditor = users

        # ------------------------------------------------------------------ #
        # 4. Organization
        # ------------------------------------------------------------------ #
        log.info("Creating organization …")
        org = Organization(name="DATAVEX Industries", owner_id=admin.id, created_at=now - timedelta(days=90))
        db.add(org)
        await db.flush()

        # ------------------------------------------------------------------ #
        # 5. Organization Members
        # ------------------------------------------------------------------ #
        log.info("Assigning organization members …")
        member_data = [
            (admin.id, "Organization Owner"),
            (sales.id, "Sales Executive"),
            (accounts.id, "Accountant"),
            (inventory_mgr.id, "Inventory Manager"),
            (auditor.id, "Auditor"),
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

        # ------------------------------------------------------------------ #
        # 6. Clients  (10 — Indian GST)
        # ------------------------------------------------------------------ #
        log.info("Creating clients …")
        clients_data = [
            ("TechNova Solutions", "contact@technova.in", "+91-80-4123-4567",
             "42, Electronic City Phase I, Bangalore", "29AABCT1234A1Z5", "Karnataka"),
            ("GreenLeaf Industries", "procure@greenleaf.in", "+91-22-6789-0123",
             "15, MIDC Andheri East, Mumbai", "27AABCG1234A1Z5", "Maharashtra"),
            ("Apex Construction Co.", "info@apexconst.com", "+91-20-2634-8901",
             "88, Baner Road, Pune", "27AABCA1234A1Z5", "Maharashtra"),
            ("BluePeak Software", "billing@bluepeak.dev", "+91-40-4455-6677",
             "7A, Hitech City, Hyderabad", "36AABCB1234A1Z5", "Telangana"),
            ("Urban Spice Foods", "orders@urbanspice.in", "+91-44-2876-5432",
             "201, Mount Road, Chennai", "33AABCU1234A1Z5", "Tamil Nadu"),
            ("SilverOak Hospital", "admin@silveroakhosp.com", "+91-11-4987-6543",
             "55, Lajpat Nagar, New Delhi", "07AABCS1234A1Z5", "Delhi"),
            ("CloudBase IT Services", "accounts@cloudbase.io", "+91-80-3322-1144",
             "12, Whitefield Main Road, Bangalore", "29AABCC1234A1Z5", "Karnataka"),
            ("Radiant Motors", "parts@radiantmotors.in", "+91-79-2658-9900",
             "3, SG Highway, Ahmedabad", "24AABCR1234A1Z5", "Gujarat"),
            ("Sapphire Hotels & Resorts", "procurement@sapphire.in", "+91-141-402-3344",
             "22, MI Road, Jaipur", "08AABCS1234A1Z5", "Rajasthan"),
            ("Golden Harvest Agro", "info@goldenagro.in", "+91-522-406-7788",
             "19, Hazratganj, Lucknow", "09AABCG1234A1Z5", "Uttar Pradesh"),
        ]
        client_svc = ClientService(db)
        clients: list[Client] = []
        for name, email, phone, addr, gst, state in clients_data:
            c = await client_svc.create_client(
                owner_id=admin.id,
                name=name,
                email=email,
                phone=phone,
                address=addr,
                gst_number=gst,
                state=state,
                notes=f"Client since {today.year}",
            )
            # backdate created_at for realistic timeline
            c.created_at = now - timedelta(days=abs(hash(name) % 60 + 15))
            clients.append(c)
        await db.flush()

        # ------------------------------------------------------------------ #
        # 7. Leads  (5)
        # ------------------------------------------------------------------ #
        log.info("Creating leads …")
        leads_data = [
            ("Quantum Dynamics", "hello@quantumdynamics.in", "+91-124-456-7890",
             4_50_000.00, "New", "Initial inquiry via website — interested in automation suite"),
            ("Orion Analytics", "sales@orionanalytics.com", "+91-33-4067-8901",
             2_80_000.00, "Contacted", "Follow-up call scheduled for next week"),
            ("Zenith Healthcare", "info@zenithhealth.in", "+91-22-6781-2345",
             8_00_000.00, "Qualified", "Requires custom integration with existing EHR system"),
            ("Prism Digital Media", "partners@prismdigital.in", "+91-80-4678-9012",
             5_50_000.00, "Proposal", "Proposal sent — awaiting approval from CFO"),
            ("FusionWorks Engineering", "connect@fusionworks.in", "+91-20-2684-1234",
             12_00_000.00, "Negotiation", "Negotiating annual maintenance contract terms"),
        ]
        for name, email, phone, expected, status, notes in leads_data:
            ld = Lead(
                owner_id=sales.id,
                name=name,
                email=email,
                phone=phone,
                expected_value=expected,
                status=status,
                notes=notes,
                created_at=now - timedelta(days=abs(hash(name) % 45 + 5)),
            )
            db.add(ld)
        await db.flush()

        # ------------------------------------------------------------------ #
        # 8. Products  (12)
        # ------------------------------------------------------------------ #
        log.info("Creating products …")
        products_data = [
            ("Industrial Sensor Kit", "SKU-IND-001", "Electronics", 12_500.00, 8_200.00,
             48, 10, True, False, False),
            ("Hydraulic Pump Assembly", "SKU-HYD-002", "Machinery", 45_000.00, 32_000.00,
             12, 5, True, False, False),
            ("Titanium Fastener Set (M8 x 50)", "SKU-TIT-003", "Hardware", 2_500.00, 1_400.00,
             200, 50, True, False, False),
            ("Circuit Board — Rev 3.0", "SKU-CIR-004", "Electronics", 8_200.00, 5_100.00,
             75, 15, True, True, True),
            ("Steel Roller Bearing (6205-2RS)", "SKU-STL-005", "Machinery", 3_800.00, 2_200.00,
             150, 30, True, False, False),
            ("Copper Wire Spool — 100m", "SKU-CPR-006", "Raw Material", 6_500.00, 4_100.00,
             40, 10, True, False, False),
            ("LED Panel Light — 48W", "SKU-LED-007", "Electrical", 1_800.00, 950.00,
             90, 20, True, False, False),
            ("Pneumatic Cylinder — 100mm Stroke", "SKU-PNM-008", "Machinery", 15_000.00, 9_800.00,
             25, 5, True, True, False),
            ("Rubber Seal Kit (Universal)", "SKU-RBR-009", "Hardware", 750.00, 380.00,
             300, 100, True, False, False),
            ("Digital Pressure Gauge — 0-10 Bar", "SKU-DPG-010", "Instruments", 7_200.00, 4_500.00,
             30, 8, True, False, False),
            ("Aluminium Sheet — 4ft x 8ft x 2mm", "SKU-ALM-011", "Raw Material", 3_200.00, 2_000.00,
             60, 15, True, False, False),
            ("Conveyor Belt — 2m x 300mm", "SKU-CNV-012", "Machinery", 22_000.00, 15_000.00,
             10, 3, True, False, False),
        ]
        product_svc = ProductService(db)
        products: list[Product] = []
        for name, sku, cat, price, cost, stock, threshold, track, batch, serial in products_data:
            p = await product_svc.create_product(
                owner_id=admin.id,
                name=name,
                sku=sku,
                category=cat,
                price=price,
                cost_price=cost,
                stock=stock,
                low_stock_threshold=threshold,
                track_inventory=track,
                uses_batch_tracking=batch,
                uses_serial_tracking=serial,
                costing_method="standard",
            )
            products.append(p)
        await db.flush()

        # ------------------------------------------------------------------ #
        # 9. Invoices  (10 — varied statuses, dates, GST)
        # ------------------------------------------------------------------ #
        log.info("Creating invoices …")
        inv_svc = InvoiceService(db)

        def mkdate(days_ago: int) -> date:
            return today - timedelta(days=days_ago)

        def mkdt(days_ago: int) -> datetime:
            return now - timedelta(days=days_ago)

        invoices_data = [
            # (client_idx, owner, status, issue_days_ago, due_days_ago, gst_treatment, place, notes, items)
            # --- PAID invoices (1-3) ---
            (0, admin, "paid", 60, 30, "intrastate", "Karnataka",
             "Annual maintenance contract Q1",
             [(products[0], 5, 12_500, 18), (products[3], 3, 8_200, 18)]),

            (4, admin, "paid", 45, 15, "intrastate", "Tamil Nadu",
             "Kitchen equipment upgrade — Phase 1",
             [(products[7], 2, 15_000, 18), (products[2], 50, 2_500, 18),
              (products[11], 1, 22_000, 18)]),

            (1, admin, "paid", 50, 20, "intrastate", "Maharashtra",
             "Industrial sensor deployment for factory line #3",
             [(products[0], 10, 12_500, 18), (products[5], 5, 6_500, 18),
              (products[9], 8, 7_200, 18)]),

            # --- SENT (not yet paid, within due date) ---
            (6, admin, "sent", 10, 20, "intrastate", "Karnataka",
             "IT infrastructure hardware order",
             [(products[3], 8, 8_200, 18), (products[6], 20, 1_800, 18)]),

            # --- OVERDUE (sent but due date passed) ---
            (3, admin, "sent", 40, -5, "interstate", "Telangana",
             "Server room equipment — interstate supply",
             [(products[0], 6, 12_500, 18), (products[4], 20, 3_800, 18),
              (products[5], 10, 6_500, 18)]),

            # --- DRAFT (not yet issued) ---
            (2, admin, "draft", 3, 25, "intrastate", "Maharashtra",
             "Construction hardware bulk order (pending approval)",
             [(products[2], 100, 2_500, 18), (products[8], 50, 750, 18)]),

            # --- PARTIALLY PAID ---
            (8, admin, "sent", 25, 5, "interstate", "Rajasthan",
             "Hotel automation system — interstate supply",
             [(products[0], 15, 12_500, 18), (products[7], 5, 15_000, 18),
              (products[11], 3, 22_000, 18)]),

            # --- CANCELLED ---
            (9, admin, "cancelled", 70, 40, "intrastate", "Uttar Pradesh",
             "Cancelled — client requested revised pricing",
             [(products[1], 1, 45_000, 18)]),

            # --- OVERDUE (2nd) ---
            (7, admin, "sent", 55, -10, "interstate", "Gujarat",
             "Factory machinery — interstate delivery",
             [(products[1], 2, 45_000, 18), (products[4], 30, 3_800, 18)]),

            # --- PAID (recent) ---
            (5, admin, "paid", 7, 14, "intrastate", "Delhi",
             "Hospital electrical maintenance supplies",
             [(products[6], 25, 1_800, 18), (products[9], 5, 7_200, 18)]),
        ]

        created_invoices: list[Invoice] = []
        for idx, (cli_idx, owner, status, issue_back, due_back, gst_treat, place, notes, items) in enumerate(invoices_data):
            client = clients[cli_idx]
            issue = mkdate(issue_back)
            due = mkdate(due_back) if due_back >= 0 else mkdate(abs(due_back))

            inv = await inv_svc.create_invoice(
                owner_id=owner.id,
                client_id=client.id,
                invoice_number=f"INV-2026-{(idx + 1):04d}",
                status=status,
                issue_date=issue,
                due_date=due,
                gst_treatment=gst_treat,
                place_of_supply=place,
                notes=notes,
                items_data=[
                    {
                        "product_id": p.id,
                        "description": f"{p.name} x {qty}",
                        "quantity": qty,
                        "unit_price": up,
                        "gst_rate": gst,
                    }
                    for p, qty, up, gst in items
                ],
            )
            inv.created_at = mkdt(issue_back)
            created_invoices.append(inv)
        await db.flush()

        # ------------------------------------------------------------------ #
        # 10. Payments  (match paid / partially-paid invoices)
        # ------------------------------------------------------------------ #
        log.info("Creating payments …")
        payment_methods = ["Bank Transfer", "Cheque", "UPI", "Credit Card", "Cash"]

        # Fully pay invoices 0, 1, 2, 9 (paid status)
        for inv_idx in [0, 1, 2]:
            inv = created_invoices[inv_idx]
            pmt = Payment(
                owner_id=admin.id,
                invoice_id=inv.id,
                amount=float(inv.total),
                payment_method=payment_methods[inv_idx % len(payment_methods)],
                payment_date=inv.issue_date + timedelta(days=abs(hash(str(inv.id)) % 10 + 1)),
                reference_id=f"PAY-{inv.invoice_number}-FULL",
                notes=f"Full payment for {inv.invoice_number}",
                status="completed",
                created_at=inv.created_at + timedelta(days=1),
            )
            db.add(pmt)
            inv.paid_amount = float(inv.total)
            inv.balance_due = 0.00

        # Partial payment for invoice 6 (index)
        inv6 = created_invoices[6]
        part_amt = float(inv6.total) * 0.4
        pmt = Payment(
            owner_id=admin.id,
            invoice_id=inv6.id,
            amount=round(part_amt, 2),
            payment_method="Bank Transfer",
            payment_date=inv6.issue_date + timedelta(days=3),
            reference_id="PAY-INV-0007-PART",
            notes="Advance payment (40%)",
            status="completed",
            created_at=inv6.created_at + timedelta(days=1),
        )
        db.add(pmt)
        inv6.paid_amount = round(part_amt, 2)
        inv6.balance_due = round(float(inv6.total) - part_amt, 2)

        # Full payment for invoice 9
        inv9 = created_invoices[9]
        pmt = Payment(
            owner_id=admin.id,
            invoice_id=inv9.id,
            amount=float(inv9.total),
            payment_method="UPI",
            payment_date=inv9.issue_date + timedelta(days=2),
            reference_id="PAY-INV-0010-UPI",
            notes="UPI payment",
            status="completed",
            created_at=inv9.created_at + timedelta(days=1),
        )
        db.add(pmt)
        inv9.paid_amount = float(inv9.total)
        inv9.balance_due = 0.00

        await db.flush()

        # ------------------------------------------------------------------ #
        # 11. Credit Notes  (2 — for invoice 1 & 8)
        # ------------------------------------------------------------------ #
        log.info("Creating credit & debit notes …")
        cn1 = CreditNote(
            owner_id=admin.id,
            invoice_id=created_invoices[1].id,
            credit_note_number="CN-2026-001",
            amount=5_000.00,
            reason="Damaged goods returned — 2x LED Panel Lights",
            status="issued",
            issue_date=mkdate(20),
            created_at=mkdt(20),
        )
        db.add(cn1)

        cn2 = CreditNote(
            owner_id=admin.id,
            invoice_id=created_invoices[7].id,
            credit_note_number="CN-2026-002",
            amount=22_500.00,
            reason="Price adjustment per client agreement on cancelled invoice",
            status="issued",
            issue_date=mkdate(55),
            created_at=mkdt(55),
        )
        db.add(cn2)

        # Debit Note
        dn1 = DebitNote(
            owner_id=admin.id,
            invoice_id=created_invoices[3].id,
            debit_note_number="DN-2026-001",
            amount=3_600.00,
            reason="Additional installation charges not included in original invoice",
            status="issued",
            issue_date=mkdate(5),
            created_at=mkdt(5),
        )
        db.add(dn1)
        await db.flush()

        # ------------------------------------------------------------------ #
        # 12. Settings  (per-user — admin has all, others minimal)
        # ------------------------------------------------------------------ #
        log.info("Creating settings …")

        # Admin company settings
        cs = CompanySetting(
            owner_id=admin.id,
            company_name="DATAVEX Industries Pvt. Ltd.",
            email="billing@datavex.com",
            phone="+91-80-4567-8900",
            address="42, Industrial Layout, Whitefield, Bangalore — 560066",
            state="Karnataka",
            gst_number="29AABCD1234E1Z5",
            website="https://datavex.com",
            industry="Industrial Automation & Electronics",
        )
        db.add(cs)

        # Admin branding settings
        bs = BrandingSetting(
            owner_id=admin.id,
            logo_url="/brand/logo.svg",
            primary_color="#96282E",
            accent_color="#CBA052",
            invoice_footer="Thank you for your business! Payment due within 15 days.",
            payment_terms="Net 15 — 2% discount if paid within 7 days",
        )
        db.add(bs)

        # Admin notification settings
        ns = NotificationSetting(
            owner_id=admin.id,
            invoice_notifications=True,
            payment_reminders=True,
            low_stock_alerts=True,
            weekly_reports=True,
        )
        db.add(ns)

        # Admin workflow settings
        ws = WorkflowSettings(
            owner_id=admin.id,
            send_upcoming_invoice_reminders=True,
            send_overdue_reminders=True,
            notify_low_stock=True,
        )
        db.add(ws)

        # Minimal settings for other users (just notification prefs)
        for u in [sales, accounts, inventory_mgr, auditor]:
            db.add(NotificationSetting(
                owner_id=u.id,
                invoice_notifications=True,
                payment_reminders=False,
                low_stock_alerts=(u.id == inventory_mgr.id),
                weekly_reports=(u.id == accounts.id),
            ))

        # ------------------------------------------------------------------ #
        # 13. Commit & Summary
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
