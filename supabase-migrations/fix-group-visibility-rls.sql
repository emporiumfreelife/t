-- Drop all existing policies
DROP POLICY IF EXISTS "View public groups" ON public.groups;
DROP POLICY IF EXISTS "View private groups" ON public.groups;
DROP POLICY IF EXISTS "View own invite-only groups" ON public.groups;
DROP POLICY IF EXISTS "View member invite-only groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Users can update own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can delete own groups" ON public.groups;
DROP POLICY IF EXISTS "Public can view public groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users view own groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users view member groups" ON public.groups;
DROP POLICY IF EXISTS "Public groups visible to all" ON public.groups;
DROP POLICY IF EXISTS "Members view their groups" ON public.groups;
DROP POLICY IF EXISTS "Creator views own groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.groups;
DROP POLICY IF EXISTS "Unauthenticated users can view public groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.groups;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Everyone can view PUBLIC groups
CREATE POLICY "View public groups"
  ON public.groups
  FOR SELECT
  USING (visibility = 'public');

-- Authenticated users can view PRIVATE groups
CREATE POLICY "View private groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (visibility = 'private');

-- Authenticated users can view INVITE_ONLY groups they created
CREATE POLICY "View own invite-only groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (visibility = 'invite_only' AND creator_id = auth.uid());

-- Authenticated users can view INVITE_ONLY groups they are members of
CREATE POLICY "View member invite-only groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'invite_only' AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.status = 'active'
    )
  );

-- Authenticated users can CREATE groups
CREATE POLICY "Users can create groups"
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid() AND
    name IS NOT NULL AND
    LENGTH(name) > 0 AND
    category IS NOT NULL AND
    visibility IS NOT NULL
  );

-- Users can UPDATE only their own groups
CREATE POLICY "Users can update own groups"
  ON public.groups
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Users can DELETE only their own groups
CREATE POLICY "Users can delete own groups"
  ON public.groups
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());
