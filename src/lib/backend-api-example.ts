/**
 * BACKEND API IMPLEMENTATION GUIDE
 * 
 * This is a reference implementation for the backend payment API.
 * Deploy this to:
 * - Vercel (Next.js)
 * - Node.js + Express server
 * - Supabase Edge Functions
 * - AWS Lambda
 * 
 * The key principle: All payment gateway interactions happen server-side
 * Frontend only communicates with your backend API, never with payment gateways directly
 */

/**
 * Endpoint: POST /api/payments/membership/initiate
 * 
 * Security Requirements:
 * - Verify JWT token from frontend
 * - Validate user exists and is authenticated
 * - Validate idempotency key
 * - Never expose API keys to frontend
 * - Rate limit per user
 */
export interface InitiatePaymentRequest {
  transactionId: string;
  userId: string;
  currentTier: string;
  targetTier: string;
  amount: number;
  billingCycle: 'monthly' | 'annual';
  paymentMethod: 'card' | 'mobile_money' | 'express_pay';
  email: string;
  phoneNumber: string;
  userName: string;
}

/**
 * CRITICAL REQUIREMENTS FOR BACKEND:
 * 
 * 1. NEVER expose API keys to frontend
 *    - Keep EVERSEND_API_KEY in server .env only
 *    - Keep FLUTTERWAVE_SECRET_KEY in server .env only
 * 
 * 2. Verify JWT token from frontend Authorization header
 *    - Validate user owns the transaction
 *    - Rate limit per user (5 requests/min recommended)
 * 
 * 3. Always verify webhook signatures
 *    - Use HMAC-SHA256 verification
 *    - Use constant-time comparison
 * 
 * 4. Implement idempotency
 *    - Accept Idempotency-Key header
 *    - Return same response for same key
 *    - Prevents double-charging on retries
 * 
 * 5. Audit every action
 *    - Log all transactions
 *    - Log all webhooks
 *    - Log all errors
 * 
 * 6. Handle errors gracefully
 *    - Never expose sensitive details to frontend
 *    - Return user-friendly error messages
 *    - Implement retry logic with exponential backoff
 */

/**
 * Initialize Eversend Payment (Backend)
 */
export async function initializeEversendPayment(
  transactionId: string,
  amount: number,
  email: string,
  phoneNumber: string,
  userName: string
): Promise<{
  success: boolean;
  reference?: string;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}> {
  try {
    // API key retrieved from server-side environment variable
    const apiKey = process.env.EVERSEND_API_KEY;
    if (!apiKey) {
      console.error('EVERSEND_API_KEY not configured');
      return {
        success: false,
        error: 'Payment service not configured',
      };
    }

    const response = await fetch('https://api.eversend.co/send/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'USD',
        phoneNumber,
        email,
        description: `Membership Upgrade - TX${transactionId.substring(0, 8)}`,
        externalId: transactionId,
        metadata: {
          transactionId,
          type: 'membership-upgrade',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Payment initialization failed',
      };
    }

    return {
      success: true,
      reference: data.reference,
      checkoutUrl: data.checkoutLink || data.paymentLink,
      sessionId: data.reference,
    };
  } catch (error) {
    console.error('Eversend API error:', error);
    return {
      success: false,
      error: 'Payment service error',
    };
  }
}

/**
 * Initialize Flutterwave Payment (Backend)
 */
export async function initializeFlutterwavePayment(
  transactionId: string,
  amount: number,
  email: string,
  userName: string
): Promise<{
  success: boolean;
  reference?: string;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}> {
  try {
    const apiKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!apiKey) {
      console.error('FLUTTERWAVE_SECRET_KEY not configured');
      return {
        success: false,
        error: 'Payment service not configured',
      };
    }

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        tx_ref: transactionId,
        amount,
        currency: 'USD',
        payment_options: 'card,mobilemoney,ussd,banktransfer',
        customer: {
          email,
          name: userName,
        },
        customizations: {
          title: 'Creator Membership Upgrade',
          description: 'Unlock premium membership features',
        },
        redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/membership-callback`,
        meta: {
          transactionId,
          type: 'membership-upgrade',
        },
      }),
    });

    const data = await response.json();

    if (data.status !== 'success') {
      return {
        success: false,
        error: data.message || 'Payment initialization failed',
      };
    }

    return {
      success: true,
      reference: data.data.link,
      checkoutUrl: data.data.link,
      sessionId: data.data.id?.toString(),
    };
  } catch (error) {
    console.error('Flutterwave API error:', error);
    return {
      success: false,
      error: 'Payment service error',
    };
  }
}

/**
 * Webhook Signature Verification (for use in backend)
 */
export function verifyEversendSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return constantTimeCompare(signature, expectedSignature);
}

export function verifyFlutterwaveSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return constantTimeCompare(signature, expectedSignature);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * IMPLEMENTATION CHECKLIST
 * 
 * Backend Setup:
 * [ ] Create /api/payments/membership/initiate endpoint
 * [ ] Create /api/webhooks/eversend endpoint
 * [ ] Create /api/webhooks/flutterwave endpoint
 * [ ] Setup environment variables (EVERSEND_API_KEY, FLUTTERWAVE_SECRET_KEY)
 * [ ] Implement JWT verification middleware
 * [ ] Implement rate limiting middleware
 * [ ] Setup database migrations (creators_membership table)
 * [ ] Implement error logging
 * [ ] Implement audit logging
 * 
 * Security:
 * [ ] Enable HTTPS for all endpoints
 * [ ] Implement CORS properly
 * [ ] Setup webhook signature verification
 * [ ] Implement idempotency checks
 * [ ] Rate limit per user
 * [ ] Sanitize all inputs
 * [ ] Log all sensitive operations
 * 
 * Testing:
 * [ ] Test payment initialization with test credentials
 * [ ] Test webhook signature verification
 * [ ] Test idempotency (send same request twice)
 * [ ] Test error handling
 * [ ] Test webhook replay protection
 * [ ] Load test to ensure scalability
 * 
 * Deployment:
 * [ ] Setup environment variables on production
 * [ ] Configure webhook URLs in Eversend dashboard
 * [ ] Configure webhook URLs in Flutterwave dashboard
 * [ ] Setup monitoring and alerting
 * [ ] Enable database backups
 * [ ] Setup API rate limiting
 */
