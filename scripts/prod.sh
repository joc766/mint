#!/bin/bash
# Convenience script to start services in production mode
# Usage: ./scripts/prod.sh [flags] [service_name]
# Examples:
#   ./scripts/prod.sh                 # Start all services in production (foreground)
#   ./scripts/prod.sh frontend        # Start only frontend in production
#   ./scripts/prod.sh -d              # Start in detached mode (recommended for prod)
#   ./scripts/prod.sh --no-detach     # Start in foreground (for testing)

set -e

cd "$(dirname "$0")/.."

# Check if --no-detach flag is provided
DETACHED="-d"
RESTART_POLICY="unless-stopped"

for arg in "$@"; do
    if [ "$arg" = "--no-detach" ]; then
        DETACHED=""
        RESTART_POLICY="no"
        # Remove --no-detach from arguments
        shift
        break
    fi
done

echo "🏭 Starting services in PRODUCTION mode..."
echo "   - Build: OPTIMIZED"
echo "   - Mode: ${DETACHED:+DETACHED}${DETACHED:-FOREGROUND}"
echo "   - Restart: $RESTART_POLICY"
echo ""

BUILD_MODE=production RESTART_POLICY=$RESTART_POLICY docker-compose up $DETACHED --build "$@"

if [ -n "$DETACHED" ]; then
    echo ""
    echo "✅ Services started in detached mode"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop services: docker-compose down"
fi
