from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user_id, require_permission
from app.settings.schemas import SettingsSchema
from app.settings.services import get_settings_by_owner, update_settings_by_owner

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=dict)
async def get_settings(
    owner_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    db_settings = await get_settings_by_owner(db, owner_id)
    return db_settings.settings

@router.put("", response_model=dict)
async def update_settings(
    body: dict,
    owner_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _perm: bool = Depends(require_permission("settings.manage")),
):
    # Perform raw dictionary updates after structural validate
    # Partial updates are allowed
    db_settings = await update_settings_by_owner(db, owner_id, body)
    return db_settings.settings
