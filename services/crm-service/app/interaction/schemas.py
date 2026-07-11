from pydantic import BaseModel
from typing import List


class Summary(BaseModel):
    total: int
    open: int
    overdue_at_risk: int
    owners: int


class EnquiryBase(BaseModel):
    id_str: str
    subject: str
    customer: str
    date: str
    status: str
    owner_id: int


class Enquiry(EnquiryBase):
    id: int
    class Config:
        from_attributes = True


class EnquiryManagementData(BaseModel):
    summary: Summary
    enquiries: List[Enquiry]


class SiteVisitBase(BaseModel):
    id_str: str
    location: str
    customer: str
    date: str
    status: str
    owner_id: int


class SiteVisit(SiteVisitBase):
    id: int
    class Config:
        from_attributes = True


class SiteVisitManagementData(BaseModel):
    summary: Summary
    site_visits: List[SiteVisit]


class FollowUpBase(BaseModel):
    id_str: str
    action: str
    customer: str
    due_date: str
    status: str
    owner_id: int


class FollowUp(FollowUpBase):
    id: int
    class Config:
        from_attributes = True


class FollowUpManagementData(BaseModel):
    summary: Summary
    follow_ups: List[FollowUp]


class TaskBase(BaseModel):
    id_str: str
    title: str
    related_to: str
    due_date: str
    status: str
    owner_id: int


class Task(TaskBase):
    id: int
    class Config:
        from_attributes = True


class TaskManagementData(BaseModel):
    summary: Summary
    tasks: List[Task]


class CommunicationBase(BaseModel):
    id_str: str
    type: str
    subject: str
    customer: str
    date: str
    owner_id: int


class Communication(CommunicationBase):
    id: int
    class Config:
        from_attributes = True


class CommunicationManagementData(BaseModel):
    summary: Summary
    communications: List[Communication]


class VisitPlanBase(BaseModel):
    id_str: str
    title: str
    customer: str
    date: str
    status: str
    owner_id: int


class VisitPlan(VisitPlanBase):
    id: int
    class Config:
        from_attributes = True


class VisitPlanManagementData(BaseModel):
    summary: Summary
    visit_plans: List[VisitPlan]
