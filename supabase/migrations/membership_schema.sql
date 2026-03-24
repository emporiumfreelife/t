-- ===================================================================
-- CREATORS MEMBERSHIP SYSTEM
-- ===================================================================

-- Table for creator membership tiers and transactions
CREATE TABLE IF NOT EXISTS creators_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_tier TEXT NOT NULL,
  new_tier TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  gateway TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  payment_status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL UNIQUE,
  transaction_id TEXT,
  reference_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  error_code TEXT,
  error_details JSONB,
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  webhook_received_at TIMESTAMP WITH TIME ZONE,
  webhook_verified BOOLEAN DEFAULT FALSE,
  webhook_signature TEXT
);

-- Create indexes for creators_membership table
CREATE INDEX IF NOT EXISTS idx_creators_membership_user_id ON creators_membership(user_id);
CREATE INDEX IF NOT EXISTS idx_creators_membership_idempotency_key ON creators_membership(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_creators_membership_transaction_id ON creators_membership(transaction_id);
CREATE INDEX IF NOT EXISTS idx_creators_membership_reference_id ON creators_membership(reference_id);
CREATE INDEX IF NOT EXISTS idx_creators_membership_status ON creators_membership(status);
CREATE INDEX IF NOT EXISTS idx_creators_membership_created_at ON creators_membership(created_at DESC);

-- ===================================================================
-- MEMBERS MEMBERSHIP SYSTEM
-- ===================================================================

-- Table for member/community membership tiers and transactions
CREATE TABLE IF NOT EXISTS members_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_tier TEXT NOT NULL,
  new_tier TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  gateway TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  payment_status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL UNIQUE,
  transaction_id TEXT,
  reference_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  error_code TEXT,
  error_details JSONB,
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  webhook_received_at TIMESTAMP WITH TIME ZONE,
  webhook_verified BOOLEAN DEFAULT FALSE,
  webhook_signature TEXT
);

