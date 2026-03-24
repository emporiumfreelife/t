-- Creators Membership Transactions Table
-- Production-grade with audit trail, idempotency, and webhook tracking
CREATE TABLE creators_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & Tier Information
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_tier VARCHAR(50) NOT NULL,
  new_tier VARCHAR(50) NOT NULL,
  
  -- Payment Details
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  
  -- Payment Method & Gateway
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('card', 'mobile_money', 'express_pay')),
  gateway VARCHAR(50) NOT NULL CHECK (gateway IN ('eversend', 'flutterwave')),
  
  -- Transaction Identifiers (for idempotency)
  transaction_id VARCHAR(255),
  reference_id VARCHAR(255),
  session_id UUID UNIQUE, -- For client-side idempotency
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  
  -- Status Management
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  initiated_at TIMESTAMP WITH TIME ZONE,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Verification & Retry Tracking
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verification_count INT DEFAULT 0,
  verification_attempts INT DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Error Tracking
  error_message TEXT,
  error_code VARCHAR(100),
  error_details JSONB,
  
  -- Webhook Tracking
  webhook_received_at TIMESTAMP WITH TIME ZONE,
  webhook_verified BOOLEAN DEFAULT FALSE,
  webhook_signature VARCHAR(512),
  
  -- Security & Audit
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  
  -- Optimistic Locking
  version INT DEFAULT 1,
  
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_verification_count CHECK (verification_count <= 10)
);

-- Indexes for performance
CREATE INDEX idx_creators_membership_user_id ON creators_membership(user_id);
CREATE INDEX idx_creators_membership_status ON creators_membership(status);
CREATE INDEX idx_creators_membership_gateway ON creators_membership(gateway);
CREATE INDEX idx_creators_membership_created_at ON creators_membership(created_at DESC);
CREATE INDEX idx_creators_membership_transaction_id ON creators_membership(transaction_id);
CREATE INDEX idx_creators_membership_idempotency_key ON creators_membership(idempotency_key);
CREATE INDEX idx_creators_membership_session_id ON creators_membership(session_id);
CREATE INDEX idx_creators_membership_user_status ON creators_membership(user_id, status);
CREATE INDEX idx_creators_membership_pending_retry ON creators_membership(status, next_retry_at) WHERE status = 'pending';

-- Webhook Events Table for audit trail
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  transaction_id UUID REFERENCES creators_membership(id) ON DELETE CASCADE,
  event_id VARCHAR(255) UNIQUE, -- Gateway event ID for deduplication
  event_type VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('eversend', 'flutterwave')),
  
  -- Event Data
  payload JSONB NOT NULL,
  signature VARCHAR(512),
  signature_verified BOOLEAN DEFAULT FALSE,
  
  -- Processing Status
  status VARCHAR(50) DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed', 'skipped')),
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  ip_address INET,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_retry_count CHECK (retry_count <= 5)
);

-- Webhook events indexes
CREATE INDEX idx_webhook_events_transaction_id ON webhook_events(transaction_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_source ON webhook_events(source);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_received_at ON webhook_events(received_at DESC);
CREATE INDEX idx_webhook_events_unprocessed ON webhook_events(status) WHERE status IN ('received', 'failed');

-- Payment Audit Log Table
CREATE TABLE payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  transaction_id UUID REFERENCES creators_membership(id) ON DELETE CASCADE,
  user_id UUID,
  
  -- Action Details
  action VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) CHECK (action_type IN ('init', 'verify', 'complete', 'fail', 'refund', 'retry')),
  
  -- Status Changes
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- Details
  details JSONB,
  error_message TEXT,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log indexes
CREATE INDEX idx_audit_log_transaction_id ON payment_audit_log(transaction_id);
CREATE INDEX idx_audit_log_user_id ON payment_audit_log(user_id);
CREATE INDEX idx_audit_log_action_type ON payment_audit_log(action_type);
CREATE INDEX idx_audit_log_created_at ON payment_audit_log(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_creators_membership_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_creators_membership_updated_at
BEFORE UPDATE ON creators_membership
FOR EACH ROW
EXECUTE FUNCTION update_creators_membership_updated_at();

-- Function to prevent multiple pending transactions for same user/tier
CREATE OR REPLACE FUNCTION check_pending_membership_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's already a pending transaction for this user upgrading to this tier
  IF NEW.status = 'pending' THEN
    IF EXISTS (
      SELECT 1 FROM creators_membership
      WHERE user_id = NEW.user_id
      AND new_tier = NEW.new_tier
      AND status = 'pending'
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Pending transaction already exists for this user and tier';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce unique pending transaction per user/tier
CREATE TRIGGER trigger_check_pending_membership
BEFORE INSERT OR UPDATE ON creators_membership
FOR EACH ROW
EXECUTE FUNCTION check_pending_membership_transaction();

-- RLS Policies for security
ALTER TABLE creators_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY creators_membership_user_access ON creators_membership
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY creators_membership_admin_access ON creators_membership
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Webhook events are read-only
CREATE POLICY webhook_events_admin_access ON webhook_events
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY audit_log_admin_access ON payment_audit_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
