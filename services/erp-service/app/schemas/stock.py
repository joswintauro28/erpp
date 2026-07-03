from pydantic import BaseModel
from typing import Optional

class StockMovement(BaseModel):
    product_id: int
    invoice_id: Optional[int] = None
    movement_type: str
    quantity: int
    location: str
    reference: str
