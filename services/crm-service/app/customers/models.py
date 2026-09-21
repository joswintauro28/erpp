from sqlalchemy import Column, Float, Integer, String
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    owner_id = Column(Integer, index=True, nullable=True)
    account = Column(String)
    industry = Column(String)
    tier = Column(String)
    arr = Column(Integer)
    # Credit limit in INR for the ERP credit check. NULL/0 means "no limit
    # configured" -> the customer is treated as having unlimited credit
    # (standard ERP convention: you only block when a limit is set).
    credit_limit = Column(Float, nullable=True)
    status = Column(String)
    owner = Column(String)
    updated_at = Column(String)
