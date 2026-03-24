# Production Payment Processing Setup Guide

This guide walks through implementing the production-ready payment system for Creator Memberships using Flutterwave and Eversend.

## Architecture Overview

```
Frontend (React)
    ↓
Payment Modal (MembershipPaymentModalV2)
    ↓
Payment Orchestration (PaymentOrchestration.ts)
    ↓
Backend API (/api/payments/membership/initiate)
    ↓
Payment Gateways (Eversend + Flutterwave)
    ↓
Webhooks (Backend receives confirmation)
    ↓
Database (creators_membership table)
    ↓
User Tier Updated
```

## Setup Steps

### 1. Database Schema Setup

Run the SQL migration from `src/lib/database-schema.sql` in your Supabase database:

```bash
# Using Supabase dashboard:
# 1. Go to SQL Editor
# 2. Click "New Query"
# 3. Paste the contents of src/lib/database-schema.sql
# 4. Click "Run"
```

This creates:
- `creators_membership` - Main transaction table
- `webhook_events` - Webhook audit trail
- `payment_audit_log` - Payment action history
- Indexes for performance
- RLS policies for security

### 2. Environment Variables Setup

Add these to your `.env.local` file:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# These are frontend environment variables (public)
# DO NOT PUT API KEYS HERE - they go in backend .env only
```

Backend server `.env` (never exposed to frontend):
```env
# Payment Gateway API Keys
EVERSEND_API_KEY=your_eversend_api_key
EVERSEND_WEBHOOK_SECRET=your_eversend_webhook_secret
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
FLUTTERWAVE_WEBHOOK_SECRET=your_flutterwave_webhook_secret

# Application
APP_URL=https://yourdomain.com
NODE_ENV=production
```

### 3. Get Payment Gateway Credentials

#### Eversend (Uganda-based, excellent for African markets)

1. Go to https://dashboard.eversend.co/
2. Sign up or log in
3. Navigate to Settings → API Keys
4. Copy your API Key
5. Set webhook URL: `https://yourdomain.com/api/webhooks/eversend`
6. Copy webhook secret

**Eversend Advantages:**
- Low fees
- Local payment method support
- Mobile money integration
- Excellent for East Africa

#### Flutterwave (Nigeria-based, continental coverage)

1. Go to https://dashboard.flutterwave.com/
2. Sign up or log in
3. Navigate to Settings → API Keys
4. Copy Secret Key and Public Key
5. Set webhook URL: `https://yourdomain.com/api/webhooks/flutterwave`
6. Copy webhook hash secret

**Flutterwave Advantages:**
- 34+ African countries
- Supports more payment methods
- Better fraud detection
- Express pay options (PayPal, Apple Pay, Google Pay)

### 4. Backend API Implementation

Create a backend server (Vercel, Node.js, or Supabase Edge Functions):

#### Option A: Vercel + Next.js (Recommended)

