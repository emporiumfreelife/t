-- Check the actual constraint on the groups table
SELECT 
  constraint_name,
  constraint_type,
  table_name,
  column_name
FROM information_schema.constraint_column_usage
WHERE table_name = 'groups' 
  AND table_schema = 'public'
ORDER BY constraint_name;

-- Get the CHECK constraint definition
SELECT 
  tablename,
  constraintname,
  consrc  -- This shows the actual constraint definition
FROM pg_constraint 
JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE relname = 'groups' 
  AND nspname = 'public'
  AND contype = 'c';  -- 'c' = CHECK constraint

-- Alternative way to see constraints
SELECT 
  con.*
FROM pg_constraint con
WHERE conrelid::regclass::text = 'public.groups'
  AND contype = 'c';
