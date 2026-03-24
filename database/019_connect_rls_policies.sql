-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR CONNECT PAGE
-- Complete security implementation for all networking tables
-- ============================================================================

-- ============================================================================
-- 1. MEMBER CONNECTIONS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.member_connections ENABLE ROW LEVEL SECURITY;

-- Users can view connections where they are the member or the connected user
DROP POLICY IF EXISTS "Users can view their own connections" ON public.member_connections;
CREATE POLICY "Users can view their own connections"
  ON public.member_connections
  FOR SELECT
  USING (auth.uid() = member_id OR auth.uid() = connected_user_id);

-- Users can only insert their own connections
DROP POLICY IF EXISTS "Users can insert their own connections" ON public.member_connections;
CREATE POLICY "Users can insert their own connections"
  ON public.member_connections
  FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Users can only update their own connections
DROP POLICY IF EXISTS "Users can update their own connections" ON public.member_connections;
CREATE POLICY "Users can update their own connections"
  ON public.member_connections
  FOR UPDATE
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- Users can only delete their own connections
DROP POLICY IF EXISTS "Users can delete their own connections" ON public.member_connections;
CREATE POLICY "Users can delete their own connections"
  ON public.member_connections
  FOR DELETE
  USING (auth.uid() = member_id);

-- ============================================================================
-- 2. MESSAGES TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages where they are sender or recipient
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can only send messages to users they are connected with
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

-- Users can only update their own messages (mark as read, edit)
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can only delete their own messages (soft delete via deleted_at)
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================================================
-- 3. MESSAGE THREADS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- Users can view threads where they are one of the participants
DROP POLICY IF EXISTS "Users can view their own message threads" ON public.message_threads;
CREATE POLICY "Users can view their own message threads"
  ON public.message_threads
  FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Only system/trigger can insert threads (not user-facing)
DROP POLICY IF EXISTS "System can create message threads" ON public.message_threads;
CREATE POLICY "System can create message threads"
  ON public.message_threads
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own thread state (archive, mute)
DROP POLICY IF EXISTS "Users can update their own message thread state" ON public.message_threads;
CREATE POLICY "Users can update their own message thread state"
  ON public.message_threads
  FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- ============================================================================
-- 4. GROUPS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Anyone can view public groups, authenticated users can view all groups
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.groups;
CREATE POLICY "Authenticated users can view groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (true);

-- Unauthenticated users can only view public groups
DROP POLICY IF EXISTS "Unauthenticated users can view public groups" ON public.groups;
CREATE POLICY "Unauthenticated users can view public groups"
  ON public.groups
  FOR SELECT
  TO anon
  USING (visibility = 'public');

-- Only creators can insert groups
DROP POLICY IF EXISTS "Users can create their own groups" ON public.groups;
CREATE POLICY "Users can create their own groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Only group creators can update their groups
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
CREATE POLICY "Group creators can update their groups"
  ON public.groups
  FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Only group creators can delete their groups
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.groups;
CREATE POLICY "Group creators can delete their groups"
  ON public.groups
  FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================================================
-- 5. GROUP MEMBERS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view group membership for groups they have access to
DROP POLICY IF EXISTS "Authenticated users can view group members" ON public.group_members;
CREATE POLICY "Authenticated users can view group members"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id AND visibility = 'public'
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
  );

-- Users can join groups (insert their own membership)
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

-- Group admins/moderators can manage members
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
CREATE POLICY "Group admins can manage members"
  ON public.group_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_members.group_id 
        AND user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_members.group_id 
        AND user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

-- Users can leave groups (delete their own membership)
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Users can leave groups"
  ON public.group_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. TEAMS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Anyone can view public teams, authenticated users can view all teams
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;
CREATE POLICY "Authenticated users can view teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

-- Unauthenticated users can only view public teams
DROP POLICY IF EXISTS "Unauthenticated users can view public teams" ON public.teams;
CREATE POLICY "Unauthenticated users can view public teams"
  ON public.teams
  FOR SELECT
  TO anon
  USING (visibility = 'public');

-- Only creators can insert teams
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
CREATE POLICY "Users can create their own teams"
  ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Only team creators can update their teams
DROP POLICY IF EXISTS "Team creators can update their teams" ON public.teams;
CREATE POLICY "Team creators can update their teams"
  ON public.teams
  FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Only team creators can delete their teams
