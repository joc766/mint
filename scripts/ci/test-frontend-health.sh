#!/bin/bash
# Basic frontend health check script - tests root page only

set -e

FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
BUILD_MODE="${BUILD_MODE:-development}"

echo "Testing frontend at $FRONTEND_URL (mode: $BUILD_MODE)"

# Test frontend returns HTML
echo "Testing frontend HTML response..."
response=$(curl -s "$FRONTEND_URL/")
if [[ ! $response =~ "<!DOCTYPE html>" ]] && [[ ! $response =~ "<html" ]]; then
  echo "✗ Frontend does not return valid HTML"
  echo "Response preview: ${response:0:200}"
  exit 1
else
  echo "✓ Frontend returns valid HTML"
fi

# Test that frontend responds with correct status code
status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/")
if [ "$status" != "200" ]; then
  echo "✗ Frontend returned unexpected status: $status"
  exit 1
else
  echo "✓ Frontend returns status 200"
fi

# If production mode, verify NODE_ENV
if [ "$BUILD_MODE" == "production" ]; then
  echo "Verifying production build mode..."
  BUILD_CHECK=$(docker-compose exec -T frontend printenv NODE_ENV 2>/dev/null || echo "not_found")
  if [ "$BUILD_CHECK" != "production" ]; then
    echo "⚠ Warning: Frontend NODE_ENV is not set to production (found: $BUILD_CHECK)"
  else
    echo "✓ Frontend NODE_ENV correctly set to production"
  fi
fi

echo "Frontend health check passed!"
