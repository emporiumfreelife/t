-- ============================================================================
-- FIX: GROUP INVITES VISIBILITY
-- Issue: Invited users cannot see invite-only groups because RLS policy
--        blocks access to groups they haven't joined yet
-- Solution: Add RLS policy allowing viewing groups if user has pending invite
-- ============================================================================

-- Step 1: Add new RLS policy to groups table
-- Allow users to view groups they have been invited to (pending invites)
DROP POLICY IF EXISTS "View groups with pending invite" ON public.groups;

CREATE POLICY "View groups with pending invite"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    visibility != 'invite_only' OR
    (visibility = 'invite_only' AND creator_id = auth.uid()) OR
    (visibility = 'invite_only' AND 
      EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_members.group_id = groups.id
          AND group_members.user_id = auth.uid()
          AND group_members.status = 'active'
      )
    ) OR
    (visibility = 'invite_only' AND
      EXISTS (
        SELECT 1 FROM public.group_invites
        WHERE group_invites.group_id = groups.id
          AND group_invites.invited_user_id = auth.uid()
          AND group_invites.status IN ('pending', 'accepted')
      )
    )
  );

-- Step 2: Ensure RLS is enabled on group_invites
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Step 3: Verify correct RLS policies exist on group_invites
-- Users can view invites sent to them
DROP POLICY IF EXISTS "Users view their invites" ON public.group_invites;

CREATE POLICY "Users view their invites"
  ON public.group_invites
  FOR SELECT
  TO authenticated
  USING (invited_user_id = auth.uid() OR invited_by_user_id = auth.uid());

-- Step 4: Allow admins to send invites
DROP POLICY IF EXISTS "Group admins send invites" ON public.group_invites;

CREATE POLICY "Group admins send invites"
  ON public.group_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_invites.group_id
        AND group_members.user_id = auth.uid()
        AND group_members.role IN ('admin', 'moderator')
    )
  );

-- Step 5: Allow invited users to respond to invites (update status)
DROP POLICY IF EXISTS "Invited users respond to invites" ON public.group_invites;

CREATE POLICY "Invited users respond to invites"
  ON public.group_invites
  FOR UPDATE
  TO authenticated
  USING (invited_user_id = auth.uid())
  WITH CHECK (invited_user_id = auth.uid());

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all RLS policies on groups table
-- SELECT tablename, policyname, cmd, roles FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'groups' 
-- ORDER BY policyname;

-- List all RLS policies on group_invites table
-- SELECT tablename, policyname, cmd, roles FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'group_invites' 
-- ORDER BY policyname;

-- Test: Check that RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('groups', 'group_invites');
