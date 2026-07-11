from pydantic import BaseModel
from typing import List


class Summary(BaseModel):
    total: int
    open: int
    overdue_at_risk: int
    owners: int


class ComplaintBase(BaseModel):
    id_str: str
    subject: str
    customer: str
    date_raised: str
    status: str
    owner_id: int


class Complaint(ComplaintBase):
    id: int
    class Config:
        from_attributes = True


class ComplaintManagementData(BaseModel):
    summary: Summary
    complaints: List[Complaint]


class FeedbackBase(BaseModel):
    id_str: str
    score: int
    comment: str
    customer: str
    date: str
    owner_id: int


class Feedback(FeedbackBase):
    id: int
    class Config:
        from_attributes = True


class FeedbackManagementData(BaseModel):
    summary: Summary
    feedback: List[Feedback]
