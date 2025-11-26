#!/bin/bash
# Basic API health check script - tests root endpoint only

set -e

API_URL="${API_URL:-http://localhost:8000}"

echo "Testing API root endpoint at $API_URL"

# Test root endpoint
response=$(curl -s "$API_URL/")
if [[ $response != *"Plaid Transaction Categorization API"* ]]; then
  echo "✗ API root endpoint test failed"
  echo "Response: $response"
  exit 1
else
  echo "✓ API root endpoint test passed"
fi

# Test that API responds with correct status code
status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/")
if [ "$status" != "200" ]; then
  echo "✗ API root endpoint returned unexpected status: $status"
  exit 1
else
  echo "✓ API root endpoint returns status 200"
fi

echo "API health check passed!"
