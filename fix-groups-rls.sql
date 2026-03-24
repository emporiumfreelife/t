-- ============================================================================
-- FIX: Correct the RLS policies for groups table to allow group creation
-- ============================================================================
-- The issue: The existing INSERT policy uses auth.role() which is not a valid
-- Supabase function. This causes group creation to fail.
-- The solution: Use the proper TO authenticated syntax and remove invalid checks.
-- ============================================================================

-- 1. Drop the broken INSERT policy
DROP POLICY IF EXISTS "Authenticated users create groups" ON public.groups;

-- 2. Create the correct INSERT policy
-- Authenticated users can create groups, setting themselves as creator
CREATE POLICY "Authenticated users can create groups"
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
  );

-- ============================================================================
-- ENSURE: group_members INSERT policy allows adding members (especially creator)
-- ============================================================================

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Admins send invites" ON public.group_members;

-- Create the correct INSERT policy - anyone can join public groups
-- The creator will be added by the app as an admin immediately after group creation
CREATE POLICY "Users can insert their own group membership"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- ============================================================================
-- VERIFY: Check the policies are correct
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NULL THEN 'N/A'
    ELSE SUBSTRING(with_check::text, 1, 100)
  END as with_check_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('groups', 'group_members')
  AND policyname IN ('Authenticated users can create groups', 'Users can insert their own group membership')
ORDER BY tablename, policyname;
