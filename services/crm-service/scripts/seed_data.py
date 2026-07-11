import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import async_session_factory, engine, Base
from app.dashboard.models import Metric, PipelineStage, Recommendation, HotLead, Report
from app.customer.models import Customer, Contact, Document
from app.lead.models import Lead, Opportunity
from app.sales.models import Sale, Requirement, Quotation, SalesOrder
from app.interaction.models import Enquiry, SiteVisit, FollowUp, Task, Communication, VisitPlan
from app.service.models import Complaint, Feedback
from app.ai.models import AIAssistantLog


async def seed_database():
    print("Recreating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        try:
            print("Seeding Dashboard Metrics...")
            metrics = [
                Metric(name="Pipeline Value", value=4820000.0, formatted_value="$4.82M", trend="+12.4% MoM", is_positive=True),
                Metric(name="Open Opportunities", value=38.0, formatted_value="38", trend="+6 this week", is_positive=True),
                Metric(name="Active Customers", value=212.0, formatted_value="212", trend="+3 net-new", is_positive=True),
                Metric(name="Open Complaints", value=7.0, formatted_value="7", trend="2 breaching SLA", is_positive=False),
            ]
            db.add_all(metrics)

            print("Seeding Pipeline Stages...")
            stages = [
                PipelineStage(name="Discovery", value=620000.0, color="#0ea5e9"),
                PipelineStage(name="Proposal", value=480000.0, color="#14b8a6"),
                PipelineStage(name="Negotiation", value=310000.0, color="#f59e0b"),
                PipelineStage(name="Won", value=220000.0, color="#10b981"),
                PipelineStage(name="Lost", value=140000.0, color="#f43f5e"),
            ]
            db.add_all(stages)

            recs = [
                Recommendation(text="Re-engage dormant Halcyon champion", confidence=92, type="positive"),
                Recommendation(text="Discount likely to close Cirrus deal", confidence=78, type="positive"),
                Recommendation(text="Escalate Meridian complaint SD-9812", confidence=88, type="negative"),
            ]
            db.add_all(recs)

            customers = [
                Customer(id_str="CU-1001", account="Meridian Foods", industry="F&B", tier="Platinum", arr=412000, status="Active", owner_id=1, updated_at="2h ago"),
                Customer(id_str="CU-1002", account="Cirrus Aviation", industry="Aerospace", tier="Gold", arr=188000, status="Prospect", owner_id=2, updated_at="5h ago"),
                Customer(id_str="CU-1003", account="Halcyon Media", industry="Media", tier="Silver", arr=76000, status="Dormant", owner_id=3, updated_at="Yesterday"),
                Customer(id_str="CU-1004", account="Bristow Textiles", industry="Manufacturing", tier="Gold", arr=210000, status="Churned", owner_id=1, updated_at="2 days ago"),
                Customer(id_str="CU-1005", account="Orbit Health", industry="Healthcare", tier="Platinum", arr=524000, status="Active", owner_id=2, updated_at="Last week"),
            ]
            db.add_all(customers)

            contacts = [
                Contact(id_str="CO-1001", name="Sarah Jenkins", role="VP Procurement", account="Meridian Foods", email="sjenkins@meridian.com", phone="+1 (555) 234-5678", type="Decision", last_contact="2h ago", owner_id=1),
                Contact(id_str="CO-1002", name="David Vance", role="Chief Pilot", account="Cirrus Aviation", email="dvance@cirrus.com", phone="+1 (555) 876-5432", type="Influencer", last_contact="5h ago", owner_id=2),
                Contact(id_str="CO-1003", name="Elena Rostova", role="Head of Content", account="Halcyon Media", email="erostova@halcyon.io", phone="+1 (555) 345-6789", type="Primary", last_contact="Yesterday", owner_id=3),
            ]
            db.add_all(contacts)

            documents = [
                Document(id_str="DO-1001", name="SLA_Agreement_2026.pdf", type="SLA", account="Meridian Foods", size="2.4 MB", status="Signed", owner_id=1, updated_at="2h ago"),
                Document(id_str="DO-1002", name="Cirrus_Quote_Draft.docx", type="Proposal", account="Cirrus Aviation", size="1.1 MB", status="Under Review", owner_id=2, updated_at="5h ago"),
                Document(id_str="DO-1003", name="Halcyon_NDA_Final.pdf", type="NDA", account="Halcyon Media", size="840 KB", status="Signed", owner_id=3, updated_at="Yesterday"),
            ]
            db.add_all(documents)

            leads = [
                Lead(id_str="LD-1001", name="Apex Logistics Group", company="Apex Corp", source="Website Request", est_value=120000, status="Qualified", owner_id=3, updated_at="3h ago"),
                Lead(id_str="LD-1002", name="Vortex Energy Solutions", company="Vortex Corp", source="Partner Referral", est_value=85000, status="New", owner_id=2, updated_at="6h ago"),
            ]
            db.add_all(leads)

            opps = [
                Opportunity(id_str="OP-1001", name="Meridian expansion contract", account="Meridian Foods", value="150000", probability="85%", close_date="Jul 30", stage="Negotiation", owner_id=1),
                Opportunity(id_str="OP-1002", name="Cirrus fleet support system", account="Cirrus Aviation", value="220000", probability="60%", close_date="Aug 15", stage="Proposal", owner_id=2),
            ]
            db.add_all(opps)

            sales = [
                Sale(id_str="SA-1001", invoice_no="INV-8891", account="Meridian Foods", amount="45000", issued_date="Jul 01", due_date="Jul 31", status="Confirmed", rep="Aditi Rao"),
                Sale(id_str="SA-1002", invoice_no="INV-8892", account="Halcyon Media", amount="12000", issued_date="Jul 05", due_date="Aug 05", status="Invoiced", rep="Priya Shah"),
            ]
            db.add_all(sales)

            reqs = [
                Requirement(id_str="RE-1001", name="SSO & SAML Integration", account="Meridian Foods", category="Security", priority="High", status="Review", owner_id=1),
                Requirement(id_str="RE-1002", name="API support for flight systems", account="Cirrus Aviation", category="Technical", priority="Medium", status="Draft", owner_id=2),
            ]
            db.add_all(reqs)

            quotes = [
                Quotation(id_str="QU-1001", quote_no="QT-9812", account="Meridian Foods", value="145000", valid_until="Aug 01", status="Sent", owner_id=1),
                Quotation(id_str="QU-1002", quote_no="QT-9813", account="Cirrus Aviation", value="210000", valid_until="Aug 15", status="Draft", owner_id=2),
            ]
            db.add_all(quotes)

            orders = [
                SalesOrder(id_str="SO-1001", so_no="SO-4401", account="Meridian Foods", from_quote="QT-9812", value="145000", eta="Aug 05", status="Confirmed", owner_id=1),
                SalesOrder(id_str="SO-1002", so_no="SO-4402", account="Halcyon Media", from_quote="QT-9501", value="75000", eta="Aug 10", status="Pending", owner_id=3),
            ]
            db.add_all(orders)

            enquiries = [
                Enquiry(id_str="EN-1001", subject="Enterprise bulk license discount query", customer="Meridian Foods", date="Jul 06", status="Open", owner_id=1),
                Enquiry(id_str="EN-1002", subject="Custom branding integration capability", customer="Halcyon Media", date="Jul 07", status="Replied", owner_id=3),
            ]
            db.add_all(enquiries)

            visits = [
                SiteVisit(id_str="SV-1001", location="Meridian Foods HQ - Chicago", customer="Meridian Foods", date="Jul 12", status="Scheduled", owner_id=1),
                SiteVisit(id_str="SV-1002", location="Cirrus Hangar 3 - Atlanta", customer="Cirrus Aviation", date="Jul 10", status="Completed", owner_id=2),
            ]
            db.add_all(visits)

            followups = [
                FollowUp(id_str="FU-1001", action="Send revised security compliance packet", customer="Meridian Foods", due_date="Jul 09", status="Pending", owner_id=1),
                FollowUp(id_str="FU-1002", action="Schedule technical scoping call with pilots", customer="Cirrus Aviation", due_date="Jul 08", status="Completed", owner_id=2),
            ]
            db.add_all(followups)

            tasks = [
                Task(id_str="TA-1001", title="Review Meridian contract amendments", related_to="Meridian Expansion", due_date="Jul 09", status="In Progress", owner_id=1),
                Task(id_str="TA-1002", title="Send quote revisions to David Vance", related_to="Cirrus System", due_date="Jul 08", status="Completed", owner_id=2),
            ]
            db.add_all(tasks)

            comms = [
                Communication(id_str="CM-1001", type="Email", subject="Revised Proposal Sent", customer="Meridian Foods", date="Jul 07", owner_id=1),
                Communication(id_str="CM-1002", type="Call", subject="Scoping meeting follow-up", customer="Cirrus Aviation", date="Jul 06", owner_id=2),
            ]
            db.add_all(comms)

            plans = [
                VisitPlan(id_str="VP-1001", title="Q3 Expansion Scope Discussion", customer="Meridian Foods", date="Jul 15", status="Confirmed", owner_id=1),
                VisitPlan(id_str="VP-1002", title="Pilot Flight Ops Walkthrough", customer="Cirrus Aviation", date="Jul 20", status="Scheduled", owner_id=2),
            ]
            db.add_all(plans)

            complaints = [
                Complaint(id_str="CP-1001", subject="Delay in security validation document delivery", customer="Meridian Foods", date_raised="Jul 05", status="Investigating", owner_id=1),
                Complaint(id_str="CP-1002", subject="API latency in flight telemetry endpoint", customer="Cirrus Aviation", date_raised="Jul 04", status="Resolved", owner_id=2),
            ]
            db.add_all(complaints)

            feedback = [
                Feedback(id_str="FB-1001", score=9, comment="Great platform stability, very happy with response times", customer="Meridian Foods", date="Jul 06", owner_id=1),
                Feedback(id_str="FB-1002", score=8, comment="Good feature depth but integration setup needs more documentation", customer="Cirrus Aviation", date="Jul 05", owner_id=2),
            ]
            db.add_all(feedback)

            reports = [
                Report(id_str="RP-1001", title="Sales Performance & ARR Breakdown Q2", category="Sales", last_run="Jul 06", status="Completed", owner_id=1),
                Report(id_str="RP-1002", title="Engagement & Retention Audit", category="Engagement", last_run="Jul 07", status="Generating", owner_id=2),
            ]
            db.add_all(reports)

            ai_logs = [
                AIAssistantLog(id_str="AI-1001", query="Summarize contract clauses for Meridian Foods", category="Documents", date="Jul 07", status="Success", owner_id=1),
                AIAssistantLog(id_str="AI-1002", query="Draft response to David Vance email", category="General", date="Jul 07", status="Success", owner_id=2),
            ]
            db.add_all(ai_logs)

            await db.commit()
            print("Database seeded successfully with all sample CRM data!")
        except Exception as e:
            print(f"Error seeding database: {e}")
            await db.rollback()


if __name__ == "__main__":
    asyncio.run(seed_database())
