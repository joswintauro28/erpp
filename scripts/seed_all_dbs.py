import os
import sys
import subprocess
import asyncio
import argparse

# Helper to run a command and stream output
def run_command(command, cwd=None, env=None):
    print(f"\nRunning command: {command} in {cwd or 'current directory'}")
    shell = sys.platform == "win32"
    
    cmd_env = os.environ.copy()
    if env:
        cmd_env.update(env)

    process = subprocess.Popen(
        command,
        cwd=cwd,
        env=cmd_env,
        shell=shell,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
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
    parser.add_argument("--profile", default=os.getenv("SEED_PROFILE", "dev"), choices=["dev", "testing"], help="Seed profile (dev or testing)")
    parser.add_argument("--testing", action="store_true", help="Shortcut for --profile testing")
    args = parser.parse_args()

    active_profile = "testing" if args.testing else args.profile
    os.environ["SEED_PROFILE"] = active_profile

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    is_windows = sys.platform == "win32"
    
    def get_py_path(service_name):
        # Prefer service virtualenv, with fallback to crm-service virtualenv
        if is_windows:
            p = os.path.join(repo_root, "services", service_name, ".venv", "Scripts", "python.exe")
            if os.path.exists(p):
                return p
            crm_p = os.path.join(repo_root, "services", "crm-service", ".venv", "Scripts", "python.exe")
            if os.path.exists(crm_p):
                return crm_p
            return sys.executable
        p = os.path.join(repo_root, "services", service_name, ".venv", "bin", "python")
        if os.path.exists(p):
            return p
        crm_p = os.path.join(repo_root, "services", "crm-service", ".venv", "bin", "python")
        if os.path.exists(crm_p):
            return crm_p
        return sys.executable

    def get_alembic_path(service_name):
        if is_windows:
            p = os.path.join(repo_root, "services", service_name, ".venv", "Scripts", "alembic.exe")
            if os.path.exists(p):
                return p
            return os.path.join(repo_root, "services", "crm-service", ".venv", "Scripts", "alembic.exe")
        p = os.path.join(repo_root, "services", service_name, ".venv", "bin", "alembic")
        if os.path.exists(p):
            return p
        return os.path.join(repo_root, "services", "crm-service", ".venv", "bin", "alembic")

    if args.docker:
        print(f"=== SEEDING DATA INSIDE DOCKER CONTAINERS [Profile: {active_profile}] ===")
        
        # Copy shared seed_lib to containers
        seed_lib_path = os.path.join(repo_root, "scripts", "seed_lib")
        for container in ["datavex-crm-service", "datavex-inventory-service", "datavex-erp-service", "datavex-ai-service"]:
            run_command(f'docker cp "{seed_lib_path}" {container}:/app/scripts/')

        # 1. core-iam (NestJS / Prisma)
        print("\n--- Seeding IAM Service in Docker ---")
        run_command("docker exec datavex-core-iam bunx prisma db push")
        run_command(f"docker exec -e SEED_PROFILE={active_profile} datavex-core-iam bunx prisma db seed")
        
        # 2. billing-service (NestJS / Prisma)
        print("\n--- Seeding Billing Service in Docker ---")
        run_command("docker exec datavex-billing-service bunx prisma db push --accept-data-loss")
        run_command(f"docker exec -e SEED_PROFILE={active_profile} datavex-billing-service bunx prisma db seed")
        
        # 3. crm-service (FastAPI / Alembic / SQLAlchemy)
        print("\n--- Seeding CRM Service in Docker ---")
        run_command("docker exec datavex-crm-service alembic upgrade head")
        run_command(f"docker exec -e SEED_PROFILE={active_profile} datavex-crm-service python scripts/seed.py --profile {active_profile}")
        
        # 4. inventory-service (FastAPI / Alembic / SQLAlchemy)
        print("\n--- Seeding Inventory Service in Docker ---")
        run_command("docker exec datavex-inventory-service alembic upgrade head")
        run_command(f"docker exec -e SEED_PROFILE={active_profile} datavex-inventory-service python scripts/seed.py --profile {active_profile}")
        
        # 5. erp-service (FastAPI / Alembic / Settings & Notifications)
        print("\n--- Migrating & Seeding Gateway Service in Docker ---")
        run_command("docker exec datavex-erp-service alembic upgrade head")
        run_command(f"docker exec -e SEED_PROFILE={active_profile} datavex-erp-service python scripts/seed.py --profile {active_profile}")

        # 6. ai-service (FastAPI / Alembic / Sessions & Audit Logs)
        print("\n--- Migrating & Seeding AI Service in Docker ---")
        run_command("docker exec datavex-ai-service alembic upgrade head")
        run_command(f"docker exec -e SEED_PROFILE={active_profile} datavex-ai-service python scripts/seed.py --profile {active_profile}")
        
        print(f"\n=== Docker Seeding Completed Successfully! [Profile: {active_profile}] ===")
        
    else:
        print(f"=== SEEDING DATA ON LOCAL DEVELOPMENT HOST [Profile: {active_profile}] ===")
        
        # Step 1: Recreate all empty databases using recreate_all_dbs.py
        recreate_script = os.path.join(repo_root, "scripts", "recreate_all_dbs.py")
        print("\n--- Step 1: Re-instantiating all PostgreSQL databases ---")
        py_runner = get_py_path("crm-service")
        if not run_command(f"{py_runner} {recreate_script}"):
            print("Failed to recreate databases. Exiting.")
            sys.exit(1)
            
        # Step 2: Seed core-iam
        print("\n--- Step 2: Seeding core-iam (SSO / RBAC) ---")
        core_iam_dir = os.path.join(repo_root, "services", "core-iam")
        if not run_command("bunx prisma db push", cwd=core_iam_dir):
            run_command("npx prisma db push", cwd=core_iam_dir)
        seed_cmd = f"bun run prisma/seed.ts --profile {active_profile}"
        if not run_command(seed_cmd, cwd=core_iam_dir, env={"SEED_PROFILE": active_profile}):
            run_command(f"npx ts-node prisma/seed.ts --profile {active_profile}", cwd=core_iam_dir, env={"SEED_PROFILE": active_profile})
            
        # Step 3: Seed billing-service
        print("\n--- Step 3: Seeding billing-service ---")
        billing_dir = os.path.join(repo_root, "services", "billing-service")
        if not run_command("bunx prisma db push --accept-data-loss", cwd=billing_dir):
            run_command("npx prisma db push --accept-data-loss", cwd=billing_dir)
        seed_cmd = f"bun run prisma/seed.ts --profile {active_profile}"
        if not run_command(seed_cmd, cwd=billing_dir, env={"SEED_PROFILE": active_profile}):
            run_command(f"npx ts-node prisma/seed.ts --profile {active_profile}", cwd=billing_dir, env={"SEED_PROFILE": active_profile})
            
        # Step 4: Seed inventory-service
        print("\n--- Step 4: Seeding inventory-service ---")
        inv_dir = os.path.join(repo_root, "services", "inventory-service")
        inv_py = get_py_path("inventory-service")
        inv_alembic = get_alembic_path("inventory-service")
        run_command(f"{inv_alembic} upgrade head", cwd=inv_dir)
        run_command(f"{inv_py} scripts/seed.py --profile {active_profile}", cwd=inv_dir, env={"SEED_PROFILE": active_profile})
        
        # Step 5: Seed crm-service
        print("\n--- Step 5: Seeding crm-service ---")
        crm_dir = os.path.join(repo_root, "services", "crm-service")
        crm_py = get_py_path("crm-service")
        crm_alembic = get_alembic_path("crm-service")
        run_command(f"{crm_alembic} upgrade head", cwd=crm_dir)
        run_command(f"{crm_py} scripts/seed.py --profile {active_profile}", cwd=crm_dir, env={"SEED_PROFILE": active_profile})
        
        # Step 6: Migrate & Seed erp-service (gateway database & settings)
        print("\n--- Step 6: Migrating & Seeding erp-service gateway ---")
        erp_dir = os.path.join(repo_root, "services", "erp-service")
        erp_py = get_py_path("erp-service")
        erp_alembic = get_alembic_path("erp-service")
        run_command(f"{erp_alembic} upgrade head", cwd=erp_dir)
        run_command(f"{erp_py} scripts/seed.py --profile {active_profile}", cwd=erp_dir, env={"SEED_PROFILE": active_profile})

        # Step 7: Migrate & Seed ai-service
        print("\n--- Step 7: Migrating & Seeding ai-service ---")
        ai_dir = os.path.join(repo_root, "services", "ai-service")
        ai_py = get_py_path("ai-service")
        ai_alembic = get_alembic_path("ai-service")
        run_command(f"{ai_alembic} upgrade head", cwd=ai_dir)
        run_command(f"{ai_py} scripts/seed.py --profile {active_profile}", cwd=ai_dir, env={"SEED_PROFILE": active_profile})
        
        print(f"\n=== Local Host Seeding Completed Successfully! [Profile: {active_profile}] ===")

if __name__ == "__main__":
    asyncio.run(main())
