from pydantic import BaseModel

class EWayBill(BaseModel):
    invoice_id: int
    vehicle_number: str
    transporter_name: str
    distance_km: int