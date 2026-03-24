-- ============================================================================
-- FIX CRITICAL RLS POLICY LOGIC ERRORS
-- Corrects: WITH CHECK conditions, self-reference bugs
-- ============================================================================

-- ============================================================================
-- 1. FIX MESSAGES - "Users can send messages to connected users"
-- ============================================================================
DROP POLICY IF EXISTS "Users can send messages to connected users" ON public.messages;
CREATE POLICY "Users can send messages to connected users"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.member_connections
      WHERE (member_id = auth.uid() AND connected_user_id = recipient_id)
        OR (member_id = recipient_id AND connected_user_id = auth.uid())
    )
  );

-- ============================================================================
-- 2. FIX MEMBER_CONNECTIONS - "Users can insert their own connections"
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert their own connections" ON public.member_connections;
CREATE POLICY "Users can insert their own connections"
  ON public.member_connections
  FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- ============================================================================
-- 3. FIX CONNECTION_REQUESTS - "Users can send connection requests"
-- ============================================================================
DROP POLICY IF EXISTS "Users can send connection requests" ON public.connection_requests;
CREATE POLICY "Users can send connection requests"
  ON public.connection_requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ============================================================================
-- 4. FIX GROUPS - "Users can create their own groups"
-- ============================================================================
DROP POLICY IF EXISTS "Users can create their own groups" ON public.groups;
CREATE POLICY "Users can create their own groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- ============================================================================
-- 5. FIX GROUP_MEMBERS - "Users can join groups"
-- ============================================================================
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Users can join groups"
  ON public.group_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id AND visibility != 'invite_only'
    )
  );

-- ============================================================================
-- 6. FIX GROUP_MEMBERS - "Group admins can manage members"
-- Self-reference bug: group_members_1.group_id = group_members_1.group_id
-- ============================================================================
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
CREATE POLICY "Group admins can manage members"
  ON public.group_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- 7. FIX GROUP_MEMBERS - "Authenticated users can view group members"
-- Self-reference bug: gm.group_id = gm.group_id
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view group members" ON public.group_members;
CREATE POLICY "Authenticated users can view group members"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_members.group_id AND visibility = 'public'
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. FIX TEAMS - "Users can create their own teams"
-- ============================================================================
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
CREATE POLICY "Users can create their own teams"
  ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- ============================================================================
-- 9. FIX TEAM_MEMBERS - "Users can join teams"
-- ============================================================================
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
CREATE POLICY "Users can join teams"
  ON public.team_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND visibility != 'invite_only'
    )
  );

-- ============================================================================
-- 10. FIX TEAM_MEMBERS - "Team leads can manage members"
-- Self-reference bug: team_members_1.team_id = team_members_1.team_id
-- ============================================================================
DROP POLICY IF EXISTS "Team leads can manage members" ON public.team_members;
CREATE POLICY "Team leads can manage members"
  ON public.team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id 
        AND tm.user_id = auth.uid()
        AND tm.role IN ('lead', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id 
        AND tm.user_id = auth.uid()
        AND tm.role IN ('lead', 'admin')
    )
  );

-- ============================================================================
-- 11. FIX TEAM_MEMBERS - "Authenticated users can view team members"
-- Self-reference bug: tm.team_id = tm.team_id
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.team_members;
CREATE POLICY "Authenticated users can view team members"
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_members.team_id AND visibility = 'public'
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION: Confirm all fixes are in place
-- ============================================================================

SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual IS NULL THEN 'No condition'
    ELSE SUBSTRING(qual, 1, 100) || '...' 
  END as policy_snippet,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'member_connections', 'messages', 'message_threads',
    'groups', 'group_members', 'teams', 'team_members',
    'connection_requests', 'connection_stats', 
    'user_interests', 'connection_recommendations'
  )
  AND policyname IN (
    'Users can send messages to connected users',
    'Users can insert their own connections',
    'Users can send connection requests',
    'Users can create their own groups',
    'Users can join groups',
    'Group admins can manage members',
    'Authenticated users can view group members',
    'Users can create their own teams',
    'Users can join teams',
    'Team leads can manage members',
    'Authenticated users can view team members'
  )
ORDER BY tablename, policyname;
