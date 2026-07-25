#!/bin/bash
# DATAVEX ERP — One-time Docker Environment Setup
# Run with sudo to configure hosts and initialize the environment

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔══════════════════════════════════════════════╗"
echo "║   DATAVEX ERP — Docker Setup                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Step 1: Check Docker
echo "[1/4] Checking Docker..."
if command -v docker &> /dev/null; then
    docker_ver=$(docker --version)
    echo "  OK - $docker_ver"
else
    echo "Error: Docker is not installed or not in PATH." >&2
    exit 1
fi

# Step 2: Configure hosts file
echo "[2/4] Configuring hosts file..."
sudo "$DIR/setup-hosts.sh"

# Step 3: Verify environment file
echo "[3/4] Preparing environment..."
env_file="$DIR/.env.docker"
if [ -f "$env_file" ]; then
    echo "  OK - Environment file: $env_file"
else
    echo "Warning: Environment file not found at $env_file" >&2
fi

# Step 4: Verify project structure
echo "[4/4] Verifying Dockerfiles..."
dockerfiles=(
    "../../apps/erp-shell/Dockerfile"
    "../../apps/crm-ui/Dockerfile"
    "../../apps/billing-ui/Dockerfile"
    "../../apps/inventory-ui/Dockerfile"
    "../../services/core-iam/Dockerfile"
    "../../services/billing-service/Dockerfile"
    "../../services/erp-service/Dockerfile"
    "../../services/crm-service/Dockerfile"
    "../../services/inventory-service/Dockerfile"
)

all_ok=true
for df in "${dockerfiles[@]}"; do
    full_path="$DIR/$df"
    if [ -f "$full_path" ]; then
        echo "  OK - $df"
    else
        echo "  MISSING - $df" >&2
        all_ok=false
    fi
done

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Setup Complete!                            ║"
echo "║                                              ║"
echo "║   Start with:                                ║"
echo "║     ./docker-build.sh up                     ║"
echo "║                                              ║"
echo "║   Or manually:                               ║"
echo "║     docker compose -f ./docker-compose.yml   ║"
echo "║       --env-file .env.docker up -d           ║"
echo "╚══════════════════════════════════════════════╝"
