from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.client import Client


def list_clients(db: Session, owner_id: int) -> list[Client]:
    return db.execute(
        select(Client).where(Client.owner_id == owner_id).order_by(Client.created_at.desc())
    ).scalars().all()


def get_client(db: Session, client_id: int, owner_id: int) -> Client:
    client = db.execute(
        select(Client).where(Client.id == client_id, Client.owner_id == owner_id)
    ).scalar_one_or_none()
    if not client:
        raise NotFoundException("Client not found")
    return client


def create_client(db: Session, owner_id: int, data: dict) -> Client:
    client = Client(owner_id=owner_id, **data)
    db.add(client)
    db.flush()
    return client


def update_client(db: Session, client_id: int, owner_id: int, data: dict) -> Client:
    client = get_client(db, client_id, owner_id)
    for key, value in data.items():
        if value is not None:
            setattr(client, key, value)
    db.flush()
    return client


def delete_client(db: Session, client_id: int, owner_id: int):
    client = get_client(db, client_id, owner_id)
    db.delete(client)
    db.flush()
