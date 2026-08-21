from pydantic import BaseModel

class GenericSummary(BaseModel):
    total: int
    active: int
    attention: int
    owners: int
