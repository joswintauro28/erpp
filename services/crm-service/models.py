from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    value = Column(Float)
    formatted_value = Column(String)
    trend = Column(String)
    is_positive = Column(Boolean)

class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    value = Column(Float)
    color = Column(String)

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    confidence = Column(Integer)
    type = Column(String)

class HotLead(Base):
    __tablename__ = "hot_leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    status = Column(String)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    account = Column(String)
    industry = Column(String)
    tier = Column(String)
    arr = Column(Integer)
    status = Column(String)
    owner = Column(String)
    updated_at = Column(String)

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    role = Column(String)
    account = Column(String)
    email = Column(String)
    phone = Column(String)
    type = Column(String)
    last_contact = Column(String)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    type = Column(String)
    account = Column(String)
    size = Column(String)
    status = Column(String)
    owner = Column(String)
    updated_at = Column(String)
    file_data = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    files = Column(String, nullable=True)

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    company = Column(String)
    source = Column(String)
    est_value = Column(Integer)
    status = Column(String)
    owner = Column(String)
    updated_at = Column(String)

class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    account = Column(String)
    value = Column(String)
    probability = Column(String)
    close_date = Column(String)
    stage = Column(String)
    owner = Column(String)

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    invoice_no = Column(String)
    account = Column(String)
    amount = Column(String)
    issued_date = Column(String)
    due_date = Column(String)
    status = Column(String)
    rep = Column(String)

class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    account = Column(String)
    category = Column(String)
    priority = Column(String)
    status = Column(String)
    owner = Column(String)

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    quote_no = Column(String)
    account = Column(String)
    value = Column(String)
    valid_until = Column(String)
    status = Column(String)
    owner = Column(String)
    file_data = Column(String, nullable=True)
    file_name = Column(String, nullable=True)

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    so_no = Column(String)
    account = Column(String)
    from_quote = Column(String)
    value = Column(String)
    eta = Column(String)
    status = Column(String)
    owner = Column(String)
    file_data = Column(String, nullable=True)
    file_name = Column(String, nullable=True)

class Enquiry(Base):
    __tablename__ = "enquiries"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    subject = Column(String)
    customer = Column(String)
    date = Column(String)
    status = Column(String)
    owner = Column(String)

class SiteVisit(Base):
    __tablename__ = "site_visits"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    location = Column(String)
    customer = Column(String)
    date = Column(String)
    status = Column(String)
    owner = Column(String)

class FollowUp(Base):
    __tablename__ = "follow_ups"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    action = Column(String)
    customer = Column(String)
    due_date = Column(String)
    status = Column(String)
    owner = Column(String)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    title = Column(String)
    related_to = Column(String)
    due_date = Column(String)
    status = Column(String)
    owner = Column(String)

class Communication(Base):
    __tablename__ = "communications"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    type = Column(String)
    subject = Column(String)
    customer = Column(String)
    date = Column(String)
    owner = Column(String)

class VisitPlan(Base):
    __tablename__ = "visit_plans"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    title = Column(String)
    customer = Column(String)
    date = Column(String)
    status = Column(String)
    owner = Column(String)

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    subject = Column(String)
    customer = Column(String)
    date_raised = Column(String)
    status = Column(String)
    owner = Column(String)

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    score = Column(Integer)
    comment = Column(String)
    customer = Column(String)
    date = Column(String)
    owner = Column(String)

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    title = Column(String)
    category = Column(String)
    last_run = Column(String)
    status = Column(String)
    owner = Column(String)

class AIAssistantLog(Base):
    __tablename__ = "ai_logs"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    query = Column(String)
    category = Column(String)
    date = Column(String)
    status = Column(String)
    owner = Column(String)

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
    status = Column(String)
    last_login = Column(String)
    owner = Column(String)
