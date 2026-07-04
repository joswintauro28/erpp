from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate
from app.services.client_service import create_client, delete_client, get_client, list_clients, update_client

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=list[ClientOut])
def get_clients(
    user_id: int = Depends(require_permission("clients.view")),
    db: Session = Depends(get_db),
):
    return list_clients(db, user_id)


@router.post("/", response_model=ClientOut, status_code=201)
def create(
    body: ClientCreate,
    user_id: int = Depends(require_permission("clients.create")),
    db: Session = Depends(get_db),
):
    return create_client(db, user_id, body.model_dump())


@router.get("/{client_id}", response_model=ClientOut)
def get(
    client_id: int,
    user_id: int = Depends(require_permission("clients.view")),
    db: Session = Depends(get_db),
):
    return get_client(db, client_id, user_id)


@router.put("/{client_id}", response_model=ClientOut)
def update(
    client_id: int,
    body: ClientUpdate,
    user_id: int = Depends(require_permission("clients.edit")),
    db: Session = Depends(get_db),
):
    return update_client(db, client_id, user_id, body.model_dump(exclude_unset=True))


@router.delete("/{client_id}", status_code=204)
def delete(
    client_id: int,
    user_id: int = Depends(require_permission("clients.delete")),
    db: Session = Depends(get_db),
):
    delete_client(db, client_id, user_id)
