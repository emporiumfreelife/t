/**
 * Webhook Verification Service
 * Securely verifies webhook signatures from payment gateways
 * Prevents spoofing and ensures authenticity
 */

import crypto from 'crypto';

export class WebhookVerification {
  /**
   * Verify Eversend webhook signature
   * Eversend uses HMAC-SHA256 signing
   */
  static verifyEversendSignature(
    payload: any,
    signature: string,
    secret: string
  ): boolean {
    try {
      // Convert payload to JSON string if it's an object
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

      // Create HMAC SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      // Use constant-time comparison to prevent timing attacks
      return this.constantTimeCompare(signature, expectedSignature);
    } catch (error) {
      console.error('Eversend signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify Flutterwave webhook signature
   * Flutterwave uses HMAC-SHA256 signing
   */
  static verifyFlutterwaveSignature(
    payload: any,
    signature: string,
    secret: string
  ): boolean {
    try {
      // Convert payload to JSON string if it's an object
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

      // Create HMAC SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      // Use constant-time comparison
      return this.constantTimeCompare(signature, expectedSignature);
    } catch (error) {
      console.error('Flutterwave signature verification failed:', error);
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a First string to compare
   * @param b Second string to compare
   * @returns True if strings are equal
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Validate webhook source and extract data
   */
  static extractWebhookData(
    source: 'eversend' | 'flutterwave',
    payload: any
  ): {
    valid: boolean;
    transactionId?: string;
    status?: string;
    amount?: number;
    eventType?: string;
    error?: string;
  } {
    try {
      if (source === 'eversend') {
        return this.extractEversendData(payload);
      } else if (source === 'flutterwave') {
        return this.extractFlutterwaveData(payload);
      }

      return { valid: false, error: 'Unknown webhook source' };
    } catch (error) {
      console.error('Error extracting webhook data:', error);
      return { valid: false, error: 'Failed to extract webhook data' };
    }
  }

  /**
   * Extract transaction data from Eversend webhook
   */
  private static extractEversendData(payload: any) {
    try {
      const {
        reference, // Transaction reference ID
        status, // completed, failed, pending
        amount,
        phoneNumber,
        timestamp,
      } = payload;

      if (!reference || !status) {
        return { valid: false, error: 'Missing required fields' };
      }

      return {
        valid: true,
        transactionId: reference,
        status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'pending',
        amount: parseFloat(amount) || 0,
        eventType: 'transaction_status_updated',
      };
    } catch (error) {
      return { valid: false, error: 'Failed to parse Eversend webhook' };
    }
  }

  /**
   * Extract transaction data from Flutterwave webhook
   */
  private static extractFlutterwaveData(payload: any) {
    try {
      const {
        data: {
          id, // Transaction ID
          status, // successful, failed, pending
          amount,
          customer,
        },
        event,
      } = payload;

      if (!id || !status) {
        return { valid: false, error: 'Missing required fields' };
      }

      // Map Flutterwave status to standard status
      const statusMap: Record<string, string> = {
        successful: 'completed',
        failed: 'failed',
        pending: 'pending',
      };

      return {
        valid: true,
        transactionId: id.toString(),
        status: statusMap[status] || status,
        amount: parseFloat(amount) || 0,
        eventType: event || 'charge.completed',
      };
    } catch (error) {
      return { valid: false, error: 'Failed to parse Flutterwave webhook' };
    }
  }

  /**
   * Check for webhook replay attacks
   * Ensures same webhook isn't processed twice
   */
  static async checkWebhookReplay(
    eventId: string,
    source: string
  ): Promise<{ isReplay: boolean; message?: string }> {
    // Webhook replay detection is handled by unified webhook handlers
    // (handlePaymentWebhookUnified for creators/members membership)
    return { isReplay: false };
  }

  /**
   * Validate webhook timestamp to prevent replay attacks
   * Webhooks older than 5 minutes are rejected
   */
  static validateWebhookTimestamp(timestamp: number, maxAgeSeconds: number = 300): boolean {
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;

    if (age < 0) {
      console.error('Webhook timestamp is in the future');
      return false;
    }

    if (age > maxAgeSeconds) {
      console.error(`Webhook is too old: ${age} seconds`);
      return false;
    }

    return true;
  }
}
