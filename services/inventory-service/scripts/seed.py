"""Comprehensive inventory seed — 30 products, 5 warehouses, 8 suppliers, 15 POs."""
import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.database import async_session_factory, engine, Base
from app.product.models import Product
from app.warehouse.models import Warehouse
from app.stock.models import Stock, StockMovement
from app.supplier.models import Supplier
from app.purchase_order.models import PurchaseOrder, PurchaseOrderItem
from app.serial_number.models import SerialNumber


now = datetime.now(timezone.utc)
def ago(days: int) -> datetime:
    return now - timedelta(days=days)

def later(days: int) -> datetime:
    return now + timedelta(days=days)


async def seed():
    print("Seeding inventory database...")
    async with async_session_factory() as db:
        try:
            organization_id = 1

            # ── Warehouses (5) ─────────────────────────────────────────
            warehouses = [
                Warehouse(organization_id=organization_id, name="Main Warehouse — Whitefield", code="WH-MAIN",
                          address="42, Industrial Layout, Whitefield", city="Bangalore", state="Karnataka", country="India"),
                Warehouse(organization_id=organization_id, name="Secondary — Peenya Industrial Area", code="WH-PEE",
                          address="88, Peenya Phase 2, Bangalore North", city="Bangalore", state="Karnataka", country="India"),
                Warehouse(organization_id=organization_id, name="Cold Storage — Hosur Road", code="WH-COLD",
                          address="15, Electronics City, Hosur Road", city="Bangalore", state="Karnataka", country="India"),
                Warehouse(organization_id=organization_id, name="Distribution Center — Bhiwandi", code="WH-DC",
                          address="Plot 7, Bhiwandi Industrial Estate", city="Bhiwandi", state="Maharashtra", country="India"),
                Warehouse(organization_id=organization_id, name="North India Hub — Noida", code="WH-NOIDA",
                          address="Sector 63, Noida Special Economic Zone", city="Noida", state="Uttar Pradesh", country="India"),
            ]
            for w in warehouses:
                db.add(w)
            await db.flush()
            print(f"  {len(warehouses)} warehouses created")

            # ── Products (30) ───────────────────────────────────────────
            products = [
                # Raw Materials (6)
                Product(organization_id=organization_id, name="Steel Rod 12mm — TATA Tiscon", sku="SR-12MM", barcode="8901234560011",
                        category="Raw Materials", unit="kg", price=Decimal("850.00"), cost_price=Decimal("620.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=100),
                Product(organization_id=organization_id, name="Cement 50kg Bag — UltraTech", sku="CM-50KG", barcode="8901234560028",
                        category="Raw Materials", unit="bag", price=Decimal("380.00"), cost_price=Decimal("275.00"),
                        tax_rate=Decimal("5.00"), low_stock_threshold=50),
                Product(organization_id=organization_id, name="TMT Steel Bar 16mm — JSW", sku="TMT-16MM", barcode="8901234560066",
                        category="Raw Materials", unit="kg", price=Decimal("720.00"), cost_price=Decimal("540.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=200),
                Product(organization_id=organization_id, name="Aluminium Composite Panel 8x4ft", sku="ACP-8X4", barcode="8901234560134",
                        category="Raw Materials", unit="sheet", price=Decimal("2100.00"), cost_price=Decimal("1550.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=15),
                Product(organization_id=organization_id, name="Copper Wire 2.5mm² (50m Roll)", sku="CW-2.5MM", barcode="8901234560165",
                        category="Raw Materials", unit="roll", price=Decimal("6200.00"), cost_price=Decimal("4800.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=5, uses_serial_tracking=True),
                Product(organization_id=organization_id, name="Mild Steel Angle 50x50mm 6m", sku="MSA-50X50", barcode="8901234560172",
                        category="Raw Materials", unit="pcs", price=Decimal("1450.00"), cost_price=Decimal("1100.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=30),

                # Plumbing (5)
                Product(organization_id=organization_id, name="PVC Pipe 4 inch — 3m Length", sku="PVC-4IN", barcode="8901234560035",
                        category="Plumbing", unit="pcs", price=Decimal("220.00"), cost_price=Decimal("155.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=50),
                Product(organization_id=organization_id, name="CPVC Pipe 1 inch — 3m", sku="CPVC-1IN", barcode="8901234560073",
                        category="Plumbing", unit="pcs", price=Decimal("180.00"), cost_price=Decimal("125.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=80),
                Product(organization_id=organization_id, name="GI Pipe 2 inch — 6m Length", sku="GI-2IN", barcode="8901234560103",
                        category="Plumbing", unit="pcs", price=Decimal("950.00"), cost_price=Decimal("720.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=30),
                Product(organization_id=organization_id, name="Ball Valve 2 inch Brass — Jaguar", sku="BV-2IN", barcode="8901234560141",
                        category="Plumbing", unit="pcs", price=Decimal("520.00"), cost_price=Decimal("380.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=60),
                Product(organization_id=organization_id, name="Bib Cock Chrome — Hindware", sku="BC-15MM", barcode="8901234560189",
                        category="Plumbing", unit="pcs", price=Decimal("280.00"), cost_price=Decimal("195.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=40),

                # Electrical (6)
                Product(organization_id=organization_id, name="Electrical Wire 1.5mm² (100m Roll) — Finolex", sku="EW-1.5MM", barcode="8901234560042",
                        category="Electrical", unit="roll", price=Decimal("4500.00"), cost_price=Decimal("3200.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=8, uses_serial_tracking=True),
                Product(organization_id=organization_id, name="LED Panel Light 24W — Philips", sku="LED-24W", barcode="8901234560080",
                        category="Electrical", unit="pcs", price=Decimal("650.00"), cost_price=Decimal("420.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=40),
                Product(organization_id=organization_id, name="Switchboard 12-way — Legrand", sku="SW-12W", barcode="8901234560110",
                        category="Electrical", unit="pcs", price=Decimal("340.00"), cost_price=Decimal("210.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=50),
                Product(organization_id=organization_id, name="MCB 32A Single Pole — Havells", sku="MCB-32A", barcode="8901234560196",
                        category="Electrical", unit="pcs", price=Decimal("185.00"), cost_price=Decimal("125.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=100),
                Product(organization_id=organization_id, name="Cable Tray Perforated 3m — 300mm", sku="CT-3M", barcode="8901234560158",
                        category="Electrical", unit="pcs", price=Decimal("1800.00"), cost_price=Decimal("1300.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=15),
                Product(organization_id=organization_id, name="Wire Crimping Tool Set — 8-pc", sku="WCT-8PC", barcode="8901234560202",
                        category="Electrical", unit="set", price=Decimal("2200.00"), cost_price=Decimal("1600.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=5),

                # Finishing (5)
                Product(organization_id=organization_id, name="Paint Bucket 20L — Asian Paints Royale", sku="PT-20L", barcode="8901234560059",
                        category="Finishing", unit="bucket", price=Decimal("2800.00"), cost_price=Decimal("1900.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=15),
                Product(organization_id=organization_id, name="Ceramic Floor Tile 2x2ft — Kajaria", sku="CFT-2X2", barcode="8901234560097",
                        category="Finishing", unit="box", price=Decimal("1200.00"), cost_price=Decimal("850.00"),
                        tax_rate=Decimal("5.00"), low_stock_threshold=25),
                Product(organization_id=organization_id, name="Waterproofing Compound 5kg — Dr. Fixit", sku="WP-5KG", barcode="8901234560127",
                        category="Finishing", unit="bucket", price=Decimal("1600.00"), cost_price=Decimal("1100.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=20),
                Product(organization_id=organization_id, name="Wall Putty Powder 20kg — Birla", sku="WP-20KG", barcode="8901234560219",
                        category="Finishing", unit="bag", price=Decimal("550.00"), cost_price=Decimal("380.00"),
                        tax_rate=Decimal("5.00"), low_stock_threshold=30),
                Product(organization_id=organization_id, name="Vitrified Tile 600x600mm — Somany", sku="VT-600X600", barcode="8901234560226",
                        category="Finishing", unit="box", price=Decimal("1800.00"), cost_price=Decimal("1250.00"),
                        tax_rate=Decimal("5.00"), low_stock_threshold=20),

                # Tools & Hardware (4)
                Product(organization_id=organization_id, name="Hammer 1kg Claw — Taparia", sku="HM-1KG", barcode="8901234560233",
                        category="Tools", unit="pcs", price=Decimal("450.00"), cost_price=Decimal("320.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=15),
                Product(organization_id=organization_id, name="Drill Machine 13mm — Bosch", sku="DM-13MM", barcode="8901234560240",
                        category="Tools", unit="pcs", price=Decimal("3500.00"), cost_price=Decimal("2600.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=5, uses_serial_tracking=True),
                Product(organization_id=organization_id, name="Measuring Tape 5m — Stanley", sku="MT-5M", barcode="8901234560257",
                        category="Tools", unit="pcs", price=Decimal("180.00"), cost_price=Decimal("120.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=25),
                Product(organization_id=organization_id, name="Safety Helmet White — IS 2925", sku="SH-WHITE", barcode="8901234560264",
                        category="Tools", unit="pcs", price=Decimal("320.00"), cost_price=Decimal("210.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=50),

                # Consumables (4)
                Product(organization_id=organization_id, name="PVC Solvent Cement 250ml", sku="PVC-SC-250", barcode="8901234560271",
                        category="Consumables", unit="bottle", price=Decimal("160.00"), cost_price=Decimal("110.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=30),
                Product(organization_id=organization_id, name="Teflon Tape Roll 12m", sku="TT-12M", barcode="8901234560288",
                        category="Consumables", unit="roll", price=Decimal("45.00"), cost_price=Decimal("28.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=100),
                Product(organization_id=organization_id, name="Masking Tape 48mm x 50m", sku="MKT-48MM", barcode="8901234560295",
                        category="Consumables", unit="roll", price=Decimal("85.00"), cost_price=Decimal("55.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=60),
                Product(organization_id=organization_id, name="Emery Paper Sheet Grit 80 — 10-pack", sku="EP-G80", barcode="8901234560301",
                        category="Consumables", unit="pack", price=Decimal("120.00"), cost_price=Decimal("75.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=40),
            ]
            for p in products:
                db.add(p)
            await db.flush()
            print(f"  {len(products)} products created")

            # ── Stock (product × warehouse placements) ──────────────────
            # Use a dict for readability: product_index -> [(warehouse_index, qty)]
            stock_map = {
                0:  [(0, 500), (1, 200)],    # Steel Rod: main + peenya
                1:  [(0, 80), (1, 40)],      # Cement
                2:  [(1, 800), (3, 300)],    # TMT Bar
                3:  [(0, 25), (2, 10)],      # ACP
                4:  [(1, 10)],               # Copper Wire
                5:  [(0, 50)],               # MS Angle
                6:  [(0, 200), (1, 100)],    # PVC Pipe
                7:  [(0, 150)],              # CPVC Pipe
                8:  [(1, 60)],               # GI Pipe
                9:  [(0, 100), (3, 50)],     # Ball Valve
                10: [(0, 80)],               # Bib Cock
                11: [(0, 12), (1, 8)],       # Electrical Wire
                12: [(1, 60), (4, 40)],      # LED Panel
                13: [(0, 200)],              # Switchboard
                14: [(0, 150), (1, 100)],    # MCB
                15: [(0, 20)],               # Cable Tray
                16: [(0, 10)],               # Crimping Tool
                17: [(0, 30), (2, 15)],      # Paint Bucket
                18: [(0, 40)],               # Ceramic Tile
                19: [(0, 25), (2, 10)],      # Waterproofing
                20: [(0, 50)],               # Wall Putty
                21: [(1, 30)],               # Vitrified Tile
                22: [(0, 20)],               # Hammer
                23: [(0, 8)],                # Drill Machine
                24: [(0, 30)],               # Measuring Tape
                25: [(0, 60), (1, 40)],      # Safety Helmet
                26: [(0, 40)],               # PVC Solvent
                27: [(0, 200)],              # Teflon Tape
                28: [(0, 80)],               # Masking Tape
                29: [(0, 60)],               # Emery Paper
            }
            stock_records = []
            for p_idx, placements in stock_map.items():
                for wh_idx, qty in placements:
                    stock_records.append(Stock(organization_id=organization_id, product_id=products[p_idx].id, warehouse_id=warehouses[wh_idx].id, quantity=qty))
            db.add_all(stock_records)
            await db.flush()
            print(f"  {len(stock_records)} stock records created")

            # ── Stock Movements (15) ────────────────────────────────────
            movements = [
                StockMovement(organization_id=organization_id, product_id=products[0].id, warehouse_id=warehouses[0].id, type="in", quantity=500, reference_type="purchase_order", reference_id=1, notes="PO-001 received — initial steel stock"),
                StockMovement(organization_id=organization_id, product_id=products[1].id, warehouse_id=warehouses[0].id, type="in", quantity=100, reference_type="purchase_order", reference_id=2, notes="PO-002 — cement stock"),
                StockMovement(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, type="out", quantity=3, reference_type="sales_order", reference_id=101, notes="Issued for project SITE-BLR-101"),
                StockMovement(organization_id=organization_id, product_id=products[17].id, warehouse_id=warehouses[0].id, type="out", quantity=5, reference_type="sales_order", reference_id=102, notes="Issued for project SITE-BLR-102"),
                StockMovement(organization_id=organization_id, product_id=products[6].id, warehouse_id=warehouses[0].id, type="out", quantity=30, reference_type="sales_order", reference_id=103, notes="PVC pipes issued for Phase 1 plumbing"),
                StockMovement(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, type="in", quantity=60, reference_type="purchase_order", reference_id=3, notes="PO-003 restock LED panels"),
                StockMovement(organization_id=organization_id, product_id=products[19].id, warehouse_id=warehouses[2].id, type="adjustment", quantity=-3, reference_type="adjustment", reference_id=None, notes="Damaged during cold storage handling — write-off"),
                StockMovement(organization_id=organization_id, product_id=products[2].id, warehouse_id=warehouses[1].id, type="in", quantity=500, reference_type="purchase_order", reference_id=4, notes="PO-004 TMT bars received"),
                StockMovement(organization_id=organization_id, product_id=products[23].id, warehouse_id=warehouses[0].id, type="out", quantity=2, reference_type="sales_order", reference_id=104, notes="Drill machines issued for field team"),
                StockMovement(organization_id=organization_id, product_id=products[5].id, warehouse_id=warehouses[0].id, type="out", quantity=15, reference_type="sales_order", reference_id=105, notes="MS angles for structure fabrication"),
                StockMovement(organization_id=organization_id, product_id=products[9].id, warehouse_id=warehouses[3].id, type="in", quantity=50, reference_type="purchase_order", reference_id=5, notes="PO-005 ball valves for DC restock"),
                StockMovement(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, type="in", quantity=10, reference_type="purchase_order", reference_id=6, notes="PO-006 copper wire"),
                StockMovement(organization_id=organization_id, product_id=products[14].id, warehouse_id=warehouses[0].id, type="out", quantity=30, reference_type="sales_order", reference_id=106, notes="MCBs for panel assembly"),
                StockMovement(organization_id=organization_id, product_id=products[25].id, warehouse_id=warehouses[0].id, type="out", quantity=20, reference_type="sales_order", reference_id=107, notes="Safety helmets issued for site workers"),
                StockMovement(organization_id=organization_id, product_id=products[8].id, warehouse_id=warehouses[1].id, type="adjustment", quantity=5, reference_type="adjustment", reference_id=None, notes="Inventory correction — count mismatch resolved"),
            ]
            db.add_all(movements)
            await db.flush()
            print(f"  {len(movements)} stock movements created")

            # ── Suppliers (8) ───────────────────────────────────────────
            suppliers = [
                Supplier(organization_id=organization_id, name="Tata Steel Limited", email="orders@tatasteel.in", phone="+91-22-6750-1000",
                         address="Bombay House, 24 Homi Mody Street, Fort", city="Mumbai", state="Maharashtra",
                         gst_number="27AABCT1234E1Z1", contact_person="Rajesh Mehta", payment_terms="Net 45"),
                Supplier(organization_id=organization_id, name="UltraTech Cement Ltd", email="supply@ultratech.in", phone="+91-80-4345-6700",
                         address="HSR Layout, Sector 3, Bannerghatta Road", city="Bangalore", state="Karnataka",
                         gst_number="29AAACU5678E1ZP", contact_person="Priya Kulkarni", payment_terms="Net 30"),
                Supplier(organization_id=organization_id, name="Philips India Ltd — Lighting Division", email="b2b.lighting@philips.com", phone="+91-120-439-2000",
                         address="Philips Innovation Campus, Manyata Tech Park", city="Bangalore", state="Karnataka",
                         gst_number="29AAACP9012E1ZR", contact_person="Arun Nair", payment_terms="Net 60"),
                Supplier(organization_id=organization_id, name="Asian Paints Limited", email="project.sales@asianpaints.com", phone="+91-22-3981-8000",
                         address="Asian Paints House, 6A Shantinagar, Santacruz East", city="Mumbai", state="Maharashtra",
                         gst_number="27AABCA3456E1ZT", contact_person="Sneha Deshmukh", payment_terms="Net 30"),
                Supplier(organization_id=organization_id, name="Finolex Pipes Ltd", email="order@finolex.com", phone="+91-20-2747-3000",
                         address="D-1/1, MIDC Industrial Area, Pimpri", city="Pune", state="Maharashtra",
                         gst_number="27AAACF7890E1ZQ", contact_person="Vikram Patil", payment_terms="Net 45"),
                Supplier(organization_id=organization_id, name="Legrand India Pvt Ltd", email="sales@legrand.in", phone="+91-20-6608-2000",
                         address="Plot P-17, MIDC Ranjangaon", city="Pune", state="Maharashtra",
                         gst_number="27AAACL2345E1ZK", contact_person="Anita Desai", payment_terms="Net 30"),
                Supplier(organization_id=organization_id, name="Bosch Power Tools India", email="tools.supply@bosch.in", phone="+91-80-6789-1000",
                         address="Bosch House, Hosur Road, Adugodi", city="Bangalore", state="Karnataka",
                         gst_number="29AAACB6789E1ZW", contact_person="Karan Singh", payment_terms="Net 45"),
                Supplier(organization_id=organization_id, name="Havells India Limited", email="b2b@havells.com", phone="+91-120-477-1000",
                         address="QRG Towers, 6, Sector 16, Institutional Area", city="Noida", state="Uttar Pradesh",
                         gst_number="09AAACH3456E1ZM", contact_person="Ravi Agarwal", payment_terms="Net 30"),
            ]
            for s in suppliers:
                db.add(s)
            await db.flush()
            print(f"  {len(suppliers)} suppliers created")

            # ── Purchase Orders (15) ────────────────────────────────────
            pos = [
                {"s": 0, "w": 0, "on": "PO-2026-001", "st": "received", "notes": "Bulk steel order for Q3 construction projects", "oa": ago(25), "ea": ago(5), "ra": ago(3),
                 "items": [(0, 300, 620), (2, 500, 530), (5, 50, 1050)]},
                {"s": 1, "w": 0, "on": "PO-2026-002", "st": "received", "notes": "Monthly cement replenishment", "oa": ago(20), "ea": ago(2), "ra": ago(1),
                 "items": [(1, 100, 260)]},
                {"s": 2, "w": 1, "on": "PO-2026-003", "st": "received", "notes": "LED panel and lighting stock", "oa": ago(18), "ea": ago(3), "ra": ago(1),
                 "items": [(12, 80, 400)]},
                {"s": 0, "w": 1, "on": "PO-2026-004", "st": "ordered", "notes": "TMT bars and angles for Phase 2", "oa": ago(7), "ea": later(7), "ra": None,
                 "items": [(2, 300, 510), (5, 30, 1050)]},
                {"s": 5, "w": 3, "on": "PO-2026-005", "st": "ordered", "notes": "Ball valves and bib cocks for DC restock", "oa": ago(5), "ea": later(10), "ra": None,
                 "items": [(9, 100, 360), (10, 80, 185)]},
                {"s": 0, "w": 1, "on": "PO-2026-006", "st": "ordered", "notes": "Copper wire and cable tray", "oa": ago(3), "ea": later(14), "ra": None,
                 "items": [(4, 10, 4600), (15, 15, 1250)]},
                {"s": 7, "w": 0, "on": "PO-2026-007", "st": "ordered", "notes": "MCBs and switchboards for panel production", "oa": ago(4), "ea": later(10), "ra": None,
                 "items": [(13, 200, 200), (14, 300, 120)]},
                {"s": 6, "w": 0, "on": "PO-2026-008", "st": "ordered", "notes": "Power tools for field service teams", "oa": ago(2), "ea": later(15), "ra": None,
                 "items": [(23, 10, 2500), (22, 20, 300)]},
                {"s": 3, "w": 0, "on": "PO-2026-009", "st": "draft", "notes": "Paint and waterproofing for residential project", "oa": None, "ea": None, "ra": None,
                 "items": [(17, 30, 1800), (19, 20, 1050), (20, 50, 370)]},
                {"s": 4, "w": 0, "on": "PO-2026-010", "st": "draft", "notes": "PVC and CPVC pipes for upcoming township", "oa": None, "ea": None, "ra": None,
                 "items": [(6, 300, 145), (7, 200, 115)]},
                {"s": 6, "w": 0, "on": "PO-2026-011", "st": "draft", "notes": "Safety equipment and measuring tools", "oa": None, "ea": None, "ra": None,
                 "items": [(24, 50, 115), (25, 100, 200)]},
                {"s": 5, "w": 0, "on": "PO-2026-012", "st": "ordered", "notes": "Consumables restock — solvents, tapes", "oa": ago(1), "ea": later(5), "ra": None,
                 "items": [(26, 50, 105), (27, 200, 25), (28, 100, 50), (29, 80, 70)]},
                {"s": 4, "w": 1, "on": "PO-2026-013", "st": "received", "notes": "GI pipes for fire safety plumbing", "oa": ago(30), "ea": ago(5), "ra": ago(2),
                 "items": [(8, 80, 680)]},
                {"s": 3, "w": 2, "on": "PO-2026-014", "st": "ordered", "notes": "Specialized waterproofing chemicals — cold storage", "oa": ago(6), "ea": later(8), "ra": None,
                 "items": [(19, 15, 1050)]},
                {"s": 1, "w": 1, "on": "PO-2026-015", "st": "received", "notes": "Cement and tile stock for Noida hub", "oa": ago(12), "ea": ago(1), "ra": ago(0),
                 "items": [(1, 50, 260), (18, 30, 820), (21, 40, 1200)]},
            ]

            for po_data in pos:
                items_data = po_data.pop("items")
                po = PurchaseOrder(
                    organization_id=organization_id, supplier_id=suppliers[po_data["s"]].id,
                    warehouse_id=warehouses[po_data["w"]].id,
                    order_number=po_data["on"], status=po_data["st"],
                    notes=po_data["notes"],
                    ordered_at=po_data["oa"], expected_at=po_data["ea"],
                    received_at=po_data["ra"],
                )
                db.add(po)
                await db.flush()
                subtotal = Decimal("0.00")
                for p_idx, qty, up in items_data:
                    unit_price = Decimal(str(up))
                    item_subtotal = unit_price * qty
                    subtotal += item_subtotal
                    db.add(PurchaseOrderItem(
                        purchase_order_id=po.id, product_id=products[p_idx].id,
                        quantity=qty, unit_price=unit_price, subtotal=item_subtotal,
                    ))
                po.subtotal = subtotal
                po.tax_amount = subtotal * Decimal("0.18")
                po.total = subtotal + po.tax_amount
            await db.flush()
            print(f"  {len(pos)} purchase orders created")

            # ── Serial Numbers (20) ────────────────────────────────────
            serials = [
                # Copper wire — serial tracked
                SerialNumber(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, serial_number="CW-2.5MM-001", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, serial_number="CW-2.5MM-002", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, serial_number="CW-2.5MM-003", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, serial_number="CW-2.5MM-004", status="in_stock"),
                # Electrical wire — serial tracked
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="EW-1.5MM-001", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="EW-1.5MM-002", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="EW-1.5MM-003", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="EW-1.5MM-004", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="EW-1.5MM-005", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[1].id, serial_number="EW-1.5MM-006", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[1].id, serial_number="EW-1.5MM-007", status="returned"),
                # Drill machine — serial tracked
                SerialNumber(organization_id=organization_id, product_id=products[23].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-001", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[23].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-002", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[23].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-003", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[23].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-004", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[23].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-005", status="in_stock"),
                # LED panels — serial tracked (also tracked via purchase order)
                SerialNumber(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, serial_number="LED-24W-001", status="in_stock", purchase_order_id=3),
                SerialNumber(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, serial_number="LED-24W-002", status="in_stock", purchase_order_id=3),
                SerialNumber(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, serial_number="LED-24W-003", status="in_stock", purchase_order_id=3),
                SerialNumber(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, serial_number="LED-24W-004", status="returned"),
            ]
            db.add_all(serials)
            await db.flush()
            print(f"  {len(serials)} serial numbers created")

            await db.commit()
            print("\nInventory seeding completed successfully!")
            print(f"Total records: {len(warehouses)+len(products)+len(stock_records)+len(movements)+len(suppliers)+len(pos)+len(serials)}")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()
            raise

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
