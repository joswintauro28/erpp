import sys
sys.path.append('.')
from app.db_bootstrap import ensure_phase1_schema
from app.database import conn

print("Running schema migration...")
ensure_phase1_schema()
print("Migration successful.")

with conn.cursor() as c:
    c.execute("SELECT name FROM roles")
    print("Roles:", [r['name'] for r in c.fetchall()])
    c.execute("SELECT id, name, owner_id FROM organizations")
    print("Organizations:", c.fetchall())
    c.execute("SELECT * FROM organization_members")
    print("Members:", c.fetchall())
