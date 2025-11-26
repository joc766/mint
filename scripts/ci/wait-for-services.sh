#!/bin/bash
# Script to wait for all services to be healthy

set -e

echo "Waiting for database..."
SECONDS=0
MAX_WAIT=120
until docker-compose exec -T db pg_isready -U plaid_user -d plaid_db >/dev/null 2>&1; do
  if [ $SECONDS -gt $MAX_WAIT ]; then
    echo "Database failed to start within ${MAX_WAIT}s"
    echo "Debug: Last pg_isready attempt:"
    docker-compose exec -T db pg_isready -U plaid_user -d plaid_db || true
    exit 1
  fi
  sleep 2
done
echo "✓ Database is ready"

echo "Waiting for API..."
SECONDS=0
MAX_WAIT=120
until curl -f http://localhost:8000/ >/dev/null 2>&1; do
  if [ $SECONDS -gt $MAX_WAIT ]; then
    echo "API failed to start within ${MAX_WAIT}s"
    exit 1
  fi
  sleep 2
done
echo "✓ API is ready"

echo "Waiting for frontend..."
SECONDS=0
MAX_WAIT=180
until curl -f http://localhost:3000/ >/dev/null 2>&1; do
  if [ $SECONDS -gt $MAX_WAIT ]; then
    echo "Frontend failed to start within ${MAX_WAIT}s"
    exit 1
  fi
  sleep 3
done
echo "✓ Frontend is ready"

echo "All services are healthy!"
