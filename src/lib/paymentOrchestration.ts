/**
 * Payment Orchestration Service
 * Handles all payment processing with proper error handling, retries, and audit trails
 * Works with Flutterwave and Eversend payment gateways
 */

import { supabase } from './supabase';
import { PaymentMethodType } from './paymentMethodConfig';
import { MembershipTier, BillingCycle } from './tierPricingConfig';

export interface PaymentInitRequest {
  userId: string;
  currentTier: MembershipTier;
  targetTier: MembershipTier;
  amount: number;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethodType;
  email: string;
  phoneNumber: string;
  userName: string;
  userAgent?: string;
  ipAddress?: string;
  membershipType?: 'creator' | 'member';
}

export interface PaymentInitResponse {
  success: boolean;
  transactionId?: string;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface WebhookPayload {
  source: 'eversend' | 'flutterwave';
  eventId: string;
  eventType: string;
  transactionId: string;
  status: string;
  signature: string;
  payload: any;
}

export class PaymentOrchestration {
  /**
   * Get the appropriate table name based on membership type
   */
  private static getTableName(membershipType: 'creator' | 'member' = 'creator'): string {
    return membershipType === 'member' ? 'members_membership' : 'creators_membership';
  }


  /**
   * Generate idempotency key to prevent duplicate charges
   */
  static generateIdempotencyKey(
    userId: string,
    targetTier: string,
    timestamp: number
  ): string {
    return `${userId}-${targetTier}-${Math.floor(timestamp / 60000)}`;
  }

  /**
   * Initialize payment - main entry point for all payment transactions
   * Handles idempotency, creates transaction record, calls backend API
   */
  static async initializePayment(
    request: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    try {
      const membershipType = request.membershipType || 'creator';

      // Generate idempotency key (prevents duplicate charges)
      const idempotencyKey = this.generateIdempotencyKey(
        request.userId,
        request.targetTier,
        Date.now()
      );

      // Check for existing pending transaction with same idempotency key
      const existingTransaction = await this.checkExistingTransaction(
        request.userId,
        idempotencyKey,
        membershipType
      );

      if (existingTransaction) {
        console.log('Returning existing transaction:', existingTransaction.id);
        return {
          success: true,
          transactionId: existingTransaction.transaction_id,
          sessionId: existingTransaction.session_id,
          checkoutUrl: existingTransaction.checkout_url,
        };
      }

      // Validate user and tier
      const validationResult = await this.validatePaymentRequest(request);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          errorCode: 'VALIDATION_FAILED',
        };
      }

      // Create pending transaction record in database
      const transactionId = await this.createPendingTransaction(
        request,
        idempotencyKey,
        membershipType
      );

      if (!transactionId) {
        return {
          success: false,
          error: 'Failed to create transaction record',
          errorCode: 'DB_ERROR',
        };
      }

      // Call backend API to initialize payment with gateway
      // This keeps sensitive operations server-side
      const paymentResponse = await this.callBackendPaymentAPI(
        request,
        transactionId,
        idempotencyKey,
        membershipType
      );

      if (!paymentResponse.success) {
        // Mark transaction as failed
        await this.updateTransactionStatus(transactionId, 'failed', membershipType, {
          error: paymentResponse.error,
          errorCode: paymentResponse.errorCode,
        });

        return {
          success: false,
          error: paymentResponse.error || 'Payment initialization failed',
          errorCode: paymentResponse.errorCode || 'GATEWAY_ERROR',
        };
      }

      // Update transaction with gateway details
      await this.updateTransactionWithGatewayDetails(
        transactionId,
        paymentResponse,
        membershipType
      );

      // Log the action in audit trail
      await this.logAuditEvent(transactionId, 'init', null, 'processing', membershipType, {
        gateway: paymentResponse.gateway,
        paymentMethod: request.paymentMethod,
      });

