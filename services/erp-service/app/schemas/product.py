from pydantic import BaseModel

class Product(BaseModel):
    name: str
    category: str
    sku: str
    price: float
    cost_price: float = 0
    stock: int = 0
    low_stock_threshold: int = 10
    uses_batch_tracking: bool = False
    uses_serial_tracking: bool = False
    track_inventory: bool = True
    costing_method: str = "standard"
