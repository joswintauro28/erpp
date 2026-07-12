from sqlalchemy import Column, Integer, String

from app.core.database import Base


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    subject = Column(String)
    customer = Column(String)
    date = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)


class SiteVisit(Base):
    __tablename__ = "site_visits"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    location = Column(String)
    customer = Column(String)
    date = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    action = Column(String)
    customer = Column(String)
    due_date = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    title = Column(String)
    related_to = Column(String)
    due_date = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)


class Communication(Base):
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    type = Column(String)
    subject = Column(String)
    customer = Column(String)
    date = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)


class VisitPlan(Base):
    __tablename__ = "visit_plans"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    title = Column(String)
    customer = Column(String)
    date = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)
