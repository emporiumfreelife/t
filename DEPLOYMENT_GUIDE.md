# Dual Membership System - Complete Deployment Guide

## Overview

This system implements two completely independent membership systems:
- **Creators Membership**: For creators to upgrade their platform tier (Free → Premium → Professional → Elite)
- **Members Membership**: For platform community members to join (Basic → Premium → VIP)

All code uses **consistent plural naming** throughout: `creators_*` and `members_*` for main membership tables, with consolidated `webhook_events` and `payment_audit_log` tables using `membership_type` discriminator column.

---

## Architecture Summary

### Two Independent Membership Tables
Each system has its own main table:
- `creators_membership` - Creator tier upgrades
- `members_membership` - Community membership signups

### Consolidated Webhook & Audit Tables
Both systems share consolidated tracking tables with `membership_type` column:
- `webhook_events` - Webhook event tracking (membership_type: 'creator' | 'member')
- `payment_audit_log` - Payment audit trail (membership_type: 'creator' | 'member')

### Shared Infrastructure
Both systems share:
- `MembershipPaymentModalV2` component (accepts `membershipType` prop)
- `paymentOrchestration.ts` service (routes based on membership type)
- `initializePaymentUnified` Edge Function
- `handlePaymentWebhookUnified` Edge Function

---

## Frontend Routes (All Clean & Specific)

```
GET  /creators-membership → CreatorsMembership.tsx (creators only)
GET  /members-membership  → MembersMembership.tsx (members only)
POST /membership-callback → MembershipCallback.tsx (webhook redirect)
```

---

## Database Schema

### Main Membership Tables (Separate)
- `creators_membership` - Creator membership records with tier upgrade history
- `members_membership` - Community member subscription records

### Consolidated Webhook & Audit Tables
Instead of having separate tables for each membership type, we use **single consolidated tables with a `membership_type` discriminator column**:

```sql
-- Consolidated webhook events table (replaces creators_webhook_events + members_webhook_events)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  membership_type TEXT NOT NULL, -- 'creator' or 'member'
  transaction_id UUID NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,      -- eversend, flutterwave
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  signature_verified BOOLEAN,
  status TEXT,               -- received, processing, completed, failed
  created_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Consolidated payment audit log table (replaces creators_payment_audit_log + members_payment_audit_log)
CREATE TABLE payment_audit_log (
  id UUID PRIMARY KEY,
  membership_type TEXT NOT NULL, -- 'creator' or 'member'
  transaction_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  performed_by TEXT DEFAULT 'system'
);
```

**Benefits of Consolidated Approach:**
- ✓ Reduced table duplication (2 tables instead of 6)
- ✓ Single query surface for audit/webhook searches
- ✓ Consistent RLS policies with membership_type checks
- ✓ Clear separation via discriminator column
- ✓ Easier to add future membership types

**Deployment:**
```bash
# Run this SQL in Supabase SQL Editor:
# File: supabase/migrations/membership_schema.sql
```

---

## Code Changes Made

### 1. Frontend Routes (src/App.tsx)
- ✓ `/creators-membership` → CreatorsMembership.tsx
- ✓ `/members-membership` → MembersMembership.tsx

### 2. Payment Orchestration Service (src/lib/paymentOrchestration.ts)

**All methods properly route based on membershipType:**
- `handleWebhook(webhook, membershipType)`
- `recordWebhookEvent(webhook, transactionId, membershipType)`
- `logAuditEvent(transactionId, actionType, previousStatus, newStatus, membershipType)`
- `completePayment(transactionId, gatewayTransactionId, membershipType)`
- `failPayment(transactionId, error, membershipType)`

**Uses consolidated tables:**
```typescript
// Records to consolidated webhook_events with membership_type
await supabase.from('webhook_events').insert({
  membership_type: membershipType,  // 'creator' or 'member'
  transaction_id: transactionId,
  ...
});

// Logs to consolidated payment_audit_log with membership_type
await supabase.from('payment_audit_log').insert({
  membership_type: membershipType,  // 'creator' or 'member'
  transaction_id: transactionId,
  ...
});
```