      return {
        success: true,
        transactionId: transactionId,
        sessionId: paymentResponse.sessionId,
        checkoutUrl: paymentResponse.checkoutUrl,
      };
    } catch (error) {
      console.error('Payment initialization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Check for existing transaction to prevent duplicates
   */
  private static async checkExistingTransaction(
    userId: string,
    idempotencyKey: string,
    membershipType: 'creator' | 'member' = 'creator'
  ): Promise<any> {
    try {
      const tableName = this.getTableName(membershipType);
      const { data } = await supabase
        .from(tableName)
        .select('id, transaction_id, session_id, metadata->checkout_url')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey)
        .eq('status', 'pending')
        .single();

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Validate payment request
   */
  private static async validatePaymentRequest(
    request: PaymentInitRequest
  ): Promise<{ valid: boolean; error?: string }> {
    // Validate user exists
    if (!request.userId) {
      return { valid: false, error: 'User ID is required' };
    }

    // Validate amount
    if (request.amount <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }

    // Validate tier upgrade
    if (request.currentTier === request.targetTier) {
      return { valid: false, error: 'Already on this tier' };
    }

    // Tier order validation for both creator and member tiers
    const creatorTierOrder: Record<string, number> = { free: 0, premium: 1, professional: 2, elite: 3 };
    const memberTierOrder: Record<string, number> = { welcome: 1, premium: 2, elite: 3, enterprise: 4 };

    // Determine which tier order to use based on membership type from request
    const membershipType = request.membershipType || 'creator';
    const tierOrder = membershipType === 'member' ? memberTierOrder : creatorTierOrder;

    // Check if tier progression is valid
    const currentTierOrder = tierOrder[request.currentTier as string];
    const targetTierOrder = tierOrder[request.targetTier as string];

    if (currentTierOrder === undefined || targetTierOrder === undefined) {
      return { valid: false, error: 'Invalid tier specified' };
    }

    if (targetTierOrder <= currentTierOrder) {
      return { valid: false, error: 'Can only upgrade to higher tiers' };
    }

    // Validate email
    if (!request.email || !request.email.includes('@')) {
      return { valid: false, error: 'Invalid email' };
    }

    return { valid: true };
  }

  /**
   * Create pending transaction record in database
   */
  private static async createPendingTransaction(
    request: PaymentInitRequest,
    idempotencyKey: string,
    membershipType: 'creator' | 'member' = 'creator'
  ): Promise<string | null> {
    try {
      const tableName = this.getTableName(membershipType);
      const transactionData: any = {
        user_id: request.userId,
        previous_tier: request.currentTier,
        new_tier: request.targetTier,
        amount: request.amount,
        currency: 'USD',
        billing_cycle: request.billingCycle,
        payment_method: request.paymentMethod,
        gateway: this.selectGateway(request.paymentMethod),
        status: 'pending',
        payment_status: 'pending',
        idempotency_key: idempotencyKey,
        ip_address: request.ipAddress,
        user_agent: request.userAgent,
        initiated_at: new Date().toISOString(),
        metadata: {
          phoneNumber: request.phoneNumber,
          userName: request.userName,
        },
      };

      const { data, error } = await supabase
        .from(tableName)
        .insert(transactionData)
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create transaction:', error);
        return null;
      }

      return data?.id;
    } catch (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
  }

  /**
   * Call backend API to initialize payment with gateway
   * This is where sensitive operations happen (API key usage, etc.)
   */
  private static async callBackendPaymentAPI(
    request: PaymentInitRequest,
    transactionId: string,
    idempotencyKey: string,
    membershipType: 'creator' | 'member' = 'creator'
  ): Promise<any> {
    try {
      // Get JWT token for backend authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('User session not found');
      }

      // Call the unified backend API (Supabase Edge Function)
      const response = await fetch(
        'https://nwzbtrueqjwsriymvwqa.supabase.co/functions/v1/initializePaymentUnified',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            membershipType,
            userId: request.userId,
            targetTier: request.targetTier,
            previousTier: request.currentTier,
            amount: request.amount,
            billingCycle: request.billingCycle,
            paymentMethod: request.paymentMethod,
            email: request.email,
            phoneNumber: request.phoneNumber,
            userName: request.userName,
            idempotencyKey,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Payment initialization failed',
          errorCode: errorData.errorCode || 'GATEWAY_ERROR',
        };
      }

      const paymentData = await response.json();
      return {
        success: true,
        gateway: paymentData.gateway,
        sessionId: paymentData.sessionId,
        checkoutUrl: paymentData.checkoutUrl,
        transactionReference: paymentData.transactionId,
      };
    } catch (error) {
      console.error('Backend API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API call failed',
        errorCode: 'API_ERROR',
      };
    }
  }

  /**
   * Update transaction with gateway details
   */
  private static async updateTransactionWithGatewayDetails(
    transactionId: string,
    paymentResponse: any,
    membershipType: 'creator' | 'member' = 'creator'
  ): Promise<void> {
    try {
      const tableName = this.getTableName(membershipType);
      await supabase
        .from(tableName)
        .update({
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          transaction_id: paymentResponse.transactionReference,
          reference_id: paymentResponse.transactionReference,
          metadata: {
            checkoutUrl: paymentResponse.checkoutUrl,
            sessionId: paymentResponse.sessionId,
          },
        })
        .eq('id', transactionId);
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  }

  /**
   * Update transaction status
   */
  private static async updateTransactionStatus(
    transactionId: string,
    status: string,
    membershipType: 'creator' | 'member' = 'creator',
    details?: any
  ): Promise<void> {
    try {
      const tableName = this.getTableName(membershipType);
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (details?.error) {
        updateData.error_message = details.error;
        updateData.error_code = details.errorCode;
        updateData.error_details = details;
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.payment_status = 'completed';
      } else if (status === 'failed') {
        updateData.failed_at = new Date().toISOString();
      }

      await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', transactionId);
    } catch (error) {
      console.error('Error updating transaction status:', error);
    }
  }

  /**
   * Log audit event to consolidated payment_audit_log table with membership_type
   */
  private static async logAuditEvent(
    transactionId: string,
    actionType: string,
    previousStatus: string | null,
    newStatus: string,
    membershipType: 'creator' | 'member' = 'creator',
    details: any = {}
  ): Promise<void> {
    try {
      await supabase
        .from('payment_audit_log')
        .insert({
          membership_type: membershipType,
          transaction_id: transactionId,
          action: `${actionType}_${newStatus}`,
          action_type: actionType,
          previous_status: previousStatus,
          new_status: newStatus,
          details,
        });
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  /**
   * Handle webhook from payment gateway
   */
  static async handleWebhook(webhook: WebhookPayload, membershipType: 'creator' | 'member' = 'creator'): Promise<void> {
    try {
      // Log webhook received
      const tableName = this.getTableName(membershipType);
      const { data: transaction, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('transaction_id', webhook.transactionId)
        .single();

      if (fetchError || !transaction) {
        console.error('Transaction not found for webhook:', webhook.transactionId);
        return;
      }

      // Record webhook event
      await this.recordWebhookEvent(webhook, transaction.id, membershipType);

      // Handle based on event type
      if (webhook.status === 'completed' || webhook.status === 'success') {
        await this.completePayment(transaction.id, webhook.transactionId, membershipType);
      } else if (webhook.status === 'failed') {
        await this.failPayment(transaction.id, webhook.payload.error, membershipType);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
    }
  }

  /**
   * Record webhook event to consolidated webhook_events table with membership_type
   */
  private static async recordWebhookEvent(
    webhook: WebhookPayload,
    transactionId: string,
    membershipType: 'creator' | 'member' = 'creator'
  ): Promise<void> {
    try {
      await supabase
        .from('webhook_events')
        .insert({
          membership_type: membershipType,
          transaction_id: transactionId,
          event_id: webhook.eventId,
          event_type: webhook.eventType,
          source: webhook.source,
          payload: webhook.payload,
          signature: webhook.signature,
          status: 'received',
        });
    } catch (error) {
      console.error('Error recording webhook event:', error);
    }
  }

  /**
   * Complete payment and upgrade membership
   */
  private static async completePayment(
    transactionId: string,
    gatewayTransactionId: string,
    membershipType: 'creator' | 'member' = 'creator'
  ): Promise<void> {
    try {
      const tableName = this.getTableName(membershipType);
      const { data: transaction } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', transactionId)
        .single();

      if (!transaction) return;

      // Update transaction status
      await this.updateTransactionStatus(transactionId, 'completed', membershipType);

      // Update user tier
      await supabase
        .from('profiles')
        .update({
          tier: transaction.new_tier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.user_id);

      // Log audit event
      await this.logAuditEvent(transactionId, 'complete', 'processing', 'completed', membershipType, {
        gatewayTransactionId,
      });

      // Send confirmation email (implement this)
      // await this.sendConfirmationEmail(transaction);
    } catch (error) {
      console.error('Error completing payment:', error);
    }
  }

  /**
   * Fail payment
   */
  private static async failPayment(
    transactionId: string,
    error: string,
    membershipType: 'creator' | 'member' = 'creator'
  ): Promise<void> {
    try {
      await this.updateTransactionStatus(transactionId, 'failed', membershipType, {
        error: error || 'Payment declined by gateway',
      });

      await this.logAuditEvent(transactionId, 'fail', 'processing', 'failed', membershipType, {
        error,
      });
    } catch (err) {
      console.error('Error failing payment:', err);
    }
  }

  /**
   * Get transaction status (for polling)
   */
  static async getTransactionStatus(
    transactionId: string
  ): Promise<{ status: string; paymentStatus: string; error?: string } | null> {
    try {
      // Try creators_membership first
      try {
        const { data: creatorData } = await supabase
          .from('creators_membership')
          .select('status, payment_status, error_message')
          .eq('id', transactionId)
          .single();

        if (creatorData) {
          return {
            status: creatorData.status,
            paymentStatus: creatorData.payment_status,
            error: creatorData.error_message,
          };
        }
      } catch {
        // Not found in creators_membership, continue to members_membership
      }

      // Try members_membership
      try {
        const { data: memberData } = await supabase
          .from('members_membership')
          .select('status, payment_status, error_message')
          .eq('id', transactionId)
          .single();

        if (memberData) {
          return {
            status: memberData.status,
            paymentStatus: memberData.payment_status,
            error: memberData.error_message,
          };
        }
      } catch {
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error fetching transaction status:', error);
      return null;
    }
  }

  /**
   * Select gateway based on payment method
   */
  private static selectGateway(paymentMethod: PaymentMethodType): 'eversend' | 'flutterwave' {
    const gatewayMap: Record<PaymentMethodType, 'eversend' | 'flutterwave'> = {
      card: 'eversend',
      mobile_money: 'eversend',
      express_pay: 'flutterwave',
    };
    return gatewayMap[paymentMethod] || 'eversend';
  }
}
