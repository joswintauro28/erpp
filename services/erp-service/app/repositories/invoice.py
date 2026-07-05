from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice, InvoiceItem, Payment, CreditNote, DebitNote
from app.repositories.base import BaseRepository


class InvoiceRepository(BaseRepository[Invoice]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Invoice)


class InvoiceItemRepository(BaseRepository[InvoiceItem]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, InvoiceItem)


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Payment)


class CreditNoteRepository(BaseRepository[CreditNote]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, CreditNote)


class DebitNoteRepository(BaseRepository[DebitNote]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, DebitNote)