### 3. Webhook Handler (supabase/functions/handlePaymentWebhookUnified/index.ts)

**Uses consolidated table names:**
```typescript
// Record webhook to consolidated webhook_events table
await supabase.from('webhook_events').insert({
  membership_type: membershipType,
  transaction_id: transaction.id,
  ...
});

// Log audit to consolidated payment_audit_log table
await supabase.from('payment_audit_log').insert({
  membership_type: membershipType,
  transaction_id: transaction.id,
  ...
});
```

### 4. Membership Callback (src/pages/MembershipCallback.tsx)

**Routes redirect to correct membership page:**
- Creators → `/creators-membership`
- Members → `/members-membership`

### 5. Navbar (src/components/Navbar.tsx)
- ✓ Routes creators to `/creators-membership`
- ✓ Routes members to `/members-membership`

---

## Edge Functions (Deployment Required)

### 1. initializePaymentUnified
- **Path**: `supabase/functions/initializePaymentUnified/index.ts`
- **Status**: ✓ Uses correct membership table names
- **Action**: Deploy with `supabase functions deploy initializePaymentUnified`

### 2. handlePaymentWebhookUnified
- **Path**: `supabase/functions/handlePaymentWebhookUnified/index.ts`
- **Status**: ✓ Uses consolidated webhook_events and payment_audit_log tables with membership_type
- **Action**: Deploy with `supabase functions deploy handlePaymentWebhookUnified`

---

## Deployment Checklist

### Step 1: Database Schema
- [ ] Run `supabase/migrations/membership_schema.sql` in Supabase SQL Editor
- [ ] Verify tables created:
  - [ ] `creators_membership`
  - [ ] `members_membership`
  - [ ] `webhook_events` (with membership_type column)
  - [ ] `payment_audit_log` (with membership_type column)

### Step 2: Edge Functions
- [ ] Deploy `initializePaymentUnified`:
  ```bash
  supabase functions deploy initializePaymentUnified
  ```
- [ ] Deploy `handlePaymentWebhookUnified`:
  ```bash
  supabase functions deploy handlePaymentWebhookUnified
  ```

