from sqlalchemy import Column, Integer, String
from app.database import Base

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
