"""Comprehensive CRM seed — customers, contacts, leads, opportunities, pipeline, quotations, sales orders, and AI data."""
import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal, engine
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


now = datetime.now(timezone.utc)
def ago(days: int) -> str:
    d = now - timedelta(days=days)
    return d.strftime("%b %d")


async def seed():
    print("Seeding CRM database...")
    async with AsyncSessionLocal() as db:
        try:
            organization_id = 1

            # ── Customers (10) ───────────────────────────────────────────
            customers = [
                Customer(id_str="CU-1001", account="Meridian Foods", industry="Food Processing",
                         tier="Enterprise", arr=240000, status="Active", owner="Maya Patel", updated_at=ago(1)),
                Customer(id_str="CU-1002", account="Cirrus Aviation", industry="Aerospace",
                         tier="Enterprise", arr=520000, status="Active", owner="Maya Patel", updated_at=ago(0)),
                Customer(id_str="CU-1003", account="Halcyon Media", industry="Media & Entertainment",
                         tier="Mid-Market", arr=85000, status="Active", owner="Maya Patel", updated_at=ago(2)),
                Customer(id_str="CU-1004", account="Orbit Health", industry="Healthcare",
                         tier="Enterprise", arr=180000, status="Active", owner="Alex Chen", updated_at=ago(1)),
                Customer(id_str="CU-1005", account="Bristow Textiles", industry="Textiles",
                         tier="Mid-Market", arr=62000, status="Prospect", owner="Maya Patel", updated_at=ago(3)),
                Customer(id_str="CU-1006", account="Nimbus Technologies", industry="Technology",
                         tier="Enterprise", arr=350000, status="Active", owner="Maya Patel", updated_at=ago(0)),
                Customer(id_str="CU-1007", account="Solara Renewable Energy", industry="Renewable Energy",
                         tier="Enterprise", arr=410000, status="Active", owner="Alex Chen", updated_at=ago(1)),
                Customer(id_str="CU-1008", account="Pinnacle Realty Group", industry="Real Estate",
                         tier="Gold", arr=95000, status="Active", owner="Maya Patel", updated_at=ago(2)),
                Customer(id_str="CU-1009", account="Titan Defence Systems", industry="Defence",
                         tier="Enterprise", arr=680000, status="Active", owner="Alex Chen", updated_at=ago(0)),
                Customer(id_str="CU-1010", account="Delta Automotive", industry="Automotive",
                         tier="Mid-Market", arr=78000, status="Dormant", owner="Maya Patel", updated_at=ago(5)),
            ]
            db.add_all(customers)
            await db.flush()
            print(f"  {len(customers)} customers created")

            # ── Contacts (8) ─────────────────────────────────────────────
            contacts = [
                Contact(id_str="CO-1001", name="Rajesh Khanna", role="CTO",
                        account="Meridian Foods", email="r.khanna@meridianfoods.in",
                        phone="+91-98765-43210", type="Decision", last_contact=ago(5)),
                Contact(id_str="CO-1002", name="Neha Joshi", role="VP Engineering",
                        account="Cirrus Aviation", email="neha.joshi@cirrusaviation.com",
                        phone="+91-87654-32109", type="Decision", last_contact=ago(2)),
                Contact(id_str="CO-1003", name="Vikram Rathore", role="Procurement Head",
                        account="Halcyon Media", email="vikram.r@halcyonmedia.com",
                        phone="+91-76543-21098", type="Primary", last_contact=ago(10)),
                Contact(id_str="CO-1004", name="Dr. Ananya Shah", role="Medical Director",
                        account="Orbit Health", email="ananya.shah@orbithealth.in",
                        phone="+91-75432-10987", type="Decision", last_contact=ago(3)),
                Contact(id_str="CO-1005", name="Ravi Deshmukh", role="IT Director",
                        account="Bristow Textiles", email="ravi.d@bristowtextiles.com",
                        phone="+91-74321-09876", type="Primary", last_contact=ago(7)),
                Contact(id_str="CO-1006", name="Sneha Patel", role="Cloud Operations Lead",
                        account="Nimbus Technologies", email="sneha.p@nimbustech.in",
                        phone="+91-73210-98765", type="Influencer", last_contact=ago(1)),
                Contact(id_str="CO-1007", name="Arun Mehta", role="VP Technology",
                        account="Solara Renewable Energy", email="arun.mehta@solarare.in",
                        phone="+91-72109-87654", type="Decision", last_contact=ago(4)),
                Contact(id_str="CO-1008", name="Priya Singh", role="Operations Manager",
                        account="Delta Automotive", email="priya.singh@deltaauto.com",
                        phone="+91-71098-76543", type="Inactive", last_contact=ago(30)),
            ]
            db.add_all(contacts)
            await db.flush()
            print(f"  {len(contacts)} contacts created")

            # ── Documents (6) ────────────────────────────────────────────
            documents = [
                Document(id_str="DO-1001", name="Meridian Foods — Q3 Proposal.pdf",
                         type="Proposal", account="Meridian Foods", size="2.4 MB",
                         status="Signed", owner="Maya Patel", updated_at=ago(3),
                         summary="Enterprise automation proposal covering ERP implementation and supply chain integration."),
                Document(id_str="DO-1002", name="Cirrus Aviation — Compliance Report.docx",
                         type="Report", account="Cirrus Aviation", size="1.1 MB",
                         status="Signed", owner="Maya Patel", updated_at=ago(1),
                         summary="Annual aviation compliance audit report with recommendations."),
                Document(id_str="DO-1003", name="Orbit Health — MSA v2.pdf",
                         type="Contract", account="Orbit Health", size="856 KB",
                         status="Under Review", owner="Alex Chen", updated_at=ago(0),
                         summary="Master Services Agreement for EHR platform deployment."),
                Document(id_str="DO-1004", name="NDA — Nimbus Technologies.pdf",
                         type="Legal", account="Nimbus Technologies", size="412 KB",
                         status="Draft", owner="Maya Patel", updated_at=ago(0),
                         summary="Mutual non-disclosure agreement for cloud migration project."),
                Document(id_str="DO-1005", name="Solara — System Architecture v1.pdf",
                         type="Technical Spec", account="Solara Renewable Energy", size="3.2 MB",
                         status="Expired", owner="Alex Chen", updated_at=ago(15),
                         summary="Preliminary system architecture for SCADA monitoring platform."),
                Document(id_str="DO-1006", name="Titan Defence — Security Clearance.pdf",
                         type="Compliance", account="Titan Defence Systems", size="1.8 MB",
                         status="Signed", owner="Alex Chen", updated_at=ago(2),
                         summary="Security clearance documentation for classified communications suite."),
            ]
            db.add_all(documents)
            await db.flush()
            print(f"  {len(documents)} documents created")

            # ── Leads (8) ────────────────────────────────────────────────
            leads = [
                Lead(id_str="LD-1001", name="E-Commerce Platform Modernization",
                     company="Zeta Retail", source="Web Inquiry", est_value=50000,
                     status="Qualified", owner="Maya Patel", updated_at=ago(1)),
                Lead(id_str="LD-1002", name="Cloud Infrastructure Migration",
                     company="Titan Energy", source="Referral", est_value=150000,
                     status="In Progress", owner="Maya Patel", updated_at=ago(0)),
                Lead(id_str="LD-1003", name="Security Audit Consultation",
                     company="Nexus Finance", source="Outbound", est_value=30000,
                     status="New", owner="Alex Chen", updated_at=ago(0)),
                Lead(id_str="LD-1004", name="Legacy Application Rewrite",
                     company="OldWorld Corp", source="Cold Call", est_value=85000,
                     status="Lost", owner="Maya Patel", updated_at=ago(12)),
                Lead(id_str="LD-1005", name="AI-Driven Customer Analytics Platform",
                     company="DataCrest Analytics", source="Trade Show / Expo", est_value=120000,
                     status="Qualified", owner="Maya Patel", updated_at=ago(2)),
                Lead(id_str="LD-1006", name="Warehouse Automation Suite",
                     company="SwiftLogistics", source="Direct Outreach", est_value=200000,
                     status="In Progress", owner="Alex Chen", updated_at=ago(1)),
                Lead(id_str="LD-1007", name="HRMS Cloud Migration",
                     company="PeopleFirst Corp", source="Referral", est_value=65000,
                     status="New", owner="Maya Patel", updated_at=ago(0)),
                Lead(id_str="LD-1008", name="IoT Sensor Network for Smart Factory",
                     company="Precision Manufacturing", source="Tender / RFQ Portal", est_value=280000,
                     status="Qualified", owner="Maya Patel", updated_at=ago(1)),
            ]
            db.add_all(leads)
            await db.flush()
            print(f"  {len(leads)} leads created")

            # ── Opportunities (5) ────────────────────────────────────────
            opportunities = [
                Opportunity(id_str="OP-1001", name="ERP Modernization",
                           account="Meridian Foods", value="240000",
                           probability="75%", close_date="2026-09-30",
                           stage="Negotiation", owner="Maya Patel"),
                Opportunity(id_str="OP-1002", name="AI Analytics Platform",
                           account="Cirrus Aviation", value="180000",
                           probability="50%", close_date="2026-10-15",
                           stage="Proposal", owner="Maya Patel"),
                Opportunity(id_str="OP-1003", name="EHR Platform — Phase 2",
                           account="Orbit Health", value="320000",
                           probability="80%", close_date="2026-08-31",
                           stage="Negotiation", owner="Alex Chen"),
                Opportunity(id_str="OP-1004", name="SCADA Monitoring System",
                           account="Solara Renewable Energy", value="450000",
                           probability="35%", close_date="2026-11-30",
                           stage="Discovery", owner="Alex Chen"),
                Opportunity(id_str="OP-1005", name="Secure Communications Upgrade",
                           account="Titan Defence Systems", value="580000",
                           probability="60%", close_date="2026-09-15",
                           stage="Proposal", owner="Alex Chen"),
            ]
            db.add_all(opportunities)
            await db.flush()
            print(f"  {len(opportunities)} opportunities created")

            # ── Requirements (4) ─────────────────────────────────────────
            requirements = [
                Requirement(id_str="RE-1001", name="Scalable API Gateway",
                           account="Meridian Foods", category="Technical",
                           priority="High", status="Approved", owner="Maya Patel"),
                Requirement(id_str="RE-1002", name="Federated SSO Implementation",
                           account="Cirrus Aviation", category="Security",
                           priority="Medium", status="Under Review", owner="Maya Patel"),
                Requirement(id_str="RE-1003", name="HL7 FHIR Integration",
                           account="Orbit Health", category="Technical",
                           priority="High", status="Draft", owner="Alex Chen"),
                Requirement(id_str="RE-1004", name="Real-Time SCADA Dashboard",
                           account="Solara Renewable Energy", category="Technical",
                           priority="Medium", status="Draft", owner="Alex Chen"),
            ]
            db.add_all(requirements)
            await db.flush()
            print(f"  {len(requirements)} requirements created")

            # ── Sales Orders (4) ─────────────────────────────────────────
            sales_orders = [
                SalesOrder(id_str="SO-1001", so_no="SO-2026-001",
                          account="Meridian Foods", from_quote="QT-2026-001",
                          value="240000", eta="2026-10-31", date_ordered="2026-07-20",
                          status="Confirmed", owner="Maya Patel"),
                SalesOrder(id_str="SO-1002", so_no="SO-2026-002",
                          account="Orbit Health", from_quote="QT-2026-003",
                          value="320000", eta="2026-12-15", date_ordered="2026-08-01",
                          status="Pending", owner="Alex Chen"),
                SalesOrder(id_str="SO-1003", so_no="SO-2026-003",
                          account="Titan Defence Systems", from_quote="",
                          value="150000", eta="2026-09-30", date_ordered="2026-07-15",
                          status="Invoiced", owner="Alex Chen"),
                SalesOrder(id_str="SO-1004", so_no="SO-2026-004",
                          account="Meridian Foods", from_quote="",
                          value="45000", eta="2026-08-15", date_ordered="2026-07-10",
                          status="Paid", owner="Maya Patel"),
            ]
            db.add_all(sales_orders)
            await db.flush()
            print(f"  {len(sales_orders)} sales orders created")

            # ── Reports (3) ──────────────────────────────────────────────
            reports = [
                Report(id_str="RP-1001", title="Q2 2026 Pipeline Review",
                       category="Sales", last_run="2026-07-01",
                       status="Final", owner="Maya Patel"),
                Report(id_str="RP-1002", title="Customer Health Score — Enterprise Tier",
                       category="Customer Success", last_run="2026-07-15",
                       status="Final", owner="Maya Patel"),
                Report(id_str="RP-1003", title="Lead Conversion Funnel Analysis",
                       category="Marketing", last_run="2026-07-10",
                       status="Draft", owner="Alex Chen"),
            ]
            db.add_all(reports)
            await db.flush()
            print(f"  {len(reports)} reports created")

            # ── AI Logs (3) ──────────────────────────────────────────────
            ai_logs = [
                AIAssistantLog(id_str="AI-1001", query="Summarize pipeline status for Q3",
                              category="Sales", date="2026-07-19",
                              status="Success", owner="Maya Patel"),
                AIAssistantLog(id_str="AI-1002", query="Draft follow-up email for Meridian Foods",
                              category="Support", date="2026-07-20",
                              status="Success", owner="Maya Patel"),
                AIAssistantLog(id_str="AI-1003", query="Generate lead scoring report",
                              category="General", date="2026-07-20",
                              status="Failed", owner="Alex Chen"),
            ]
            db.add_all(ai_logs)
            await db.flush()
            print(f"  {len(ai_logs)} AI logs created")

            # ── Dashboard: Metrics (3) ───────────────────────────────────
            metrics = [
                Metric(id=1, name="Pipeline Value", value=1770000.0,
                       formatted_value="$1.77M", trend="+12.4%", is_positive=True),
                Metric(id=2, name="Open Opportunities", value=5.0,
                       formatted_value="5", trend="+2 vs last month", is_positive=True),
                Metric(id=3, name="Active Customers", value=8.0,
                       formatted_value="8", trend="+1 this quarter", is_positive=True),
            ]
            db.add_all(metrics)
            await db.flush()
            print(f"  {len(metrics)} metrics created")

            # ── Dashboard: Pipeline Stages (5) ───────────────────────────
            pipeline_stages = [
                PipelineStage(id=1, name="Discovery", value=450000.0, color="#6366f1"),
                PipelineStage(id=2, name="Qualification", value=280000.0, color="#0ea5e9"),
                PipelineStage(id=3, name="Proposal", value=760000.0, color="#14b8a6"),
                PipelineStage(id=4, name="Negotiation", value=560000.0, color="#f59e0b"),
                PipelineStage(id=5, name="Closing", value=210000.0, color="#10b981"),
            ]
            db.add_all(pipeline_stages)
            await db.flush()
            print(f"  {len(pipeline_stages)} pipeline stages created")

            # ── Dashboard: Recommendations (5) ───────────────────────────
            recommendations = [
                Recommendation(id=1, text="High-value deal ERP Modernization has been in Negotiation stage for 14 days. Suggest follow-up with Rajesh Khanna.", confidence=88, type="Opportunity"),
                Recommendation(id=2, text="Lead Cloud Infrastructure Migration has a 92% similarity to previously won deals in the Energy sector.", confidence=92, type="Lead"),
                Recommendation(id=3, text="Cirrus Aviation has unused support credits. Consider introducing AI Analytics add-on.", confidence=75, type="Customer"),
                Recommendation(id=4, text="Orbit Health deal probability dropped to 35%. Schedule a meeting with Dr. Ananya Shah.", confidence=82, type="Opportunity"),
                Recommendation(id=5, text="Titan Defence Systems is showing expansion signals. Cross-sell secure data center services.", confidence=78, type="Customer"),
            ]
            db.add_all(recommendations)
            await db.flush()
            print(f"  {len(recommendations)} recommendations created")

            # ── Dashboard: Hot Leads (2) ─────────────────────────────────
            hot_leads = [
                HotLead(id=1, name="Zeta Retail", status="High Priority"),
                HotLead(id=2, name="SwiftLogistics", status="Engaged"),
            ]
            db.add_all(hot_leads)
            await db.flush()
            print(f"  {len(hot_leads)} hot leads created")

            # ── Pinned Leads (2) ─────────────────────────────────────────
            pinned_leads = [
                PinnedLead(
                    company_name="Zeta Logistics",
                    industry="Logistics",
                    location="Bangalore, India",
                    website="https://zetalogistics.com",
                    estimated_employees="500-1000",
                    estimated_revenue="$50M - $100M",
                    company_overview="Zeta Logistics is a leading supply-chain provider in South Asia operating over 50 fulfillment centers across India and Southeast Asia.",
                    ai_readiness_score=78,
                    detected_technologies=["SAP ERP", "Salesforce", "React", "NodeJS"],
                    business_pain_points=["Manual route optimization causing delays", "High fuel overheads", "Customer service response bottlenecks"],
                    recommended_ai_solutions=["AI-driven dispatch & route planning", "LLM-powered customer service agents", "Predictive warehouse allocation"],
                    key_decision_makers=[{"name": "Rohan Sen", "title": "VP Operations", "email": "r.sen@zetalogistics.com"}],
                    public_contact={"email": "info@zetalogistics.com", "phone": "+91-80-4321-0987"}
                ),
                PinnedLead(
                    company_name="Apex Aerospace",
                    industry="Aerospace & Defence",
                    location="Hyderabad, India",
                    website="https://apexaero.in",
                    estimated_employees="200-500",
                    estimated_revenue="$100M - $500M",
                    company_overview="Apex Aerospace manufactures precision components for satellite launch vehicles and defence aircraft. ISO 9001:2025 certified.",
                    ai_readiness_score=65,
                    detected_technologies=["SolidWorks", "SAP S/4HANA", "JFrog Artifactory"],
                    business_pain_points=["Legacy CAD-to-manufacturing pipeline", "Supply chain visibility gaps", "Regulatory compliance overhead"],
                    recommended_ai_solutions=["Generative design for lightweight components", "AI-powered supply chain risk monitoring", "Automated compliance documentation"],
                    key_decision_makers=[{"name": "Kavita Nair", "title": "Director of Engineering", "email": "kavita.nair@apexaero.in"}],
                    public_contact={"email": "contact@apexaero.in", "phone": "+91-40-2345-6789"}
                ),
            ]
            db.add_all(pinned_leads)
            await db.flush()
            print(f"  {len(pinned_leads)} pinned leads created")

            await db.commit()
            print("\nCRM seeding completed successfully!")
            print(f"Total records: {len(customers) + len(contacts) + len(documents) + len(leads) + len(opportunities) + len(requirements) + len(sales_orders) + len(reports) + len(ai_logs) + len(metrics) + len(pipeline_stages) + len(recommendations) + len(hot_leads) + len(pinned_leads)}")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()
            raise

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
