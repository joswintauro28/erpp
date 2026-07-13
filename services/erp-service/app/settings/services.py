import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from app.settings.models import SystemSettings
from app.settings.schemas import SettingsSchema

async def get_settings_by_owner(db: AsyncSession, owner_id: int) -> SystemSettings:
    stmt = sa.select(SystemSettings).where(SystemSettings.owner_id == owner_id)
    result = await db.execute(stmt)
    db_settings = result.scalar_one_or_none()
    
    if not db_settings:
        # Generate default settings based on schemas defaults
        default_data = SettingsSchema().model_dump()
        db_settings = SystemSettings(owner_id=owner_id, settings=default_data)
        db.add(db_settings)
        await db.flush()
        
    return db_settings

async def update_settings_by_owner(db: AsyncSession, owner_id: int, updated_data: dict) -> SystemSettings:
    db_settings = await get_settings_by_owner(db, owner_id)
    
    # Merge existing and incoming updates
    current_settings = dict(db_settings.settings)
    
    # Simple nested merge
    for group_key, group_val in updated_data.items():
        if isinstance(group_val, dict) and group_key in current_settings:
            current_settings[group_key].update(group_val)
        else:
            current_settings[group_key] = group_val
            
    db_settings.settings = current_settings
    await db.flush()
    return db_settings
