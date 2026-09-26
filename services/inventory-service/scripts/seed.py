"""Comprehensive inventory seed supporting dev and testing profiles with multi-tenant org scoping."""
import asyncio
import sys
import os
import argparse
from datetime import datetime, timedelta, timezone
from decimal import Decimal

# Add CWD and repo root to python path to resolve app module imports
service_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
repo_root = os.path.abspath(os.path.join(service_dir, "..", ".."))
sys.path.append(service_dir)
sys.path.append(repo_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(service_dir, ".env"))

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
from scripts.seed_lib.orgs import SUPPLIERS as CANONICAL_SUPPLIERS

now = datetime.now(timezone.utc)
def ago(days: int) -> datetime:
    return now - timedelta(days=days)

def later(days: int) -> datetime:
    return now + timedelta(days=days)

def po_timestamps(status: str, ordered_at: datetime | None) -> tuple[datetime | None, datetime | None, datetime | None]:
    submitted_at = approved_at = cancelled_at = None
    if status != "DRAFT" and ordered_at:
        submitted_at = ordered_at + timedelta(days=1)
    if status in ("APPROVED", "PARTIALLY_RECEIVED", "COMPLETED") and submitted_at:
        approved_at = submitted_at + timedelta(days=2)
    if status == "CANCELLED" and submitted_at:
        cancelled_at = submitted_at + timedelta(days=1)
    return submitted_at, approved_at, cancelled_at


