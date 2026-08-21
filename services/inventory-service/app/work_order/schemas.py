from datetime import datetime

from pydantic import BaseModel, Field


class WorkOrderOperationCreate(BaseModel):
    sequence: int = 1
    operation_name: str
    workcenter: str | None = None


class WorkOrderMaterialCreate(BaseModel):
    product_id: int | None = None
    product_name: str | None = None
    quantity_required: int = Field(gt=0)


class WorkOrderCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    priority: str = "MEDIUM"
    due_date: datetime | None = None
    notes: str | None = None
    operations: list[WorkOrderOperationCreate] = []
    materials: list[WorkOrderMaterialCreate] = []


class WorkOrderMaterialIssue(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class WorkOrderOperationOut(BaseModel):
    id: int
    work_order_id: int
    sequence: int
    operation_name: str
    workcenter: str | None = None
    status: str
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class WorkOrderMaterialOut(BaseModel):
    id: int
    work_order_id: int
    product_id: int
    product_name: str
    sku: str | None = None
    quantity_required: int
    quantity_issued: int

    model_config = {"from_attributes": True}


class WorkOrderOut(BaseModel):
    id: int
    organization_id: int
    work_order_no: str
    product_id: int
    product_name: str
    sku: str | None = None
    quantity: int
    status: str
    priority: str
    due_date: datetime | None = None
    notes: str | None = None
    created_by: str | None = None
    released_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    operations: list[WorkOrderOperationOut] = []
    materials: list[WorkOrderMaterialOut] = []

    model_config = {"from_attributes": True}
