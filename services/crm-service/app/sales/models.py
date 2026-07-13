from sqlalchemy import Column, Integer, String

from app.core.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    invoice_no = Column(String)
    account = Column(String)
    amount = Column(String)
    issued_date = Column(String)
    due_date = Column(String)
    status = Column(String)
    rep = Column(String)


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    account = Column(String)
    category = Column(String)
    priority = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    quote_no = Column(String)
    account = Column(String)
    value = Column(String)
    valid_until = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)
    file_data = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    billing_quote_id = Column(Integer, nullable=True)


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    so_no = Column(String)
    account = Column(String)
    from_quote = Column(String)
    value = Column(String)
    eta = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)
    file_data = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
