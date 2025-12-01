#!/bin/bash
# Convenience script to start services in development mode with hot reload
# Usage: ./scripts/dev.sh [service_name] [additional_flags]
# Examples:
#   ./scripts/dev.sh                  # Start all services in dev mode
#   ./scripts/dev.sh frontend         # Start only frontend in dev mode
#   ./scripts/dev.sh -d               # Start in detached mode

set -e

cd "$(dirname "$0")/.."

echo "🚀 Starting services in DEVELOPMENT mode..."
echo "   - Hot reload: ENABLED"
echo "   - Volumes: MOUNTED"
echo ""

docker compose -f docker-compose.yml -f docker-compose.dev.yml up "$@"
