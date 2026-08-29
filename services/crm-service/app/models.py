from app.database import Base

# Import models from their respective modules to preserve central registration and export
from app.dashboard.models import Metric, PipelineStage, Recommendation, HotLead
from app.customers.models import Customer
from app.contacts.models import Contact
from app.documents.models import Document
from app.leads.models import Lead
from app.opportunities.models import Opportunity
from app.requirements.models import Requirement
from app.sales_orders.models import SalesOrder
from app.sales.models import Sale
from app.reports.models import Report
from app.lead_discovery.models import PinnedLead
from app.quotation_approvals.models import QuotationApproval
from app.ai_assistant.models import AIAssistantLog
