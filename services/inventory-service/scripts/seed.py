"""Comprehensive inventory seed — 30 products, 5 warehouses, 8 suppliers, 15 POs."""
import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal

# Add CWD to python path to resolve app module imports
sys.path.append(os.getcwd())

from app.core.database import async_session_factory, engine
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

            # Clean up existing data first
            from sqlalchemy import text
            await db.execute(text("TRUNCATE TABLE serial_numbers, purchase_order_items, purchase_orders, stock_movements, stock, products, warehouses, suppliers CASCADE"))
            await db.commit()

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
                # Controllers (6)
                Product(organization_id=organization_id, name="PLC CPU Module — Siemens S7-1200", sku="PLC-S71200", barcode="8901234560011",
                        category="Controllers", unit="pcs", price=Decimal("25000.00"), cost_price=Decimal("18000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=100),
                Product(organization_id=organization_id, name="Industrial Controller X200 — Schneider Modicon", sku="IC-X200", barcode="8901234560028",
                        category="Controllers", unit="pcs", price=Decimal("35000.00"), cost_price=Decimal("26000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=50),
                Product(organization_id=organization_id, name="Distributed I/O Interface — Siemens ET200", sku="IO-ET200", barcode="8901234560066",
                        category="Controllers", unit="pcs", price=Decimal("15000.00"), cost_price=Decimal("11000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=200),
                Product(organization_id=organization_id, name="Micro PLC Controller — Omron CP1E", sku="PLC-CP1E", barcode="8901234560134",
                        category="Controllers", unit="pcs", price=Decimal("12000.00"), cost_price=Decimal("8500.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=15),
                Product(organization_id=organization_id, name="IoT Gateway Edge Controller", sku="IOT-GW200", barcode="8901234560165",
                        category="Controllers", unit="pcs", price=Decimal("8500.00"), cost_price=Decimal("5800.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=5, uses_serial_tracking=True),
                Product(organization_id=organization_id, name="Redundant CPU Processor Panel", sku="CPU-RED500", barcode="8901234560172",
                        category="Controllers", unit="pcs", price=Decimal("85000.00"), cost_price=Decimal("62000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=30),

                # Sensors (5)
                Product(organization_id=organization_id, name="Photoelectric Sensor — Omron E3Z", sku="SEN-E3Z", barcode="8901234560035",
                        category="Sensors", unit="pcs", price=Decimal("2800.00"), cost_price=Decimal("1900.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=50),
                Product(organization_id=organization_id, name="Inductive Proximity Sensor — Omron", sku="SEN-PRX12", barcode="8901234560073",
                        category="Sensors", unit="pcs", price=Decimal("1200.00"), cost_price=Decimal("850.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=80),
                Product(organization_id=organization_id, name="Smart Temperature Transmitter — Honeywell", sku="TX-TEMP", barcode="8901234560103",
                        category="Sensors", unit="pcs", price=Decimal("6500.00"), cost_price=Decimal("4800.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=30),
                Product(organization_id=organization_id, name="Differential Pressure Transmitter", sku="TX-DP900", barcode="8901234560141",
                        category="Sensors", unit="pcs", price=Decimal("18000.00"), cost_price=Decimal("13000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=60),
                Product(organization_id=organization_id, name="Ultrasonic Level Sensor — Honeywell", sku="SEN-USL30", barcode="8901234560189",
                        category="Sensors", unit="pcs", price=Decimal("14500.00"), cost_price=Decimal("10500.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=40),

                # HMI & Drives (6)
                Product(organization_id=organization_id, name="HMI Touch Panel 10-inch — Siemens KTP1000", sku="HMI-KTP1000", barcode="8901234560042",
                        category="HMI & Drives", unit="pcs", price=Decimal("42000.00"), cost_price=Decimal("30000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=8, uses_serial_tracking=True),
                Product(organization_id=organization_id, name="HMI Graphic Terminal 7-inch — Schneider", sku="HMI-GT7", barcode="8901234560080",
                        category="HMI & Drives", unit="pcs", price=Decimal("28000.00"), cost_price=Decimal("20000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=40),
                Product(organization_id=organization_id, name="Variable Frequency Drive 5.5kW — Siemens", sku="VFD-5.5KW", barcode="8901234560110",
                        category="HMI & Drives", unit="pcs", price=Decimal("32000.00"), cost_price=Decimal("24000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=50),
                Product(organization_id=organization_id, name="Compact VFD Drive 1.5kW — Omron", sku="VFD-1.5KW", barcode="8901234560196",
                        category="HMI & Drives", unit="pcs", price=Decimal("14500.00"), cost_price=Decimal("10500.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=100),
                Product(organization_id=organization_id, name="Servo Motor & Drive System — Schneider", sku="SRV-DRV100", barcode="8901234560158",
                        category="HMI & Drives", unit="pcs", price=Decimal("75000.00"), cost_price=Decimal("55000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=15),
                Product(organization_id=organization_id, name="Power Supply 24V DC 10A — Siemens SITOP", sku="PS-24V10A", barcode="8901234560202",
                        category="HMI & Drives", unit="pcs", price=Decimal("6500.00"), cost_price=Decimal("4500.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=5),

                # Switchgear (5)
                Product(organization_id=organization_id, name="Industrial Control Cable 2.5mm² (50m Roll)", sku="CAB-2.5MM", barcode="8901234560059",
                        category="Switchgear", unit="roll", price=Decimal("6200.00"), cost_price=Decimal("4800.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=15),
                Product(organization_id=organization_id, name="MCB 32A Triple Pole — Havells", sku="MCB-33A", barcode="8901234560097",
                        category="Switchgear", unit="pcs", price=Decimal("850.00"), cost_price=Decimal("600.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=25),
                Product(organization_id=organization_id, name="Magnetic Contactor 40A — Schneider LC1D", sku="CON-40A", barcode="8901234560127",
                        category="Switchgear", unit="pcs", price=Decimal("3200.00"), cost_price=Decimal("2300.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=20),
                Product(organization_id=organization_id, name="Overload Relay 18-25A — Siemens", sku="REL-1825A", barcode="8901234560219",
                        category="Switchgear", unit="pcs", price=Decimal("2400.00"), cost_price=Decimal("1700.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=30),
                Product(organization_id=organization_id, name="Indicator Light LED (Box of 10) — Philips", sku="IND-LED10", barcode="8901234560226",
                        category="Switchgear", unit="box", price=Decimal("1500.00"), cost_price=Decimal("1050.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=20),

                # Hardware & Modules (4)
                Product(organization_id=organization_id, name="IP65 Control Panel Enclosure 600x600", sku="ENC-IP65", barcode="8901234560233",
                        category="Hardware", unit="pcs", price=Decimal("12500.00"), cost_price=Decimal("9000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=15),
                Product(organization_id=organization_id, name="Aviation-Grade Telemetry Module", sku="TEL-AV900", barcode="8901234560240",
                        category="Hardware", unit="pcs", price=Decimal("120000.00"), cost_price=Decimal("85000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=5, uses_serial_tracking=True),
                Product(organization_id=organization_id, name="Flight Data Recorder Interface", sku="FDR-INT10", barcode="8901234560257",
                        category="Hardware", unit="pcs", price=Decimal("30000.00"), cost_price=Decimal("22000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=25, uses_serial_tracking=True),
                Product(organization_id=organization_id, name="Perforated Cable Tray 3m — Legrand", sku="CT-3M-LEG", barcode="8901234560264",
                        category="Hardware", unit="pcs", price=Decimal("1800.00"), cost_price=Decimal("1300.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=50),

                # Tools & Safety (4)
                Product(organization_id=organization_id, name="Drill Machine 13mm — Bosch", sku="DM-13MM", barcode="8901234560271",
                        category="Tools", unit="pcs", price=Decimal("3500.00"), cost_price=Decimal("2600.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=30, uses_serial_tracking=True),
                Product(organization_id=organization_id, name="Wire Crimping Tool Set — Bosch", sku="WCT-8PC", barcode="8901234560288",
                        category="Tools", unit="set", price=Decimal("2200.00"), cost_price=Decimal("1600.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=100),
                Product(organization_id=organization_id, name="Safety Helmet White — Havells", sku="SH-WHITE", barcode="8901234560295",
                        category="Tools", unit="pcs", price=Decimal("320.00"), cost_price=Decimal("210.00"),
                        tax_rate=Decimal("12.00"), low_stock_threshold=60),
                Product(organization_id=organization_id, name="Power Strip 12-way — Legrand", sku="SW-12W", barcode="8901234560301",
                        category="Tools", unit="pcs", price=Decimal("340.00"), cost_price=Decimal("2400.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=40),
            ]
            for p in products:
                db.add(p)
            await db.flush()
            print(f"  {len(products)} products created")

            # ── Stock (product × warehouse placements) ──────────────────
            stock_map = {
                0:  [(0, 500), (1, 200)],    # Siemens PLC S7-1200: main + peenya
                1:  [(0, 80), (1, 40)],      # Schneider Modicon Controller
                2:  [(1, 800), (3, 300)],    # Siemens ET200 module
                3:  [(0, 25), (2, 10)],      # Omron CP1E
                4:  [(1, 10)],               # IoT Gateway
                5:  [(0, 50)],               # Redundant CPU
                6:  [(0, 200), (1, 100)],    # Photoelectric sensor
                7:  [(0, 150)],              # Proximity sensor
                8:  [(1, 60)],               # Temperature Transmitter
                9:  [(0, 100), (3, 50)],     # DP Transmitter
                10: [(0, 80)],               # Ultrasonic Level
                11: [(0, 12), (1, 8)],       # Siemens KTP1000 HMI
                12: [(1, 60), (4, 40)],      # Schneider Graphic HMI
                13: [(0, 200)],              # Siemens 5.5kW VFD
                14: [(0, 150), (1, 100)],    # Omron 1.5kW VFD
                15: [(0, 20)],               # Servo Motor System
                16: [(0, 10)],               # Power Supply 24V
                17: [(0, 30), (2, 15)],      # Control Cable 2.5mm²
                18: [(0, 40)],               # Triple Pole MCB
                19: [(0, 25), (2, 10)],      # Magnetic Contactor
                20: [(0, 50)],               # Overload Relay
                21: [(1, 30)],               # LED Indicator Light
                22: [(0, 20)],               # IP65 Enclosure
                23: [(0, 8)],                # Telemetry Module
                24: [(0, 30)],               # FDR Interface
                25: [(0, 60), (1, 40)],      # Perforated Cable Tray
                26: [(0, 40)],               # Bosch Drill
                27: [(0, 200)],              # Bosch Crimping Set
                28: [(0, 80)],               # Safety Helmet
                29: [(0, 60)],               # Power Strip
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
                StockMovement(organization_id=organization_id, product_id=products[0].id, warehouse_id=warehouses[0].id, type="in", quantity=500, reference_type="purchase_order", reference_id=1, notes="PO-001 received — initial PLC stock"),
                StockMovement(organization_id=organization_id, product_id=products[1].id, warehouse_id=warehouses[0].id, type="in", quantity=100, reference_type="purchase_order", reference_id=2, notes="PO-002 — Schneider Modicon stock"),
                StockMovement(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, type="out", quantity=3, reference_type="sales_order", reference_id=101, notes="Issued for project Siemens HMI upgrade"),
                StockMovement(organization_id=organization_id, product_id=products[17].id, warehouse_id=warehouses[0].id, type="out", quantity=5, reference_type="sales_order", reference_id=102, notes="Issued for panel wiring"),
                StockMovement(organization_id=organization_id, product_id=products[6].id, warehouse_id=warehouses[0].id, type="out", quantity=30, reference_type="sales_order", reference_id=103, notes="Sensors issued for line automation"),
                StockMovement(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, type="in", quantity=60, reference_type="purchase_order", reference_id=3, notes="PO-003 restock Schneider HMIs"),
                StockMovement(organization_id=organization_id, product_id=products[19].id, warehouse_id=warehouses[2].id, type="adjustment", quantity=-3, reference_type="adjustment", reference_id=None, notes="Damaged contactor write-off"),
                StockMovement(organization_id=organization_id, product_id=products[2].id, warehouse_id=warehouses[1].id, type="in", quantity=500, reference_type="purchase_order", reference_id=4, notes="PO-004 Distributed I/O modules received"),
                StockMovement(organization_id=organization_id, product_id=products[23].id, warehouse_id=warehouses[0].id, type="out", quantity=2, reference_type="sales_order", reference_id=104, notes="Telemetry modules issued"),
                StockMovement(organization_id=organization_id, product_id=products[5].id, warehouse_id=warehouses[0].id, type="out", quantity=15, reference_type="sales_order", reference_id=105, notes="Redundant CPUs for safety panel"),
                StockMovement(organization_id=organization_id, product_id=products[9].id, warehouse_id=warehouses[3].id, type="in", quantity=50, reference_type="purchase_order", reference_id=5, notes="PO-005 transmitters for stock"),
                StockMovement(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, type="in", quantity=10, reference_type="purchase_order", reference_id=6, notes="PO-006 IoT gateways"),
                StockMovement(organization_id=organization_id, product_id=products[14].id, warehouse_id=warehouses[0].id, type="out", quantity=30, reference_type="sales_order", reference_id=106, notes="VFDs for pump control assembly"),
                StockMovement(organization_id=organization_id, product_id=products[25].id, warehouse_id=warehouses[0].id, type="out", quantity=20, reference_type="sales_order", reference_id=107, notes="Cable trays for plant installation"),
                StockMovement(organization_id=organization_id, product_id=products[8].id, warehouse_id=warehouses[1].id, type="adjustment", quantity=5, reference_type="adjustment", reference_id=None, notes="Inventory count correction"),
            ]
            db.add_all(movements)
            await db.flush()
            print(f"  {len(movements)} stock movements created")

            # ── Suppliers (8) ───────────────────────────────────────────
            suppliers = [
                Supplier(organization_id=organization_id, name="Siemens India Limited", email="orders@siemens.co.in", phone="+91-22-6750-1000",
                          address="Birla Aurora, 21st Floor, Dr. Annie Besant Road, Worli", city="Mumbai", state="Maharashtra",
                          gst_number="27AABCT1234E1Z1", contact_person="Rajesh Mehta", payment_terms="Net 45"),
                Supplier(organization_id=organization_id, name="Schneider Electric India", email="supply@schneider.co.in", phone="+91-80-4345-6700",
                          address="Bearys Horizon, 14, DivyaSree Chambers", city="Bangalore", state="Karnataka",
                          gst_number="29AAACU5678E1ZP", contact_person="Priya Kulkarni", payment_terms="Net 30"),
                Supplier(organization_id=organization_id, name="Philips India Ltd — Lighting Division", email="b2b.lighting@philips.com", phone="+91-120-439-2000",
                          address="Philips Innovation Campus, Manyata Tech Park", city="Bangalore", state="Karnataka",
                          gst_number="29AAACP9012E1ZR", contact_person="Arun Nair", payment_terms="Net 60"),
                Supplier(organization_id=organization_id, name="Omron Automation Pvt Ltd", email="project.sales@omron.com", phone="+91-22-3981-8000",
                          address="Omron House, 6A Shantinagar, Santacruz East", city="Mumbai", state="Maharashtra",
                          gst_number="27AABCA3456E1ZT", contact_person="Sneha Deshmukh", payment_terms="Net 30"),
                Supplier(organization_id=organization_id, name="Honeywell Automation India", email="order@honeywell.com", phone="+91-20-2747-3000",
                          address="56 & 57, Hadapsar Industrial Estate", city="Pune", state="Maharashtra",
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
                {"s": 0, "w": 0, "on": "PO-2026-001", "st": "received", "notes": "Bulk PLCs and I/O modules for Q3 projects", "oa": ago(25), "ea": ago(5), "ra": ago(3),
                 "items": [(0, 300, 18000), (2, 500, 11000), (5, 50, 62000)]},
                {"s": 1, "w": 0, "on": "PO-2026-002", "st": "received", "notes": "Monthly Modicon controller replenishment", "oa": ago(20), "ea": ago(2), "ra": ago(1),
                 "items": [(1, 100, 26000)]},
                {"s": 2, "w": 1, "on": "PO-2026-003", "st": "received", "notes": "HMI panel stock restock", "oa": ago(18), "ea": ago(3), "ra": ago(1),
                 "items": [(12, 80, 20000)]},
                {"s": 0, "w": 1, "on": "PO-2026-004", "st": "ordered", "notes": "Distributed I/O and processor modules", "oa": ago(7), "ea": later(7), "ra": None,
                 "items": [(2, 300, 11000), (5, 30, 62000)]},
                {"s": 5, "w": 3, "on": "PO-2026-005", "st": "ordered", "notes": "Enclosures and cable trays restock", "oa": ago(5), "ea": later(10), "ra": None,
                 "items": [(22, 100, 9000), (25, 80, 1300)]},
                {"s": 0, "w": 1, "on": "PO-2026-006", "st": "ordered", "notes": "IoT edge gateways and telemetry panels", "oa": ago(3), "ea": later(14), "ra": None,
                 "items": [(4, 10, 5800), (23, 15, 85000)]},
                {"s": 7, "w": 0, "on": "PO-2026-007", "st": "ordered", "notes": "Havells MCBs and switchgear for panels", "oa": ago(4), "ea": later(10), "ra": None,
                 "items": [(18, 200, 600), (29, 300, 2400)]},
                {"s": 6, "w": 0, "on": "PO-2026-008", "st": "ordered", "notes": "Bosch tools for service crew", "oa": ago(2), "ea": later(15), "ra": None,
                 "items": [(27, 10, 1600), (26, 20, 2600)]},
                {"s": 3, "w": 0, "on": "PO-2026-009", "st": "draft", "notes": "Control cables and photoelectric sensors", "oa": None, "ea": None, "ra": None,
                 "items": [(17, 30, 4800), (19, 20, 2300), (20, 50, 1700)]},
                {"s": 4, "w": 0, "on": "PO-2026-010", "st": "draft", "notes": "Transmitters and level sensors", "oa": None, "ea": None, "ra": None,
                 "items": [(6, 300, 1900), (7, 200, 850)]},
                {"s": 6, "w": 0, "on": "PO-2026-011", "st": "draft", "notes": "Crimping tools and helmets", "oa": None, "ea": None, "ra": None,
                 "items": [(27, 50, 1600), (28, 100, 210)]},
                {"s": 5, "w": 0, "on": "PO-2026-012", "st": "ordered", "notes": "Consumables restock — enclosures and switchgear", "oa": ago(1), "ea": later(5), "ra": None,
                 "items": [(22, 50, 9000), (19, 200, 2300)]},
                {"s": 4, "w": 1, "on": "PO-2026-013", "st": "received", "notes": "Transmitters for plant automation", "oa": ago(30), "ea": ago(5), "ra": ago(2),
                 "items": [(8, 80, 4800)]},
                {"s": 3, "w": 2, "on": "PO-2026-014", "st": "ordered", "notes": "Temperature transmitters — Hosur road project", "oa": ago(6), "ea": later(8), "ra": None,
                 "items": [(8, 15, 4800)]},
                {"s": 1, "w": 1, "on": "PO-2026-015", "st": "received", "notes": "Controller and HMI panels for Noida hub", "oa": ago(12), "ea": ago(1), "ra": ago(0),
                 "items": [(1, 50, 26000), (18, 30, 600), (21, 40, 1050)]},
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
                # IoT Gateway — serial tracked
                SerialNumber(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, serial_number="IOT-GW200-001", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, serial_number="IOT-GW200-002", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, serial_number="IOT-GW200-003", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, serial_number="IOT-GW200-004", status="in_stock"),
                # Siemens KTP1000 HMI — serial tracked
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="HMI-KTP1000-001", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="HMI-KTP1000-002", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="HMI-KTP1000-003", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="HMI-KTP1000-004", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, serial_number="HMI-KTP1000-005", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[1].id, serial_number="HMI-KTP1000-006", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[1].id, serial_number="HMI-KTP1000-007", status="returned"),
                # Drill machine — serial tracked
                SerialNumber(organization_id=organization_id, product_id=products[26].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-001", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[26].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-002", status="in_stock"),
                SerialNumber(organization_id=organization_id, product_id=products[26].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-003", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[26].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-004", status="sold"),
                SerialNumber(organization_id=organization_id, product_id=products[26].id, warehouse_id=warehouses[0].id, serial_number="DM-13MM-005", status="in_stock"),
                # Schneider Graphic HMI — serial tracked (also tracked via purchase order)
                SerialNumber(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, serial_number="HMI-GT7-001", status="in_stock", purchase_order_id=3),
                SerialNumber(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, serial_number="HMI-GT7-002", status="in_stock", purchase_order_id=3),
                SerialNumber(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, serial_number="HMI-GT7-003", status="in_stock", purchase_order_id=3),
                SerialNumber(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, serial_number="HMI-GT7-004", status="returned"),
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