### Step 3: Environment Variables
Ensure these are configured in Supabase:
- `EVERSEND_API_KEY`
- `EVERSEND_WEBHOOK_SECRET`
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_WEBHOOK_SECRET`
- `APP_URL` (your app domain)

### Step 4: Payment Gateway Webhooks
Update webhook URLs in:
- **Eversend Dashboard**: Point to `handlePaymentWebhookUnified`
- **Flutterwave Dashboard**: Point to `handlePaymentWebhookUnified`

### Step 5: Frontend Build
```bash
npm run build
# Verify no build errors
npm run typecheck
```

### Step 6: Test Payment Flow
1. Creator upgrades membership via `/creators-membership`
2. Member joins membership via `/members-membership`
3. Complete payment in gateway
4. Verify webhook updates correct table (`creators_membership` or `members_membership`)
5. Verify webhook event logged in `webhook_events` with correct `membership_type`
6. Verify audit trail logged in `payment_audit_log` with correct `membership_type`

---

## Naming Convention Reference

### Table Names (Plural)
- ✓ `creators_membership` (main creators membership table)
- ✓ `members_membership` (main members membership table)
- ✓ `webhook_events` (consolidated, uses membership_type column)
- ✓ `payment_audit_log` (consolidated, uses membership_type column)

### Index Names (Plural)
- ✓ `idx_creators_membership_*`
- ✓ `idx_members_membership_*`
- ✓ `idx_webhook_events_membership_type`
- ✓ `idx_webhook_events_transaction_id`
- ✓ `idx_payment_audit_log_membership_type`
- ✓ `idx_payment_audit_log_transaction_id`

### Function Names (Plural)
- ✓ `update_creators_membership_updated_at()`
- ✓ `update_members_membership_updated_at()`
- ✓ `trigger_update_creators_membership_updated_at`
- ✓ `trigger_update_members_membership_updated_at`

### Route Paths (Plural & Specific)
- ✓ `/creators-membership` (not `/membership` or `/creator-membership`)
- ✓ `/members-membership` (not `/member` or `/member-membership`)

---

## What Was Removed

1. **Separate webhook tables**: `creators_webhook_events`, `members_webhook_events` → consolidated to `webhook_events` with membership_type
2. **Separate audit tables**: `creators_payment_audit_log`, `members_payment_audit_log` → consolidated to `payment_audit_log` with membership_type
3. **Redundant code**: Table name resolution methods replaced with single membership_type parameter
4. **Old naming patterns**: All consistent plural naming (including routes)

---

## Testing Checklist

After deployment, verify:

### Creators Membership Flow
- [ ] Navigate to `/creators-membership`
- [ ] View current tier
- [ ] Click upgrade button
- [ ] Payment modal appears
- [ ] Complete payment
- [ ] Redirected to `/creators-membership` callback
- [ ] Data written to `creators_membership` table
- [ ] Webhook recorded in `webhook_events` with `membership_type='creator'`
- [ ] Audit logged in `payment_audit_log` with `membership_type='creator'`

### Members Membership Flow
- [ ] Navigate to `/members-membership`
- [ ] View membership tiers (Basic, Premium, VIP)
- [ ] Click join button
- [ ] Payment modal appears
- [ ] Complete payment
- [ ] Redirected to `/members-membership` callback
- [ ] Data written to `members_membership` table
- [ ] Webhook recorded in `webhook_events` with `membership_type='member'`
- [ ] Audit logged in `payment_audit_log` with `membership_type='member'`

### Database Verification
- [ ] No old separate tables exist:
  - [ ] `creators_webhook_events` - DOES NOT EXIST
  - [ ] `members_webhook_events` - DOES NOT EXIST
  - [ ] `creators_payment_audit_log` - DOES NOT EXIST
  - [ ] `members_payment_audit_log` - DOES NOT EXIST
- [ ] Consolidated tables exist:
  - [ ] `webhook_events` has `membership_type` column
  - [ ] `payment_audit_log` has `membership_type` column
- [ ] No `creator_id` column in `members_membership` table

---

## SQL Verification Queries

Run these in Supabase SQL Editor to verify correct deployment:

```sql
-- Verify webhook_events table has correct schema
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'webhook_events' 
ORDER BY ordinal_position;

-- Verify payment_audit_log table has correct schema
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'payment_audit_log' 
ORDER BY ordinal_position;

-- Verify old separate tables do NOT exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('creators_webhook_events', 'members_webhook_events', 'creators_payment_audit_log', 'members_payment_audit_log');
-- Should return 0 rows

-- Verify members_membership does NOT have creator_id
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'members_membership' 
AND column_name = 'creator_id';
-- Should return 0 rows
```

---

## Support & Troubleshooting

### Issue: Payment redirects to wrong membership page
- **Check**: MembershipCallback.tsx should use `/creators-membership` or `/members-membership`
- **Check**: Query parameter `?type=creator` or `?type=member` being passed

### Issue: Webhook not updating membership
- **Check**: `webhook_events` and `payment_audit_log` tables exist in Supabase
- **Check**: Edge Function `handlePaymentWebhookUnified` is deployed
- **Check**: Webhook URL configured correctly in payment gateway
- **Check**: `membership_type` column is being populated correctly

### Issue: Payment orchestration fails
- **Check**: `paymentOrchestration.ts` methods accept `membershipType` parameter
- **Check**: Uses consolidated table names: `webhook_events` and `payment_audit_log`
- **Check**: Includes `membership_type` column in all insert/update operations

---

## Code Stability

✓ **All code is production-grade:**
- No deprecated patterns
- No legacy support code
- Clean, single way of doing things
- Consistent naming throughout
- Proper error handling and audit trails
- RLS policies for data security
- Idempotency keys prevent duplicate charges
- Consolidated webhook/audit tables reduce duplication
