"""Comprehensive CRM seed supporting dev and testing profiles with multi-tenant org scoping."""
import asyncio
import sys
import os
import argparse
from datetime import datetime, timedelta, timezone

# Ensure project and root paths are available
sys.path.append(os.getcwd())
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from app.database import AsyncSessionLocal, engine, Base
import app.models  # noqa: F401 — registers all models with Base.metadata
from app.dashboard.models import Metric, PipelineStage, Recommendation, HotLead
from app.customers.models import Customer
from app.contacts.models import Contact
from app.documents.models import Document
from app.leads.models import Lead
from app.opportunities.models import Opportunity
from app.requirements.models import Requirement
from app.sales_orders.models import SalesOrder
from app.reports.models import Report
from app.ai_assistant.models import AIAssistantLog
from app.lead_discovery.models import PinnedLead
from scripts.seed_lib.orgs import CUSTOMERS, ORGS

now = datetime.now(timezone.utc)
def ago(days: int) -> str:
    d = now - timedelta(days=days)
    return d.strftime("%b %d")

def ago_date(days: int) -> str:
    d = now - timedelta(days=days)
    return d.strftime("%Y-%m-%d")

def later_date(days: int) -> str:
    d = now + timedelta(days=days)
    return d.strftime("%Y-%m-%d")


