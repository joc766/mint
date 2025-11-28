-- Migration: Remove unique index on default budgets that may be causing issues
-- Date: 2025-11-26
-- Description: Removes the partial unique index and relies on API-level validation instead

BEGIN;

-- Drop the partial unique index for default budgets
DROP INDEX IF EXISTS uq_user_default_budget;

-- Note: The check constraint chk_default_budget_null_dates remains in place
-- to ensure data integrity (default budgets must have NULL month/year)
-- API endpoints will enforce the "one default per user" rule

COMMIT;
