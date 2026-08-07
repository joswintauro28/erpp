from sqlalchemy import Column, Integer, String, JSON
from app.database import Base

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    so_no = Column(String)
    account = Column(String)
    from_quote = Column(String)
    value = Column(String)
    eta = Column(String)
    date_ordered = Column(String, nullable=True)
    status = Column(String)
    owner = Column(String)
    file_data = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    # Product line items from the quote/order: [{ product_name, sku, quantity, unit_price }]
    line_items = Column(JSON, nullable=True)

    # Order lifecycle (O2/O3): credit check + internal approval state
    credit_check_status = Column(String, default="Not Checked", nullable=False, server_default="Not Checked")
    credit_check_detail = Column(JSON, nullable=True)
    approval_status = Column(String, default="Pending", nullable=False, server_default="Pending")
    approved_at = Column(String, nullable=True)
