#!/bin/sh
# Migration runner script for PostgreSQL
# Usage: run-migration <migration-file>
# Example: run-migration 001_add_default_budget_support.sql

set -e

if [ -z "$1" ]; then
    echo "Usage: run-migration <migration-file>"
    echo ""
    echo "Available migrations in /migrations/:"
    ls -1 /migrations/*.sql 2>/dev/null || echo "No migration files found"
    exit 1
fi

MIGRATION_FILE="$1"
MIGRATION_PATH="/migrations/${MIGRATION_FILE}"

# Check if file exists
if [ ! -f "$MIGRATION_PATH" ]; then
    # Try with .sql extension if not provided
    if [ ! -f "/migrations/${MIGRATION_FILE}.sql" ]; then
        echo "Error: Migration file not found: $MIGRATION_FILE"
        echo ""
        echo "Available migrations:"
        ls -1 /migrations/*.sql 2>/dev/null || echo "No migration files found"
        exit 1
    fi
    MIGRATION_PATH="/migrations/${MIGRATION_FILE}.sql"
fi

echo "========================================="
echo "Running migration: $(basename $MIGRATION_PATH)"
echo "========================================="
echo ""

# Run the migration
psql -U "${POSTGRES_USER:-plaid_user}" -d "${POSTGRES_DB:-plaid_db}" -f "$MIGRATION_PATH"

echo ""
echo "========================================="
echo "Migration completed successfully!"
echo "========================================="
