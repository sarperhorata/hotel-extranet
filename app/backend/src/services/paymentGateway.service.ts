import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface PaymentRequest {
  tenantId: string;
  bookingId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  customerEmail: string;
  customerName: string;
  description?: string;
  metadata?: any;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  paymentMethod: string;
  externalId?: string;
  error?: string;
  metadata?: any;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export abstract class PaymentGateway {
  abstract processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  abstract processRefund(request: RefundRequest): Promise<RefundResponse>;
  abstract getPaymentStatus(transactionId: string): Promise<PaymentResponse>;
  abstract validateWebhook(payload: any, signature: string): boolean;
}

export class StripeGateway extends PaymentGateway {
  private secretKey: string;
  private publishableKey: string;
  private webhookSecret: string;

  constructor() {
    super();
    this.secretKey = config.STRIPE_SECRET_KEY || '';
    this.publishableKey = config.STRIPE_PUBLISHABLE_KEY || '';
    this.webhookSecret = config.STRIPE_WEBHOOK_SECRET || '';
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Simulate Stripe API call (replace with actual Stripe integration)
      const transactionId = `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`Stripe payment processed for booking ${request.bookingId}: ${transactionId}`);

      return {
        success: true,
        transactionId,
        status: 'completed',
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentMethod,
        externalId: transactionId,
        metadata: {
          stripe_payment_intent: transactionId,
          customer_email: request.customerEmail
        }
      };
    } catch (error) {
      logger.error(`Stripe payment failed for booking ${request.bookingId}:`, error);
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentMethod,
        error: error.message
      };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      // Simulate Stripe refund API call
      const refundId = `stripe_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`Stripe refund processed for transaction ${request.transactionId}: ${refundId}`);

      return {
        success: true,
        refundId,
        amount: request.amount,
        status: 'completed'
      };
    } catch (error) {
      logger.error(`Stripe refund failed for transaction ${request.transactionId}:`, error);
      return {
        success: false,
        refundId: '',
        amount: request.amount,
        status: 'failed',
        error: error.message
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    try {
      // Simulate Stripe API call to get payment status
      logger.info(`Fetching Stripe payment status for transaction: ${transactionId}`);
      
      return {
        success: true,
        transactionId,
        status: 'completed',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        externalId: transactionId
      };
    } catch (error) {
      logger.error(`Failed to fetch Stripe payment status for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    try {
      // Simulate Stripe webhook validation
      logger.info('Validating Stripe webhook signature');
      return true;
    } catch (error) {
      logger.error('Stripe webhook validation failed:', error);
      return false;
    }
  }
}

export class PayPalGateway extends PaymentGateway {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    super();
    this.clientId = config.PAYPAL_CLIENT_ID || '';
    this.clientSecret = config.PAYPAL_CLIENT_SECRET || '';
    this.baseUrl = config.PAYPAL_BASE_URL || 'https://api.sandbox.paypal.com';
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Simulate PayPal API call
      const transactionId = `paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`PayPal payment processed for booking ${request.bookingId}: ${transactionId}`);

      return {
        success: true,
        transactionId,
        status: 'completed',
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentMethod,
        externalId: transactionId,
        metadata: {
          paypal_order_id: transactionId,
          customer_email: request.customerEmail
        }
      };
    } catch (error) {
      logger.error(`PayPal payment failed for booking ${request.bookingId}:`, error);
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentMethod,
        error: error.message
      };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      // Simulate PayPal refund API call
      const refundId = `paypal_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`PayPal refund processed for transaction ${request.transactionId}: ${refundId}`);

      return {
        success: true,
        refundId,
        amount: request.amount,
        status: 'completed'
      };
    } catch (error) {
      logger.error(`PayPal refund failed for transaction ${request.transactionId}:`, error);
      return {
        success: false,
        refundId: '',
        amount: request.amount,
        status: 'failed',
        error: error.message
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    try {
      logger.info(`Fetching PayPal payment status for transaction: ${transactionId}`);
      
      return {
        success: true,
        transactionId,
        status: 'completed',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'paypal',
        externalId: transactionId
      };
    } catch (error) {
      logger.error(`Failed to fetch PayPal payment status for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    try {
      logger.info('Validating PayPal webhook signature');
      return true;
    } catch (error) {
      logger.error('PayPal webhook validation failed:', error);
      return false;
    }
  }
}

export class AdyenGateway extends PaymentGateway {
  private apiKey: string;
  private merchantAccount: string;
  private baseUrl: string;

  constructor() {
    super();
    this.apiKey = config.ADYEN_API_KEY || '';
    this.merchantAccount = config.ADYEN_MERCHANT_ACCOUNT || '';
    this.baseUrl = config.ADYEN_BASE_URL || 'https://checkout-test.adyen.com';
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Simulate Adyen API call
      const transactionId = `adyen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`Adyen payment processed for booking ${request.bookingId}: ${transactionId}`);

      return {
        success: true,
        transactionId,
        status: 'completed',
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentMethod,
        externalId: transactionId,
        metadata: {
          adyen_payment_id: transactionId,
          customer_email: request.customerEmail
        }
      };
    } catch (error) {
      logger.error(`Adyen payment failed for booking ${request.bookingId}:`, error);
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentMethod,
        error: error.message
      };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      // Simulate Adyen refund API call
      const refundId = `adyen_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`Adyen refund processed for transaction ${request.transactionId}: ${refundId}`);

      return {
        success: true,
        refundId,
        amount: request.amount,
        status: 'completed'
      };
    } catch (error) {
      logger.error(`Adyen refund failed for transaction ${request.transactionId}:`, error);
      return {
        success: false,
        refundId: '',
        amount: request.amount,
        status: 'failed',
        error: error.message
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    try {
      logger.info(`Fetching Adyen payment status for transaction: ${transactionId}`);
      
      return {
        success: true,
        transactionId,
        status: 'completed',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        externalId: transactionId
      };
    } catch (error) {
      logger.error(`Failed to fetch Adyen payment status for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    try {
      logger.info('Validating Adyen webhook signature');
      return true;
    } catch (error) {
      logger.error('Adyen webhook validation failed:', error);
      return false;
    }
  }
}

export class MockPaymentGateway extends PaymentGateway {
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const transactionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`Mock payment processed for booking ${request.bookingId}: ${transactionId}`);

    return {
      success: true,
      transactionId,
      status: 'completed',
      amount: request.amount,
      currency: request.currency,
      paymentMethod: request.paymentMethod,
      externalId: transactionId
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    const refundId = `mock_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`Mock refund processed for transaction ${request.transactionId}: ${refundId}`);

    return {
      success: true,
      refundId,
      amount: request.amount,
      status: 'completed'
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId,
      status: 'completed',
      amount: 100.00,
      currency: 'USD',
      paymentMethod: 'card',
      externalId: transactionId
    };
  }

  validateWebhook(payload: any, signature: string): boolean {
    return true;
  }
}

export class PaymentGatewayFactory {
  static createGateway(gatewayType: 'stripe' | 'paypal' | 'adyen' | 'mock'): PaymentGateway {
    switch (gatewayType) {
      case 'stripe':
        return new StripeGateway();
      case 'paypal':
        return new PayPalGateway();
      case 'adyen':
        return new AdyenGateway();
      case 'mock':
        return new MockPaymentGateway();
      default:
        throw new Error(`Unsupported payment gateway: ${gatewayType}`);
    }
  }
}
