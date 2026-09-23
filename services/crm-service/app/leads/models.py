from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    owner_id = Column(Integer, index=True, nullable=True)
    name = Column(String)
    company = Column(String)
    source = Column(String)
    est_value = Column(Integer)
    status = Column(String)
    owner = Column(String)
    updated_at = Column(String)
    created_at = Column(String, nullable=True)

    # Contact / qualification detail collected by LeadCreateModal
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    probability = Column(String, nullable=True)

    # Lead scoring (M3) / MQL qualification (M4 / S1 handoff)
    score = Column(Integer, default=0, nullable=False, server_default="0")
    tier = Column(String, default="Cold", nullable=False, server_default="Cold")
    nurture_status = Column(String, default="New", nullable=False, server_default="New")
    is_mql = Column(Boolean, default=False, nullable=False, server_default="false")
    mql_qualified_at = Column(String, nullable=True)
