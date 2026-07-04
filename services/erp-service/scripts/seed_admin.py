import sys
sys.path.append('.')

from app.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization, Role, OrganizationMember
from app.models.settings import CompanySetting, BrandingSetting, NotificationSetting, WorkflowSettings
from app.core.security import hash_password

def seed_admin():
    db = SessionLocal()
    email = "admin@example.com"
    password = "password123"
    
    print(f"Seeding admin user: {email}")
    try:
        # 1. User creation/update
        user = db.query(User).filter(User.email == email).first()
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
            db.flush()  # Populate user.id
            print(f"User created successfully (ID: {user.id}). Password: {password}")
            
        # 2. Ensure Role (Organization Owner) exists
        owner_role = db.query(Role).filter(Role.name == "Organization Owner").first()
        if not owner_role:
            owner_role = Role(
                name="Organization Owner",
                description="Has full system access to the organization",
                is_system_role=True
            )
            db.add(owner_role)
            db.flush()
            print("Created Organization Owner role.")
            
        # 3. Ensure Organization exists (id matches user.id)
        org = db.query(Organization).filter(Organization.id == user.id).first()
        if not org:
            org = Organization(
                id=user.id,
                name="Admin's Organization",
                owner_id=user.id
            )
            db.add(org)
            db.flush()
            print("Created organization.")
            
        # 4. Ensure user is Member of organization
        member = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id
        ).first()
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
            setting = db.query(setting_class).filter(setting_class.owner_id == user.id).first()
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
                
        db.commit()
        print("Seeding transaction committed successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Failed to seed admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
