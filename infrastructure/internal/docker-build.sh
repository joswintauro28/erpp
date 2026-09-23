#!/bin/bash
# DATAVEX ERP — Production/Internal Docker Build & Start Helper (Bash)
# Usage: ./docker-build.sh [up|build|down|restart|rebuild|logs|ps|prune] [service_name] [--mode single-domain|prod]

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$DIR/docker-compose.yml"
ENV_FILE="$DIR/.env.docker"

if [ ! -f "$ENV_FILE" ]; then
    echo "Warning: .env.docker not found at $ENV_FILE"
    echo "Copying .env.docker.example to .env.docker..."
    cp "$DIR/.env.docker.example" "$ENV_FILE"
fi

COMMAND="${1:-up}"
SERVICE=""
MODE="subdomain"
EXTRA_ARGS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --mode=*)
            MODE="${1#*=}"
            shift
            ;;
        --mode)
            MODE="$2"
            shift 2
            ;;
        up|build|down|restart|rebuild|logs|ps|prune)
            COMMAND="$1"
            shift
            ;;
        *)
            if [ -z "$SERVICE" ]; then
                SERVICE="$1"
            else
                EXTRA_ARGS+=("$1")
            fi
            shift
            ;;
    esac
done

# Base compose args
BASE_ARGS=("-f" "$COMPOSE_FILE" "--env-file" "$ENV_FILE")

# Append single-domain / prod override
if [ "$MODE" = "single-domain" ] || [ "$MODE" = "prod" ]; then
    OVERRIDE_FILE="$DIR/docker-compose.prod.yaml"
    if [ ! -f "$OVERRIDE_FILE" ]; then
        echo "Error: docker-compose.prod.yaml not found at $OVERRIDE_FILE" >&2
        exit 1
    fi
    BASE_ARGS+=("-f" "$OVERRIDE_FILE")
    echo "  [MODE] single-domain (path-based routing)"
else
    echo "  [MODE] subdomain (*.erp.datavex.com)"
fi

case "$COMMAND" in
    build)
        docker compose "${BASE_ARGS[@]}" build $SERVICE "${EXTRA_ARGS[@]}"
        ;;
    up)
        docker compose "${BASE_ARGS[@]}" up -d $SERVICE "${EXTRA_ARGS[@]}"
        ;;
    down)
        docker compose "${BASE_ARGS[@]}" down "${EXTRA_ARGS[@]}"
        ;;
    restart)
        docker compose "${BASE_ARGS[@]}" restart $SERVICE "${EXTRA_ARGS[@]}"
        ;;
    rebuild)
        docker compose "${BASE_ARGS[@]}" build $SERVICE "${EXTRA_ARGS[@]}" && \
        docker compose "${BASE_ARGS[@]}" up -d $SERVICE "${EXTRA_ARGS[@]}"
        ;;
    logs)
        docker compose "${BASE_ARGS[@]}" logs -f $SERVICE "${EXTRA_ARGS[@]}"
        ;;
    ps)
        docker compose "${BASE_ARGS[@]}" ps "${EXTRA_ARGS[@]}"
        ;;
    prune)
        docker builder prune -f
        docker image prune -f
        docker volume prune -f
        ;;
    *)
        echo "Usage: $0 {up|build|down|restart|rebuild|logs|ps|prune} [service_name] [--mode single-domain|prod]"
        exit 1
        ;;
esac
