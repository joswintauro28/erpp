from sqlalchemy import Column, Integer, String
from app.database import Base

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
