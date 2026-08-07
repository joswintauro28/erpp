from datetime import datetime

from pydantic import BaseModel, Field


class QualityCheckCreate(BaseModel):
    po_id: int | None = None
    po_item_id: int | None = None
    product_id: int | None = None
    product_name: str | None = None
    quantity: int = Field(default=0, ge=0)
    notes: str | None = None


class QualityCheckResult(BaseModel):
    status: str = Field(pattern="^(PASS|FAIL|HOLD)$")
    notes: str | None = None


class QualityCheckOut(BaseModel):
    id: int
    organization_id: int
    po_id: int | None
    po_item_id: int | None
    product_id: int
    product_name: str
    quantity: int
    status: str
    inspected_by: str | None
    inspected_at: datetime | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
