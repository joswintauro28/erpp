import os
import sys
import subprocess
import asyncio
import argparse

# Helper to run a command and stream output
def run_command(command, cwd=None):
    print(f"\nRunning command: {command} in {cwd or 'current directory'}")
    # Use shell=True for windows to recognize .bat/.ps1 and aliases
    shell = sys.platform == "win32"
    
    # Run process
    process = subprocess.Popen(
        command,
        cwd=cwd,
        shell=shell,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    # Read output in real-time
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            print(output.strip())
            
    rc = process.poll()
    if rc != 0:
        print(f"Command failed with exit code {rc}")
        return False
    return True

async def main():
    parser = argparse.ArgumentParser(description="DATAVEX ERP Collective Database Seeder")
    parser.add_argument("--docker", action="store_true", help="Run seeding inside running Docker containers")
    args = parser.parse_args()

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # Determine python executable path for each service (virtual environments)
    is_windows = sys.platform == "win32"
    
    def get_py_path(service_name):
        if is_windows:
            return os.path.join(repo_root, "services", service_name, ".venv", "Scripts", "python.exe")
        return os.path.join(repo_root, "services", service_name, ".venv", "bin", "python")

    def get_alembic_path(service_name):
        if is_windows:
            return os.path.join(repo_root, "services", service_name, ".venv", "Scripts", "alembic.exe")
        return os.path.join(repo_root, "services", service_name, ".venv", "bin", "alembic")

    if args.docker:
        print("=== SEEDING DATA INSIDE DOCKER CONTAINERS ===")
        
        # 1. core-iam (NestJS / Prisma)
        print("\n--- Seeding IAM Service in Docker ---")
        run_command("docker exec datavex-core-iam bunx prisma db push")
        run_command("docker exec datavex-core-iam bunx prisma db seed")
        
        # 2. billing-service (NestJS / Prisma)
        print("\n--- Seeding Billing Service in Docker ---")
        run_command("docker exec datavex-billing-service bunx prisma db push")
        run_command("docker exec datavex-billing-service bunx prisma db seed")
        
        # 3. crm-service (FastAPI / Alembic / SQLAlchemy)
        print("\n--- Seeding CRM Service in Docker ---")
        run_command("docker exec datavex-crm-service alembic upgrade head")
        run_command("docker exec datavex-crm-service python scripts/seed.py")
        
        # 4. inventory-service (FastAPI / Alembic / SQLAlchemy)
        print("\n--- Seeding Inventory Service in Docker ---")
        run_command("docker exec datavex-inventory-service alembic upgrade head")
        run_command("docker exec datavex-inventory-service python scripts/seed.py")
        
        # 5. erp-service (FastAPI / Alembic)
        print("\n--- Migrating Gateway Service in Docker ---")
        run_command("docker exec datavex-erp-service alembic upgrade head")
        
        print("\n=== Docker Seeding Completed! ===")
        
    else:
        print("=== SEEDING DATA ON LOCAL DEVELOPMENT HOST ===")
        
        # Step 1: Recreate all empty databases using recreate_all_dbs.py
        recreate_script = os.path.join(repo_root, "scripts", "recreate_all_dbs.py")
        print("\n--- Step 1: Re-instantiating all PostgreSQL databases ---")
        # Run using current python environment
        if not run_command(f"{sys.executable} {recreate_script}"):
            print("Failed to recreate databases. Exiting.")
            sys.exit(1)
            
        # Step 2: Seed core-iam
        print("\n--- Step 2: Seeding core-iam (SSO / RBAC) ---")
        core_iam_dir = os.path.join(repo_root, "services", "core-iam")
        if not run_command("bunx prisma db push", cwd=core_iam_dir):
            # Fallback to npx if bunx not available
            run_command("npx prisma db push", cwd=core_iam_dir)
        if not run_command("bunx prisma db seed", cwd=core_iam_dir):
            run_command("npx prisma db seed", cwd=core_iam_dir)
            
        # Step 3: Seed billing-service
        print("\n--- Step 3: Seeding billing-service ---")
        billing_dir = os.path.join(repo_root, "services", "billing-service")
        if not run_command("bunx prisma db push", cwd=billing_dir):
            run_command("npx prisma db push", cwd=billing_dir)
        if not run_command("bunx prisma db seed", cwd=billing_dir):
            run_command("npx prisma db seed", cwd=billing_dir)
            
        # Step 4: Seed inventory-service
        print("\n--- Step 4: Seeding inventory-service ---")
        inv_dir = os.path.join(repo_root, "services", "inventory-service")
        inv_py = get_py_path("inventory-service")
        inv_alembic = get_alembic_path("inventory-service")
        
        # Set python path environment variable
        os.environ["PYTHONPATH"] = inv_dir
        run_command(f"{inv_alembic} upgrade head", cwd=inv_dir)
        run_command(f"{inv_py} scripts/seed.py", cwd=inv_dir)
        
        # Step 5: Seed crm-service
        print("\n--- Step 5: Seeding crm-service ---")
        crm_dir = os.path.join(repo_root, "services", "crm-service")
        crm_py = get_py_path("crm-service")
        crm_alembic = get_alembic_path("crm-service")
        
        os.environ["PYTHONPATH"] = crm_dir
        run_command(f"{crm_alembic} upgrade head", cwd=crm_dir)
        run_command(f"{crm_py} scripts/seed.py", cwd=crm_dir)
        
        # Step 6: Migrate erp-service (gateway database)
        print("\n--- Step 6: Migrating erp-service gateway ---")
        erp_dir = os.path.join(repo_root, "services", "erp-service")
        erp_alembic = get_alembic_path("erp-service")
        
        os.environ["PYTHONPATH"] = erp_dir
        run_command(f"{erp_alembic} upgrade head", cwd=erp_dir)
        
        print("\n=== Local Host Seeding Completed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(main())
