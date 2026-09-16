"""Seed erp-service database with default company settings and brand colors synced with @datavex/ui-theme globals.css."""
import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import async_session_factory, Base, engine
from app.notification.models import Notification
from app.settings.models import SystemSettings
from app.settings.schemas import SettingsSchema
from sqlalchemy import select


async def seed():
    print("Seeding erp-service database...")
    async with async_session_factory() as db:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            owner_ids = [1, 2, 3, 4, 5]
            default_settings = SettingsSchema().model_dump()

            for owner_id in owner_ids:
                stmt = select(SystemSettings).where(SystemSettings.owner_id == owner_id)
                res = await db.execute(stmt)
                existing = res.scalar_one_or_none()

                if not existing:
                    new_settings = SystemSettings(
                        owner_id=owner_id,
                        settings=default_settings,
                    )
                    db.add(new_settings)
                    print(f"  Created default settings for owner_id={owner_id}")
                else:
                    current = dict(existing.settings)
                    current.setdefault("branding", {})
                    current["branding"]["brand_colors"] = default_settings["branding"]["brand_colors"]
                    existing.settings = current
                    print(f"  Updated brand colors to ui-theme defaults for owner_id={owner_id}")

            notif_stmt = select(Notification).where(Notification.organization_id == 1)
            notif_res = await db.execute(notif_stmt)
            if not notif_res.scalars().first():
                welcome_notif = Notification(
                    organization_id=1,
                    user_id=1,
                    role="Organization Owner",
                    title="Welcome to DATAVEX ERP",
                    message="System initialized successfully with unified design tokens and theme settings.",
                    type="SUCCESS",
                    module_source="SYSTEM",
                    read_status=False,
                )
                db.add(welcome_notif)
                print("  Created welcome notification for organization 1")

            await db.commit()
            print("erp-service seeding completed successfully!")
        except Exception as e:
            await db.rollback()
            print(f"Error seeding erp-service: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed())
