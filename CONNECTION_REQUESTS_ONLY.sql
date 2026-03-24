-- ============================================================================
-- CONNECTION REQUESTS TABLE - For pending connection workflow
-- Minimal setup needed for the feature
-- ============================================================================

-- Create the connection_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.connection_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(sender_id, recipient_id),
    CHECK(sender_id != recipient_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connection_requests_sender_id ON public.connection_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_recipient_id ON public.connection_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON public.connection_requests(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR CONNECTION REQUESTS
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

-- Users can update connection requests they are involved in (sender or recipient)
DROP POLICY IF EXISTS "Users can update connection requests" ON public.connection_requests;
CREATE POLICY "Users can update connection requests"
  ON public.connection_requests
  FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can delete their own sent connection requests (sender can cancel)
DROP POLICY IF EXISTS "Users can delete their connection requests" ON public.connection_requests;
CREATE POLICY "Users can delete their connection requests"
  ON public.connection_requests
  FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================================================
-- VERIFY: Check that RLS is enabled and policies are created
-- ============================================================================

-- Run this to verify the setup
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'connection_requests';

SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'connection_requests'
ORDER BY policyname;