Create `pages/api/payments/membership/initiate.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { initializeEversendPayment, initializeFlutterwavePayment } from '@/lib/backend-api-example';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Service role key (server-side only)
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Verify JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 2. Validate request
    const { transactionId, userId, amount, paymentMethod, email, phoneNumber, userName } = req.body;

    if (user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // 3. Fetch transaction from database
    const { data: transaction } = await supabase
      .from('creators_membership')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // 4. Initialize payment with gateway
    const gateway = paymentMethod === 'express_pay' ? 'flutterwave' : 'eversend';
    let paymentResponse;

    if (gateway === 'eversend') {
      paymentResponse = await initializeEversendPayment(
        transactionId,
        amount,
        email,
        phoneNumber,
        userName
      );
    } else {
      paymentResponse = await initializeFlutterwavePayment(
        transactionId,
        amount,
        email,
        userName
      );
    }

    if (!paymentResponse.success) {
      return res.status(400).json({
        error: paymentResponse.error,
        errorCode: 'GATEWAY_ERROR'
      });
    }

    // 5. Update transaction
    await supabase
      .from('creators_membership')
      .update({
        transaction_id: paymentResponse.reference,
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        metadata: {
          gateway,
          checkoutUrl: paymentResponse.checkoutUrl,
        }
      })
      .eq('id', transactionId);

    return res.status(200).json({
      success: true,
      gateway,
      checkoutUrl: paymentResponse.checkoutUrl,
      reference: paymentResponse.reference
    });
  } catch (error) {
    console.error('Payment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

Create `pages/api/webhooks/eversend.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyEversendSignature } from '@/lib/backend-api-example';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-eversend-signature'] as string;
    const payload = req.body;

    // Verify signature
    const verified = verifyEversendSignature(
      JSON.stringify(payload),
      signature,
      process.env.EVERSEND_WEBHOOK_SECRET!
    );

    if (!verified) {
      console.error('Invalid Eversend signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Find transaction
    const { data: transaction } = await supabase
      .from('creators_membership')
      .select('*')
      .eq('transaction_id', payload.reference)
      .single();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Handle payment completion
    if (payload.status === 'completed') {
      // Update transaction
      await supabase
        .from('creators_membership')
        .update({
          status: 'completed',
          payment_status: 'completed',
          completed_at: new Date().toISOString(),
          webhook_received_at: new Date().toISOString(),
          webhook_verified: true
        })
        .eq('id', transaction.id);

      // Update user tier
      await supabase
        .from('profiles')
        .update({
          tier: transaction.new_tier,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.user_id);

      // Log event
      await supabase.from('webhook_events').insert({
        transaction_id: transaction.id,
        event_id: payload.reference,
        event_type: 'payment_completed',
        source: 'eversend',
        payload,
        signature,
        signature_verified: true,
        status: 'processed',
        processed_at: new Date().toISOString()
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### Option B: Node.js Express Server

Similar structure with Express middleware for authentication and webhook verification.

#### Option C: Supabase Edge Functions

Deploy functions to `supabase/functions/payments-membership-initiate/index.ts`

### 5. Payment Gateway Configuration

#### In Eversend Dashboard:
1. Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/eversend`
3. Select events: payment.completed, payment.failed
4. Copy webhook secret to your `.env`

#### In Flutterwave Dashboard:
1. Settings → Webhooks & Events
2. Add webhook URL: `https://yourdomain.com/api/webhooks/flutterwave`
3. Copy webhook hash to your `.env`

### 6. Testing the Payment Flow

#### Test with Sandbox Credentials:

**Eversend Test:**
- Use test phone number: +256700000001
- Test payment will be marked as pending

**Flutterwave Test:**
- Use test card: 4242 4242 4242 4242
- CVV: 123
- Expiry: Any future date
- OTP: 123456 (when prompted)

#### Test Steps:

1. Open `/membership` page
2. Click "Upgrade to [Tier]"
3. Select billing cycle
4. Select payment method
5. Complete test payment
6. Check database for `creators_membership` record
7. Verify user tier was updated
8. Check `webhook_events` table for webhook record

### 7. Monitoring & Troubleshooting

#### Check Transaction Status:

```sql
-- View all pending transactions
SELECT id, user_id, new_tier, status, created_at 
FROM creators_membership 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- View failed transactions
SELECT id, user_id, error_message, failed_at 
FROM creators_membership 
WHERE status = 'failed'
ORDER BY failed_at DESC;

-- View webhook events
SELECT transaction_id, event_type, status, received_at 
FROM webhook_events 
ORDER BY received_at DESC;

-- View payment audit log
SELECT transaction_id, action_type, new_status, created_at 
FROM payment_audit_log 
ORDER BY created_at DESC;
```

#### Common Issues:

**Payment initialization fails:**
- Check API keys are correct
- Check environment variables are set on backend
- Check rate limiting isn't blocking requests
- Check user authentication token is valid

**Webhook not received:**
- Check webhook URL is publicly accessible
- Check firewall isn't blocking webhooks
- Verify webhook secret in environment variable
- Check gateway dashboard to see webhook attempts

**Payment succeeds but tier doesn't update:**
- Check webhook_events table for the event
- Check webhook signature was verified
- Check payment_audit_log for errors
- Manually verify transaction completed in gateway dashboard

### 8. Production Checklist

- [ ] Database migrations applied
- [ ] Backend API deployed
- [ ] Environment variables configured on backend
- [ ] Webhook URLs registered in both gateways
- [ ] HTTPS enabled (required for webhooks)
- [ ] Test payment flow end-to-end
- [ ] Monitor first 24 hours of production traffic
- [ ] Setup alerts for payment failures
- [ ] Setup email notifications for users
- [ ] Create admin dashboard to view transactions
- [ ] Document support process for payment issues
- [ ] Setup refund process for failed charges
- [ ] Monitor webhook failures and implement retry logic
- [ ] Implement payment reconciliation script
- [ ] Setup fraud detection alerts

### 9. Future Enhancements

- [ ] Add Stripe as additional gateway
- [ ] Implement subscription management (auto-renew)
- [ ] Add invoice generation
- [ ] Implement dunning management (retry failed charges)
- [ ] Add dispute/chargeback handling
- [ ] Real-time transaction dashboard
- [ ] Automated reconciliation with accounting system
- [ ] Advanced fraud detection
- [ ] Multi-currency support
- [ ] Members marketplace (peer-to-peer payments)

## Support & Resources

- **Eversend Docs:** https://docs.eversend.co
- **Flutterwave Docs:** https://developer.flutterwave.com
- **Supabase Docs:** https://supabase.com/docs
- **PCI Compliance:** https://www.pcisecuritystandards.org

## Security Notes

1. **API Keys:** Never commit API keys to Git. Use `.env` files and environment variables.
2. **HTTPS:** All payment URLs must be HTTPS. Never test with HTTP in production.
3. **Webhook Verification:** Always verify webhook signatures before processing.
4. **PII:** Never log sensitive customer data (card numbers, full emails, etc.)
5. **Encryption:** Store sensitive data encrypted at rest.
6. **Rate Limiting:** Implement rate limiting on payment endpoints (5 req/min recommended).
7. **Auditing:** Log all payment-related operations for compliance.
