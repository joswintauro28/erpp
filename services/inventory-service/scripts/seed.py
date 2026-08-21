"""Comprehensive inventory seed — 30 products, 5 warehouses, 8 suppliers, 15 POs,
28 serials, 6 purchase requisitions, 4 work orders, 7 quality checks.

All business identifiers (PO order numbers, serial tags, sales order references, work
order / requisition numbers) are auto-generated from consistent patterns so the
dataset mirrors production behaviour.
"""
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
from app.purchase_requisition.models import PurchaseRequisition, PurchaseRequisitionItem
from app.work_order.models import WorkOrder, WorkOrderOperation, WorkOrderMaterial
from app.quality_check.models import QualityCheck


now = datetime.now(timezone.utc)
def ago(days: int) -> datetime:
    return now - timedelta(days=days)

def later(days: int) -> datetime:
    return now + timedelta(days=days)

def po_timestamps(status: str, ordered_at: datetime | None) -> tuple[datetime | None, datetime | None, datetime | None]:
    """Derive canonical lifecycle timestamps from the PO status."""
    submitted_at = approved_at = cancelled_at = None
    if status != "DRAFT" and ordered_at:
        submitted_at = ordered_at + timedelta(days=1)
    if status in ("APPROVED", "PARTIALLY_RECEIVED", "COMPLETED") and submitted_at:
        approved_at = submitted_at + timedelta(days=2)
    if status == "CANCELLED" and submitted_at:
        cancelled_at = submitted_at + timedelta(days=1)
    return submitted_at, approved_at, cancelled_at


