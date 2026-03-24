-- ============================================================================
-- COMPLETE GROUP INVITES FIX
-- Creates table + fixes all RLS policies in one go
-- ============================================================================

-- STEP 1: Create group_invites table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.group_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, invited_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON public.group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_invited_user_id ON public.group_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON public.group_invites(status);

-- STEP 2: Fix groups table RLS - allow viewing invite-only groups when user has pending invite
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Drop all old conflicting policies on groups
DROP POLICY IF EXISTS "Public groups visible to all" ON public.groups;
DROP POLICY IF EXISTS "Members view their groups" ON public.groups;
DROP POLICY IF EXISTS "Creator views own groups" ON public.groups;
DROP POLICY IF EXISTS "Creator updates own group" ON public.groups;
DROP POLICY IF EXISTS "Creator deletes own group" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users create groups" ON public.groups;
DROP POLICY IF EXISTS "Public can view public groups" ON public.groups;
DROP POLICY IF EXISTS "View private groups" ON public.groups;
DROP POLICY IF EXISTS "View own invite-only groups" ON public.groups;
DROP POLICY IF EXISTS "View member invite-only groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Users can update own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can delete own groups" ON public.groups;
DROP POLICY IF EXISTS "View groups with pending invite" ON public.groups;

-- Create SINGLE comprehensive SELECT policy for groups
CREATE POLICY "View groups based on visibility and membership"
  ON public.groups
  FOR SELECT
  USING (
    -- Always allow viewing public groups
    visibility = 'public'
    OR
    -- Allow authenticated users to view private groups
    (visibility = 'private')
    OR
    -- Allow viewing invite_only groups if: creator, member, OR has pending invite
    (visibility = 'invite_only' AND (
      creator_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_members.group_id = groups.id
          AND group_members.user_id = auth.uid()
          AND group_members.status = 'active'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.group_invites
        WHERE group_invites.group_id = groups.id
          AND group_invites.invited_user_id = auth.uid()
          AND group_invites.status IN ('pending', 'accepted')
      )
    ))
  );

-- Allow authenticated users to create groups
CREATE POLICY "Users can create groups"
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Allow creators to update their groups
CREATE POLICY "Creators update own groups"
  ON public.groups
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Allow creators to delete their groups
CREATE POLICY "Creators delete own groups"
  ON public.groups
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- STEP 3: Fix group_invites table RLS
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users view their invites" ON public.group_invites;
DROP POLICY IF EXISTS "Group admins send invites" ON public.group_invites;
DROP POLICY IF EXISTS "Invited users respond to invites" ON public.group_invites;
DROP POLICY IF EXISTS "Users can view their invites" ON public.group_invites;

-- Allow users to VIEW their invites (sent TO them OR sent BY them)
CREATE POLICY "Users can view their invites"
  ON public.group_invites
  FOR SELECT
  TO authenticated
  USING (invited_user_id = auth.uid() OR invited_by_user_id = auth.uid());

-- Allow group members/admins to SEND invites
CREATE POLICY "Group members can send invites"
  ON public.group_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_invites.group_id
        AND group_members.user_id = auth.uid()
        AND group_members.status = 'active'
    )
  );

-- Allow invited users to RESPOND to invites (update status)
CREATE POLICY "Invited users can respond to invites"
  ON public.group_invites
  FOR UPDATE
  TO authenticated
  USING (invited_user_id = auth.uid())
  WITH CHECK (invited_user_id = auth.uid());

-- STEP 4: Fix group_members table RLS if needed
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can add themselves as member" ON public.group_members;
DROP POLICY IF EXISTS "Users can update their membership" ON public.group_members;
DROP POLICY IF EXISTS "Users can remove themselves" ON public.group_members;
DROP POLICY IF EXISTS "View group members if in group" ON public.group_members;
DROP POLICY IF EXISTS "Users join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users leave or admins remove" ON public.group_members;

-- Allow viewing group members
CREATE POLICY "View group members"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to add themselves as members
CREATE POLICY "Users can join groups"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow updating own membership
CREATE POLICY "Update own membership"
  ON public.group_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow users to leave groups
CREATE POLICY "Users can leave groups"
  ON public.group_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
