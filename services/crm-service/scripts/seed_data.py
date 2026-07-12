"""Comprehensive CRM seed — 20 customers with full pipeline, interactions, service."""
import asyncio
from datetime import datetime, timedelta

from app.core.database import async_session_factory, engine, Base
from app.dashboard.models import Metric, PipelineStage, Recommendation, Report, HotLead
from app.customer.models import Customer, Contact, Document
from app.lead.models import Lead, Opportunity
from app.sales.models import Sale, Requirement, Quotation, SalesOrder
from app.interaction.models import Enquiry, SiteVisit, FollowUp, Task, Communication, VisitPlan
from app.service.models import Complaint, Feedback
from app.ai.models import AIAssistantLog


d = datetime.now()
def ago(days: int) -> str:
    return (d - timedelta(days=days)).strftime("%b %d")

def later(days: int) -> str:
    return (d + timedelta(days=days)).strftime("%b %d")


async def seed():
    print("Seeding CRM database with 20 customers...")
    async with async_session_factory() as db:
        try:
            # ── Dashboard ──────────────────────────────────────────────
            metrics = [
                Metric(name="Pipeline Value", value=12580000.0, formatted_value="$12.58M", trend="+18.3% MoM", is_positive=True),
                Metric(name="Open Opportunities", value=62.0, formatted_value="62", trend="+9 this week", is_positive=True),
                Metric(name="Active Customers", value=18.0, formatted_value="18", trend="+2 net-new", is_positive=True),
                Metric(name="Open Complaints", value=12.0, formatted_value="12", trend="3 breaching SLA", is_positive=False),
                Metric(name="Quotations Pending", value=15.0, formatted_value="15", trend="5 over 7 days", is_positive=False),
            ]
            db.add_all(metrics)

            stages = [
                PipelineStage(name="Discovery", value=3200000.0, color="#0ea5e9"),
                PipelineStage(name="Proposal", value=2800000.0, color="#14b8a6"),
                PipelineStage(name="Negotiation", value=2100000.0, color="#f59e0b"),
                PipelineStage(name="Won", value=3500000.0, color="#10b981"),
                PipelineStage(name="Lost", value=970000.0, color="#f43f5e"),
            ]
            db.add_all(stages)

            recs = [
                Recommendation(text="Re-engage Meridian Foods — expansion ready", confidence=94, type="positive"),
                Recommendation(text="Discount likely to close Cirrus Aviation deal", confidence=82, type="positive"),
                Recommendation(text="Escalate Orbit Health complaint SD-9912", confidence=91, type="negative"),
                Recommendation(text="Cross-sell automation to Apex Logistics", confidence=76, type="positive"),
                Recommendation(text="Nurture Vortex Energy — high fit score", confidence=88, type="positive"),
            ]
            db.add_all(recs)
            await db.flush()

            # ── Customers (20) ─────────────────────────────────────────
            customers = [
                Customer(id_str="CU-1001", account="Meridian Foods", industry="F&B", tier="Platinum", arr=412000, status="Active", organization_id=1, updated_at=ago(0)),
                Customer(id_str="CU-1002", account="Cirrus Aviation", industry="Aerospace", tier="Gold", arr=188000, status="Active", organization_id=1, updated_at=ago(1)),
                Customer(id_str="CU-1003", account="Halcyon Media", industry="Media", tier="Silver", arr=76000, status="Dormant", organization_id=1, updated_at=ago(5)),
                Customer(id_str="CU-1004", account="Orbit Health", industry="Healthcare", tier="Platinum", arr=524000, status="Active", organization_id=1, updated_at=ago(0)),
                Customer(id_str="CU-1005", account="Bristow Textiles", industry="Manufacturing", tier="Gold", arr=210000, status="Churned", organization_id=1, updated_at=ago(30)),
                Customer(id_str="CU-1006", account="Apex Logistics Group", industry="Logistics", tier="Bronze", arr=45000, status="Prospect", organization_id=1, updated_at=ago(2)),
                Customer(id_str="CU-1007", account="Vortex Energy Solutions", industry="Energy", tier="Silver", arr=98000, status="Active", organization_id=1, updated_at=ago(1)),
                Customer(id_str="CU-1008", account="Nimbus Technologies", industry="Technology", tier="Gold", arr=345000, status="Active", organization_id=1, updated_at=ago(0)),
                Customer(id_str="CU-1009", account="Solara Renewable Energy", industry="Renewable", tier="Platinum", arr=612000, status="Active", organization_id=1, updated_at=ago(0)),
                Customer(id_str="CU-1010", account="Cascade Water Solutions", industry="Utilities", tier="Silver", arr=87000, status="Prospect", organization_id=1, updated_at=ago(3)),
                Customer(id_str="CU-1011", account="Pinnacle Realty Group", industry="Real Estate", tier="Gold", arr=275000, status="Active", organization_id=1, updated_at=ago(0)),
                Customer(id_str="CU-1012", account="Neuron AI Research", industry="AI/ML", tier="Bronze", arr=52000, status="Active", organization_id=1, updated_at=ago(4)),
                Customer(id_str="CU-1013", account="Gardenia Organic Farms", industry="Agriculture", tier="Silver", arr=63000, status="Dormant", organization_id=1, updated_at=ago(15)),
                Customer(id_str="CU-1014", account="Titan Defence Systems", industry="Defence", tier="Gold", arr=489000, status="Active", organization_id=1, updated_at=ago(1)),
                Customer(id_str="CU-1015", account="Velora Hospitality", industry="Hospitality", tier="Silver", arr=112000, status="Active", organization_id=1, updated_at=ago(2)),
                Customer(id_str="CU-1016", account="Oceanic Pharmaceuticals", industry="Pharma", tier="Platinum", arr=756000, status="Active", organization_id=1, updated_at=ago(0)),
                Customer(id_str="CU-1017", account="Bright Future Education", industry="Education", tier="Bronze", arr=38000, status="Prospect", organization_id=1, updated_at=ago(6)),
                Customer(id_str="CU-1018", account="Everest Logistics", industry="Logistics", tier="Gold", arr=198000, status="Active", organization_id=1, updated_at=ago(1)),
                Customer(id_str="CU-1019", account="Starlight Entertainment", industry="Media", tier="Silver", arr=84000, status="Active", organization_id=1, updated_at=ago(3)),
                Customer(id_str="CU-1020", account="Delta Automotive", industry="Automotive", tier="Gold", arr=310000, status="Active", organization_id=1, updated_at=ago(0)),
            ]
            db.add_all(customers)
            await db.flush()
            print(f"  {len(customers)} customers seeded")

            # ── Contacts (30+ ── multi-contacts per customer) ──────────
            contacts = [
                Contact(id_str="CO-1001", name="Sarah Jenkins", role="VP Procurement", account="Meridian Foods", email="sjenkins@meridian.com", phone="+91-98765-10001", type="Decision", last_contact=ago(0), organization_id=1),
                Contact(id_str="CO-1002", name="Rajiv Mehta", role="Supply Chain Head", account="Meridian Foods", email="rmehta@meridian.com", phone="+91-98765-10002", type="Influencer", last_contact=ago(3), organization_id=1),
                Contact(id_str="CO-1003", name="David Vance", role="Chief Pilot", account="Cirrus Aviation", email="dvance@cirrus.com", phone="+91-98765-20001", type="Decision", last_contact=ago(1), organization_id=1),
                Contact(id_str="CO-1004", name="Nina Roy", role="Operations Director", account="Cirrus Aviation", email="nroy@cirrus.com", phone="+91-98765-20002", type="Influencer", last_contact=ago(5), organization_id=1),
                Contact(id_str="CO-1005", name="Elena Rostova", role="Head of Content", account="Halcyon Media", email="erostova@halcyon.io", phone="+91-98765-30001", type="Primary", last_contact=ago(5), organization_id=1),
                Contact(id_str="CO-1006", name="Dr. Arvind Nair", role="CTO", account="Orbit Health", email="anair@orbithealth.in", phone="+91-98765-40001", type="Decision", last_contact=ago(0), organization_id=1),
                Contact(id_str="CO-1007", name="Meera Krishnan", role="IT Director", account="Orbit Health", email="mkrishnan@orbithealth.in", phone="+91-98765-40002", type="Technical", last_contact=ago(2), organization_id=1),
                Contact(id_str="CO-1008", name="Vikram Singh", role="CEO", account="Bristow Textiles", email="vsingh@bristowtextiles.com", phone="+91-98765-50001", type="Decision", last_contact=ago(30), organization_id=1),
                Contact(id_str="CO-1009", name="Ananya Gupta", role="VP Operations", account="Nimbus Technologies", email="agupta@nimbustech.in", phone="+91-98765-80001", type="Decision", last_contact=ago(0), organization_id=1),
                Contact(id_str="CO-1010", name="Rohit Sharma", role="Infra Lead", account="Nimbus Technologies", email="rsharma@nimbustech.in", phone="+91-98765-80002", type="Technical", last_contact=ago(1), organization_id=1),
                Contact(id_str="CO-1011", name="Priya Kapoor", role="Procurement Manager", account="Solara Renewable", email="pkapoor@solaraenergy.com", phone="+91-98765-90001", type="Decision", last_contact=ago(0), organization_id=1),
                Contact(id_str="CO-1012", name="Aditya Verma", role="COO", account="Solara Renewable", email="averma@solaraenergy.com", phone="+91-98765-90002", type="Influencer", last_contact=ago(2), organization_id=1),
                Contact(id_str="CO-1013", name="Kavita Desai", role="Head of Engineering", account="Titan Defence", email="kdesai@titandefence.in", phone="+91-98765-14001", type="Decision", last_contact=ago(1), organization_id=1),
                Contact(id_str="CO-1014", name="Arjun Menon", role="IT Manager", account="Cascade Water", email="amenon@cascadewater.com", phone="+91-98765-10001", type="Technical", last_contact=ago(3), organization_id=1),
                Contact(id_str="CO-1015", name="Sneha Reddy", role="Director of Ops", account="Delta Automotive", email="sreddy@deltaauto.in", phone="+91-98765-20001", type="Decision", last_contact=ago(0), organization_id=1),
                Contact(id_str="CO-1016", name="Dr. Faizal Khan", role="R&D Head", account="Oceanic Pharmaceuticals", email="fkhan@oceanicpharma.com", phone="+91-98765-16001", type="Primary", last_contact=ago(0), organization_id=1),
                Contact(id_str="CO-1017", name="Michael Chang", role="VP Engineering", account="Neuron AI", email="mchang@neuronai.com", phone="+91-98765-12001", type="Decision", last_contact=ago(4), organization_id=1),
                Contact(id_str="CO-1018", name="Lakshmi Iyer", role="GM", account="Pinnacle Realty", email="liyer@pinnaclerealty.in", phone="+91-98765-11001", type="Decision", last_contact=ago(0), organization_id=1),
                Contact(id_str="CO-1019", name="Ravi Joshi", role="Operations Head", account="Everest Logistics", email="rjoshi@everestlogistics.com", phone="+91-98765-18001", type="Influencer", last_contact=ago(1), organization_id=1),
                Contact(id_str="CO-1020", name="Deepa Nair", role="Marketing Head", account="Starlight Entertainment", email="dnair@starlight.in", phone="+91-98765-19001", type="Primary", last_contact=ago(3), organization_id=1),
                Contact(id_str="CO-1021", name="Amit Saxena", role="Procurement", account="Vortex Energy", email="asaxena@vortexenergy.com", phone="+91-98765-70001", type="Technical", last_contact=ago(1), organization_id=1),
                Contact(id_str="CO-1022", name="Pooja Jain", role="Account Manager", account="Apex Logistics", email="pjain@apexlogistics.com", phone="+91-98765-60001", type="Influencer", last_contact=ago(2), organization_id=1),
                Contact(id_str="CO-1023", name="Sunil Patel", role="IT Head", account="Velora Hospitality", email="spatel@velorahospitality.com", phone="+91-98765-15001", type="Decision", last_contact=ago(2), organization_id=1),
                Contact(id_str="CO-1024", name="Dr. Anjali Rao", role="Admin Head", account="Bright Future Education", email="arao@brightfuture.edu", phone="+91-98765-17001", type="Decision", last_contact=ago(6), organization_id=1),
                Contact(id_str="CO-1025", name="Hariharan N", role="VP Tech", account="Gardenia Organic", email="hn@gardeniaorganic.com", phone="+91-98765-13001", type="Primary", last_contact=ago(15), organization_id=1),
            ]
            db.add_all(contacts)
            await db.flush()
            print(f"  {len(contacts)} contacts seeded")

            # ── Documents ──────────────────────────────────────────────
            documents = [
                Document(id_str="DO-1001", name="SLA_Agreement_2026.pdf", type="SLA", account="Meridian Foods", size="2.4 MB", status="Signed", organization_id=1, updated_at=ago(0)),
                Document(id_str="DO-1002", name="Cirrus_Quote_Draft.docx", type="Proposal", account="Cirrus Aviation", size="1.1 MB", status="Under Review", organization_id=1, updated_at=ago(1)),
                Document(id_str="DO-1003", name="Orbit_Health_NDA_Final.pdf", type="NDA", account="Orbit Health", size="840 KB", status="Signed", organization_id=1, updated_at=ago(2)),
                Document(id_str="DO-1004", name="Nimbus_Technical_Scope.pdf", type="SOW", account="Nimbus Technologies", size="3.6 MB", status="Approved", organization_id=1, updated_at=ago(0)),
                Document(id_str="DO-1005", name="Solara_Panel_Specs_V2.xlsx", type="Specification", account="Solara Renewable", size="1.8 MB", status="Draft", organization_id=1, updated_at=ago(1)),
                Document(id_str="DO-1006", name="Titan_Compliance_Report.pdf", type="Compliance", account="Titan Defence", size="4.2 MB", status="Under Review", organization_id=1, updated_at=ago(1)),
                Document(id_str="DO-1007", name="Delta_Auto_Integration_Plan.pptx", type="Proposal", account="Delta Automotive", size="2.9 MB", status="Draft", organization_id=1, updated_at=ago(0)),
                Document(id_str="DO-1008", name="Oceanic_Pharma_Validation.pdf", type="Validation", account="Oceanic Pharmaceuticals", size="5.1 MB", status="Signed", organization_id=1, updated_at=ago(0)),
                Document(id_str="DO-1009", name="Pinnacle_Realty_Contract_Final.docx", type="Contract", account="Pinnacle Realty", size="980 KB", status="Signed", organization_id=1, updated_at=ago(0)),
                Document(id_str="DO-1010", name="Everest_Logistics_NDA.pdf", type="NDA", account="Everest Logistics", size="720 KB", status="Signed", organization_id=1, updated_at=ago(1)),
            ]
            db.add_all(documents)
            print(f"  {len(documents)} documents seeded")

            # ── Leads (15) ─────────────────────────────────────────────
            leads = [
                Lead(id_str="LD-1001", name="Apex Logistics — Full Suite", company="Apex Logistics Group", source="Website Request", est_value=120000, status="Qualified", organization_id=1, updated_at=ago(3)),
                Lead(id_str="LD-1002", name="Vortex Energy — SCADA Integration", company="Vortex Energy Solutions", source="Partner Referral", est_value=85000, status="New", organization_id=1, updated_at=ago(6)),
                Lead(id_str="LD-1003", name="Bright Future — Campus ERP", company="Bright Future Education", source="Conference", est_value=45000, status="New", organization_id=1, updated_at=ago(4)),
                Lead(id_str="LD-1004", name="Cascade Water — IoT Monitoring", company="Cascade Water Solutions", source="LinkedIn Campaign", est_value=95000, status="Qualified", organization_id=1, updated_at=ago(2)),
                Lead(id_str="LD-1005", name="Gardenia Organic — Supply Chain", company="Gardenia Organic Farms", source="Trade Show", est_value=55000, status="New", organization_id=1, updated_at=ago(10)),
                Lead(id_str="LD-1006", name="Neuron AI — GPU Cluster Mgmt", company="Neuron AI Research", source="Website Request", est_value=140000, status="Qualified", organization_id=1, updated_at=ago(3)),
                Lead(id_str="LD-1007", name="Starlight — Media Asset Platform", company="Starlight Entertainment", source="Referral", est_value=78000, status="Qualified", organization_id=1, updated_at=ago(1)),
                Lead(id_str="LD-1008", name="Velora — PMS Integration", company="Velora Hospitality", source="Email Campaign", est_value=110000, status="New", organization_id=1, updated_at=ago(5)),
                Lead(id_str="LD-1009", name="Halcyon — Reactivation Campaign", company="Halcyon Media", source="Outbound", est_value=65000, status="Contacted", organization_id=1, updated_at=ago(4)),
                Lead(id_str="LD-1010", name="Everest — Fleet Tracking", company="Everest Logistics", source="Partner Referral", est_value=160000, status="Qualified", organization_id=1, updated_at=ago(1)),
                Lead(id_str="LD-1011", name="Kalpana Aerospace — MRO System", company="Kalpana Aerospace", source="Conference", est_value=280000, status="New", organization_id=1, updated_at=ago(2)),
                Lead(id_str="LD-1012", name="Veda Analytics — Data Platform", company="Veda Analytics", source="Website Request", est_value=92000, status="Contacted", organization_id=1, updated_at=ago(3)),
                Lead(id_str="LD-1013", name="Sahana Agritech — Farm Mgmt", company="Sahana Agritech", source="Trade Show", est_value=48000, status="New", organization_id=1, updated_at=ago(7)),
                Lead(id_str="LD-1014", name="Phoenix Solar — Panel Mfg", company="Phoenix Solar", source="Email Campaign", est_value=195000, status="Qualified", organization_id=1, updated_at=ago(1)),
                Lead(id_str="LD-1015", name="Coastal Shipping — Port Ops", company="Coastal Shipping Lines", source="Referral", est_value=230000, status="New", organization_id=1, updated_at=ago(5)),
            ]
            db.add_all(leads)
            await db.flush()
            print(f"  {len(leads)} leads seeded")

            # ── Opportunities (15) ──────────────────────────────────────
            opps = [
                Opportunity(id_str="OP-1001", name="Meridian Foods — Phase 3 Expansion", account="Meridian Foods", value="450000", probability="85%", close_date=later(14), stage="Negotiation", organization_id=1),
                Opportunity(id_str="OP-1002", name="Cirrus — Fleet Telemetry Upgrade", account="Cirrus Aviation", value="220000", probability="60%", close_date=later(30), stage="Proposal", organization_id=1),
                Opportunity(id_str="OP-1003", name="Orbit Health — EHR Platform", account="Orbit Health", value="580000", probability="90%", close_date=later(7), stage="Negotiation", organization_id=1),
                Opportunity(id_str="OP-1004", name="Nimbus — Cloud Migration", account="Nimbus Technologies", value="310000", probability="70%", close_date=later(21), stage="Proposal", organization_id=1),
                Opportunity(id_str="OP-1005", name="Solara — Plant SCADA Overhaul", account="Solara Renewable", value="420000", probability="75%", close_date=later(45), stage="Discovery", organization_id=1),
                Opportunity(id_str="OP-1006", name="Titan Defence — Secure Comms Suite", account="Titan Defence", value="680000", probability="50%", close_date=later(60), stage="Discovery", organization_id=1),
                Opportunity(id_str="OP-1007", name="Pinnacle Realty — PropTech Platform", account="Pinnacle Realty", value="250000", probability="80%", close_date=later(10), stage="Negotiation", organization_id=1),
                Opportunity(id_str="OP-1008", name="Delta Auto — MES Implementation", account="Delta Automotive", value="380000", probability="65%", close_date=later(35), stage="Proposal", organization_id=1),
                Opportunity(id_str="OP-1009", name="Oceanic — GxP Compliance System", account="Oceanic Pharmaceuticals", value="720000", probability="95%", close_date=later(5), stage="Negotiation", organization_id=1),
                Opportunity(id_str="OP-1010", name="Everest — WMS Upgrade", account="Everest Logistics", value="190000", probability="55%", close_date=later(28), stage="Proposal", organization_id=1),
                Opportunity(id_str="OP-1011", name="Meridian Foods — Analytics Add-on", account="Meridian Foods", value="85000", probability="90%", close_date=later(7), stage="Won", organization_id=1),
                Opportunity(id_str="OP-1012", name="Bristow Textiles — Win-back", account="Bristow Textiles", value="150000", probability="20%", close_date=later(90), stage="Discovery", organization_id=1),
                Opportunity(id_str="OP-1013", name="Vortex Energy — IIoT Platform", account="Vortex Energy Solutions", value="130000", probability="40%", close_date=later(45), stage="Discovery", organization_id=1),
                Opportunity(id_str="OP-1014", name="Apex Logistics — TMS Rollout", account="Apex Logistics Group", value="95000", probability="45%", close_date=later(30), stage="Proposal", organization_id=1),
                Opportunity(id_str="OP-1015", name="Starlight — DAM Platform", account="Starlight Entertainment", value="110000", probability="50%", close_date=later(25), stage="Discovery", organization_id=1),
            ]
            db.add_all(opps)
            await db.flush()
            print(f"  {len(opps)} opportunities seeded")

            # ── Sales (15) ─────────────────────────────────────────────
            sales = [
                Sale(id_str="SA-1001", invoice_no="INV-2026-001", account="Meridian Foods", amount="177000", issued_date=ago(60), due_date=ago(45), status="Paid", rep="Aditi Rao"),
                Sale(id_str="SA-1002", invoice_no="INV-2026-002", account="Cirrus Aviation", amount="495600", issued_date=ago(30), due_date=later(0), status="Invoiced", rep="Aditi Rao"),
                Sale(id_str="SA-1003", invoice_no="INV-2026-003", account="Halcyon Media", amount="100300", issued_date=ago(90), due_date=ago(60), status="Overdue", rep="Priya Shah"),
                Sale(id_str="SA-1004", invoice_no="INV-2026-004", account="Orbit Health", amount="271400", issued_date=ago(5), due_date=later(25), status="Pending", rep="Aditi Rao"),
                Sale(id_str="SA-1005", invoice_no="INV-2026-005", account="Bristow Textiles", amount="365800", issued_date=ago(15), due_date=later(15), status="Partially Paid", rep="Raj Kumar"),
                Sale(id_str="SA-1006", invoice_no="INV-2026-007", account="Nimbus Technologies", amount="408200", issued_date=ago(10), due_date=later(20), status="Invoiced", rep="Aditi Rao"),
                Sale(id_str="SA-1007", invoice_no="INV-2026-008", account="Solara Renewable", amount="620500", issued_date=ago(3), due_date=later(27), status="Pending", rep="Priya Shah"),
                Sale(id_str="SA-1008", invoice_no="INV-2026-009", account="Titan Defence", amount="823000", issued_date=ago(20), due_date=later(10), status="Invoiced", rep="Raj Kumar"),
                Sale(id_str="SA-1009", invoice_no="INV-2026-010", account="Pinnacle Realty", amount="195200", issued_date=ago(7), due_date=later(23), status="Pending", rep="Aditi Rao"),
                Sale(id_str="SA-1010", invoice_no="INV-2026-011", account="Delta Automotive", amount="312800", issued_date=ago(2), due_date=later(28), status="Pending", rep="Priya Shah"),
                Sale(id_str="SA-1011", invoice_no="INV-2026-012", account="Oceanic Pharmaceuticals", amount="889400", issued_date=ago(1), due_date=later(29), status="Pending", rep="Aditi Rao"),
                Sale(id_str="SA-1012", invoice_no="INV-2026-013", account="Everest Logistics", amount="245000", issued_date=ago(12), due_date=later(18), status="Invoiced", rep="Raj Kumar"),
                Sale(id_str="SA-1013", invoice_no="INV-2026-014", account="Velora Hospitality", amount="134500", issued_date=ago(8), due_date=later(22), status="Pending", rep="Priya Shah"),
                Sale(id_str="SA-1014", invoice_no="INV-2026-015", account="Meridian Foods", amount="125000", issued_date=ago(4), due_date=later(26), status="Pending", rep="Aditi Rao"),
                Sale(id_str="SA-1015", invoice_no="INV-2026-016", account="Starlight Entertainment", amount="78000", issued_date=ago(2), due_date=later(28), status="Pending", rep="Priya Shah"),
            ]
            db.add_all(sales)
            await db.flush()
            print(f"  {len(sales)} sales seeded")

            # ── Requirements (12) ──────────────────────────────────────
            reqs = [
                Requirement(id_str="RE-1001", name="SSO & SAML Integration", account="Meridian Foods", category="Security", priority="High", status="Review", organization_id=1),
                Requirement(id_str="RE-1002", name="API support for flight systems", account="Cirrus Aviation", category="Technical", priority="Medium", status="Draft", organization_id=1),
                Requirement(id_str="RE-1003", name="HIPAA Compliance Module", account="Orbit Health", category="Compliance", priority="Critical", status="Approved", organization_id=1),
                Requirement(id_str="RE-1004", name="Real-time SCADA Dashboard", account="Solara Renewable", category="Technical", priority="High", status="Review", organization_id=1),
                Requirement(id_str="RE-1005", name="Multi-tenant Architecture", account="Nimbus Technologies", category="Architecture", priority="High", status="Approved", organization_id=1),
                Requirement(id_str="RE-1006", name="Offline-first Mobile App", account="Everest Logistics", category="Mobile", priority="Medium", status="Draft", organization_id=1),
                Requirement(id_str="RE-1007", name="GxP Electronic Signatures", account="Oceanic Pharmaceuticals", category="Compliance", priority="Critical", status="Approved", organization_id=1),
                Requirement(id_str="RE-1008", name="Property Management API", account="Pinnacle Realty", category="Integration", priority="High", status="Review", organization_id=1),
                Requirement(id_str="RE-1009", name="MES Protocol Adapter", account="Delta Automotive", category="Technical", priority="High", status="Draft", organization_id=1),
                Requirement(id_str="RE-1010", name="Secure Comms Encryption", account="Titan Defence", category="Security", priority="Critical", status="Approved", organization_id=1),
                Requirement(id_str="RE-1011", name="GMP Labeling Module", account="Bristow Textiles", category="Manufacturing", priority="Low", status="Draft", organization_id=1),
                Requirement(id_str="RE-1012", name="AI-driven Predictive Maintenance", account="Vortex Energy", category="AI/ML", priority="Medium", status="Review", organization_id=1),
            ]
            db.add_all(reqs)
            await db.flush()
            print(f"  {len(reqs)} requirements seeded")

            # ── CRM Quotations (10) ────────────────────────────────────
            quotes = [
                Quotation(id_str="QU-1001", quote_no="QTN-2026-001", account="Meridian Foods", value="245000", valid_until=later(30), status="Sent", organization_id=1),
                Quotation(id_str="QU-1002", quote_no="QTN-2026-002", account="Cirrus Aviation", value="510000", valid_until=later(20), status="Sent", organization_id=1),
                Quotation(id_str="QU-1003", quote_no="QTN-2026-003", account="Orbit Health", value="625000", valid_until=later(45), status="Draft", organization_id=1),
                Quotation(id_str="QU-1004", quote_no="QTN-2026-004", account="Nimbus Technologies", value="350000", valid_until=later(30), status="Sent", organization_id=1),
                Quotation(id_str="QU-1005", quote_no="QTN-2026-005", account="Solara Renewable", value="480000", valid_until=later(60), status="Draft", organization_id=1),
                Quotation(id_str="QU-1006", quote_no="QTN-2026-006", account="Pinnacle Realty", value="220000", valid_until=later(21), status="Sent", organization_id=1),
                Quotation(id_str="QU-1007", quote_no="QTN-2026-007", account="Delta Automotive", value="395000", valid_until=later(30), status="Draft", organization_id=1),
                Quotation(id_str="QU-1008", quote_no="QTN-2026-008", account="Oceanic Pharmaceuticals", value="780000", valid_until=later(45), status="Sent", organization_id=1),
                Quotation(id_str="QU-1009", quote_no="QTN-2026-009", account="Everest Logistics", value="210000", valid_until=later(25), status="Sent", organization_id=1),
                Quotation(id_str="QU-1010", quote_no="QTN-2026-010", account="Titan Defence", value="720000", valid_until=later(60), status="Draft", organization_id=1),
            ]
            db.add_all(quotes)
            await db.flush()
            print(f"  {len(quotes)} CRM quotations seeded")

            # ── Sales Orders (10) ─────────────────────────────────────
            orders = [
                SalesOrder(id_str="SO-1001", so_no="SO-4401", account="Meridian Foods", from_quote="QTN-2026-001", value="245000", eta=later(30), status="Confirmed", organization_id=1),
                SalesOrder(id_str="SO-1002", so_no="SO-4402", account="Cirrus Aviation", from_quote="QTN-2026-002", value="510000", eta=later(45), status="Pending", organization_id=1),
                SalesOrder(id_str="SO-1003", so_no="SO-4403", account="Orbit Health", from_quote="QTN-2026-003", value="625000", eta=later(60), status="Draft", organization_id=1),
                SalesOrder(id_str="SO-1004", so_no="SO-4404", account="Nimbus Technologies", from_quote="QTN-2026-004", value="350000", eta=later(40), status="Confirmed", organization_id=1),
                SalesOrder(id_str="SO-1005", so_no="SO-4405", account="Pinnacle Realty", from_quote="QTN-2026-006", value="220000", eta=later(25), status="Confirmed", organization_id=1),
                SalesOrder(id_str="SO-1006", so_no="SO-4406", account="Oceanic Pharmaceuticals", from_quote="QTN-2026-008", value="780000", eta=later(60), status="Pending", organization_id=1),
                SalesOrder(id_str="SO-1007", so_no="SO-4407", account="Everest Logistics", from_quote="QTN-2026-009", value="210000", eta=later(35), status="Confirmed", organization_id=1),
                SalesOrder(id_str="SO-1008", so_no="SO-4408", account="Delta Automotive", from_quote="QTN-2026-007", value="395000", eta=later(50), status="Draft", organization_id=1),
            ]
            db.add_all(orders)
            await db.flush()
            print(f"  {len(orders)} sales orders seeded")

            # ── Enquiries (12) ─────────────────────────────────────────
            enquiries = [
                Enquiry(id_str="EN-1001", subject="Enterprise bulk license discount query", customer="Meridian Foods", date=ago(8), status="Open", organization_id=1),
                Enquiry(id_str="EN-1002", subject="Custom branding integration capability", customer="Halcyon Media", date=ago(12), status="Replied", organization_id=1),
                Enquiry(id_str="EN-1003", subject="API rate limit and throttling configuration", customer="Nimbus Technologies", date=ago(3), status="Open", organization_id=1),
                Enquiry(id_str="EN-1004", subject="On-premise deployment options", customer="Titan Defence", date=ago(5), status="Replied", organization_id=1),
                Enquiry(id_str="EN-1005", subject="EDI integration for logistics partners", customer="Everest Logistics", date=ago(2), status="Open", organization_id=1),
                Enquiry(id_str="EN-1006", subject="GMP validation documentation required", customer="Oceanic Pharmaceuticals", date=ago(1), status="Replied", organization_id=1),
                Enquiry(id_str="EN-1007", subject="IoT sensor compatibility list", customer="Solara Renewable", date=ago(4), status="Open", organization_id=1),
                Enquiry(id_str="EN-1008", subject="Multi-currency billing support", customer="Cirrus Aviation", date=ago(6), status="Replied", organization_id=1),
                Enquiry(id_str="EN-1009", subject="Property management CRM data migration", customer="Pinnacle Realty", date=ago(2), status="Open", organization_id=1),
                Enquiry(id_str="EN-1010", subject="Mobile app SDK documentation", customer="Apex Logistics", date=ago(3), status="Open", organization_id=1),
                Enquiry(id_str="EN-1011", subject="MES integration with SAP", customer="Delta Automotive", date=ago(1), status="Replied", organization_id=1),
                Enquiry(id_str="EN-1012", subject="Energy monitoring dashboard customization", customer="Vortex Energy", date=ago(5), status="Open", organization_id=1),
            ]
            db.add_all(enquiries)
            await db.flush()
            print(f"  {len(enquiries)} enquiries seeded")

            # ── Site Visits (10) ───────────────────────────────────────
            visits = [
                SiteVisit(id_str="SV-1001", location="Meridian Foods HQ — Whitefield", customer="Meridian Foods", date=ago(5), status="Completed", organization_id=1),
                SiteVisit(id_str="SV-1002", location="Cirrus Hangar 3 — Bengaluru Airport", customer="Cirrus Aviation", date=ago(3), status="Completed", organization_id=1),
                SiteVisit(id_str="SV-1003", location="Orbit Health — Electronic City", customer="Orbit Health", date=later(2), status="Scheduled", organization_id=1),
                SiteVisit(id_str="SV-1004", location="Nimbus Tech Park — Manyata", customer="Nimbus Technologies", date=ago(1), status="Completed", organization_id=1),
                SiteVisit(id_str="SV-1005", location="Solara Solar Plant — Pavagada", customer="Solara Renewable", date=later(10), status="Scheduled", organization_id=1),
                SiteVisit(id_str="SV-1006", location="Titan Defence — DRDO Complex", customer="Titan Defence", date=ago(2), status="Completed", organization_id=1),
                SiteVisit(id_str="SV-1007", location="Pinnacle Realty — UB City", customer="Pinnacle Realty", date=later(5), status="Scheduled", organization_id=1),
                SiteVisit(id_str="SV-1008", location="Delta Auto Plant — Hosur", customer="Delta Automotive", date=later(7), status="Scheduled", organization_id=1),
                SiteVisit(id_str="SV-1009", location="Oceanic Pharma — Vizag SEZ", customer="Oceanic Pharmaceuticals", date=ago(4), status="Completed", organization_id=1),
                SiteVisit(id_str="SV-1010", location="Everest Logistics — Bhiwandi DC", customer="Everest Logistics", date=later(3), status="Scheduled", organization_id=1),
            ]
            db.add_all(visits)
            await db.flush()
            print(f"  {len(visits)} site visits seeded")

            # ── Follow-ups (12) ────────────────────────────────────────
            followups = [
                FollowUp(id_str="FU-1001", action="Send revised security compliance packet", customer="Meridian Foods", due_date=ago(1), status="Pending", organization_id=1),
                FollowUp(id_str="FU-1002", action="Schedule technical scoping call", customer="Cirrus Aviation", due_date=ago(2), status="Completed", organization_id=1),
                FollowUp(id_str="FU-1003", action="Submit HIPAA compliance evidence", customer="Orbit Health", due_date=later(3), status="Pending", organization_id=1),
                FollowUp(id_str="FU-1004", action="Share architecture whitepaper", customer="Nimbus Technologies", due_date=ago(1), status="Completed", organization_id=1),
                FollowUp(id_str="FU-1005", action="Schedule plant walkthrough for SCADA assessment", customer="Solara Renewable", due_date=later(7), status="Pending", organization_id=1),
                FollowUp(id_str="FU-1006", action="Follow up on encrypted comms demo", customer="Titan Defence", due_date=ago(3), status="Completed", organization_id=1),
                FollowUp(id_str="FU-1007", action="Send payment link for overdue invoice", customer="Halcyon Media", due_date=later(1), status="Pending", organization_id=1),
                FollowUp(id_str="FU-1008", action="Coordinate with Oceanic validation team", customer="Oceanic Pharmaceuticals", due_date=later(2), status="Pending", organization_id=1),
                FollowUp(id_str="FU-1009", action="Draft integration proposal for Pinnacle", customer="Pinnacle Realty", due_date=later(5), status="Pending", organization_id=1),
                FollowUp(id_str="FU-1010", action="Schedule MES requirements workshop", customer="Delta Automotive", due_date=later(10), status="Pending", organization_id=1),
                FollowUp(id_str="FU-1011", action="Follow up on lead qualification—Apex", customer="Apex Logistics", due_date=ago(2), status="Completed", organization_id=1),
                FollowUp(id_str="FU-1012", action="Send energy dashboard mockups", customer="Vortex Energy", due_date=later(4), status="Pending", organization_id=1),
            ]
            db.add_all(followups)
            await db.flush()
            print(f"  {len(followups)} follow-ups seeded")

            # ── Tasks (12) ──────────────────────────────────────────────
            tasks = [
                Task(id_str="TA-1001", title="Review Meridian contract amendments", related_to="Meridian Expansion", due_date=ago(1), status="In Progress", organization_id=1),
                Task(id_str="TA-1002", title="Send quote revisions to David Vance", related_to="Cirrus System", due_date=ago(2), status="Completed", organization_id=1),
                Task(id_str="TA-1003", title="Finalize Orbit Health SOW", related_to="Orbit EHR Platform", due_date=later(3), status="In Progress", organization_id=1),
                Task(id_str="TA-1004", title="Prepare Nimbus cloud cost analysis", related_to="Nimbus Migration", due_date=later(5), status="Pending", organization_id=1),
                Task(id_str="TA-1005", title="Draft Solara SCADA RFP response", related_to="Solara Plant", due_date=later(10), status="Pending", organization_id=1),
                Task(id_str="TA-1006", title="Review Titan security compliance", related_to="Titan Comms Suite", due_date=ago(1), status="Completed", organization_id=1),
                Task(id_str="TA-1007", title="Schedule Oceanic Pharma GxP audit", related_to="Oceanic GxP", due_date=later(7), status="In Progress", organization_id=1),
                Task(id_str="TA-1008", title="Velocity Pinnacle property listing import", related_to="Pinnacle PropTech", due_date=later(2), status="Pending", organization_id=1),
                Task(id_str="TA-1009", title="Delta MES protocol research", related_to="Delta MES", due_date=later(14), status="Pending", organization_id=1),
                Task(id_str="TA-1010", title="Everest WMS integration test", related_to="Everest WMS", due_date=later(4), status="In Progress", organization_id=1),
                Task(id_str="TA-1011", title="Create sales deck for Apex Logistics", related_to="Apex TMS", due_date=later(6), status="Pending", organization_id=1),
                Task(id_str="TA-1012", title="Research IIoT sensors for Vortex", related_to="Vortex IIoT", due_date=later(8), status="Pending", organization_id=1),
            ]
            db.add_all(tasks)
            await db.flush()
            print(f"  {len(tasks)} tasks seeded")

            # ── Communications (12) ────────────────────────────────────
            comms = [
                Communication(id_str="CM-1001", type="Email", subject="Revised Proposal Sent", customer="Meridian Foods", date=ago(7), organization_id=1),
                Communication(id_str="CM-1002", type="Call", subject="Scoping meeting follow-up", customer="Cirrus Aviation", date=ago(6), organization_id=1),
                Communication(id_str="CM-1003", type="Meeting", subject="HIPAA Compliance Workshop", customer="Orbit Health", date=ago(4), organization_id=1),
                Communication(id_str="CM-1004", type="Email", subject="Cloud Architecture Review", customer="Nimbus Technologies", date=ago(3), organization_id=1),
                Communication(id_str="CM-1005", type="Call", subject="SCADA Requirements Call", customer="Solara Renewable", date=ago(2), organization_id=1),
                Communication(id_str="CM-1006", type="Meeting", subject="Titan Secure Comms Demo", customer="Titan Defence", date=ago(5), organization_id=1),
                Communication(id_str="CM-1007", type="Email", subject="Payment Reminder — INV-2026-003", customer="Halcyon Media", date=ago(3), organization_id=1),
                Communication(id_str="CM-1008", type="Meeting", subject="GxP Readiness Assessment", customer="Oceanic Pharmaceuticals", date=ago(1), organization_id=1),
                Communication(id_str="CM-1009", type="Email", subject="Pinnacle Property Data Schema", customer="Pinnacle Realty", date=ago(2), organization_id=1),
                Communication(id_str="CM-1010", type="Call", subject="Delta MES Integration Kickoff", customer="Delta Automotive", date=ago(1), organization_id=1),
                Communication(id_str="CM-1011", type="Email", subject="Everest WMS API Documentation", customer="Everest Logistics", date=ago(2), organization_id=1),
                Communication(id_str="CM-1012", type="Meeting", subject="Apex Logistics — Product Demo", customer="Apex Logistics", date=ago(4), organization_id=1),
            ]
            db.add_all(comms)
            await db.flush()
            print(f"  {len(comms)} communications seeded")

            # ── Visit Plans (8) ────────────────────────────────────────
            plans = [
                VisitPlan(id_str="VP-1001", title="Q3 Expansion Scope Discussion", customer="Meridian Foods", date=later(5), status="Confirmed", organization_id=1),
                VisitPlan(id_str="VP-1002", title="Pilot Flight Ops Walkthrough", customer="Cirrus Aviation", date=later(12), status="Scheduled", organization_id=1),
                VisitPlan(id_str="VP-1003", title="EHR Go-Live Support Visit", customer="Orbit Health", date=later(20), status="Scheduled", organization_id=1),
                VisitPlan(id_str="VP-1004", title="SCADA System On-site Assessment", customer="Solara Renewable", date=later(30), status="Tentative", organization_id=1),
                VisitPlan(id_str="VP-1005", title="Titan Comm Suite Install", customer="Titan Defence", date=later(14), status="Confirmed", organization_id=1),
                VisitPlan(id_str="VP-1006", title="Pharma GxP Validation On-site", customer="Oceanic Pharmaceuticals", date=later(45), status="Scheduled", organization_id=1),
                VisitPlan(id_str="VP-1007", title="WMS Go-live Support", customer="Everest Logistics", date=later(18), status="Confirmed", organization_id=1),
                VisitPlan(id_str="VP-1008", title="PropTech Platform Launch", customer="Pinnacle Realty", date=later(21), status="Scheduled", organization_id=1),
            ]
            db.add_all(plans)
            await db.flush()
            print(f"  {len(plans)} visit plans seeded")

            # ── Complaints (10) ────────────────────────────────────────
            complaints = [
                Complaint(id_str="CP-1001", subject="Delay in security validation document delivery", customer="Meridian Foods", date_raised=ago(10), status="Investigating", organization_id=1),
                Complaint(id_str="CP-1002", subject="API latency in flight telemetry endpoint", customer="Cirrus Aviation", date_raised=ago(7), status="Resolved", organization_id=1),
                Complaint(id_str="CP-1003", subject="EHR data sync failure after upgrade", customer="Orbit Health", date_raised=ago(2), status="Open", organization_id=1),
                Complaint(id_str="CP-1004", subject="Incorrect invoicing — overcharged on support", customer="Nimbus Technologies", date_raised=ago(4), status="Resolved", organization_id=1),
                Complaint(id_str="CP-1005", subject="SCADA dashboard not refreshing real-time", customer="Solara Renewable", date_raised=ago(1), status="Open", organization_id=1),
                Complaint(id_str="CP-1006", subject="Encrypted comms module failing FIPS check", customer="Titan Defence", date_raised=ago(6), status="Investigating", organization_id=1),
                Complaint(id_str="CP-1007", subject="Invoice #INV-2026-003 payment not reflecting", customer="Halcyon Media", date_raised=ago(5), status="Open", organization_id=1),
                Complaint(id_str="CP-1008", subject="GxP audit log missing timestamps", customer="Oceanic Pharmaceuticals", date_raised=ago(1), status="Investigating", organization_id=1),
                Complaint(id_str="CP-1009", subject="Property listing API returning 502 errors", customer="Pinnacle Realty", date_raised=ago(3), status="Resolved", organization_id=1),
                Complaint(id_str="CP-1010", subject="WMS picklist generation taking >30s", customer="Everest Logistics", date_raised=ago(2), status="Open", organization_id=1),
            ]
            db.add_all(complaints)
            await db.flush()
            print(f"  {len(complaints)} complaints seeded")

            # ── Feedback (10) ──────────────────────────────────────────
            feedback = [
                Feedback(id_str="FB-1001", score=9, comment="Great platform stability, very happy with response times", customer="Meridian Foods", date=ago(8), organization_id=1),
                Feedback(id_str="FB-1002", score=8, comment="Good feature depth but integration setup needs more docs", customer="Cirrus Aviation", date=ago(7), organization_id=1),
                Feedback(id_str="FB-1003", score=10, comment="Excellent HIPAA compliance support — very thorough", customer="Orbit Health", date=ago(3), organization_id=1),
                Feedback(id_str="FB-1004", score=7, comment="Cloud migration smooth overall, minor downtime issues", customer="Nimbus Technologies", date=ago(5), organization_id=1),
                Feedback(id_str="FB-1005", score=9, comment="SCADA integration exceeded expectations", customer="Solara Renewable", date=ago(2), organization_id=1),
                Feedback(id_str="FB-1006", score=6, comment="Security module good but FIPS certification pending", customer="Titan Defence", date=ago(6), organization_id=1),
                Feedback(id_str="FB-1007", score=4, comment="Billing issues causing reconciliation headaches", customer="Halcyon Media", date=ago(10), organization_id=1),
                Feedback(id_str="FB-1008", score=10, comment="GxP validation team was outstanding", customer="Oceanic Pharmaceuticals", date=ago(1), organization_id=1),
                Feedback(id_str="FB-1009", score=8, comment="Property tech platform looks promising, smooth demo", customer="Pinnacle Realty", date=ago(3), organization_id=1),
                Feedback(id_str="FB-1010", score=7, comment="WMS is solid but picklist performance can improve", customer="Everest Logistics", date=ago(2), organization_id=1),
            ]
            db.add_all(feedback)
            await db.flush()
            print(f"  {len(feedback)} feedback seeded")

            # ── Reports (10) ───────────────────────────────────────────
            reports = [
                Report(id_str="RP-1001", title="Sales Performance & ARR Breakdown Q2", category="Sales", last_run=ago(1), status="Completed", organization_id=1),
                Report(id_str="RP-1002", title="Engagement & Retention Audit", category="Engagement", last_run=ago(2), status="Completed", organization_id=1),
                Report(id_str="RP-1003", title="Pipeline Health Dashboard", category="Pipeline", last_run=ago(0), status="Completed", organization_id=1),
                Report(id_str="RP-1004", title="Support SLA Compliance Report", category="Support", last_run=ago(3), status="Completed", organization_id=1),
                Report(id_str="RP-1005", title="Quarterly Churn Analysis", category="Retention", last_run=ago(15), status="Completed", organization_id=1),
                Report(id_str="RP-1006", title="Lead Source Effectiveness", category="Marketing", last_run=ago(5), status="Generating", organization_id=1),
                Report(id_str="RP-1007", title="Customer Satisfaction Scorecard", category="CSAT", last_run=ago(7), status="Completed", organization_id=1),
                Report(id_str="RP-1008", title="Revenue Forecasting Q3", category="Finance", last_run=ago(0), status="Completed", organization_id=1),
                Report(id_str="RP-1009", title="Product Feature Usage Stats", category="Product", last_run=ago(10), status="Completed", organization_id=1),
                Report(id_str="RP-1010", title="Complaint Resolution Time Analysis", category="Support", last_run=ago(4), status="Generating", organization_id=1),
            ]
            db.add_all(reports)
            await db.flush()
            print(f"  {len(reports)} reports seeded")

            # ── AI Assistant Logs (10) ─────────────────────────────────
            ai_logs = [
                AIAssistantLog(id_str="AI-1001", query="Summarize contract clauses for Meridian Foods", category="Documents", date=ago(7), status="Success", organization_id=1),
                AIAssistantLog(id_str="AI-1002", query="Draft response to David Vance email about API latency", category="General", date=ago(6), status="Success", organization_id=1),
                AIAssistantLog(id_str="AI-1003", query="Generate HIPAA compliance checklist for Orbit Health", category="Compliance", date=ago(4), status="Success", organization_id=1),
                AIAssistantLog(id_str="AI-1004", query="Compare cloud migration costs — Azure vs AWS", category="Analysis", date=ago(3), status="Success", organization_id=1),
                AIAssistantLog(id_str="AI-1005", query="Write SCADA system requirements document template", category="Documents", date=ago(2), status="Success", organization_id=1),
                AIAssistantLog(id_str="AI-1006", query="Translate technical spec to Hindi", category="Translation", date=ago(5), status="Success", organization_id=1),
                AIAssistantLog(id_str="AI-1007", query="Analyze customer sentiment from support tickets", category="Analysis", date=ago(3), status="Failed", organization_id=1),
                AIAssistantLog(id_str="AI-1008", query="Draft email for overdue invoice reminder", category="General", date=ago(4), status="Success", organization_id=1),
                AIAssistantLog(id_str="AI-1009", query="Generate test cases for WMS picklist module", category="Engineering", date=ago(1), status="Success", organization_id=1),
                AIAssistantLog(id_str="AI-1010", query="Summarize Q3 sales forecast from data", category="Analysis", date=ago(0), status="Success", organization_id=1),
            ]
            db.add_all(ai_logs)
            await db.flush()
            print(f"  {len(ai_logs)} AI logs seeded")

            await db.commit()
            print("\nCRM seeding completed successfully!")
            print(f"Total records: {len(metrics)+len(stages)+len(recs)+len(customers)+len(contacts)+len(documents)+len(leads)+len(opps)+len(sales)+len(reqs)+len(quotes)+len(orders)+len(enquiries)+len(visits)+len(followups)+len(tasks)+len(comms)+len(plans)+len(complaints)+len(feedback)+len(reports)+len(ai_logs)}")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()
            raise

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
