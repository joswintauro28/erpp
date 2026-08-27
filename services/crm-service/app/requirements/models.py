from sqlalchemy import Column, Integer, String, Text
from app.database import Base

class Requirement(Base):
    """Client-submitted requirement linked to a Lead or Opportunity.

    Lifecycle status: Draft -> Submitted -> In Review -> Approved -> Converted / Rejected
    """
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    account = Column(String)
    category = Column(String)
    priority = Column(String)
    status = Column(String)
    owner = Column(String)

    # Blueprint alignment: richer requirement record
    description = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    lead_id_str = Column(String, nullable=True, index=True)
    opportunity_id_str = Column(String, nullable=True, index=True)
    submitted_date = Column(String, nullable=True)
    file_id = Column(Integer, nullable=True)
