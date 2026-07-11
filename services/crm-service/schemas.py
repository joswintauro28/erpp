from pydantic import BaseModel
from typing import List, Optional

class MetricBase(BaseModel):
    name: str
    value: float
    formatted_value: str
    trend: str
    is_positive: bool

class Metric(MetricBase):
    id: int
    class Config:
        from_attributes = True

class PipelineStageBase(BaseModel):
    name: str
    value: float
    color: str

class PipelineStage(PipelineStageBase):
    id: int
    class Config:
        from_attributes = True

class RecommendationBase(BaseModel):
    text: str
    confidence: int
    type: str

class Recommendation(RecommendationBase):
    id: int
    class Config:
        from_attributes = True

class DashboardData(BaseModel):
    metrics: List[Metric]
    pipeline_stages: List[PipelineStage]
    recommendations: List[Recommendation]

class CustomerBase(BaseModel):
    id_str: str
    account: str
    industry: str
    tier: str
    arr: int
    status: str
    owner: str
    updated_at: str

class Customer(CustomerBase):
    id: int
    class Config:
        from_attributes = True

class CustomerSummary(BaseModel):
    total_customers: int
    open: int
    overdue_at_risk: int
    owners: int

class CustomerManagementData(BaseModel):
    summary: CustomerSummary
    customers: List[Customer]

class ContactBase(BaseModel):
    id_str: str
    name: str
    role: str
    account: str
    email: str
    phone: str
    type: str
    last_contact: str

class Contact(ContactBase):
    id: int
    class Config:
        from_attributes = True

class ContactSummary(BaseModel):
    total_contacts: int
    open: int
    overdue_at_risk: int
    owners: int

class ContactManagementData(BaseModel):
    summary: ContactSummary
    contacts: List[Contact]

class DocumentBase(BaseModel):
    id_str: str
    name: str
    type: str
    account: str
    size: str
    status: str
    owner: str
    updated_at: str
    file_data: Optional[str] = None
    summary: Optional[str] = None
    files: Optional[str] = None

class Document(DocumentBase):
    id: int
    class Config:
        from_attributes = True

class DocumentSummary(BaseModel):
    total_documents: int
    open: int
    overdue_at_risk: int
    owners: int

class DocumentManagementData(BaseModel):
    summary: DocumentSummary
    documents: List[Document]

class LeadBase(BaseModel):
    id_str: str
    name: str
    company: str
    source: str
    est_value: int
    status: str
    owner: str
    updated_at: str

class Lead(LeadBase):
    id: int
    class Config:
        from_attributes = True

class LeadSummary(BaseModel):
    total_leads: int
    open: int
    overdue_at_risk: int
    owners: int

class LeadManagementData(BaseModel):
    summary: LeadSummary
    leads: List[Lead]

class OpportunityBase(BaseModel):
    id_str: str
    name: str
    account: str
    value: str
    probability: str
    close_date: str
    stage: str
    owner: str

class Opportunity(OpportunityBase):
    id: int
    class Config:
        from_attributes = True

class OpportunitySummary(BaseModel):
    total_opportunities: int
    open: int
    overdue_at_risk: int
    owners: int

class OpportunityManagementData(BaseModel):
    summary: OpportunitySummary
    opportunities: List[Opportunity]

class SaleBase(BaseModel):
    id_str: str
    invoice_no: str
    account: str
    amount: str
    issued_date: str
    due_date: str
    status: str
    rep: str

class Sale(SaleBase):
    id: int
    class Config:
        from_attributes = True

class SaleSummary(BaseModel):
    total_sales: int
    open: int
    overdue_at_risk: int
    owners: int

class SaleManagementData(BaseModel):
    summary: SaleSummary
    sales: List[Sale]

class RequirementBase(BaseModel):
    id_str: str
    name: str
    account: str
    category: str
    priority: str
    status: str
    owner: str

class Requirement(RequirementBase):
    id: int
    class Config:
        from_attributes = True

class RequirementSummary(BaseModel):
    total_requirements: int
    open: int
    overdue_at_risk: int
    owners: int

class RequirementManagementData(BaseModel):
    summary: RequirementSummary
    requirements: List[Requirement]

class QuotationBase(BaseModel):
    id_str: str
    quote_no: str
    account: str
    value: str
    valid_until: str
    status: str
    owner: str
    file_data: Optional[str] = None
    file_name: Optional[str] = None

class Quotation(QuotationBase):
    id: int
    class Config:
        from_attributes = True

class QuotationSummary(BaseModel):
    total_quotations: int
    open: int
    overdue_at_risk: int
    owners: int