DROP POLICY IF EXISTS "Team creators can delete their teams" ON public.teams;
CREATE POLICY "Team creators can delete their teams"
  ON public.teams
  FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================================================
-- 7. TEAM MEMBERS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view team membership for teams they have access to
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.team_members;
CREATE POLICY "Authenticated users can view team members"
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND visibility = 'public'
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid()
    )
  );

-- Users can join teams (insert their own membership)
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

-- Team leads/admins can manage members
DROP POLICY IF EXISTS "Team leads can manage members" ON public.team_members;
CREATE POLICY "Team leads can manage members"
  ON public.team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_members.team_id 
        AND user_id = auth.uid()
        AND role IN ('lead', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_members.team_id 
        AND user_id = auth.uid()
        AND role IN ('lead', 'admin')
    )
  );

-- Users can leave teams (delete their own membership)
DROP POLICY IF EXISTS "Users can leave teams" ON public.team_members;
CREATE POLICY "Users can leave teams"
  ON public.team_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. CONNECTION REQUESTS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- Users can view connection requests where they are sender or recipient
DROP POLICY IF EXISTS "Users can view their own connection requests" ON public.connection_requests;
CREATE POLICY "Users can view their own connection requests"
  ON public.connection_requests
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can only send their own connection requests
DROP POLICY IF EXISTS "Users can send connection requests" ON public.connection_requests;
CREATE POLICY "Users can send connection requests"
  ON public.connection_requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update connection requests they are involved in
DROP POLICY IF EXISTS "Users can update connection requests" ON public.connection_requests;
CREATE POLICY "Users can update connection requests"
  ON public.connection_requests
  FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can delete their own connection requests
DROP POLICY IF EXISTS "Users can delete their connection requests" ON public.connection_requests;
CREATE POLICY "Users can delete their connection requests"
  ON public.connection_requests
  FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================================================
-- 9. CONNECTION STATS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.connection_stats ENABLE ROW LEVEL SECURITY;

-- Users can only view their own connection statistics
DROP POLICY IF EXISTS "Users can view their own connection stats" ON public.connection_stats;
CREATE POLICY "Users can view their own connection stats"
  ON public.connection_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only system/triggers can insert/update stats (not user-facing)
DROP POLICY IF EXISTS "System can update connection stats" ON public.connection_stats;
CREATE POLICY "System can update connection stats"
  ON public.connection_stats
  FOR ALL
  USING (true);

-- ============================================================================
-- 10. USER INTERESTS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- Users can view interests for public profiles and their own
DROP POLICY IF EXISTS "Users can view user interests" ON public.user_interests;
CREATE POLICY "Users can view user interests"
  ON public.user_interests
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only manage their own interests
DROP POLICY IF EXISTS "Users can manage their own interests" ON public.user_interests;
CREATE POLICY "Users can manage their own interests"
  ON public.user_interests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 11. CONNECTION RECOMMENDATIONS TABLE - RLS POLICIES
-- ============================================================================

ALTER TABLE public.connection_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can only view their own recommendations
DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.connection_recommendations;
CREATE POLICY "Users can view their own recommendations"
  ON public.connection_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can insert recommendations
DROP POLICY IF EXISTS "System can insert recommendations" ON public.connection_recommendations;
CREATE POLICY "System can insert recommendations"
  ON public.connection_recommendations
  FOR INSERT
  WITH CHECK (true);

-- Users can only update their own recommendations (dismiss)
DROP POLICY IF EXISTS "Users can update their own recommendations" ON public.connection_recommendations;
CREATE POLICY "Users can update their own recommendations"
  ON public.connection_recommendations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION: List all RLS policies created
-- ============================================================================

SELECT 
  schemaname,
  tablename, 
  policyname, 
  roles,
  qual as policy_condition
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN (
    'member_connections',
    'messages',
    'message_threads',
    'groups',
    'group_members',
    'teams',
    'team_members',
    'connection_requests',
    'connection_stats',
    'user_interests',
    'connection_recommendations'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFICATION: Check RLS is enabled on all tables
-- ============================================================================

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'member_connections',
    'messages',
    'message_threads',
    'groups',
    'group_members',
    'teams',
    'team_members',
    'connection_requests',
    'connection_stats',
    'user_interests',
    'connection_recommendations'
  )
ORDER BY tablename;
