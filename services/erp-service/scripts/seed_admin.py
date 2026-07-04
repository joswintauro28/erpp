import sys
sys.path.append('.')

from app.database import conn
from app.utils import hash

def seed_admin():
    email = "admin@example.com"
    password = "password123"
    hashed_password = hash(password)
    
    print(f"Seeding admin user: {email}")
    try:
        with conn.cursor() as cursor:
            # Query the actual column names in the users table
            cursor.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
            )
            columns = [row['column_name'] for row in cursor.fetchall()]
            
            # Determine the password column name
            pwd_col = 'password_hash' if 'password_hash' in columns else 'password'
            
            # 1. Insert or Update user
            cursor.execute(
                "SELECT id FROM users WHERE email = %s",
                (email,)
            )
            existing = cursor.fetchone()
            if existing:
                user_id = existing["id"]
                # Update password
                cursor.execute(
                    f"UPDATE users SET {pwd_col} = %s WHERE id = %s",
                    (hashed_password, user_id)
                )
                print(f"User already exists (ID: {user_id}). Updated password to: {password}")
            else:
                cursor.execute(
                    f"INSERT INTO users (email, {pwd_col}) VALUES (%s, %s) RETURNING id",
                    (email, hashed_password)
                )
                user_id = cursor.fetchone()["id"]
                print(f"User created successfully (ID: {user_id}). Password: {password}")
            
            # 2. Sync organization and role (checking existence manually to avoid ON CONFLICT constraint issues)
            cursor.execute("SELECT id FROM roles WHERE name = 'Organization Owner'")
            role = cursor.fetchone()
            owner_role_id = role["id"] if role else None
            
            if owner_role_id:
                # Check and insert Organization
                cursor.execute("SELECT 1 FROM organizations WHERE id = %s", (user_id,))
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO organizations (id, name, owner_id) VALUES (%s, %s, %s)", 
                        (user_id, "Admin's Organization", user_id)
                    )
                    print("Created organization.")
                
                # Check and insert Organization Member
                cursor.execute(
                    "SELECT 1 FROM organization_members WHERE organization_id = %s AND user_id = %s",
                    (user_id, user_id)
                )
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO organization_members (organization_id, user_id, role_id) 
                        VALUES (%s, %s, %s)
                    """, (user_id, user_id, owner_role_id))
                    print("Assigned Organization Owner role to user.")
                
                # Make sure there is a main warehouse associated
                cursor.execute(
                    """
                    SELECT 1 FROM warehouses WHERE owner_id = %s AND code = 'MAIN'
                    """ ,
                    (user_id,)
                )
                if not cursor.fetchone():
                    cursor.execute(
                        """
                        INSERT INTO warehouses (owner_id, name, code, status)
                        VALUES (%s, 'Main Warehouse', 'MAIN', 'active')
                        """,
                        (user_id,)
                    )
                    print("Created Main Warehouse.")
                
                print("Organization, Role, and Warehouse configurations synchronized successfully.")
            else:
                print("Warning: 'Organization Owner' role not found. Please run backend migrations first.")
                
            conn.commit()
            print("Seeding transaction committed successfully.")
            
    except Exception as e:
        conn.rollback()
        print(f"Failed to seed admin user: {e}")

if __name__ == "__main__":
    seed_admin()
