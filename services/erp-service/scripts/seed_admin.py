import sys
sys.path.append('.')

import asyncio
import sqlalchemy as sa
from app.database import async_session_factory
from app.models.user import User
from app.models.organization import Organization, Role, OrganizationMember
from app.models.settings import CompanySetting, BrandingSetting, NotificationSetting, WorkflowSettings
from app.core.security import hash_password

async def seed_admin():
    async with async_session_factory() as db:
        email = "admin@example.com"
        password = "password123"
        
        print(f"Seeding admin user: {email}")
        try:
            # 1. User creation/update
            stmt = sa.select(User).filter(User.email == email)
            user_result = await db.execute(stmt)
            user = user_result.scalar_one_or_none()
            if user:
                user.password_hash = hash_password(password)
                print(f"User already exists (ID: {user.id}). Updated password to: {password}")
            else:
                user = User(
                    email=email,
                    password_hash=hash_password(password),
                    full_name="System Admin",
                    is_active=True
                )
                db.add(user)
                await db.flush()  # Populate user.id
                print(f"User created successfully (ID: {user.id}). Password: {password}")
                
            # 2. Ensure Role (Organization Owner) exists
            stmt = sa.select(Role).filter(Role.name == "Organization Owner")
            role_result = await db.execute(stmt)
            owner_role = role_result.scalar_one_or_none()
            if not owner_role:
                owner_role = Role(
                    name="Organization Owner",
                    description="Has full system access to the organization",
                    is_system_role=True
                )
                db.add(owner_role)
                await db.flush()
                print("Created Organization Owner role.")
                
            # 3. Ensure Organization exists (id matches user.id)
            stmt = sa.select(Organization).filter(Organization.id == user.id)
            org_result = await db.execute(stmt)
            org = org_result.scalar_one_or_none()
            if not org:
                org = Organization(
                    id=user.id,
                    name="Admin's Organization",
                    owner_id=user.id
                )
                db.add(org)
                await db.flush()
                print("Created organization.")
                
            # 4. Ensure user is Member of organization
            stmt = sa.select(OrganizationMember).filter(
                sa.and_(
                    OrganizationMember.organization_id == org.id,
                    OrganizationMember.user_id == user.id
                )
            )
            member_result = await db.execute(stmt)
            member = member_result.scalar_one_or_none()
            if not member:
                member = OrganizationMember(
                    organization_id=org.id,
                    user_id=user.id,
                    role_id=owner_role.id,
                    status="active"
                )
                db.add(member)
                print("Assigned Organization Owner role to user.")
                
            # 5. Ensure core user settings are generated
            for setting_class, name in [
                (CompanySetting, "Company settings"),
                (BrandingSetting, "Branding settings"),
                (NotificationSetting, "Notification settings"),
                (WorkflowSettings, "Workflow settings")
            ]:
                stmt = sa.select(setting_class).filter(setting_class.owner_id == user.id)
                setting_result = await db.execute(stmt)
                setting = setting_result.scalar_one_or_none()
                if not setting:
                    if setting_class == CompanySetting:
                        setting = CompanySetting(
                            owner_id=user.id,
                            company_name="Admin's Company",
                            email=user.email
                        )
                    else:
                        setting = setting_class(owner_id=user.id)
                    db.add(setting)
                    print(f"Created default {name}.")
                    
            await db.commit()
            print("Seeding transaction committed successfully.")
            
        except Exception as e:
            await db.rollback()
            print(f"Failed to seed admin user: {e}")

if __name__ == "__main__":
    asyncio.run(seed_admin())

