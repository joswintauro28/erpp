from sqlalchemy import Column, Integer, String
from app.database import Base

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