class QuotationManagementData(BaseModel):
    summary: QuotationSummary
    quotations: List[Quotation]

class SalesOrderBase(BaseModel):
    id_str: str
    so_no: str
    account: str
    from_quote: str
    value: str
    eta: str
    status: str
    owner: str
    file_data: Optional[str] = None
    file_name: Optional[str] = None

class SalesOrder(SalesOrderBase):
    id: int
    class Config:
        from_attributes = True

class SalesOrderSummary(BaseModel):
    total_orders: int
    open: int
    overdue_at_risk: int
    owners: int

class SalesOrderManagementData(BaseModel):
    summary: SalesOrderSummary
    sales_orders: List[SalesOrder]

# --- Engagement Schemas ---

class GenericSummary(BaseModel):
    total: int
    active: int
    attention: int
    owners: int

# Enquiry
class EnquiryBase(BaseModel):
    id_str: str
    subject: str
    customer: str
    date: str
    status: str
    owner: str

class Enquiry(EnquiryBase):
    id: int
    class Config:
        from_attributes = True

class EnquiryManagementData(BaseModel):
    summary: GenericSummary
    enquiries: List[Enquiry]

# SiteVisit
class SiteVisitBase(BaseModel):
    id_str: str
    location: str
    customer: str
    date: str
    status: str
    owner: str

class SiteVisit(SiteVisitBase):
    id: int
    class Config:
        from_attributes = True

class SiteVisitManagementData(BaseModel):
    summary: GenericSummary
    site_visits: List[SiteVisit]

# FollowUp
class FollowUpBase(BaseModel):
    id_str: str
    action: str
    customer: str
    due_date: str
    status: str
    owner: str

class FollowUp(FollowUpBase):
    id: int
    class Config:
        from_attributes = True

class FollowUpManagementData(BaseModel):
    summary: GenericSummary
    follow_ups: List[FollowUp]

# Task
class TaskBase(BaseModel):
    id_str: str
    title: str
    related_to: str
    due_date: str
    status: str
    owner: str

class Task(TaskBase):
    id: int
    class Config:
        from_attributes = True

class TaskManagementData(BaseModel):
    summary: GenericSummary
    tasks: List[Task]

# Communication
class CommunicationBase(BaseModel):
    id_str: str
    type: str
    subject: str
    customer: str
    date: str
    owner: str

class Communication(CommunicationBase):
    id: int
    class Config:
        from_attributes = True

class CommunicationManagementData(BaseModel):
    summary: GenericSummary
    communications: List[Communication]

# VisitPlan
class VisitPlanBase(BaseModel):
    id_str: str
    title: str
    customer: str
    date: str
    status: str
    owner: str

class VisitPlan(VisitPlanBase):
    id: int
    class Config:
        from_attributes = True

class VisitPlanManagementData(BaseModel):
    summary: GenericSummary
    visit_plans: List[VisitPlan]

# Complaint
class ComplaintBase(BaseModel):
    id_str: str
    subject: str
    customer: str
    date_raised: str
    status: str
    owner: str

class Complaint(ComplaintBase):
    id: int
    class Config:
        from_attributes = True

class ComplaintManagementData(BaseModel):
    summary: GenericSummary
    complaints: List[Complaint]

# Feedback
class FeedbackBase(BaseModel):
    id_str: str
    score: int
    comment: str
    customer: str
    date: str
    owner: str

class Feedback(FeedbackBase):
    id: int
    class Config:
        from_attributes = True

class FeedbackManagementData(BaseModel):
    summary: GenericSummary
    feedback: List[Feedback]

# --- Insights Schemas ---

class ReportBase(BaseModel):
    id_str: str
    title: str
    category: str
    last_run: str
    status: str
    owner: str

class Report(ReportBase):
    id: int
    class Config:
        from_attributes = True

class ReportManagementData(BaseModel):
    summary: GenericSummary
    reports: List[Report]

class AIAssistantLogBase(BaseModel):
    id_str: str
    query: str
    category: str
    date: str
    status: str
    owner: str

class AIAssistantLog(AIAssistantLogBase):
    id: int
    class Config:
        from_attributes = True

class AIAssistantManagementData(BaseModel):
    summary: GenericSummary
    ai_logs: List[AIAssistantLog]

# Admin
class AdminBase(BaseModel):
    id_str: str
    name: str
    email: str
    role: str
    status: str
    last_login: str
    owner: str

class Admin(AdminBase):
    id: int
    class Config:
        from_attributes = True

class AdminManagementData(BaseModel):
    summary: GenericSummary
    admins: List[Admin]

class AdminLogin(BaseModel):
    email: str
    password: str


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


