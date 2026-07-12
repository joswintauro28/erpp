from sqlalchemy import Column, Integer, String

from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    company = Column(String)
    source = Column(String)
    est_value = Column(Integer)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)
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
    organization_id = Column(Integer, nullable=False, index=True)