async def seed_dev(db):
    print("Seeding CRM database [Profile: dev]...")

    # ── ORG 1 (DATAVEX Industries) ──────────────────────────────────
    # Canonical 20 Customers (aligned 1:1 with Billing)
    customers_org1 = [
        Customer(
            id_str=c["id_str"],
            organization_id=1,
            owner_id=1,
            account=c["name"],
            industry=c["industry"],
            tier=c["tier"],
            arr=c["arr"],
            credit_limit=c["credit_limit"],
            status=c["status"],
            owner=c["owner"],
            updated_at=ago(c["id"] % 7),
        )
        for c in CUSTOMERS
    ]
    db.add_all(customers_org1)
    await db.flush()
    print(f"  Org 1: {len(customers_org1)} customers created")

    # Contacts (8)
    contacts_org1 = [
        Contact(id_str="CO-202608-0001", organization_id=1, name="Rajesh Khanna", role="CTO", account="Meridian Foods", email="r.khanna@meridianfoods.in", phone="+91-98765-43210", type="Decision", last_contact=ago(5)),
        Contact(id_str="CO-202608-0002", organization_id=1, name="Neha Joshi", role="VP Engineering", account="Cirrus Aviation", email="neha.joshi@cirrusaviation.com", phone="+91-87654-32109", type="Decision", last_contact=ago(2)),
        Contact(id_str="CO-202608-0003", organization_id=1, name="Vikram Rathore", role="Procurement Head", account="Halcyon Media", email="vikram.r@halcyonmedia.com", phone="+91-76543-21098", type="Primary", last_contact=ago(10)),
        Contact(id_str="CO-202608-0004", organization_id=1, name="Dr. Ananya Shah", role="Medical Director", account="Orbit Health", email="ananya.shah@orbithealth.in", phone="+91-75432-10987", type="Decision", last_contact=ago(3)),
        Contact(id_str="CO-202608-0005", organization_id=1, name="Ravi Deshmukh", role="IT Director", account="Bristow Textiles", email="ravi.d@bristowtextiles.com", phone="+91-74321-09876", type="Primary", last_contact=ago(7)),
        Contact(id_str="CO-202608-0006", organization_id=1, name="Sneha Patel", role="Cloud Operations Lead", account="Nimbus Technologies", email="sneha.p@nimbustech.in", phone="+91-73210-98765", type="Influencer", last_contact=ago(1)),
        Contact(id_str="CO-202608-0007", organization_id=1, name="Arun Mehta", role="VP Technology", account="Solara Renewable Energy", email="arun.mehta@solarare.in", phone="+91-72109-87654", type="Decision", last_contact=ago(4)),
        Contact(id_str="CO-202608-0008", organization_id=1, name="Priya Singh", role="Operations Manager", account="Delta Automotive", email="priya.singh@deltaauto.com", phone="+91-71098-76543", type="Inactive", last_contact=ago(30)),
    ]
    db.add_all(contacts_org1)
    await db.flush()

    # Documents (6)
    documents_org1 = [
        Document(id_str="DO-202608-0001", organization_id=1, name="Meridian Foods — Q3 Proposal.pdf", type="Proposal", account="Meridian Foods", size="2.4 MB", status="Signed", owner="Maya Patel", updated_at=ago(3), summary="Enterprise automation proposal."),
        Document(id_str="DO-202608-0002", organization_id=1, name="Cirrus Aviation — Compliance Report.docx", type="Report", account="Cirrus Aviation", size="1.1 MB", status="Signed", owner="Maya Patel", updated_at=ago(1), summary="Annual compliance audit."),
        Document(id_str="DO-202608-0003", organization_id=1, name="Orbit Health — MSA v2.pdf", type="Contract", account="Orbit Health", size="856 KB", status="Under Review", owner="Alex Chen", updated_at=ago(0), summary="Master Services Agreement."),
        Document(id_str="DO-202608-0004", organization_id=1, name="NDA — Nimbus Technologies.pdf", type="Legal", account="Nimbus Technologies", size="412 KB", status="Draft", owner="Maya Patel", updated_at=ago(0), summary="Mutual non-disclosure agreement."),
        Document(id_str="DO-202608-0005", organization_id=1, name="Solara — System Architecture v1.pdf", type="Technical Spec", account="Solara Renewable Energy", size="3.2 MB", status="Expired", owner="Alex Chen", updated_at=ago(15), summary="Preliminary architecture."),
        Document(id_str="DO-202608-0006", organization_id=1, name="Titan Defence — Security Clearance.pdf", type="Compliance", account="Titan Defence Systems", size="1.8 MB", status="Signed", owner="Alex Chen", updated_at=ago(2), summary="Security clearance documentation."),
    ]
    db.add_all(documents_org1)
    await db.flush()

    # Leads (15)
    leads_org1 = [
        Lead(id_str="LD-202608-0001", organization_id=1, name="E-Commerce Modernization", company="Zeta Retail", source="Web Inquiry", est_value=50000, status="Qualified", owner="Maya Patel", updated_at=ago(1)),
        Lead(id_str="LD-202608-0002", organization_id=1, name="Cloud Infrastructure Migration", company="Titan Energy", source="Referral", est_value=150000, status="In Progress", owner="Maya Patel", updated_at=ago(0)),
        Lead(id_str="LD-202608-0003", organization_id=1, name="Security Audit Consultation", company="Nexus Finance", source="Outbound", est_value=30000, status="New", owner="Alex Chen", updated_at=ago(0)),
        Lead(id_str="LD-202608-0004", organization_id=1, name="Legacy Application Rewrite", company="OldWorld Corp", source="Cold Call", est_value=85000, status="Lost", owner="Maya Patel", updated_at=ago(12)),
        Lead(id_str="LD-202608-0005", organization_id=1, name="AI Analytics Platform", company="DataCrest", source="Trade Show", est_value=120000, status="Qualified", owner="Maya Patel", updated_at=ago(2)),
        Lead(id_str="LD-202608-0006", organization_id=1, name="Warehouse Automation", company="SwiftLogistics", source="Direct Outreach", est_value=200000, status="In Progress", owner="Alex Chen", updated_at=ago(1)),
        Lead(id_str="LD-202608-0007", organization_id=1, name="HRMS Cloud Migration", company="PeopleFirst", source="Referral", est_value=65000, status="New", owner="Maya Patel", updated_at=ago(0)),
        Lead(id_str="LD-202608-0008", organization_id=1, name="IoT Smart Factory", company="Precision Mfg", source="Tender Portal", est_value=280000, status="Qualified", owner="Maya Patel", updated_at=ago(1)),
        Lead(id_str="LD-202608-0009", organization_id=1, name="FinTech API Gateway", company="PaySwift Labs", source="Web Inquiry", est_value=90000, status="Qualified", owner="Maya Patel", updated_at=ago(3)),
        Lead(id_str="LD-202608-0010", organization_id=1, name="EV Charging Network Management", company="VoltMove", source="Referral", est_value=175000, status="In Progress", owner="Alex Chen", updated_at=ago(2)),
        Lead(id_str="LD-202608-0011", organization_id=1, name="Supply Chain Cold Chain Monitoring", company="KoolCold", source="Trade Show", est_value=110000, status="New", owner="Maya Patel", updated_at=ago(1)),
        Lead(id_str="LD-202608-0012", organization_id=1, name="Automated Vision Inspection", company="MicroOptics", source="Direct Outreach", est_value=95000, status="In Progress", owner="Alex Chen", updated_at=ago(4)),
        Lead(id_str="LD-202608-0013", organization_id=1, name="Building Management IoT Suite", company="Skyline Towers", source="Web Inquiry", est_value=130000, status="Qualified", owner="Maya Patel", updated_at=ago(0)),
        Lead(id_str="LD-202608-0014", organization_id=1, name="Biomedical Device Telemetry", company="CureTech Systems", source="Tender Portal", est_value=210000, status="New", owner="Alex Chen", updated_at=ago(5)),
        Lead(id_str="LD-202608-0015", organization_id=1, name="Automotive Line Robotics Controller", company="Apex Motors", source="Referral", est_value=320000, status="Qualified", owner="Maya Patel", updated_at=ago(2)),
    ]
    db.add_all(leads_org1)
    await db.flush()

    # Opportunities (10)
    opportunities_org1 = [
        Opportunity(id_str="OP-202608-0001", organization_id=1, name="ERP Modernization", account="Meridian Foods", value="240000", probability="75%", close_date=later_date(30), stage="Negotiation", owner="Maya Patel"),
        Opportunity(id_str="OP-202608-0002", organization_id=1, name="AI Analytics Platform", account="Cirrus Aviation", value="180000", probability="50%", close_date=later_date(45), stage="Proposal", owner="Maya Patel"),
        Opportunity(id_str="OP-202608-0003", organization_id=1, name="EHR Platform — Phase 2", account="Orbit Health", value="320000", probability="80%", close_date=later_date(10), stage="Negotiation", owner="Alex Chen"),
        Opportunity(id_str="OP-202608-0004", organization_id=1, name="SCADA Monitoring System", account="Solara Renewable Energy", value="450000", probability="35%", close_date=later_date(90), stage="Discovery", owner="Alex Chen"),
        Opportunity(id_str="OP-202608-0005", organization_id=1, name="Secure Communications Upgrade", account="Titan Defence Systems", value="580000", probability="60%", close_date=later_date(20), stage="Proposal", owner="Alex Chen"),
        Opportunity(id_str="OP-202608-0006", organization_id=1, name="Textile ERP Rollout", account="Bristow Textiles", value="95000", probability="65%", close_date=later_date(40), stage="Proposal", owner="Maya Patel"),
        Opportunity(id_str="OP-202608-0007", organization_id=1, name="Fleet Telemetry Deployment", account="Apex Logistics Group", value="210000", probability="85%", close_date=later_date(15), stage="Negotiation", owner="Maya Patel"),
        Opportunity(id_str="OP-202608-0008", organization_id=1, name="Smart Building IoT Upgrade", account="Pinnacle Realty Group", value="125000", probability="40%", close_date=later_date(60), stage="Discovery", owner="Maya Patel"),
        Opportunity(id_str="OP-202608-0009", organization_id=1, name="Assembly Line Vision Sensors", account="Delta Automotive", value="160000", probability="70%", close_date=later_date(25), stage="Proposal", owner="Maya Patel"),
        Opportunity(id_str="OP-202608-0010", organization_id=1, name="Cloud Migration Wave 2", account="Nimbus Technologies", value="340000", probability="90%", close_date=later_date(5), stage="Negotiation", owner="Maya Patel"),
    ]
    db.add_all(opportunities_org1)
    await db.flush()

    # Requirements (4)
    requirements_org1 = [
        Requirement(id_str="RE-202608-0001", organization_id=1, name="Scalable API Gateway", account="Meridian Foods", category="Technical", priority="High", status="Approved", owner="Maya Patel"),
        Requirement(id_str="RE-202608-0002", organization_id=1, name="Federated SSO Implementation", account="Cirrus Aviation", category="Security", priority="Medium", status="Under Review", owner="Maya Patel"),
        Requirement(id_str="RE-202608-0003", organization_id=1, name="HL7 FHIR Integration", account="Orbit Health", category="Technical", priority="High", status="Draft", owner="Alex Chen"),
        Requirement(id_str="RE-202608-0004", organization_id=1, name="Real-Time SCADA Dashboard", account="Solara Renewable Energy", category="Technical", priority="Medium", status="Draft", owner="Alex Chen"),
    ]
    db.add_all(requirements_org1)
    await db.flush()

    # Sales Orders (9 bound to inventory catalog)
    sales_orders_org1 = [
        SalesOrder(id_str="SO-202608-0101", organization_id=1, so_no="SO-202608-0101", account="Halcyon Media", from_quote="QT-202608-0003", value="182000", eta="2026-10-31", date_ordered="2026-07-20", status="Confirmed", owner="Maya Patel", line_items=[{"product_name": "HMI Touch Panel 10-inch — Siemens KTP1000", "sku": "HMI-KTP1000", "quantity": 3, "unit_price": 42000}, {"product_name": "HMI Graphic Terminal 7-inch — Schneider", "sku": "HMI-GT7", "quantity": 2, "unit_price": 28000}]),
        SalesOrder(id_str="SO-202608-0102", organization_id=1, so_no="SO-202608-0102", account="Bristow Textiles", from_quote="QT-202608-0010", value="42000", eta="2026-08-31", date_ordered="2026-07-22", status="Confirmed", owner="Maya Patel", line_items=[{"product_name": "Industrial Control Cable 2.5mm² (50m Roll)", "sku": "CAB-2.5MM", "quantity": 5, "unit_price": 6200}, {"product_name": "Wire Crimping Tool Set — Bosch", "sku": "WCT-8PC", "quantity": 5, "unit_price": 2200}]),
        SalesOrder(id_str="SO-202608-0103", organization_id=1, so_no="SO-202608-0103", account="Meridian Foods", from_quote="QT-202608-0001", value="132000", eta="2026-10-15", date_ordered="2026-07-18", status="Invoiced", owner="Maya Patel", line_items=[{"product_name": "Photoelectric Sensor — Omron E3Z", "sku": "SEN-E3Z", "quantity": 30, "unit_price": 2800}, {"product_name": "Inductive Proximity Sensor — Omron", "sku": "SEN-PRX12", "quantity": 40, "unit_price": 1200}]),
        SalesOrder(id_str="SO-202608-0104", organization_id=1, so_no="SO-202608-0104", account="Cirrus Aviation", from_quote="QT-202608-0002", value="300000", eta="2026-11-30", date_ordered="2026-07-25", status="Confirmed", owner="Maya Patel", line_items=[{"product_name": "Aviation-Grade Telemetry Module", "sku": "TEL-AV900", "quantity": 2, "unit_price": 120000}, {"product_name": "Flight Data Recorder Interface", "sku": "FDR-INT10", "quantity": 2, "unit_price": 30000}]),
        SalesOrder(id_str="SO-202608-0105", organization_id=1, so_no="SO-202608-0105", account="Titan Defence Systems", from_quote="QT-202608-0008", value="1340000", eta="2026-09-30", date_ordered="2026-07-16", status="Invoiced", owner="Alex Chen", line_items=[{"product_name": "Redundant CPU Processor Panel", "sku": "CPU-RED500", "quantity": 15, "unit_price": 85000}, {"product_name": "Power Supply 24V DC 10A — Siemens SITOP", "sku": "PS-24V10A", "quantity": 10, "unit_price": 6500}]),
        SalesOrder(id_str="SO-202608-0106", organization_id=1, so_no="SO-202608-0106", account="Solara Renewable Energy", from_quote="QT-202608-0006", value="507000", eta="2026-10-31", date_ordered="2026-07-19", status="Confirmed", owner="Alex Chen", line_items=[{"product_name": "Compact VFD Drive 1.5kW — Omron", "sku": "VFD-1.5KW", "quantity": 30, "unit_price": 14500}, {"product_name": "Overload Relay 18-25A — Siemens", "sku": "REL-1825A", "quantity": 30, "unit_price": 2400}]),
        SalesOrder(id_str="SO-202608-0107", organization_id=1, so_no="SO-202608-0107", account="Delta Automotive", from_quote="QT-202608-0009", value="86000", eta="2026-09-15", date_ordered="2026-07-23", status="Pending", owner="Maya Patel", line_items=[{"product_name": "Perforated Cable Tray 3m — Legrand", "sku": "CT-3M-LEG", "quantity": 20, "unit_price": 1800}, {"product_name": "IP65 Control Panel Enclosure 600x600", "sku": "ENC-IP65", "quantity": 4, "unit_price": 12500}]),
        SalesOrder(id_str="SO-202608-0108", organization_id=1, so_no="SO-202608-0108", account="Nimbus Technologies", from_quote="QT-202608-0005", value="25500", eta="2026-08-15", date_ordered="2026-07-10", status="Paid", owner="Maya Patel", line_items=[{"product_name": "IoT Gateway Edge Controller", "sku": "IOT-GW200", "quantity": 3, "unit_price": 8500}]),
        SalesOrder(id_str="SO-202608-0109", organization_id=1, so_no="SO-202608-0109", account="Pinnacle Realty Group", from_quote="QT-202608-0007", value="14000", eta="2026-08-31", date_ordered="2026-07-12", status="Paid", owner="Maya Patel", line_items=[{"product_name": "Drill Machine 13mm — Bosch", "sku": "DM-13MM", "quantity": 4, "unit_price": 3500}]),
    ]
    db.add_all(sales_orders_org1)
    await db.flush()

    # Reports, AI Logs, Metrics, Pipelines for Org 1
    reports_org1 = [
        Report(id_str="RP-202608-0001", organization_id=1, title="Q2 2026 Pipeline Review", category="Sales", last_run="2026-07-01", status="Final", owner="Maya Patel"),
        Report(id_str="RP-202608-0002", organization_id=1, title="Customer Health Score — Enterprise Tier", category="Customer Success", last_run="2026-07-15", status="Final", owner="Maya Patel"),
        Report(id_str="RP-202608-0003", organization_id=1, title="Lead Conversion Funnel Analysis", category="Marketing", last_run="2026-07-10", status="Draft", owner="Alex Chen"),
    ]
    db.add_all(reports_org1)

    ai_logs_org1 = [
        AIAssistantLog(id_str="AI-202608-0001", organization_id=1, query="Summarize pipeline status for Q3", category="Sales", date="2026-07-19", status="Success", owner="Maya Patel"),
        AIAssistantLog(id_str="AI-202608-0002", organization_id=1, query="Draft follow-up email for Meridian Foods", category="Support", date="2026-07-20", status="Success", owner="Maya Patel"),
        AIAssistantLog(id_str="AI-202608-0003", organization_id=1, query="Generate lead scoring report", category="General", date="2026-07-20", status="Failed", owner="Alex Chen"),
    ]
    db.add_all(ai_logs_org1)

    metrics_org1 = [
        Metric(organization_id=1, name="Pipeline Value", value=1770000.0, formatted_value="$1.77M", trend="+12.4%", is_positive=True),
        Metric(organization_id=1, name="Open Opportunities", value=10.0, formatted_value="10", trend="+2 vs last month", is_positive=True),
        Metric(organization_id=1, name="Active Customers", value=18.0, formatted_value="18", trend="+3 this quarter", is_positive=True),
    ]
    db.add_all(metrics_org1)

    stages_org1 = [
        PipelineStage(organization_id=1, name="Discovery", value=450000.0, color="#6366f1"),
        PipelineStage(organization_id=1, name="Qualification", value=280000.0, color="#0ea5e9"),
        PipelineStage(organization_id=1, name="Proposal", value=760000.0, color="#14b8a6"),
        PipelineStage(organization_id=1, name="Negotiation", value=560000.0, color="#f59e0b"),
        PipelineStage(organization_id=1, name="Closing", value=210000.0, color="#10b981"),
    ]
    db.add_all(stages_org1)

    recs_org1 = [
        Recommendation(organization_id=1, text="High-value deal ERP Modernization in Negotiation stage for 14 days.", confidence=88, type="Opportunity"),
        Recommendation(organization_id=1, text="Cirrus Aviation has unused support credits. Introduce AI add-on.", confidence=75, type="Customer"),
    ]
    db.add_all(recs_org1)

    hot_org1 = [
        HotLead(organization_id=1, name="Zeta Retail", status="High Priority"),
        HotLead(organization_id=1, name="SwiftLogistics", status="Engaged"),
    ]
    db.add_all(hot_org1)

    pinned_org1 = [
        PinnedLead(
            organization_id=1,
            company_name="Zeta Logistics", industry="Logistics", location="Bangalore, India", website="https://zetalogistics.com",
            estimated_employees="500-1000", estimated_revenue="$50M - $100M",
            company_overview="Zeta Logistics operates 50 fulfillment centers across India.",
            ai_readiness_score=78, detected_technologies=["SAP ERP", "React"],
            business_pain_points=["Route optimization delays"],
            recommended_ai_solutions=["AI dispatch planning"],
            key_decision_makers=[{"name": "Rohan Sen", "title": "VP Operations", "email": "r.sen@zetalogistics.com"}],
            public_contact={"email": "info@zetalogistics.com", "phone": "+91-80-4321-0987"}
        ),
    ]
    db.add_all(pinned_org1)
    await db.flush()

    # ── ORG 2 (Eternal) ──────────────────────────────────────────────
    # Test customer name collision across Org 1 & Org 2
    customers_org2 = [
        Customer(id_str="CUST-0001", organization_id=2, owner_id=2, account="Cirrus Aviation", industry="Aerospace", tier="Enterprise", arr=300000, credit_limit=500000, status="Active", owner="Maya Patel", updated_at=ago(1)),
        Customer(id_str="CUST-0002", organization_id=2, owner_id=2, account="Meridian Foods", industry="Food Processing", tier="Enterprise", arr=180000, credit_limit=350000, status="Active", owner="Maya Patel", updated_at=ago(3)),
    ]
    db.add_all(customers_org2)

    leads_org2 = [
        Lead(id_str="LD-ORG2-0001", organization_id=2, name="Aviation Telemetry Calibration", company="Cirrus Aviation", source="Direct Outreach", est_value=120000, status="Qualified", owner="Maya Patel", updated_at=ago(2)),
        Lead(id_str="LD-ORG2-0002", organization_id=2, name="Supply Chain Integration", company="Meridian Foods", source="Referral", est_value=90000, status="In Progress", owner="Maya Patel", updated_at=ago(1)),
    ]
    db.add_all(leads_org2)

    opps_org2 = [
        Opportunity(id_str="OP-ORG2-0001", organization_id=2, name="Aero Maintenance Contract", account="Cirrus Aviation", value="150000", probability="70%", close_date=later_date(30), stage="Negotiation", owner="Maya Patel"),
    ]
    db.add_all(opps_org2)

    so_org2 = [
        SalesOrder(id_str="SO-ORG2-0001", organization_id=2, so_no="SO-ORG2-0001", account="Cirrus Aviation", from_quote="QT-202608-0001", value="118000", eta="2026-11-15", date_ordered="2026-07-24", status="Confirmed", owner="Maya Patel", line_items=[{"product_name": "Aviation-Grade Telemetry Module", "sku": "TEL-AV900", "quantity": 1, "unit_price": 100000}]),
    ]
    db.add_all(so_org2)

    metrics_org2 = [
        Metric(organization_id=2, name="Pipeline Value", value=270000.0, formatted_value="$270K", trend="+5.0%", is_positive=True),
        Metric(organization_id=2, name="Open Opportunities", value=1.0, formatted_value="1", trend="0", is_positive=True),
        Metric(organization_id=2, name="Active Customers", value=2.0, formatted_value="2", trend="+2", is_positive=True),
    ]
    db.add_all(metrics_org2)

    stages_org2 = [
        PipelineStage(organization_id=2, name="Discovery", value=90000.0, color="#6366f1"),
        PipelineStage(organization_id=2, name="Negotiation", value=150000.0, color="#f59e0b"),
    ]
    db.add_all(stages_org2)
    await db.flush()

    # ── ORG 3 (Zomato) ───────────────────────────────────────────────
    db.add(Customer(id_str="CUST-0001", organization_id=3, owner_id=3, account="Meridian Foods", industry="Food Processing", tier="Enterprise", arr=80000, credit_limit=200000, status="Active", owner="Jordan Kim", updated_at=ago(2)))
    db.add(Lead(id_str="LD-ORG3-0001", organization_id=3, name="Fleet Routing Optimization", company="Meridian Foods", source="Web Inquiry", est_value=45000, status="New", owner="Jordan Kim", updated_at=ago(1)))
    db.add(Metric(organization_id=3, name="Pipeline Value", value=45000.0, formatted_value="$45K", trend="+10%", is_positive=True))
    await db.flush()

    # ── ORG 4 (Blinkit) ──────────────────────────────────────────────
    db.add(Customer(id_str="CUST-0001", organization_id=4, owner_id=4, account="Pinnacle Realty Group", industry="Real Estate", tier="Mid-Market", arr=60000, credit_limit=150000, status="Active", owner="Sam Rivera", updated_at=ago(1)))
    db.add(Lead(id_str="LD-ORG4-0001", organization_id=4, name="Dark Store Warehousing", company="Pinnacle Realty Group", source="Referral", est_value=35000, status="In Progress", owner="Sam Rivera", updated_at=ago(0)))
    await db.flush()

    # ── ORG 5 (District) ─────────────────────────────────────────────
    # Strictly 0 customers, 0 leads, 0 opps for empty state testing
    print("  Org 5 left with 0 records (empty-state verification).")

    await db.commit()
    print("Dev profile CRM seeding completed successfully!")