-- Create indexes for members_membership table
CREATE INDEX IF NOT EXISTS idx_members_membership_user_id ON members_membership(user_id);
CREATE INDEX IF NOT EXISTS idx_members_membership_idempotency_key ON members_membership(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_members_membership_transaction_id ON members_membership(transaction_id);
CREATE INDEX IF NOT EXISTS idx_members_membership_reference_id ON members_membership(reference_id);
CREATE INDEX IF NOT EXISTS idx_members_membership_status ON members_membership(status);
CREATE INDEX IF NOT EXISTS idx_members_membership_created_at ON members_membership(created_at DESC);

-- ===================================================================
-- CONSOLIDATED WEBHOOK EVENTS TABLE (for both creators and members)
-- ===================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_type TEXT NOT NULL CHECK (membership_type IN ('creator', 'member')),
  transaction_id UUID NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL, -- eversend, flutterwave
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  signature_verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'received', -- received, processing, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT webhook_events_creator_fk FOREIGN KEY (transaction_id) 
    REFERENCES creators_membership(id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT webhook_events_member_fk FOREIGN KEY (transaction_id) 
    REFERENCES members_membership(id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for webhook_events table
CREATE INDEX IF NOT EXISTS idx_webhook_events_membership_type ON webhook_events(membership_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_transaction_id ON webhook_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- ===================================================================
-- CONSOLIDATED PAYMENT AUDIT LOG TABLE (for both creators and members)
-- ===================================================================

CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_type TEXT NOT NULL CHECK (membership_type IN ('creator', 'member')),
  transaction_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  performed_by TEXT DEFAULT 'system',
  CONSTRAINT payment_audit_log_creator_fk FOREIGN KEY (transaction_id) 
    REFERENCES creators_membership(id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT payment_audit_log_member_fk FOREIGN KEY (transaction_id) 
    REFERENCES members_membership(id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for payment_audit_log table
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_membership_type ON payment_audit_log(membership_type);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_transaction_id ON payment_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_user_id ON payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_action_type ON payment_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at ON payment_audit_log(created_at DESC);

-- ===================================================================
-- TRIGGER FUNCTIONS FOR UPDATED_AT COLUMNS
-- ===================================================================

-- Function to update updated_at for creators_membership
CREATE OR REPLACE FUNCTION update_creators_membership_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for creators_membership
DROP TRIGGER IF EXISTS trigger_update_creators_membership_updated_at ON creators_membership;
CREATE TRIGGER trigger_update_creators_membership_updated_at
BEFORE UPDATE ON creators_membership
FOR EACH ROW
EXECUTE FUNCTION update_creators_membership_updated_at();

-- Function to update updated_at for members_membership
CREATE OR REPLACE FUNCTION update_members_membership_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for members_membership
DROP TRIGGER IF EXISTS trigger_update_members_membership_updated_at ON members_membership;
CREATE TRIGGER trigger_update_members_membership_updated_at
BEFORE UPDATE ON members_membership
FOR EACH ROW
EXECUTE FUNCTION update_members_membership_updated_at();

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on all membership tables
ALTER TABLE creators_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE members_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- CREATORS_MEMBERSHIP RLS POLICIES
-- ===================================================================

-- RLS Policy: Creators can view their own membership records
DROP POLICY IF EXISTS "Users can view own creators_membership" ON creators_membership;
CREATE POLICY "Users can view own creators_membership"
ON creators_membership FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Service role (via Edge Functions) can insert/update creators_membership
DROP POLICY IF EXISTS "Service role can manage creators_membership" ON creators_membership;
CREATE POLICY "Service role can manage creators_membership"
ON creators_membership FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ===================================================================
-- MEMBERS_MEMBERSHIP RLS POLICIES
-- ===================================================================

-- RLS Policy: Members can view their own membership records
DROP POLICY IF EXISTS "Users can view own members_membership" ON members_membership;
CREATE POLICY "Users can view own members_membership"
ON members_membership FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Service role (via Edge Functions) can insert/update members_membership
DROP POLICY IF EXISTS "Service role can manage members_membership" ON members_membership;
CREATE POLICY "Service role can manage members_membership"
ON members_membership FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ===================================================================
-- WEBHOOK_EVENTS RLS POLICIES
-- ===================================================================

-- RLS Policy: Creators can view their own webhook events
DROP POLICY IF EXISTS "Users can view own webhook_events creators" ON webhook_events;
CREATE POLICY "Users can view own webhook_events creators"
ON webhook_events FOR SELECT
USING (
  membership_type = 'creator' AND
  EXISTS (
    SELECT 1 FROM creators_membership cm
    WHERE cm.id = webhook_events.transaction_id
    AND cm.user_id = auth.uid()
  )
);

-- RLS Policy: Members can view their own webhook events
DROP POLICY IF EXISTS "Users can view own webhook_events members" ON webhook_events;
CREATE POLICY "Users can view own webhook_events members"
ON webhook_events FOR SELECT
USING (
  membership_type = 'member' AND
  EXISTS (
    SELECT 1 FROM members_membership mm
    WHERE mm.id = webhook_events.transaction_id
    AND mm.user_id = auth.uid()
  )
);

-- RLS Policy: Service role can manage webhook_events
DROP POLICY IF EXISTS "Service role can manage webhook_events" ON webhook_events;
CREATE POLICY "Service role can manage webhook_events"
ON webhook_events FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ===================================================================
-- PAYMENT_AUDIT_LOG RLS POLICIES
-- ===================================================================

-- RLS Policy: Creators can view their own audit logs
DROP POLICY IF EXISTS "Users can view own payment_audit_log creators" ON payment_audit_log;
CREATE POLICY "Users can view own payment_audit_log creators"
ON payment_audit_log FOR SELECT
USING (
  membership_type = 'creator' AND
  EXISTS (
    SELECT 1 FROM creators_membership cm
    WHERE cm.id = payment_audit_log.transaction_id
    AND cm.user_id = auth.uid()
  )
);

-- RLS Policy: Members can view their own audit logs
DROP POLICY IF EXISTS "Users can view own payment_audit_log members" ON payment_audit_log;
CREATE POLICY "Users can view own payment_audit_log members"
ON payment_audit_log FOR SELECT
USING (
  membership_type = 'member' AND
  EXISTS (
    SELECT 1 FROM members_membership mm
    WHERE mm.id = payment_audit_log.transaction_id
    AND mm.user_id = auth.uid()
  )
);

-- RLS Policy: Service role can manage payment_audit_log
DROP POLICY IF EXISTS "Service role can manage payment_audit_log" ON payment_audit_log;
CREATE POLICY "Service role can manage payment_audit_log"
ON payment_audit_log FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
