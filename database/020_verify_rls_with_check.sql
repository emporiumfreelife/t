-- ============================================================================
-- CORRECT VERIFICATION QUERY
-- Shows BOTH USING conditions (qual) AND WITH CHECK conditions (with_check)
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual IS NULL THEN 'N/A' 
    ELSE SUBSTRING(qual::text, 1, 80) 
  END as using_condition,
  CASE 
    WHEN with_check IS NULL THEN 'N/A' 
    ELSE SUBSTRING(with_check::text, 1, 80) 
  END as with_check_condition,
  roles,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'member_connections', 'messages', 'message_threads',
    'groups', 'group_members', 'teams', 'team_members',
    'connection_requests', 'connection_stats', 
    'user_interests', 'connection_recommendations'
  )
ORDER BY tablename, cmd DESC, policyname;

-- ============================================================================
-- SPECIFIC CHECK: Verify all critical INSERT policies have WITH CHECK
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN with_check IS NULL THEN '❌ MISSING WITH CHECK'
    ELSE '✅ WITH CHECK: ' || SUBSTRING(with_check::text, 1, 60)
  END as with_check_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'member_connections', 'messages', 'groups',
    'group_members', 'teams', 'team_members', 'connection_requests'
  )
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFY: Messages INSERT policy includes member_connections check
-- ============================================================================

SELECT 
  tablename,
  policyname,
  with_check,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'messages'
  AND policyname = 'Users can send messages to connected users';

-- ============================================================================
-- VERIFY: Groups/Teams have visibility checks on JOIN policies
-- ============================================================================

SELECT 
  tablename,
  policyname,
  with_check,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('group_members', 'team_members')
  AND policyname IN ('Users can join groups', 'Users can join teams');
