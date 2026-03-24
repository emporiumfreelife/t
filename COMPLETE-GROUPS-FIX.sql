-- ============================================================================
-- COMPLETE FIX FOR GROUP CREATION FAILURE
-- This script fixes all RLS policies and verifies the database schema
-- ============================================================================

-- STEP 1: VERIFY THE GROUPS TABLE SCHEMA
-- Run this first to see what we're working with
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'groups' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: CHECK CURRENT RLS STATUS
-- ============================================================================

-- Check if RLS is enabled on groups
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'groups';

-- Check all current policies on groups
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  qual as using_condition,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'groups'
ORDER BY policyname;

-- ============================================================================
-- STEP 3: COMPLETELY RESET ALL BROKEN POLICIES
-- Drop ALL existing policies and recreate them correctly
-- ============================================================================

-- Drop all existing policies on groups (to start fresh)
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.groups;
DROP POLICY IF EXISTS "Unauthenticated users can view public groups" ON public.groups;
DROP POLICY IF EXISTS "Public groups visible to all" ON public.groups;
DROP POLICY IF EXISTS "Members view their groups" ON public.groups;
DROP POLICY IF EXISTS "Creator views own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create their own groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Creator updates own group" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.groups;
DROP POLICY IF EXISTS "Creator deletes own group" ON public.groups;

-- Ensure RLS is enabled
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE CORRECT RLS POLICIES FOR GROUPS
-- ============================================================================

-- POLICY 1: Everyone (authenticated + anon) can view public groups
CREATE POLICY "Public can view public groups"
  ON public.groups
  FOR SELECT
  USING (visibility = 'public');

-- POLICY 2: Authenticated users can view groups they created
CREATE POLICY "Authenticated users view own groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

-- POLICY 3: Authenticated users can view groups they are members of
CREATE POLICY "Authenticated users view member groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.status = 'active'
    )
  );

-- POLICY 4: CRITICAL - Authenticated users can CREATE groups
CREATE POLICY "Users can create groups"
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND
    name IS NOT NULL AND
    LENGTH(name) > 0 AND
    category IS NOT NULL AND
    visibility IS NOT NULL
  );

-- POLICY 5: Users can UPDATE only their own groups
CREATE POLICY "Users can update own groups"
  ON public.groups
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- POLICY 6: Users can DELETE only their own groups
CREATE POLICY "Users can delete own groups"
  ON public.groups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- ============================================================================
-- STEP 5: FIX GROUP_MEMBERS POLICIES
-- ============================================================================

-- Drop broken policies on group_members
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can insert their own group membership" ON public.group_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.group_members;
DROP POLICY IF EXISTS "Admins send invites" ON public.group_members;
DROP POLICY IF EXISTS "View group members if in group" ON public.group_members;
DROP POLICY IF EXISTS "Users leave or admins remove" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Authenticated users can view group members" ON public.group_members;

-- Ensure RLS is enabled
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Users can view group members
CREATE POLICY "Users can view group members"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (true);

-- POLICY 2: CRITICAL - Users can INSERT their own membership
CREATE POLICY "Users can add themselves as member"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    user_id IS NOT NULL AND
    group_id IS NOT NULL
  );

-- POLICY 3: Users can UPDATE their own membership
CREATE POLICY "Users can update their membership"
  ON public.group_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- POLICY 4: Users can DELETE their own membership
CREATE POLICY "Users can remove themselves"
  ON public.group_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: VERIFY ALL POLICIES ARE IN PLACE
-- ============================================================================

SELECT 
  'groups' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'groups'
UNION ALL
SELECT 
  'group_members' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'group_members';

-- Show all final policies
SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('groups', 'group_members')
ORDER BY tablename, policyname;
