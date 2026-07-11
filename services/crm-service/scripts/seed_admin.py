import sys
import os

# Add the parent directory to the path so we can import the backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
import models
from datetime import datetime

def seed_admin():
    # Drop existing tables to apply schema changes
    Base.metadata.drop_all(bind=engine)
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        if db.query(models.Admin).count() == 0:
            print("Seeding initial admin user...")
            
            # Format today's date like "Jul 07"
            today_str = datetime.now().strftime("%b %d")
            
            admin = models.Admin(
                id_str="ADM-1001",
                name="Super Admin",
                email="admin@generalref.com",
                password="admin@12345",
                role="Super Admin",
                status="Active",
                last_login=today_str,
                owner="System"
            )
            db.add(admin)
            db.commit()
            print("Admin user seeded successfully!")
        else:
            print("Admin users already exist in the database.")
    except Exception as e:
        print(f"Error seeding admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