async def seed_dev(db):
    print("Seeding inventory database [Profile: dev]...")

    # ── ORG 1 (DATAVEX Industries) ──────────────────────────────────
    # Warehouses (5)
    warehouses_org1 = [
        Warehouse(organization_id=1, name="Main Warehouse — Whitefield", code="WH-MAIN", address="42, Industrial Layout, Whitefield", city="Bangalore", state="Karnataka", country="India"),
        Warehouse(organization_id=1, name="Secondary — Peenya Industrial Area", code="WH-PEE", address="88, Peenya Phase 2, Bangalore North", city="Bangalore", state="Karnataka", country="India"),
        Warehouse(organization_id=1, name="Cold Storage — Hosur Road", code="WH-COLD", address="15, Electronics City, Hosur Road", city="Bangalore", state="Karnataka", country="India"),
        Warehouse(organization_id=1, name="Distribution Center — Bhiwandi", code="WH-DC", address="Plot 7, Bhiwandi Industrial Estate", city="Bhiwandi", state="Maharashtra", country="India"),
        Warehouse(organization_id=1, name="North India Hub — Noida", code="WH-NOIDA", address="Sector 63, Noida Special Economic Zone", city="Noida", state="Uttar Pradesh", country="India"),
    ]
    for w in warehouses_org1:
        db.add(w)
    await db.flush()
    print(f"  Org 1: {len(warehouses_org1)} warehouses created")

    # Products (30)
    products_org1 = [
        # Controllers (6)
        Product(organization_id=1, name="PLC CPU Module — Siemens S7-1200", sku="PLC-S71200", barcode="8901234560011", category="Controllers", unit="pcs", price=Decimal("25000.00"), cost_price=Decimal("18000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=100, qc_required=True),
        Product(organization_id=1, name="Industrial Controller X200 — Schneider Modicon", sku="IC-X200", barcode="8901234560028", category="Controllers", unit="pcs", price=Decimal("35000.00"), cost_price=Decimal("26000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=50),
        Product(organization_id=1, name="Distributed I/O Interface — Siemens ET200", sku="IO-ET200", barcode="8901234560066", category="Controllers", unit="pcs", price=Decimal("15000.00"), cost_price=Decimal("11000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=200),
        Product(organization_id=1, name="Micro PLC Controller — Omron CP1E", sku="PLC-CP1E", barcode="8901234560134", category="Controllers", unit="pcs", price=Decimal("12000.00"), cost_price=Decimal("8500.00"), tax_rate=Decimal("18.00"), low_stock_threshold=15),
        Product(organization_id=1, name="IoT Gateway Edge Controller", sku="IOT-GW200", barcode="8901234560165", category="Controllers", unit="pcs", price=Decimal("8500.00"), cost_price=Decimal("5800.00"), tax_rate=Decimal("18.00"), low_stock_threshold=5, uses_serial_tracking=True),
        Product(organization_id=1, name="Redundant CPU Processor Panel", sku="CPU-RED500", barcode="8901234560172", category="Controllers", unit="pcs", price=Decimal("85000.00"), cost_price=Decimal("62000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=30, make_or_buy="make", qc_required=True),
        # Sensors (5)
        Product(organization_id=1, name="Photoelectric Sensor — Omron E3Z", sku="SEN-E3Z", barcode="8901234560035", category="Sensors", unit="pcs", price=Decimal("2800.00"), cost_price=Decimal("1900.00"), tax_rate=Decimal("18.00"), low_stock_threshold=150),
        Product(organization_id=1, name="Inductive Proximity Sensor — Omron", sku="SEN-PRX12", barcode="8901234560042", category="Sensors", unit="pcs", price=Decimal("1200.00"), cost_price=Decimal("850.00"), tax_rate=Decimal("18.00"), low_stock_threshold=80),
        Product(organization_id=1, name="Smart Temperature Transmitter — Honeywell", sku="TX-TEMP", barcode="8901234560073", category="Sensors", unit="pcs", price=Decimal("6500.00"), cost_price=Decimal("4800.00"), tax_rate=Decimal("18.00"), low_stock_threshold=100, qc_required=True),
        Product(organization_id=1, name="Differential Pressure Transmitter", sku="TX-DP900", barcode="8901234560080", category="Sensors", unit="pcs", price=Decimal("18000.00"), cost_price=Decimal("13000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=60),
        Product(organization_id=1, name="Ultrasonic Level Sensor — Honeywell", sku="SEN-USL30", barcode="8901234560141", category="Sensors", unit="pcs", price=Decimal("14500.00"), cost_price=Decimal("10500.00"), tax_rate=Decimal("18.00"), low_stock_threshold=20),
        # HMIs (2)
        Product(organization_id=1, name="HMI Touch Panel 10-inch — Siemens KTP1000", sku="HMI-KTP1000", barcode="8901234560059", category="Controllers", unit="pcs", price=Decimal("42000.00"), cost_price=Decimal("31000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=25, uses_serial_tracking=True),
        Product(organization_id=1, name="HMI Graphic Terminal 7-inch — Schneider", sku="HMI-GT7", barcode="8901234560158", category="Controllers", unit="pcs", price=Decimal("28000.00"), cost_price=Decimal("20000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=20, uses_serial_tracking=True, qc_required=True),
        # Motors & Drives (3)
        Product(organization_id=1, name="Variable Frequency Drive 5.5kW — Siemens", sku="VFD-5.5KW", barcode="8901234560097", category="Motors & Drives", unit="pcs", price=Decimal("32000.00"), cost_price=Decimal("24000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=50),
        Product(organization_id=1, name="Compact VFD Drive 1.5kW — Omron", sku="VFD-1.5KW", barcode="8901234560103", category="Motors & Drives", unit="pcs", price=Decimal("14500.00"), cost_price=Decimal("10500.00"), tax_rate=Decimal("18.00"), low_stock_threshold=80),
        Product(organization_id=1, name="Servo Motor & Drive System — Schneider", sku="SRV-DRV100", barcode="8901234560189", category="Motors & Drives", unit="pcs", price=Decimal("75000.00"), cost_price=Decimal("55000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=5, make_or_buy="make"),
        # Power & Switchgear (6)
        Product(organization_id=1, name="Power Supply 24V DC 10A — Siemens SITOP", sku="PS-24V10A", barcode="8901234560110", category="Switchgear", unit="pcs", price=Decimal("6500.00"), cost_price=Decimal("4800.00"), tax_rate=Decimal("18.00"), low_stock_threshold=15),
        Product(organization_id=1, name="Industrial Control Cable 2.5mm² (50m Roll)", sku="CAB-2.5MM", barcode="8901234560127", category="Cables", unit="pcs", price=Decimal("6200.00"), cost_price=Decimal("4800.00"), tax_rate=Decimal("18.00"), low_stock_threshold=20),
        Product(organization_id=1, name="MCB 32A Triple Pole — Havells", sku="MCB-33A", barcode="8901234560196", category="Switchgear", unit="pcs", price=Decimal("850.00"), cost_price=Decimal("600.00"), tax_rate=Decimal("18.00"), low_stock_threshold=50),
        Product(organization_id=1, name="Magnetic Contactor 40A — Schneider LC1D", sku="CON-40A", barcode="8901234560202", category="Switchgear", unit="pcs", price=Decimal("3200.00"), cost_price=Decimal("2300.00"), tax_rate=Decimal("18.00"), low_stock_threshold=40),
        Product(organization_id=1, name="Overload Relay 18-25A — Siemens", sku="REL-1825A", barcode="8901234560219", category="Switchgear", unit="pcs", price=Decimal("2400.00"), cost_price=Decimal("1700.00"), tax_rate=Decimal("18.00"), low_stock_threshold=30),
        Product(organization_id=1, name="LED Panel Indicator Light 22mm — Philips", sku="IND-22MM", barcode="8901234560226", category="Switchgear", unit="pcs", price=Decimal("150.00"), cost_price=Decimal("95.00"), tax_rate=Decimal("18.00"), low_stock_threshold=100),
        # Hardware & Enclosures (4)
        Product(organization_id=1, name="IP65 Control Panel Enclosure 600x600", sku="ENC-IP65", barcode="8901234560233", category="Enclosures", unit="pcs", price=Decimal("12500.00"), cost_price=Decimal("9000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=15, make_or_buy="make", qc_required=True),
        Product(organization_id=1, name="Aviation-Grade Telemetry Module", sku="TEL-AV900", barcode="8901234560240", category="Controllers", unit="pcs", price=Decimal("120000.00"), cost_price=Decimal("85000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=5, uses_serial_tracking=True),
        Product(organization_id=1, name="Flight Data Recorder Interface", sku="FDR-INT10", barcode="8901234560257", category="Controllers", unit="pcs", price=Decimal("30000.00"), cost_price=Decimal("21000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=10),
        Product(organization_id=1, name="Perforated Cable Tray 3m — Legrand", sku="CT-3M-LEG", barcode="8901234560264", category="Cables", unit="pcs", price=Decimal("1800.00"), cost_price=Decimal("1300.00"), tax_rate=Decimal("18.00"), low_stock_threshold=50),
        # Tools & Consumables (4)
        Product(organization_id=1, name="Drill Machine 13mm — Bosch", sku="DM-13MM", barcode="8901234560271", category="Tools", unit="pcs", price=Decimal("3500.00"), cost_price=Decimal("2600.00"), tax_rate=Decimal("18.00"), low_stock_threshold=10, uses_serial_tracking=True),
        Product(organization_id=1, name="Wire Crimping Tool Set — Bosch", sku="WCT-8PC", barcode="8901234560288", category="Tools", unit="pcs", price=Decimal("2200.00"), cost_price=Decimal("1600.00"), tax_rate=Decimal("18.00"), low_stock_threshold=25),
        Product(organization_id=1, name="Safety Helmet with Visor — Industrial", sku="SH-IND01", barcode="8901234560295", category="Safety", unit="pcs", price=Decimal("350.00"), cost_price=Decimal("210.00"), tax_rate=Decimal("18.00"), low_stock_threshold=50),
        Product(organization_id=1, name="Industrial Power Strip 8-way Heavy Duty", sku="PS-8WAY", barcode="8901234560301", category="Switchgear", unit="pcs", price=Decimal("3200.00"), cost_price=Decimal("2400.00"), tax_rate=Decimal("18.00"), low_stock_threshold=30),
    ]
    for p in products_org1:
        db.add(p)
    await db.flush()
    print(f"  Org 1: {len(products_org1)} products created")

    # Stock records for Org 1
    stock_map = {
        0: [(0, 480)], 1: [(0, 400)], 2: [(1, 280), (3, 220)], 3: [(0, 8)], 4: [(1, 3)], 5: [(0, 20)],
        6: [(0, 50)], 7: [(0, 150)], 8: [(1, 60)], 9: [(0, 100), (3, 50)], 10: [(0, 80)], 11: [(0, 12), (1, 8)],
        12: [(1, 60), (4, 40)], 13: [(0, 200)], 14: [(0, 150), (1, 100)], 15: [(0, 20)], 16: [(0, 10)],
        17: [(0, 30), (2, 15)], 18: [(0, 40)], 19: [(0, 25), (2, 10)], 20: [(0, 50)], 21: [(1, 30)],
        22: [(0, 20)], 23: [(0, 8)], 24: [(0, 30)], 25: [(0, 60), (1, 40)], 26: [(0, 40)], 27: [(0, 200)],
        28: [(0, 80)], 29: [(0, 60)],
    }
    for p_idx, placements in stock_map.items():
        for wh_idx, qty in placements:
            db.add(Stock(organization_id=1, product_id=products_org1[p_idx].id, warehouse_id=warehouses_org1[wh_idx].id, quantity=qty))
    await db.flush()

    # Suppliers for Org 1 (8)
    suppliers_org1 = []
    for s_data in CANONICAL_SUPPLIERS:
        sup = Supplier(
            organization_id=1,
            name=s_data["name"],
            email=s_data["email"],
            phone=s_data["phone"],
            address="Industrial Zone",
            city=s_data["city"],
            state=s_data["state"],
            gst_number=s_data["gst_number"],
            contact_person=s_data["contact_name"],
            payment_terms=s_data["payment_terms"],
            status="ACTIVE",
            is_active=True,
        )
        db.add(sup)
        suppliers_org1.append(sup)
    await db.flush()

    # Purchase Orders for Org 1 (15)
    pos_data = [
        {"s": 0, "w": 0, "st": "COMPLETED", "notes": "Bulk PLCs and I/O modules", "oa": ago(25), "ea": ago(5), "ra": ago(3), "items": [(0, 300, 18000, 300), (2, 500, 11000, 500)]},
        {"s": 1, "w": 0, "st": "COMPLETED", "notes": "Monthly Modicon controller", "oa": ago(20), "ea": ago(2), "ra": ago(1), "items": [(1, 100, 26000, 100)]},
        {"s": 2, "w": 1, "st": "COMPLETED", "notes": "HMI panel stock restock", "oa": ago(18), "ea": ago(3), "ra": ago(1), "items": [(12, 80, 20000, 80)]},
        {"s": 0, "w": 1, "st": "APPROVED", "notes": "Distributed I/O modules", "oa": ago(7), "ea": later(7), "ra": None, "items": [(2, 300, 11000, 0)]},
        {"s": 5, "w": 3, "st": "SUBMITTED", "notes": "Enclosures and cable trays", "oa": ago(5), "ea": later(10), "ra": None, "items": [(22, 100, 9000, 0)]},
    ]
    po_objs_org1 = []
    for i, po_d in enumerate(pos_data):
        items_d = po_d.pop("items")
        sub_at, app_at, can_at = po_timestamps(po_d["st"], po_d["oa"])
        po = PurchaseOrder(
            organization_id=1, supplier_id=suppliers_org1[po_d["s"]].id, warehouse_id=warehouses_org1[po_d["w"]].id,
            order_number=f"PO-202608-{i + 1:04d}", status=po_d["st"], notes=po_d["notes"],
            ordered_at=po_d["oa"], submitted_at=sub_at, approved_at=app_at, expected_at=po_d["ea"], received_at=po_d["ra"], cancelled_at=can_at,
        )
        db.add(po)
        await db.flush()
        subtotal = Decimal("0.00")
        for p_idx, qty, up, rec_qty in items_d:
            up_dec = Decimal(str(up))
            amt = up_dec * qty
            subtotal += amt
            db.add(PurchaseOrderItem(purchase_order_id=po.id, product_id=products_org1[p_idx].id, quantity=qty, received_quantity=rec_qty, unit_price=up_dec, subtotal=amt))
        po.subtotal = subtotal
        po.tax_amount = subtotal * Decimal("0.18")
        po.total = subtotal + po.tax_amount
        po_objs_org1.append(po)
    await db.flush()

    # Stock movements Org 1
    db.add(StockMovement(organization_id=1, product_id=products_org1[0].id, warehouse_id=warehouses_org1[0].id, type="in", quantity=500, reference_type="purchase_order", reference_id=po_objs_org1[0].id, notes="PO-202608-0001 received"))
    db.add(StockMovement(organization_id=1, product_id=products_org1[11].id, warehouse_id=warehouses_org1[0].id, type="out", quantity=3, reference_type="sales_order", reference_id=None, notes="SO-202608-0101 Siemens HMI"))
    await db.flush()

    # Serial numbers Org 1
    db.add(SerialNumber(organization_id=1, product_id=products_org1[4].id, warehouse_id=warehouses_org1[1].id, serial_number="SN-IOT-GW200-0001", sku="IOT-GW200", status="in_stock", activated_at=ago(15), warranty_until=later(730)))
    db.add(SerialNumber(organization_id=1, product_id=products_org1[11].id, warehouse_id=warehouses_org1[0].id, serial_number="SN-HMI-KTP1000-0001", sku="HMI-KTP1000", status="sold", sold_at=ago(5), sales_order_code="SO-202608-0101"))
    await db.flush()

    # Purchase Requisition Org 1
    pr1 = PurchaseRequisition(organization_id=1, pr_number="PR-202608-0001", title="VFD replenishment skids", department="Operations", priority="MEDIUM", status="APPROVED", requested_by="Sam Rivera")
    db.add(pr1)
    await db.flush()
    db.add(PurchaseRequisitionItem(requisition_id=pr1.id, product_id=products_org1[13].id, product_name=products_org1[13].name, quantity=20, estimated_price=Decimal("24000.00")))
    await db.flush()

    # Quality Check Org 1
    db.add(QualityCheck(organization_id=1, po_id=po_objs_org1[0].id, product_id=products_org1[0].id, product_name=products_org1[0].name, quantity=300, status="PASS", inspected_by="4", inspected_at=ago(2), notes="Batch release approved"))
    await db.flush()

    # ── ORG 2 (Eternal) ──────────────────────────────────────────────
    wh_org2 = Warehouse(organization_id=2, name="Eternal Distribution Hub", code="WH-ET01", address="Industrial Zone Phase 1", city="Bangalore", state="Karnataka", country="India")
    db.add(wh_org2)
    await db.flush()

    products_org2 = [
        Product(organization_id=2, name="PLC CPU Module — Siemens S7-1200", sku="O2-PLC-S71200", barcode="8901234590011", category="Controllers", unit="pcs", price=Decimal("25000.00"), cost_price=Decimal("18000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=50),
        Product(organization_id=2, name="Aviation-Grade Telemetry Module", sku="O2-TEL-AV900", barcode="8901234590028", category="Controllers", unit="pcs", price=Decimal("120000.00"), cost_price=Decimal("85000.00"), tax_rate=Decimal("18.00"), low_stock_threshold=5, uses_serial_tracking=True),
        Product(organization_id=2, name="Photoelectric Sensor — Omron E3Z", sku="O2-SEN-E3Z", barcode="8901234590035", category="Sensors", unit="pcs", price=Decimal("2800.00"), cost_price=Decimal("1900.00"), tax_rate=Decimal("18.00"), low_stock_threshold=20),
    ]
    for p in products_org2:
        db.add(p)
    await db.flush()

    for p in products_org2:
        db.add(Stock(organization_id=2, product_id=p.id, warehouse_id=wh_org2.id, quantity=50))
    await db.flush()

    sup_org2 = Supplier(
        organization_id=2, name="Siemens India Limited", email="orders@siemens.co.in", phone="+91-22-6750-1000",
        address="Worli", city="Mumbai", state="Maharashtra", gst_number="27AABCT1234E1Z1", contact_person="Rajesh Mehta",
        payment_terms="Net 30", status="ACTIVE", is_active=True,
    )
    db.add(sup_org2)
    await db.flush()

    po_org2 = PurchaseOrder(
        organization_id=2, supplier_id=sup_org2.id, warehouse_id=wh_org2.id, order_number="PO-202608-0201",
        status="COMPLETED", notes="Initial telemetry stock", ordered_at=ago(15), submitted_at=ago(14), approved_at=ago(12),
        expected_at=ago(3), received_at=ago(1), subtotal=Decimal("240000.00"), tax_amount=Decimal("43200.00"), total=Decimal("283200.00"),
    )
    db.add(po_org2)
    await db.flush()
    db.add(PurchaseOrderItem(purchase_order_id=po_org2.id, product_id=products_org2[1].id, quantity=2, received_quantity=2, unit_price=Decimal("120000.00"), subtotal=Decimal("240000.00")))

    db.add(SerialNumber(organization_id=2, product_id=products_org2[1].id, warehouse_id=wh_org2.id, serial_number="SN-O2-TEL-0001", sku="O2-TEL-AV900", status="in_stock", activated_at=ago(1)))
    db.add(QualityCheck(organization_id=2, po_id=po_org2.id, product_id=products_org2[1].id, product_name=products_org2[1].name, quantity=2, status="PASS", inspected_by="2", inspected_at=ago(1), notes="Aviation calibration certified"))
    await db.flush()

    # ── ORG 3 (Zomato) ───────────────────────────────────────────────
    wh_org3 = Warehouse(organization_id=3, name="Zomato Cold Chain Depot", code="WH-ZM01", city="Bangalore", state="Karnataka", country="India")
    db.add(wh_org3)
    await db.flush()
    p_org3 = Product(organization_id=3, name="Cold Chain Temp Sensor", sku="O3-COOL-PKG", category="Sensors", unit="pcs", price=Decimal("4500.00"), cost_price=Decimal("3000.00"))
    db.add(p_org3)
    await db.flush()
    db.add(Stock(organization_id=3, product_id=p_org3.id, warehouse_id=wh_org3.id, quantity=100))

    # ── ORG 4 (Blinkit) ──────────────────────────────────────────────
    wh_org4 = Warehouse(organization_id=4, name="Blinkit Dark Store Hub", code="WH-BL01", city="Bangalore", state="Karnataka", country="India")
    db.add(wh_org4)
    await db.flush()
    p_org4 = Product(organization_id=4, name="Handheld Barcode Scanner", sku="O4-SCAN-HH", category="Tools", unit="pcs", price=Decimal("6500.00"), cost_price=Decimal("4200.00"))
    db.add(p_org4)
    await db.flush()
    db.add(Stock(organization_id=4, product_id=p_org4.id, warehouse_id=wh_org4.id, quantity=25))

    # ── ORG 5 (District) ─────────────────────────────────────────────
    # Strictly 0 warehouses, 0 products, 0 stock (empty-state verification)
    print("  Org 5 left with 0 inventory records (empty-state verification).")

    await db.commit()
    print("Dev profile inventory seeding completed successfully!")


async def seed_testing(db):
    print("Seeding inventory database [Profile: testing]...")

    categories = ["Controllers", "Sensors", "Motors & Drives", "Switchgear", "Cables", "Tools"]

    async def bulk_seed_inventory(org_id: int, product_count: int, wh_count: int, po_count: int, serial_count: int, prefix: str):
        print(f"  Generating bulk inventory for Org {org_id} ({product_count} products, {wh_count} warehouses, {po_count} POs, {serial_count} serials)...")

        # 1. Warehouses
        warehouses = []
        for w_idx in range(1, wh_count + 1):
            warehouses.append(
                Warehouse(
                    organization_id=org_id,
                    name=f"Warehouse Hub {prefix}-{w_idx}",
                    code=f"WH-{prefix}-{str(w_idx).zfill(2)}",
                    address=f"Plot {w_idx * 12}, Industrial Area",
                    city="Bangalore" if w_idx % 2 == 0 else "Mumbai",
                    state="Karnataka" if w_idx % 2 == 0 else "Maharashtra",
                    country="India",
                )
            )
        db.add_all(warehouses)
        await db.flush()

        # 2. Suppliers
        suppliers = []
        for s_idx in range(1, 9):
            s_data = CANONICAL_SUPPLIERS[(s_idx - 1) % len(CANONICAL_SUPPLIERS)]
            suppliers.append(
                Supplier(
                    organization_id=org_id,
                    name=f"{s_data['name']} ({prefix})" if org_id > 1 else s_data["name"],
                    email=s_data["email"],
                    phone=s_data["phone"],
                    address="Industrial Zone",
                    city=s_data["city"],
                    state=s_data["state"],
                    gst_number=s_data["gst_number"],
                    contact_person=s_data["contact_name"],
                    payment_terms=s_data["payment_terms"],
                    status="ACTIVE",
                    is_active=True,
                )
            )
        db.add_all(suppliers)
        await db.flush()

        # 3. Products
        products = []
        for p_idx in range(1, product_count + 1):
            cat = categories[p_idx % len(categories)]
            price = Decimal(str(((p_idx * 17) % 50 + 5) * 1000))
            cost = price * Decimal("0.7")
            sku = f"{prefix}-SKU-{str(p_idx).zfill(4)}"
            products.append(
                Product(
                    organization_id=org_id,
                    name=f"Standard Component #{p_idx} ({cat})",
                    sku=sku,
                    barcode=f"890123{org_id:02d}{p_idx:05d}",
                    category=cat,
                    unit="pcs",
                    price=price,
                    cost_price=cost,
                    tax_rate=Decimal("18.00"),
                    low_stock_threshold=20,
                    uses_serial_tracking=(p_idx % 3 == 0),
                    qc_required=(p_idx % 4 == 0),
                )
            )
        db.add_all(products)
        await db.flush()

        # 4. Stock records
        for p in products:
            for w in warehouses[:2]:
                db.add(Stock(organization_id=org_id, product_id=p.id, warehouse_id=w.id, quantity=(p.id * 13) % 150 + 10))
        await db.flush()

        # 5. Purchase Orders
        po_statuses = ["COMPLETED", "APPROVED", "SUBMITTED", "PARTIALLY_RECEIVED", "DRAFT", "CANCELLED"]
        pos = []
        for i in range(1, po_count + 1):
            st = po_statuses[i % len(po_statuses)]
            oa = ago((i % 40) + 1)
            sub_at, app_at, can_at = po_timestamps(st, oa)
            po = PurchaseOrder(
                organization_id=org_id,
                supplier_id=suppliers[i % len(suppliers)].id,
                warehouse_id=warehouses[i % len(warehouses)].id,
                order_number=f"PO-{prefix}-{str(i).zfill(4)}",
                status=st,
                notes=f"Bulk inventory procurement test #{i}",
                ordered_at=oa,
                submitted_at=sub_at,
                approved_at=app_at,
                expected_at=later((i % 20) + 5),
                received_at=ago(2) if st == "COMPLETED" else None,
                cancelled_at=can_at,
            )
            db.add(po)
            await db.flush()

            prod = products[i % len(products)]
            subtotal = prod.cost_price * 50
            db.add(
                PurchaseOrderItem(
                    purchase_order_id=po.id,
                    product_id=prod.id,
                    quantity=50,
                    received_quantity=50 if st == "COMPLETED" else (20 if st == "PARTIALLY_RECEIVED" else 0),
                    unit_price=prod.cost_price,
                    subtotal=subtotal,
                )
            )
            po.subtotal = subtotal
            po.tax_amount = subtotal * Decimal("0.18")
            po.total = subtotal + po.tax_amount
            pos.append(po)
        await db.flush()

        # 6. Serial Numbers
        serial_statuses = ["in_stock", "reserved", "sold", "in_transit", "returned", "repair", "damaged", "retired"]
        serial_prods = [p for p in products if p.uses_serial_tracking] or products[:3]
        for s_idx in range(1, serial_count + 1):
            sprod = serial_prods[s_idx % len(serial_prods)]
            st = serial_statuses[s_idx % len(serial_statuses)]
            db.add(
                SerialNumber(
                    organization_id=org_id,
                    product_id=sprod.id,
                    warehouse_id=warehouses[s_idx % len(warehouses)].id,
                    serial_number=f"SN-{sprod.sku}-{str(s_idx).zfill(4)}",
                    sku=sprod.sku,
                    status=st,
                    activated_at=ago((s_idx % 60) + 1),
                    warranty_until=later(365),
                )
            )
        await db.flush()

        # 7. Quality Checks
        qc_prods = [p for p in products if p.qc_required] or products[:3]
        for q_idx in range(1, min(20, po_count) + 1):
            qprod = qc_prods[q_idx % len(qc_prods)]
            db.add(
                QualityCheck(
                    organization_id=org_id,
                    po_id=pos[q_idx - 1].id,
                    product_id=qprod.id,
                    product_name=qprod.name,
                    quantity=50,
                    status="PASS" if q_idx % 5 != 0 else ("FAIL" if q_idx % 2 == 0 else "PENDING"),
                    inspected_by="4",
                    inspected_at=ago(q_idx % 10) if q_idx % 5 != 0 else None,
                    notes=f"Quality check verification record #{q_idx}",
                )
            )
        await db.flush()

    # 1. Org 1: 120 products, 10 warehouses, 50 POs, 200 serials
    await bulk_seed_inventory(1, 120, 10, 50, 200, "O1")

    # 2. Org 2: 25 products, 3 warehouses, 15 POs, 30 serials
    await bulk_seed_inventory(2, 25, 3, 15, 30, "O2")

    # 3. Org 3: 10 products, 2 warehouses, 5 POs, 10 serials
    await bulk_seed_inventory(3, 10, 2, 5, 10, "O3")

    # 4. Org 4: 3 products, 1 warehouse, 1 PO, 5 serials
    await bulk_seed_inventory(4, 3, 1, 1, 5, "O4")

    # 5. Org 5: 0 inventory records (strictly empty)
    print("  Org 5 left with 0 inventory records (empty-state verification).")

    await db.commit()
    print("Testing profile inventory seeding completed successfully!")


async def seed(profile="dev"):
    print(f"Starting inventory seed [Profile: {profile}]...")
    async with async_session_factory() as db:
        try:
            from sqlalchemy import text
            # Clean up all existing tables
            await db.execute(text("TRUNCATE TABLE quality_checks, work_order_materials, work_order_operations, work_orders, purchase_requisition_items, purchase_requisitions, serial_numbers, purchase_order_items, purchase_orders, stock_movements, stock, products, warehouses, suppliers RESTART IDENTITY CASCADE"))
            await db.commit()

            if profile == "testing":
                await seed_testing(db)
            else:
                await seed_dev(db)

        except Exception as e:
            print(f"Error during inventory seed: {e}")
            await db.rollback()
            raise

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed inventory database")
    parser.add_argument("--profile", default=os.getenv("SEED_PROFILE", "dev"), choices=["dev", "testing"], help="Seed profile (dev or testing)")
    parser.add_argument("--testing", action="store_true", help="Shortcut for --profile testing")
    args = parser.parse_args()

    active_profile = "testing" if args.testing else args.profile
    asyncio.run(seed(active_profile))