async def seed():
    print("Seeding inventory database...")
    async with async_session_factory() as db:
        try:
            organization_id = 1

            # Clean up existing data first (restart identity so auto-generated IDs are deterministic)
            from sqlalchemy import text
            await db.execute(text("TRUNCATE TABLE quality_checks, work_order_materials, work_order_operations, work_orders, purchase_requisition_items, purchase_requisitions, serial_numbers, purchase_order_items, purchase_orders, stock_movements, stock, products, warehouses, suppliers RESTART IDENTITY CASCADE"))
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
                        tax_rate=Decimal("18.00"), low_stock_threshold=100, qc_required=True),
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
                        tax_rate=Decimal("18.00"), low_stock_threshold=30, make_or_buy="make", qc_required=True),

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
                        tax_rate=Decimal("18.00"), low_stock_threshold=15, make_or_buy="make"),
                Product(organization_id=organization_id, name="Aviation-Grade Telemetry Module", sku="TEL-AV900", barcode="8901234560240",
                        category="Hardware", unit="pcs", price=Decimal("120000.00"), cost_price=Decimal("85000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=5, uses_serial_tracking=True, qc_required=True),
                Product(organization_id=organization_id, name="Flight Data Recorder Interface", sku="FDR-INT10", barcode="8901234560257",
                        category="Hardware", unit="pcs", price=Decimal("30000.00"), cost_price=Decimal("22000.00"),
                        tax_rate=Decimal("18.00"), low_stock_threshold=25, uses_serial_tracking=True, qc_required=True),
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

            # ── Suppliers (8) ───────────────────────────────────────────
            suppliers = [
                Supplier(organization_id=organization_id, name="Siemens India Limited", email="orders@siemens.co.in", phone="+91-22-6750-1000",
                          address="Birla Aurora, 21st Floor, Dr. Annie Besant Road, Worli", city="Mumbai", state="Maharashtra",
                          gst_number="27AABCT1234E1Z1", contact_person="Rajesh Mehta", payment_terms="Net 45", status="ACTIVE"),
                Supplier(organization_id=organization_id, name="Schneider Electric India", email="supply@schneider.co.in", phone="+91-80-4345-6700",
                          address="Bearys Horizon, 14, DivyaSree Chambers", city="Bangalore", state="Karnataka",
                          gst_number="29AAACU5678E1ZP", contact_person="Priya Kulkarni", payment_terms="Net 30", status="ACTIVE"),
                Supplier(organization_id=organization_id, name="Philips India Ltd — Lighting Division", email="b2b.lighting@philips.com", phone="+91-120-439-2000",
                          address="Philips Innovation Campus, Manyata Tech Park", city="Bangalore", state="Karnataka",
                          gst_number="29AAACP9012E1ZR", contact_person="Arun Nair", payment_terms="Net 60", status="INACTIVE"),
                Supplier(organization_id=organization_id, name="Omron Automation Pvt Ltd", email="project.sales@omron.com", phone="+91-22-3981-8000",
                          address="Omron House, 6A Shantinagar, Santacruz East", city="Mumbai", state="Maharashtra",
                          gst_number="27AABCA3456E1ZT", contact_person="Sneha Deshmukh", payment_terms="Net 30", status="ACTIVE"),
                Supplier(organization_id=organization_id, name="Honeywell Automation India", email="order@honeywell.com", phone="+91-20-2747-3000",
                          address="56 & 57, Hadapsar Industrial Estate", city="Pune", state="Maharashtra",
                          gst_number="27AAACF7890E1ZQ", contact_person="Vikram Patil", payment_terms="Net 45", status="ACTIVE"),
                Supplier(organization_id=organization_id, name="Legrand India Pvt Ltd", email="sales@legrand.in", phone="+91-20-6608-2000",
                          address="Plot P-17, MIDC Ranjangaon", city="Pune", state="Maharashtra",
                          gst_number="27AAACL2345E1ZK", contact_person="Anita Desai", payment_terms="Net 30", status="ACTIVE"),
                Supplier(organization_id=organization_id, name="Bosch Power Tools India", email="tools.supply@bosch.in", phone="+91-80-6789-1000",
                          address="Bosch House, Hosur Road, Adugodi", city="Bangalore", state="Karnataka",
                          gst_number="29AAACB6789E1ZW", contact_person="Karan Singh", payment_terms="Net 45", status="ACTIVE"),
                Supplier(organization_id=organization_id, name="Havells India Limited", email="b2b@havells.com", phone="+91-120-477-1000",
                          address="QRG Towers, 6, Sector 16, Institutional Area", city="Noida", state="Uttar Pradesh",
                          gst_number="09AAACH3456E1ZM", contact_person="Ravi Agarwal", payment_terms="Net 30", status="SUSPENDED"),
            ]
            for s in suppliers:
                s.is_active = (s.status == "ACTIVE")
                db.add(s)
            await db.flush()
            print(f"  {len(suppliers)} suppliers created")

            # ── Purchase Orders (15) ────────────────────────────────────
            # status ∈ DRAFT|SUBMITTED|APPROVED|PARTIALLY_RECEIVED|COMPLETED|CANCELLED
            # item tuple: (product_idx, quantity, unit_price, received_quantity)
            pos = [
                {"s": 0, "w": 0, "st": "COMPLETED", "notes": "Bulk PLCs and I/O modules for Q3 projects", "oa": ago(25), "ea": ago(5), "ra": ago(3),
                 "items": [(0, 300, 18000, 300), (2, 500, 11000, 500), (5, 50, 62000, 50)]},
                {"s": 1, "w": 0, "st": "COMPLETED", "notes": "Monthly Modicon controller replenishment", "oa": ago(20), "ea": ago(2), "ra": ago(1),
                 "items": [(1, 100, 26000, 100)]},
                {"s": 2, "w": 1, "st": "COMPLETED", "notes": "HMI panel stock restock", "oa": ago(18), "ea": ago(3), "ra": ago(1),
                 "items": [(12, 80, 20000, 80)]},
                {"s": 0, "w": 1, "st": "APPROVED", "notes": "Distributed I/O and processor modules", "oa": ago(7), "ea": later(7), "ra": None,
                 "items": [(2, 300, 11000, 0), (5, 30, 62000, 0)]},
                {"s": 5, "w": 3, "st": "SUBMITTED", "notes": "Enclosures and cable trays restock", "oa": ago(5), "ea": later(10), "ra": None,
                 "items": [(22, 100, 9000, 0), (25, 80, 1300, 0)]},
                {"s": 0, "w": 1, "st": "SUBMITTED", "notes": "IoT edge gateways and telemetry panels", "oa": ago(3), "ea": later(14), "ra": None,
                 "items": [(4, 10, 5800, 0), (23, 15, 85000, 0)]},
                {"s": 7, "w": 0, "st": "SUBMITTED", "notes": "Havells MCBs and switchgear for panels", "oa": ago(4), "ea": later(10), "ra": None,
                 "items": [(18, 200, 600, 0), (29, 300, 2400, 0)]},
                {"s": 6, "w": 0, "st": "SUBMITTED", "notes": "Bosch tools for service crew", "oa": ago(2), "ea": later(15), "ra": None,
                 "items": [(27, 10, 1600, 0), (26, 20, 2600, 0)]},
                {"s": 3, "w": 0, "st": "DRAFT", "notes": "Control cables and photoelectric sensors", "oa": None, "ea": None, "ra": None,
                 "items": [(17, 30, 4800, 0), (19, 20, 2300, 0), (20, 50, 1700, 0)]},
                {"s": 4, "w": 0, "st": "DRAFT", "notes": "Transmitters and level sensors", "oa": None, "ea": None, "ra": None,
                 "items": [(6, 300, 1900, 0), (7, 200, 850, 0)]},
                {"s": 6, "w": 0, "st": "CANCELLED", "notes": "Crimping tools and helmets — budget withdrawn", "oa": ago(4), "ea": None, "ra": None,
                 "items": [(27, 50, 1600, 0), (28, 100, 210, 0)]},
                {"s": 5, "w": 0, "st": "PARTIALLY_RECEIVED", "notes": "Consumables restock — enclosures and switchgear", "oa": ago(1), "ea": later(5), "ra": None,
                 "items": [(22, 50, 9000, 50), (19, 200, 2300, 80)]},
                {"s": 4, "w": 1, "st": "COMPLETED", "notes": "Transmitters for plant automation", "oa": ago(30), "ea": ago(5), "ra": ago(2),
                 "items": [(8, 80, 4800, 80)]},
                {"s": 3, "w": 2, "st": "SUBMITTED", "notes": "Temperature transmitters — Hosur road project", "oa": ago(6), "ea": later(8), "ra": None,
                 "items": [(8, 15, 4800, 0)]},
                {"s": 1, "w": 1, "st": "COMPLETED", "notes": "Controller and HMI panels for Noida hub", "oa": ago(12), "ea": ago(1), "ra": ago(0),
                 "items": [(1, 50, 26000, 50), (18, 30, 600, 30), (21, 40, 1050, 40)]},
            ]

            po_objects: list[PurchaseOrder] = []
            for i, po_data in enumerate(pos):
                items_data = po_data.pop("items")
                status = po_data["st"]
                submitted_at, approved_at, cancelled_at = po_timestamps(status, po_data["oa"])
                po_month = po_data["oa"].strftime("%Y%m") if po_data["oa"] else now.strftime("%Y%m")
                po = PurchaseOrder(
                    organization_id=organization_id, supplier_id=suppliers[po_data["s"]].id,
                    warehouse_id=warehouses[po_data["w"]].id,
                    order_number=f"PO-{po_month}-{i + 1:04d}", status=status,
                    notes=po_data["notes"],
                    ordered_at=po_data["oa"], submitted_at=submitted_at, approved_at=approved_at,
                    expected_at=po_data["ea"], received_at=po_data["ra"], cancelled_at=cancelled_at,
                )
                db.add(po)
                await db.flush()
                subtotal = Decimal("0.00")
                for p_idx, qty, up, received_qty in items_data:
                    unit_price = Decimal(str(up))
                    item_subtotal = unit_price * qty
                    subtotal += item_subtotal
                    db.add(PurchaseOrderItem(
                        purchase_order_id=po.id, product_id=products[p_idx].id,
                        quantity=qty, received_quantity=received_qty,
                        unit_price=unit_price, subtotal=item_subtotal,
                    ))
                po.subtotal = subtotal
                tax_amount = subtotal * Decimal("0.18")
                po.tax_amount = tax_amount
                po.total = subtotal + tax_amount
                po_objects.append(po)
            await db.flush()
            print(f"  {len(pos)} purchase orders created")

            # ── Stock Movements (15) ────────────────────────────────────
            # reference_id uses the auto-generated PurchaseOrder.id; sales orders use an auto-generated SO code.
            movements = [
                StockMovement(organization_id=organization_id, product_id=products[0].id, warehouse_id=warehouses[0].id, type="in", quantity=500, reference_type="purchase_order", reference_id=po_objects[0].id, notes="PO-202608-0001 received — initial PLC stock"),
                StockMovement(organization_id=organization_id, product_id=products[1].id, warehouse_id=warehouses[0].id, type="in", quantity=100, reference_type="purchase_order", reference_id=po_objects[1].id, notes="PO-202608-0002 — Schneider Modicon stock"),
                StockMovement(organization_id=organization_id, product_id=products[11].id, warehouse_id=warehouses[0].id, type="out", quantity=3, reference_type="sales_order", reference_id=None, notes="SO-202608-0101 — Siemens HMI upgrade project"),
                StockMovement(organization_id=organization_id, product_id=products[17].id, warehouse_id=warehouses[0].id, type="out", quantity=5, reference_type="sales_order", reference_id=None, notes="SO-202608-0102 — panel wiring"),
                StockMovement(organization_id=organization_id, product_id=products[6].id, warehouse_id=warehouses[0].id, type="out", quantity=30, reference_type="sales_order", reference_id=None, notes="SO-202608-0103 — line automation"),
                StockMovement(organization_id=organization_id, product_id=products[12].id, warehouse_id=warehouses[1].id, type="in", quantity=60, reference_type="purchase_order", reference_id=po_objects[2].id, notes="PO-202608-0003 restock Schneider HMIs"),
                StockMovement(organization_id=organization_id, product_id=products[19].id, warehouse_id=warehouses[2].id, type="adjustment", quantity=-3, reference_type="adjustment", reference_id=None, notes="Damaged contactor write-off"),
                StockMovement(organization_id=organization_id, product_id=products[2].id, warehouse_id=warehouses[1].id, type="in", quantity=500, reference_type="purchase_order", reference_id=po_objects[0].id, notes="PO-202608-0001 Distributed I/O modules received"),
                StockMovement(organization_id=organization_id, product_id=products[23].id, warehouse_id=warehouses[0].id, type="out", quantity=2, reference_type="sales_order", reference_id=None, notes="SO-202608-0104 — telemetry modules issued"),
                StockMovement(organization_id=organization_id, product_id=products[5].id, warehouse_id=warehouses[0].id, type="out", quantity=15, reference_type="sales_order", reference_id=None, notes="SO-202608-0105 — redundant CPUs for safety panel"),
                StockMovement(organization_id=organization_id, product_id=products[8].id, warehouse_id=warehouses[1].id, type="in", quantity=80, reference_type="purchase_order", reference_id=po_objects[12].id, notes="PO-202608-0013 transmitters for stock"),
                StockMovement(organization_id=organization_id, product_id=products[4].id, warehouse_id=warehouses[1].id, type="in", quantity=10, reference_type="adjustment", reference_id=None, notes="Initial IoT gateway placement"),
                StockMovement(organization_id=organization_id, product_id=products[14].id, warehouse_id=warehouses[0].id, type="out", quantity=30, reference_type="sales_order", reference_id=None, notes="SO-202608-0106 — VFDs for pump control assembly"),
                StockMovement(organization_id=organization_id, product_id=products[25].id, warehouse_id=warehouses[0].id, type="out", quantity=20, reference_type="sales_order", reference_id=None, notes="SO-202608-0107 — cable trays for plant installation"),
                StockMovement(organization_id=organization_id, product_id=products[8].id, warehouse_id=warehouses[1].id, type="adjustment", quantity=5, reference_type="adjustment", reference_id=None, notes="Inventory count correction"),
            ]
            db.add_all(movements)
            await db.flush()
            print(f"  {len(movements)} stock movements created")

            # ── Serial Numbers (28) ─────────────────────────────────────
            # Serial tags are auto-generated as SN-{SKU}-{NNNN}, SKU bound to the product.
            # product_12 serials were received via PO-003, so they carry the real PO id.
            serial_plan = [
                # (product_idx, warehouse_idx, count, status)
                (4,  1, 3, "in_stock"),
                (4,  1, 1, "reserved"),
                (4,  1, 1, "sold"),
                (4,  1, 1, "in_transit"),
                (11, 0, 4, "in_stock"),
                (11, 0, 2, "sold"),
                (11, 0, 1, "returned"),
                (11, 1, 1, "repair"),
                (11, 1, 1, "in_stock"),
                (26, 0, 3, "in_stock"),
                (26, 0, 2, "sold"),
                (26, 0, 1, "damaged"),
                (12, 1, 3, "in_stock"),
                (12, 1, 1, "returned"),
                (23, 0, 2, "in_stock"),
                (23, 0, 1, "retired"),
            ]

            serials = []
            seq_by_product: dict[int, int] = {}
            # Sold/reserved serials reference the CRM sales-order code that owns them.
            so_code_by_product = {
                4: "SO-202608-0108",    # IoT Gateway Edge Controller → Nimbus Technologies
                11: "SO-202608-0101",   # HMI KTP1000 → Halcyon Media
                26: "SO-202608-0109",   # Drill Machine 13mm → Pinnacle Realty Group
            }
            for p_idx, wh_idx, count, status in serial_plan:
                product = products[p_idx]
                seq_by_product[p_idx] = seq_by_product.get(p_idx, 0) + 1
                first_seq = seq_by_product[p_idx]
                seq_by_product[p_idx] = seq_by_product[p_idx] + count - 1
                for n in range(first_seq, first_seq + count):
                    serial = SerialNumber(
                        organization_id=organization_id,
                        product_id=product.id,
                        warehouse_id=warehouses[wh_idx].id,
                        serial_number=f"SN-{product.sku}-{n:04d}",
                        sku=product.sku,
                        status=status,
                    )
                    if status == "in_stock":
                        serial.activated_at = ago(10 + (n % 20))
                        serial.warranty_until = later(730)
                    elif status == "sold":
                        serial.sold_at = ago(5 + (n % 15))
                        serial.sales_order_code = so_code_by_product.get(p_idx)
                        serial.activated_at = ago(30 + (n % 20))
                    elif status == "reserved":
                        serial.sales_order_code = so_code_by_product.get(p_idx)
                        serial.activated_at = ago(20 + (n % 10))
                    elif status == "in_transit":
                        serial.notes = "Dispatched to regional hub, awaiting scan-in"
                        serial.activated_at = ago(15 + (n % 10))
                    elif status == "returned":
                        serial.notes = "Returned by customer — pending RMA inspection"
                        serial.activated_at = ago(60 + (n % 15))
                    elif status == "repair":
                        serial.notes = "In service centre — display replacement"
                        serial.activated_at = ago(90)
                    elif status == "damaged":
                        serial.notes = "Damaged in transit — awaiting write-off"
                        serial.activated_at = ago(40 + (n % 10))
                    elif status == "retired":
                        serial.notes = "Decommissioned — EOL beyond warranty"
                        serial.activated_at = ago(400)
                    if p_idx == 12 and status == "in_stock":
                        serial.purchase_order_id = po_objects[2].id
                    serials.append(serial)
            db.add_all(serials)
            await db.flush()
            print(f"  {len(serials)} serial numbers created")

            # ── Purchase Requisitions (6) ──────────────────────────────
            # Lifecycle: DRAFT -> SUBMITTED -> APPROVED | REJECTED -> CONVERTED | CANCELLED
            requisitions = [
                {
                    "pr_number": "PR-202608-0001", "title": "VFD replenishment for pump control skids",
                    "dept": "Operations", "priority": "MEDIUM", "status": "DRAFT",
                    "items": [(13, 20, 24000), (14, 30, 10500)],
                },
                {
                    "pr_number": "PR-202608-0002", "title": "Transmitters for plant automation expansion",
                    "dept": "Engineering", "priority": "HIGH", "status": "SUBMITTED", "need_in": 10,
                    "items": [(8, 25, 4800), (9, 15, 13000)],
                },
                {
                    "pr_number": "PR-202608-0003", "title": "Switchgear and cable for panel builds",
                    "dept": "Operations", "priority": "HIGH", "status": "APPROVED", "need_in": 7,
                    "items": [(19, 40, 2300), (20, 60, 1700), (17, 20, 4800)],
                },
                {
                    "pr_number": "PR-202608-0004", "title": "Servo systems bulk buy",
                    "dept": "Engineering", "priority": "LOW", "status": "REJECTED",
                    "items": [(15, 5, 55000)],
                },
                {
                    "pr_number": "PR-202608-0005", "title": "Distributed I/O modules for Noida hub",
                    "dept": "Operations", "priority": "MEDIUM", "status": "CONVERTED",
                    "items": [(2, 300, 11000)],
                },
                {
                    "pr_number": "PR-202608-0006", "title": "Bosch tooling for service crew",
                    "dept": "Service", "priority": "MEDIUM", "status": "SUBMITTED", "need_in": 15,
                    "items": [(26, 10, 2600), (27, 20, 1600)],
                },
            ]
            for idx, r in enumerate(requisitions):
                status = r["status"]
                approved_at = ago(6) if status in ("APPROVED", "CONVERTED") else None
                pr = PurchaseRequisition(
                    organization_id=organization_id,
                    pr_number=r["pr_number"],
                    title=r["title"],
                    requested_by="Inventory Planner",
                    department=r["dept"],
                    priority=r["priority"],
                    need_by_date=later(r.get("need_in", 21)) if status not in ("DRAFT", "REJECTED") else None,
                    notes="Auto-seeded internal buy request",
                    status=status,
                    approved_by="4" if status in ("APPROVED", "CONVERTED") else None,
                    approved_at=approved_at,
                    rejected_reason="Budget not approved for this quarter" if status == "REJECTED" else None,
                    purchase_order_id=po_objects[3].id if status == "CONVERTED" else None,
                    created_at=ago(30 - idx * 3),
                )
                db.add(pr)
                await db.flush()
                for p_idx, qty, est in r["items"]:
                    db.add(PurchaseRequisitionItem(
                        requisition_id=pr.id,
                        product_id=products[p_idx].id,
                        product_name=products[p_idx].name,
                        quantity=qty,
                        estimated_price=Decimal(str(est)),
                    ))
            await db.flush()
            print(f"  {len(requisitions)} purchase requisitions created")

            # ── Manufacturing Work Orders (4) ──────────────────────────
            # Lifecycle: DRAFT -> RELEASED -> IN_PROGRESS -> COMPLETED | CANCELLED
            work_orders = [
                {
                    "wo_no": "WO-202608-0001", "product_idx": 5, "qty": 20, "priority": "MEDIUM",
                    "status": "DRAFT", "due_in": 21, "notes": "Planned run for redundant CPU back-orders",
                    "operations": [
                        (1, "Solder PCB Assembly", "SMT Line", "PENDING"),
                        (2, "Firmware Flashing & Burn-in", "Test Bay", "PENDING"),
                        (3, "QA Calibration", "QC Lab", "PENDING"),
                    ],
                    "materials": [(2, 20, 0)],
                },
                {
                    "wo_no": "WO-202608-0002", "product_idx": 22, "qty": 40, "priority": "HIGH",
                    "status": "RELEASED", "due_in": 14, "released_at": ago(3),
                    "notes": "Panel enclosures for Q3 switchgear contracts",
                    "operations": [
                        (1, "Cut & Prep Sheet Metal", "Fabrication", "PENDING"),
                        (2, "Weld Frame", "Fabrication", "PENDING"),
                        (3, "Powder Coat & Final Inspection", "Finishing", "PENDING"),
                    ],
                    "materials": [(18, 40, 0), (19, 40, 0)],
                },
                {
                    "wo_no": "WO-202608-0003", "product_idx": 5, "qty": 15, "priority": "HIGH",
                    "status": "IN_PROGRESS", "due_in": 7, "released_at": ago(5), "started_at": ago(4),
                    "notes": "Rush order — safety panel CPUs for Delta Automotive",
                    "operations": [
                        (1, "Solder PCB Assembly", "SMT Line", "COMPLETED"),
                        (2, "Firmware Flashing & Burn-in", "Test Bay", "IN_PROGRESS"),
                        (3, "QA Calibration", "QC Lab", "PENDING"),
                    ],
                    "materials": [(2, 15, 15)],
                },
                {
                    "wo_no": "WO-202608-0004", "product_idx": 5, "qty": 10, "priority": "MEDIUM",
                    "status": "COMPLETED", "due_in": -2, "released_at": ago(20), "started_at": ago(19), "completed_at": ago(2),
                    "notes": "Completed production run — credited 10 units to Main Warehouse",
                    "operations": [
                        (1, "Solder PCB Assembly", "SMT Line", "COMPLETED"),
                        (2, "Firmware Flashing & Burn-in", "Test Bay", "COMPLETED"),
                        (3, "QA Calibration", "QC Lab", "COMPLETED"),
                    ],
                    "materials": [(2, 10, 10)],
                },
            ]
            for w in work_orders:
                product = products[w["product_idx"]]
                wo = WorkOrder(
                    organization_id=organization_id,
                    work_order_no=w["wo_no"],
                    product_id=product.id,
                    product_name=product.name,
                    sku=product.sku,
                    quantity=w["qty"],
                    warehouse_id=warehouses[0].id,
                    status=w["status"],
                    priority=w["priority"],
                    due_date=later(w["due_in"]),
                    notes=w["notes"],
                    created_by="4",
                    released_at=w.get("released_at"),
                    started_at=w.get("started_at"),
                    completed_at=w.get("completed_at"),
                )
                db.add(wo)
                await db.flush()
                for seq, name, wc, op_status in w["operations"]:
                    db.add(WorkOrderOperation(
                        work_order_id=wo.id,
                        sequence=seq,
                        operation_name=name,
                        workcenter=wc,
                        status=op_status,
                        completed_at=ago(2) if op_status == "COMPLETED" else None,
                    ))
                for mat_idx, req, issued in w["materials"]:
                    mp = products[mat_idx]
                    db.add(WorkOrderMaterial(
                        work_order_id=wo.id,
                        product_id=mp.id,
                        product_name=mp.name,
                        sku=mp.sku,
                        quantity_required=req,
                        quantity_issued=issued,
                    ))
            await db.flush()
            print(f"  {len(work_orders)} work orders created")

            # ── Quality Checks (7) ─────────────────────────────────────
            # Auto-created as PENDING on GRN for qc_required products; the
            # records below show the PENDING -> PASS | FAIL lifecycle.
            qc_plan = [
                # (product_idx, po_index, qty, status, inspected_at, notes)
                (0, 0, 300, "PASS", ago(2), "All units within tolerance — batch release approved"),
                (5, 0, 50, "PASS", ago(2), "Burned-in 48h, no faults detected"),
                (12, 2, 80, "PASS", ago(1), "Panel alignment verified — ready for dispatch"),
                (1, 1, 100, "PASS", ago(1), "Firmware version confirmed"),
                (22, 11, 50, "PENDING", None, None),
                (19, 11, 80, "PENDING", None, None),
                (8, 12, 80, "FAIL", ago(2), "Calibration drift outside ±0.5% tolerance — quarantine lot"),
            ]
            for p_idx, po_idx, qty, status, inspected_at, notes in qc_plan:
                db.add(QualityCheck(
                    organization_id=organization_id,
                    po_id=po_objects[po_idx].id,
                    po_item_id=None,
                    product_id=products[p_idx].id,
                    product_name=products[p_idx].name,
                    quantity=qty,
                    status=status,
                    inspected_by="4" if status in ("PASS", "FAIL", "HOLD") else None,
                    inspected_at=inspected_at,
                    notes=notes,
                ))
            await db.flush()
            print(f"  {len(qc_plan)} quality checks created")

            await db.commit()
            print("\nInventory seeding completed successfully!")
            print(f"Total records: {len(warehouses)+len(products)+len(stock_records)+len(movements)+len(suppliers)+len(pos)+len(serials)+len(requisitions)+len(work_orders)+len(qc_plan)}")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()
            raise

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
