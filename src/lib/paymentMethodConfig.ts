/**
 * Payment Methods Configuration
 * Maps user-facing payment methods to their underlying payment gateways
 */

export type PaymentMethodType = 'card' | 'mobile_money' | 'express_pay';
export type PaymentGateway = 'eversend' | 'flutterwave';

export interface PaymentMethod {
  id: PaymentMethodType;
  name: string;
  description: string;
  icon: string;
  primaryGateway: PaymentGateway;
  secondaryGateway?: PaymentGateway;
  supportedCurrencies: string[];
  trustSignals: string[];
  tips: string;
}

export const PAYMENT_METHODS: Record<PaymentMethodType, PaymentMethod> = {
  card: {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, and other major card networks',
    icon: '💳',
    primaryGateway: 'eversend',
    secondaryGateway: 'flutterwave',
    supportedCurrencies: ['UGX', 'USD', 'GHS', 'KES', 'TZS'],
    trustSignals: ['Visa', 'Mastercard', 'Secure'],
    tips: 'Use your credit or debit card for instant payment.',
  },
  mobile_money: {
    id: 'mobile_money',
    name: 'Mobile Money',
    description: 'M-Pesa, Airtel Money, and other mobile money services',
    icon: '📲',
    primaryGateway: 'eversend',
    secondaryGateway: 'flutterwave',
    supportedCurrencies: ['UGX', 'KES', 'TZS', 'GHS'],
    trustSignals: ['M-Pesa', 'Airtel Money', 'Secure'],
    tips: 'Quick and secure payment using your mobile money account.',
  },
  express_pay: {
    id: 'express_pay',
    name: 'Express Pay',
    description: 'PayPal, Google Pay, and Apple Pay',
    icon: '💳',
    primaryGateway: 'flutterwave',
    secondaryGateway: 'eversend',
    supportedCurrencies: ['UGX', 'USD', 'EUR', 'GBP', 'KES', 'GHS'],
    trustSignals: ['PayPal', 'Google Pay', 'Apple Pay'],
    tips: 'Fast and secure digital wallet payments.',
  },
};

export const PAYMENT_METHOD_OPTIONS = Object.values(PAYMENT_METHODS);

/**
 * Get the appropriate gateway for a payment method
 * @param method The selected payment method
 * @returns The gateway to use (primary or secondary)
 */
export function selectGateway(method: PaymentMethodType): PaymentGateway {
  const paymentMethod = PAYMENT_METHODS[method];
  if (!paymentMethod) return 'eversend';
  return paymentMethod.primaryGateway;
}


/**
 * Validate payment method for currency
 */
export function isMethodSupportedForCurrency(
  method: PaymentMethodType,
  currency: string
): boolean {
  const paymentMethod = PAYMENT_METHODS[method];
  if (!paymentMethod) return false;
  return paymentMethod.supportedCurrencies.includes(currency);
}
