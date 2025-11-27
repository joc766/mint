-- Migration: Add default budget support to budget_templates table
-- Date: 2025-11-26
-- Description: Adds is_default column and modifies constraints to support both default and monthly budgets

BEGIN;

-- Step 1: Add is_default column (default False to maintain backward compatibility)
ALTER TABLE budget_templates
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Alter month and year columns to allow NULL values (for default budgets)
ALTER TABLE budget_templates
ALTER COLUMN month DROP NOT NULL;

ALTER TABLE budget_templates
ALTER COLUMN year DROP NOT NULL;

-- Step 3: Set all existing budgets to is_default=FALSE (they are monthly budgets)
UPDATE budget_templates
SET is_default = FALSE
WHERE is_default IS NULL;

-- Step 4: Drop the old unique constraint (if it exists)
-- Note: The constraint name should match what's in the models
ALTER TABLE budget_templates
DROP CONSTRAINT IF EXISTS uq_user_monthly_budget;

-- Step 5: Recreate the monthly budget unique constraint
-- This allows NULL values for month/year (which will be used for default budgets)
ALTER TABLE budget_templates
ADD CONSTRAINT uq_user_monthly_budget 
UNIQUE (user_id, year, month);

-- Step 6: Add unique constraint for default budget per user
-- Note: PostgreSQL unique constraints automatically allow multiple NULLs,
-- but we need a partial unique index to enforce "only one default per user"
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_default_budget 
ON budget_templates (user_id, is_default) 
WHERE is_default = TRUE;

-- Step 7: Add a check constraint to ensure default budgets have NULL month/year
ALTER TABLE budget_templates
ADD CONSTRAINT chk_default_budget_null_dates
CHECK (
    (is_default = TRUE AND month IS NULL AND year IS NULL) OR
    (is_default = FALSE AND month IS NOT NULL AND year IS NOT NULL)
);

-- Step 8: Add comment to the table for documentation
COMMENT ON TABLE budget_templates IS 'User budget templates - can be default (is_default=TRUE, month=NULL, year=NULL) or monthly (is_default=FALSE, month/year set)';

COMMIT;
