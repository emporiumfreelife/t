-- ============================================================================
-- FIX: Correct the category CHECK constraint on groups table
-- ============================================================================

-- STEP 1: Check what the current constraint is
SELECT 
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
WHERE con.conrelid = 'public.groups'::regclass
  AND con.contype = 'c';  -- 'c' = CHECK constraint

-- ============================================================================
-- STEP 2: Drop the old constraint if it exists
-- ============================================================================

ALTER TABLE public.groups 
DROP CONSTRAINT IF EXISTS groups_category_check;

-- ============================================================================
-- STEP 3: Create the CORRECT constraint that matches the form options
-- ============================================================================
-- The form sends: 'creative', 'professional', 'hobby', 'learning', 'business', 'community'

ALTER TABLE public.groups
ADD CONSTRAINT groups_category_check 
CHECK (category IN ('creative', 'professional', 'hobby', 'learning', 'business', 'community'));

-- ============================================================================
-- STEP 4: Verify the constraint was created correctly
-- ============================================================================

SELECT 
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
WHERE con.conrelid = 'public.groups'::regclass
  AND con.contype = 'c'
ORDER BY con.conname;

-- ============================================================================
-- STEP 5: Verify visibility constraint too
-- ============================================================================

SELECT 
  con.conname,
  pg_get_constraintdef(con.oid)
FROM pg_constraint con
WHERE con.conrelid = 'public.groups'::regclass
  AND con.contype = 'c'
ORDER BY con.conname;
