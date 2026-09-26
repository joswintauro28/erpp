from sqlalchemy import Column, Integer, String
from app.database import Base

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    organization_id = Column(Integer, nullable=False, default=1, index=True)
    owner_id = Column(Integer, index=True, nullable=True)
    name = Column(String)
    role = Column(String)
    account = Column(String)
    email = Column(String)
    phone = Column(String)
    type = Column(String)
    last_contact = Column(String)
