from sqlalchemy import Column, Integer, String, Text

from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    account = Column(String)
    industry = Column(String)
    tier = Column(String)
    arr = Column(Integer)
    status = Column(String)
    owner_id = Column(Integer, nullable=False, index=True)
    updated_at = Column(String)


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    role = Column(String)
    account = Column(String)
    email = Column(String)
    phone = Column(String)
    type = Column(String)
    last_contact = Column(String)
    owner_id = Column(Integer, nullable=False, index=True)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    type = Column(String)
    account = Column(String)
    size = Column(String)
    status = Column(String)
    owner_id = Column(Integer, nullable=False, index=True)
    updated_at = Column(String)
    file_data = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    files = Column(String, nullable=True)
