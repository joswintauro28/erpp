from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_clients: int
    total_invoices: int
    total_revenue: float
    outstanding_revenue: float
    overdue_amount: float
    total_products: int
    low_stock_count: int