async def seed_testing(db):
    print("Seeding CRM database [Profile: testing]...")

    industries = ["Food Processing", "Aerospace", "Media & Entertainment", "Healthcare", "Textiles", "Technology", "Renewable Energy", "Real Estate", "Defence", "Automotive", "Logistics", "Financial Services"]
    tiers = ["Enterprise", "Mid-Market", "Gold", "Strategic"]
    lead_sources = ["Web Inquiry", "Referral", "Outbound", "Cold Call", "Trade Show", "Tender Portal", "Direct Outreach"]
    lead_statuses = ["New", "Contacted", "Qualified", "In Progress", "Lost", "Converted"]
    opp_stages = ["Discovery", "Qualification", "Proposal", "Negotiation", "Closed-Won", "Closed-Lost"]
    so_statuses = ["Draft", "Pending", "Confirmed", "Invoiced", "Paid", "Cancelled"]

    async def bulk_seed_org(org_id: int, cust_count: int, lead_count: int, opp_count: int, so_count: int):
        print(f"  Generating bulk CRM data for Org {org_id} ({cust_count} cust, {lead_count} leads, {opp_count} opps, {so_count} SOs)...")

        # 1. Customers
        customers = []
        for i in range(1, cust_count + 1):
            base_cust = CUSTOMERS[(i - 1) % len(CUSTOMERS)]
            name = base_cust["name"] if i <= 20 else f"{base_cust['name']} Div-{i // 20}"
            customers.append(
                Customer(
                    id_str=f"CUST-{str(i).zfill(4)}",
                    organization_id=org_id,
                    owner_id=1,
                    account=name,
                    industry=industries[i % len(industries)],
                    tier=tiers[i % len(tiers)],
                    arr=((i * 19) % 80 + 10) * 10000,
                    credit_limit=((i * 23) % 150 + 20) * 10000,
                    status="Active" if i % 6 != 0 else ("Prospect" if i % 2 == 0 else "Dormant"),
                    owner="Maya Patel" if i % 2 == 0 else "Alex Chen",
                    updated_at=ago(i % 30),
                )
            )
        db.add_all(customers)
        await db.flush()

        # 2. Leads
        leads = []
        for i in range(1, lead_count + 1):
            leads.append(
                Lead(
                    id_str=f"LD-{str(i).zfill(4)}",
                    organization_id=org_id,
                    name=f"Enterprise Modernization Track #{i}",
                    company=customers[(i - 1) % len(customers)].account,
                    source=lead_sources[i % len(lead_sources)],
                    est_value=((i * 13) % 40 + 5) * 10000,
                    status=lead_statuses[i % len(lead_statuses)],
                    owner="Maya Patel" if i % 2 == 0 else "Alex Chen",
                    updated_at=ago(i % 45),
                )
            )
        # Flush in chunks of 500
        for chunk_idx in range(0, len(leads), 500):
            db.add_all(leads[chunk_idx:chunk_idx + 500])
            await db.flush()

        # 3. Opportunities
        opps = []
        for i in range(1, opp_count + 1):
            stage = opp_stages[i % len(opp_stages)]
            prob = "100%" if stage == "Closed-Won" else ("0%" if stage == "Closed-Lost" else f"{((i * 17) % 60 + 20)}%")
            opps.append(
                Opportunity(
                    id_str=f"OP-{str(i).zfill(4)}",
                    organization_id=org_id,
                    name=f"Automation Solution #{i}",
                    account=customers[(i - 1) % len(customers)].account,
                    value=str(((i * 29) % 70 + 10) * 10000),
                    probability=prob,
                    close_date=later_date((i % 60) - 20),
                    stage=stage,
                    owner="Maya Patel" if i % 2 == 0 else "Alex Chen",
                )
            )
        db.add_all(opps)
        await db.flush()

        # 4. Sales Orders
        sos = []
        for i in range(1, so_count + 1):
            sos.append(
                SalesOrder(
                    id_str=f"SO-{str(i).zfill(4)}",
                    organization_id=org_id,
                    so_no=f"SO-{str(i).zfill(4)}",
                    account=customers[(i - 1) % len(customers)].account,
                    from_quote=f"QT-TST-{str((i - 1) % 200 + 1).zfill(4)}",
                    value=str(((i * 21) % 50 + 5) * 10000),
                    eta=later_date((i % 40) + 5),
                    date_ordered=ago_date((i % 60) + 1),
                    status=so_statuses[i % len(so_statuses)],
                    owner="Maya Patel" if i % 2 == 0 else "Alex Chen",
                    line_items=[
                        {"product_name": "Standard Automation Module", "sku": "MOD-AUTO", "quantity": (i % 5) + 1, "unit_price": 25000}
                    ],
                )
            )
        for chunk_idx in range(0, len(sos), 500):
            db.add_all(sos[chunk_idx:chunk_idx + 500])
            await db.flush()

        # Dashboard metrics for org
        db.add(Metric(organization_id=org_id, name="Pipeline Value", value=float(cust_count * 50000), formatted_value=f"${cust_count * 50 // 1000}M", trend="+18.5%", is_positive=True))
        db.add(Metric(organization_id=org_id, name="Open Opportunities", value=float(opp_count), formatted_value=str(opp_count), trend="+15 vs last month", is_positive=True))
        db.add(Metric(organization_id=org_id, name="Active Customers", value=float(cust_count), formatted_value=str(cust_count), trend="+12 this quarter", is_positive=True))
        for s_idx, st_name in enumerate(["Discovery", "Qualification", "Proposal", "Negotiation", "Closing"]):
            db.add(PipelineStage(organization_id=org_id, name=st_name, value=float((s_idx + 1) * 250000), color="#6366f1"))
        await db.flush()

    # Org 1: 300 customers, 1000 leads, 150 opps, 400 SOs
    await bulk_seed_org(1, 300, 1000, 150, 400)

    # Org 2: 50 customers, 100 leads, 30 opps, 40 SOs
    await bulk_seed_org(2, 50, 100, 30, 40)

    # Org 3: 20 customers, 30 leads, 10 opps, 10 SOs
    await bulk_seed_org(3, 20, 30, 10, 10)

    # Org 4: 5 customers, 10 leads, 2 opps, 2 SOs
    await bulk_seed_org(4, 5, 10, 2, 2)

    # Org 5: 0 customers, 0 leads, 0 opps, 0 SOs
    print("  Org 5 left with 0 records (empty-state verification).")

    await db.commit()
    print("Testing profile CRM seeding completed successfully!")


async def seed(profile="dev"):
    print(f"Starting CRM seed [Profile: {profile}]...")
    async with AsyncSessionLocal() as db:
        try:
            from sqlalchemy import text
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            # Truncate all CRM tables cleanly
            await db.execute(text("TRUNCATE TABLE ai_logs, contacts, customers, documents, hot_leads, leads, metrics, opportunities, pinned_leads, pipeline_stages, recommendations, reports, requirements, sales, quotation_approvals, sales_orders CASCADE"))
            await db.commit()

            if profile == "testing":
                await seed_testing(db)
            else:
                await seed_dev(db)

        except Exception as e:
            print(f"Error during CRM seed: {e}")
            await db.rollback()
            raise

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed CRM database")
    parser.add_argument("--profile", default=os.getenv("SEED_PROFILE", "dev"), choices=["dev", "testing"], help="Seed profile (dev or testing)")
    parser.add_argument("--testing", action="store_true", help="Shortcut for --profile testing")
    args = parser.parse_args()

    active_profile = "testing" if args.testing else args.profile
    asyncio.run(seed(active_profile))
