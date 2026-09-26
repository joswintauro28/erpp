"""Seed erp-service database with per-organization settings, brand colors, and notifications."""
import asyncio
import os
import sys
import argparse
from datetime import datetime, timezone, timedelta

service_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
repo_root = os.path.abspath(os.path.join(service_dir, "..", ".."))
sys.path.append(service_dir)
sys.path.append(repo_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(service_dir, ".env"))

from app.core.database import async_session_factory, Base, engine
from app.notification.models import Notification
from app.settings.models import SystemSettings
from app.settings.schemas import SettingsSchema
from sqlalchemy import select, delete

BRAND_COLORS = {
    1: {"primary": "#96282E", "accent": "#CBA052"},  # DATAVEX Crimson / Gold
    2: {"primary": "#0F5132", "accent": "#D1E7DD"},  # Eternal Forest Green
    3: {"primary": "#E23744", "accent": "#FFF0F1"},  # Zomato Red
    4: {"primary": "#F8CB46", "accent": "#FFF9E6"},  # Blinkit Yellow
    5: {"primary": "#343A40", "accent": "#CED4DA"},  # District Slate
}

async def seed_dev(db):
    print("Seeding erp-service [Profile: dev]...")

    # Upsert settings for orgs 1..5
    for org_id in [1, 2, 3, 4, 5]:
        stmt = select(SystemSettings).where(SystemSettings.organization_id == org_id)
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        default_settings = SettingsSchema().model_dump()
        colors = BRAND_COLORS.get(org_id, BRAND_COLORS[1])
        default_settings.setdefault("branding", {})
        default_settings["branding"]["brand_colors"] = {
            "primary": colors["primary"],
            "accent": colors["accent"],
        }

        if not existing:
            new_settings = SystemSettings(
                organization_id=org_id,
                settings=default_settings,
            )
            db.add(new_settings)
            print(f"  Created default settings for organization_id={org_id}")
        else:
            current = dict(existing.settings)
            current.setdefault("branding", {})
            current["branding"]["brand_colors"] = {
                "primary": colors["primary"],
                "accent": colors["accent"],
            }
            existing.settings = current
            print(f"  Updated brand colors for organization_id={org_id}")

    # Dev notifications for Org 1
    welcome_notif = Notification(
        organization_id=1,
        user_id=1,
        role="Organization Owner",
        title="Welcome to DATAVEX ERP",
        message="System initialized successfully with unified multi-tenant architecture and theme settings.",
        type="SUCCESS",
        module_source="SYSTEM",
        read_status=False,
    )
    db.add(welcome_notif)

    db.add(Notification(
        organization_id=1,
        user_id=2,
        role="Sales Executive",
        title="New Lead Assigned",
        message="Lead 'E-Commerce Platform Modernization' assigned to Maya Patel.",
        type="INFO",
        module_source="CRM",
        read_status=False,
    ))

    db.add(Notification(
        organization_id=2,
        user_id=1,
        role="Organization Owner",
        title="Welcome to Eternal ERP",
        message="Multi-tenant workspace ready for Eternal organization.",
        type="SUCCESS",
        module_source="SYSTEM",
        read_status=False,
    ))

    await db.commit()
    print("Dev profile erp-service seeding completed!")


async def seed_testing(db):
    print("Seeding erp-service [Profile: testing]...")

    # Upsert settings for orgs 1..5
    for org_id in [1, 2, 3, 4, 5]:
        stmt = select(SystemSettings).where(SystemSettings.organization_id == org_id)
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        default_settings = SettingsSchema().model_dump()
        colors = BRAND_COLORS.get(org_id, BRAND_COLORS[1])
        default_settings.setdefault("branding", {})
        default_settings["branding"]["brand_colors"] = {
            "primary": colors["primary"],
            "accent": colors["accent"],
        }

        if not existing:
            new_settings = SystemSettings(
                organization_id=org_id,
                settings=default_settings,
            )
            db.add(new_settings)
        else:
            current = dict(existing.settings)
            current.setdefault("branding", {})
            current["branding"]["brand_colors"] = {
                "primary": colors["primary"],
                "accent": colors["accent"],
            }
            existing.settings = current

    # Bulk notifications for Org 1 (50 notifications)
    modules = ["SYSTEM", "CRM", "BILLING", "INVENTORY"]
    types = ["INFO", "SUCCESS", "WARNING", "ERROR", "ACTION"]
    now = datetime.now(timezone.utc)

    for i in range(1, 51):
        mod = modules[i % len(modules)]
        typ = types[i % len(types)]
        db.add(Notification(
            organization_id=1,
            user_id=(i % 5) + 1,
            role="Organization Owner" if i % 3 == 0 else "Sales Executive",
            title=f"Automated Notification #{i} ({mod})",
            message=f"Event triggered in module {mod} with severity {typ} for multi-tenant verification.",
            type=typ,
            module_source=mod,
            read_status=(i % 4 == 0),
            created_at=now - timedelta(hours=i),
        ))

    # Org 2: 15 notifications
    for i in range(1, 16):
        db.add(Notification(
            organization_id=2,
            user_id=1,
            role="Organization Owner",
            title=f"Eternal Notification #{i}",
            message=f"Tenant 2 operational alert #{i}",
            type="INFO" if i % 2 == 0 else "SUCCESS",
            module_source="BILLING",
            read_status=False,
            created_at=now - timedelta(hours=i * 2),
        ))

    # Org 3: 5 notifications
    for i in range(1, 6):
        db.add(Notification(
            organization_id=3,
            user_id=1,
            role="Organization Owner",
            title=f"Zomato Notification #{i}",
            message=f"Tenant 3 logistics update #{i}",
            type="INFO",
            module_source="INVENTORY",
            read_status=False,
        ))

    # Org 5: 0 notifications (empty-state verification)
    print("  Org 5 left with 0 notifications (empty-state verification).")

    await db.commit()
    print("Testing profile erp-service seeding completed!")


async def seed(profile="dev"):
    print(f"Starting erp-service seed [Profile: {profile}]...")
    async with async_session_factory() as db:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            # Clean notifications
            await db.execute(delete(Notification))
            await db.commit()

            if profile == "testing":
                await seed_testing(db)
            else:
                await seed_dev(db)

            print("erp-service seeding completed successfully!")
        except Exception as e:
            await db.rollback()
            print(f"Error seeding erp-service: {e}")
            raise

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed erp-service database")
    parser.add_argument("--profile", default=os.getenv("SEED_PROFILE", "dev"), choices=["dev", "testing"], help="Seed profile (dev or testing)")
    parser.add_argument("--testing", action="store_true", help="Shortcut for --profile testing")
    args = parser.parse_args()

    active_profile = "testing" if args.testing else args.profile
    asyncio.run(seed(active_profile))
