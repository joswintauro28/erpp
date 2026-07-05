from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.core.exceptions import NotFoundException
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate
from app.services.client import ClientService

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientOut])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = ClientService(db)
    return await service.list_clients(user_id)


@router.post("", response_model=ClientOut, status_code=201)
async def create_client(
    req: ClientCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = ClientService(db)
    return await service.create_client(user_id, **req.model_dump())


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = ClientService(db)
    client = await service.get_client(client_id, user_id)
    if not client:
        raise NotFoundException("Client not found")
    return client


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: int,
    req: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = ClientService(db)
    client = await service.update_client(
        client_id, user_id, **{k: v for k, v in req.model_dump().items() if v is not None}
    )
    if not client:
        raise NotFoundException("Client not found")
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = ClientService(db)
    deleted = await service.delete_client(client_id, user_id)
    if not deleted:
        raise NotFoundException("Client not found")
