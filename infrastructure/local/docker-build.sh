#!/bin/bash
# DATAVEX ERP — Docker Build & Start Helper
# Usage: ./docker-build.sh [build|up|down|rebuild|logs|ps|prune] [service_name]

# Resolve script directory path
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$DIR/docker-compose.yml"
ENV_FILE="$DIR/.env.docker"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: docker-compose.yml not found at $COMPOSE_FILE" >&2
    exit 1
fi

COMMAND="${1:-up}"
SERVICE="${2:-}"

# Base compose args
BASE_ARGS=("-f" "$COMPOSE_FILE" "--env-file" "$ENV_FILE")

case "$COMMAND" in
    build)
        docker compose "${BASE_ARGS[@]}" build $SERVICE
        ;;
    up)
        docker compose "${BASE_ARGS[@]}" up -d $SERVICE
        ;;
    down)
        docker compose "${BASE_ARGS[@]}" down --volumes --remove-orphans
        ;;
    rebuild)
        docker compose "${BASE_ARGS[@]}" build --no-cache $SERVICE
        docker compose "${BASE_ARGS[@]}" up -d $SERVICE
        ;;
    logs)
        docker compose "${BASE_ARGS[@]}" logs -f $SERVICE
        ;;
    ps)
        docker compose "${BASE_ARGS[@]}" ps
        ;;
    prune)
        docker compose "${BASE_ARGS[@]}" down --volumes --rmi all --remove-orphans
        ;;
    *)
        echo "Usage: $0 {build|up|down|rebuild|logs|ps|prune} [service_name]"
        exit 1
        ;;
esac
