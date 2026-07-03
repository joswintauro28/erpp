from pydantic import BaseModel

class LedgerEntry(BaseModel):
    account: str
    description: str
    debit: float = 0
    credit: float = 0