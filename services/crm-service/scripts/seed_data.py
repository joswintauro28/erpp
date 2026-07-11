import sys
import os

# Add the parent directory to the path so we can import the backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
import models
from datetime import datetime

def seed_database():
    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding Dashboard Metrics...")
        metrics = [
            models.Metric(name="Pipeline Value", value=4820000.0, formatted_value="$4.82M", trend="+12.4% MoM", is_positive=True),
            models.Metric(name="Open Opportunities", value=38.0, formatted_value="38", trend="+6 this week", is_positive=True),
            models.Metric(name="Active Customers", value=212.0, formatted_value="212", trend="+3 net-new", is_positive=True),
            models.Metric(name="Open Complaints", value=7.0, formatted_value="7", trend="2 breaching SLA", is_positive=False),
        ]
        db.add_all(metrics)

        print("Seeding Pipeline Stages...")
        stages = [
            models.PipelineStage(name="Discovery", value=620000.0, color="#0ea5e9"),
            models.PipelineStage(name="Proposal", value=480000.0, color="#14b8a6"),
            models.PipelineStage(name="Negotiation", value=310000.0, color="#f59e0b"),
            models.PipelineStage(name="Won", value=220000.0, color="#10b981"),
            models.PipelineStage(name="Lost", value=140000.0, color="#f43f5e"),
        ]
        db.add_all(stages)

        print("Seeding Recommendations...")
        recs = [
            models.Recommendation(text="Re-engage dormant Halcyon champion", confidence=92, type="positive"),
            models.Recommendation(text="Discount likely to close Cirrus deal", confidence=78, type="positive"),
            models.Recommendation(text="Escalate Meridian complaint SD-9812", confidence=88, type="negative"),
        ]
        db.add_all(recs)

        print("Seeding Admins...")
        today_str = datetime.now().strftime("%b %d")
        admins = [
            models.Admin(id_str="ADM-1001", name="Super Admin", email="admin@generalref.com", password="admin@12345", role="Super Admin", status="Active", last_login=today_str, owner="System"),
            models.Admin(id_str="ADM-1002", name="Jane Doe", email="jane@example.com", password="admin", role="Admin", status="Active", last_login=today_str, owner="System")
        ]
        db.add_all(admins)

        print("Seeding Customers...")
        customers = [
            models.Customer(id_str="CU-1001", account="Meridian Foods", industry="F&B", tier="Platinum", arr=412000, status="Active", owner="Aditi Rao", updated_at="2h ago"),
            models.Customer(id_str="CU-1002", account="Cirrus Aviation", industry="Aerospace", tier="Gold", arr=188000, status="Prospect", owner="Marcus Lee", updated_at="5h ago"),
            models.Customer(id_str="CU-1003", account="Halcyon Media", industry="Media", tier="Silver", arr=76000, status="Dormant", owner="Priya Shah", updated_at="Yesterday"),
            models.Customer(id_str="CU-1004", account="Bristow Textiles", industry="Manufacturing", tier="Gold", arr=210000, status="Churned", owner="Aditi Rao", updated_at="2 days ago"),
            models.Customer(id_str="CU-1005", account="Orbit Health", industry="Healthcare", tier="Platinum", arr=524000, status="Active", owner="Marcus Lee", updated_at="Last week")
        ]
        db.add_all(customers)

        print("Seeding Contacts...")
        contacts = [
            models.Contact(id_str="CO-1001", name="Sarah Jenkins", role="VP Procurement", account="Meridian Foods", email="sjenkins@meridian.com", phone="+1 (555) 234-5678", type="Decision", last_contact="2h ago"),
            models.Contact(id_str="CO-1002", name="David Vance", role="Chief Pilot", account="Cirrus Aviation", email="dvance@cirrus.com", phone="+1 (555) 876-5432", type="Influencer", last_contact="5h ago"),
            models.Contact(id_str="CO-1003", name="Elena Rostova", role="Head of Content", account="Halcyon Media", email="erostova@halcyon.io", phone="+1 (555) 345-6789", type="Primary", last_contact="Yesterday")
        ]
        db.add_all(contacts)

        print("Seeding Documents...")
        documents = [
            models.Document(id_str="DO-1001", name="SLA_Agreement_2026.pdf", type="SLA", account="Meridian Foods", size="2.4 MB", status="Signed", owner="Aditi Rao", updated_at="2h ago"),
            models.Document(id_str="DO-1002", name="Cirrus_Quote_Draft.docx", type="Proposal", account="Cirrus Aviation", size="1.1 MB", status="Under Review", owner="Marcus Lee", updated_at="5h ago"),
            models.Document(id_str="DO-1003", name="Halcyon_NDA_Final.pdf", type="NDA", account="Halcyon Media", size="840 KB", status="Signed", owner="Priya Shah", updated_at="Yesterday")
        ]
        db.add_all(documents)

        print("Seeding Leads...")
        leads = [
            models.Lead(id_str="LD-1001", name="Apex Logistics Group", company="Apex Corp", source="Website Request", est_value=120000, status="Qualified", owner="Priya Shah", updated_at="3h ago"),
            models.Lead(id_str="LD-1002", name="Vortex Energy Solutions", company="Vortex Corp", source="Partner Referral", est_value=85000, status="New", owner="Marcus Lee", updated_at="6h ago")
        ]
        db.add_all(leads)

        print("Seeding Opportunities...")
        opps = [
            models.Opportunity(id_str="OP-1001", name="Meridian expansion contract", account="Meridian Foods", value=150000, probability="85%", close_date="Jul 30", stage="Negotiation", owner="Aditi Rao"),
            models.Opportunity(id_str="OP-1002", name="Cirrus fleet support system", account="Cirrus Aviation", value=220000, probability="60%", close_date="Aug 15", stage="Proposal", owner="Marcus Lee")
        ]
        db.add_all(opps)

        print("Seeding Sales...")
        sales = [
            models.Sale(id_str="SA-1001", invoice_no="INV-8891", account="Meridian Foods", amount=45000, issued_date="Jul 01", due_date="Jul 31", status="Confirmed", rep="Aditi Rao"),
            models.Sale(id_str="SA-1002", invoice_no="INV-8892", account="Halcyon Media", amount=12000, issued_date="Jul 05", due_date="Aug 05", status="Invoiced", rep="Priya Shah")
        ]
        db.add_all(sales)

        print("Seeding Requirements...")
        reqs = [
            models.Requirement(id_str="RE-1001", name="SSO & SAML Integration", account="Meridian Foods", category="Security", priority="High", status="Review", owner="Aditi Rao"),
            models.Requirement(id_str="RE-1002", name="API support for flight systems", account="Cirrus Aviation", category="Technical", priority="Medium", status="Draft", owner="Marcus Lee")
        ]
        db.add_all(reqs)

        print("Seeding Quotations...")
        quotes = [
            models.Quotation(id_str="QU-1001", quote_no="QT-9812", account="Meridian Foods", value=145000, valid_until="Aug 01", status="Sent", owner="Aditi Rao"),
            models.Quotation(id_str="QU-1002", quote_no="QT-9813", account="Cirrus Aviation", value=210000, valid_until="Aug 15", status="Draft", owner="Marcus Lee")
        ]
        db.add_all(quotes)

        print("Seeding Sales Orders...")
        orders = [
            models.SalesOrder(id_str="SO-1001", so_no="SO-4401", account="Meridian Foods", from_quote="QT-9812", value=145000, eta="Aug 05", status="Confirmed", owner="Aditi Rao"),
            models.SalesOrder(id_str="SO-1002", so_no="SO-4402", account="Halcyon Media", from_quote="QT-9501", value=75000, eta="Aug 10", status="Pending", owner="Priya Shah")
        ]
        db.add_all(orders)

        print("Seeding Enquiries...")
        enquiries = [
            models.Enquiry(id_str="EN-1001", subject="Enterprise bulk license discount query", customer="Meridian Foods", date="Jul 06", status="Open", owner="Aditi Rao"),
            models.Enquiry(id_str="EN-1002", subject="Custom branding integration capability", customer="Halcyon Media", date="Jul 07", status="Replied", owner="Priya Shah")
        ]
        db.add_all(enquiries)

        print("Seeding Site Visits...")
        visits = [
            models.SiteVisit(id_str="SV-1001", location="Meridian Foods HQ - Chicago", customer="Meridian Foods", date="Jul 12", status="Scheduled", owner="Aditi Rao"),
            models.SiteVisit(id_str="SV-1002", location="Cirrus Hangar 3 - Atlanta", customer="Cirrus Aviation", date="Jul 10", status="Completed", owner="Marcus Lee")
        ]
        db.add_all(visits)

        print("Seeding Follow-ups...")
        followups = [
            models.FollowUp(id_str="FU-1001", action="Send revised security compliance packet", customer="Meridian Foods", due_date="Jul 09", status="Pending", owner="Aditi Rao"),
            models.FollowUp(id_str="FU-1002", action="Schedule technical scoping call with pilots", customer="Cirrus Aviation", due_date="Jul 08", status="Completed", owner="Marcus Lee")
        ]
        db.add_all(followups)

        print("Seeding Tasks...")
        tasks = [
            models.Task(id_str="TA-1001", title="Review Meridian contract amendments", related_to="Meridian Expansion", due_date="Jul 09", status="In Progress", owner="Aditi Rao"),
            models.Task(id_str="TA-1002", title="Send quote revisions to David Vance", related_to="Cirrus System", due_date="Jul 08", status="Completed", owner="Marcus Lee")
        ]
        db.add_all(tasks)

        print("Seeding Communications...")
        comms = [
            models.Communication(id_str="CM-1001", type="Email", subject="Revised Proposal Sent", customer="Meridian Foods", date="Jul 07", owner="Aditi Rao"),
            models.Communication(id_str="CM-1002", type="Call", subject="Scoping meeting follow-up", customer="Cirrus Aviation", date="Jul 06", owner="Marcus Lee")
        ]
        db.add_all(comms)

        print("Seeding Visit Plans...")
        plans = [
            models.VisitPlan(id_str="VP-1001", title="Q3 Expansion Scope Discussion", customer="Meridian Foods", date="Jul 15", status="Confirmed", owner="Aditi Rao"),
            models.VisitPlan(id_str="VP-1002", title="Pilot Flight Ops Walkthrough", customer="Cirrus Aviation", date="Jul 20", status="Scheduled", owner="Marcus Lee")
        ]
        db.add_all(plans)

        print("Seeding Complaints...")
        complaints = [
            models.Complaint(id_str="CP-1001", subject="Delay in security validation document delivery", customer="Meridian Foods", date_raised="Jul 05", status="Investigating", owner="Aditi Rao"),
            models.Complaint(id_str="CP-1002", subject="API latency in flight telemetry endpoint", customer="Cirrus Aviation", date_raised="Jul 04", status="Resolved", owner="Marcus Lee")
        ]
        db.add_all(complaints)

        print("Seeding Feedback...")
        feedback = [
            models.Feedback(id_str="FB-1001", score=9, comment="Great platform stability, very happy with response times", customer="Meridian Foods", date="Jul 06", owner="Aditi Rao"),
            models.Feedback(id_str="FB-1002", score=8, comment="Good feature depth but integration setup needs more documentation", customer="Cirrus Aviation", date="Jul 05", owner="Marcus Lee")
        ]
        db.add_all(feedback)

        print("Seeding Reports...")
        reports = [
            models.Report(id_str="RP-1001", title="Sales Performance & ARR Breakdown Q2", category="Sales", last_run="Jul 06", status="Completed", owner="Aditi Rao"),
            models.Report(id_str="RP-1002", title="Engagement & Retention Audit", category="Engagement", last_run="Jul 07", status="Generating", owner="Marcus Lee")
        ]
        db.add_all(reports)

        print("Seeding AI Log Query Logs...")
        ai_logs = [
            models.AIAssistantLog(id_str="AI-1001", query="Summarize contract clauses for Meridian Foods", category="Documents", date="Jul 07", status="Success", owner="Aditi Rao"),
            models.AIAssistantLog(id_str="AI-1002", query="Draft response to David Vance email", category="General", date="Jul 07", status="Success", owner="Marcus Lee")
        ]
        db.add_all(ai_logs)

        db.commit()
        print("Database seeded successfully with all sample CRM data!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
