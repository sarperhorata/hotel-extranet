import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface VCCRequest {
  tenantId: string;
  bookingId: string;
  amount: number;
  currency: string;
  expiryDays: number;
  description?: string;
  cardholderName?: string;
}

export interface VCCResponse {
  success: boolean;
  cardId: string;
  cardNumber: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  amount: number;
  currency: string;
  status: 'active' | 'pending' | 'failed';
  externalId?: string;
  error?: string;
}

export interface VCCBalance {
  cardId: string;
  originalAmount: number;
  currentBalance: number;
  usedAmount: number;
  currency: string;
  status: 'active' | 'closed' | 'expired';
  createdAt: Date;
  closedAt?: Date;
}

export interface VCCUsage {
  cardId: string;
  amount: number;
  description: string;
  merchantName?: string;
  timestamp: Date;
}

export abstract class VCCProvider {
  abstract generateVCC(request: VCCRequest): Promise<VCCResponse>;
  abstract getVCCBalance(cardId: string): Promise<VCCBalance>;
  abstract updateVCCBalance(cardId: string, usedAmount: number): Promise<boolean>;
  abstract closeVCC(cardId: string): Promise<boolean>;
  abstract getVCCUsage(cardId: string): Promise<VCCUsage[]>;
}

export class MarqetaVCCProvider extends VCCProvider {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    super();
    this.apiKey = config.MARQETA_API_KEY || '';
    this.apiSecret = config.MARQETA_API_SECRET || '';
    this.baseUrl = config.MARQETA_BASE_URL || 'https://sandbox-api.marqeta.com/v3';
  }

  async generateVCC(request: VCCRequest): Promise<VCCResponse> {
    try {
      // Simulate Marqeta API call (replace with actual implementation)
      const cardId = `marqeta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const cardNumber = this.generateCardNumber();
      const cvv = this.generateCVV();
      const expiryDate = this.generateExpiryDate(request.expiryDays);

      logger.info(`Marqeta VCC generated for booking ${request.bookingId}: ${cardId}`);

      return {
        success: true,
        cardId,
        cardNumber,
        cvv,
        expiryMonth: expiryDate.month,
        expiryYear: expiryDate.year,
        cardholderName: request.cardholderName || 'HOTEL BOOKING',
        amount: request.amount,
        currency: request.currency,
        status: 'active',
        externalId: cardId
      };
    } catch (error) {
      logger.error(`Marqeta VCC generation failed for booking ${request.bookingId}:`, error);
      return {
        success: false,
        cardId: '',
        cardNumber: '',
        cvv: '',
        expiryMonth: '',
        expiryYear: '',
        cardholderName: '',
        amount: 0,
        currency: '',
        status: 'failed',
        error: error.message
      };
    }
  }

  async getVCCBalance(cardId: string): Promise<VCCBalance> {
    try {
      // Simulate Marqeta API call for balance
      logger.info(`Fetching Marqeta VCC balance for card: ${cardId}`);
      
      return {
        cardId,
        originalAmount: 1000.00,
        currentBalance: 750.00,
        usedAmount: 250.00,
        currency: 'USD',
        status: 'active',
        createdAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to fetch Marqeta VCC balance for card ${cardId}:`, error);
      throw error;
    }
  }

  async updateVCCBalance(cardId: string, usedAmount: number): Promise<boolean> {
    try {
      // Simulate Marqeta API call to update balance
      logger.info(`Updating Marqeta VCC balance for card ${cardId}: used ${usedAmount}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update Marqeta VCC balance for card ${cardId}:`, error);
      return false;
    }
  }

  async closeVCC(cardId: string): Promise<boolean> {
    try {
      // Simulate Marqeta API call to close card
      logger.info(`Closing Marqeta VCC card: ${cardId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to close Marqeta VCC card ${cardId}:`, error);
      return false;
    }
  }

  async getVCCUsage(cardId: string): Promise<VCCUsage[]> {
    try {
      // Simulate Marqeta API call for usage history
      logger.info(`Fetching Marqeta VCC usage for card: ${cardId}`);
      
      return [
        {
          cardId,
          amount: 150.00,
          description: 'Hotel payment',
          merchantName: 'Hotel ABC',
          timestamp: new Date()
        },
        {
          cardId,
          amount: 100.00,
          description: 'Restaurant payment',
          merchantName: 'Restaurant XYZ',
          timestamp: new Date()
        }
      ];
    } catch (error) {
      logger.error(`Failed to fetch Marqeta VCC usage for card ${cardId}:`, error);
      throw error;
    }
  }

  private generateCardNumber(): string {
    // Generate Visa format card number
    return `4${Math.random().toString().substr(2, 15)}`;
  }

  private generateCVV(): string {
    return Math.floor(Math.random() * 900) + 100;
  }

  private generateExpiryDate(expiryDays: number) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    
    return {
      month: (expiryDate.getMonth() + 1).toString().padStart(2, '0'),
      year: expiryDate.getFullYear().toString()
    };
  }
}

export class StripeIssuingVCCProvider extends VCCProvider {
  private secretKey: string;
  private publishableKey: string;

  constructor() {
    super();
    this.secretKey = config.STRIPE_SECRET_KEY || '';
    this.publishableKey = config.STRIPE_PUBLISHABLE_KEY || '';
  }

  async generateVCC(request: VCCRequest): Promise<VCCResponse> {
    try {
      // Simulate Stripe Issuing API call
      const cardId = `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const cardNumber = this.generateCardNumber();
      const cvv = this.generateCVV();
      const expiryDate = this.generateExpiryDate(request.expiryDays);

      logger.info(`Stripe Issuing VCC generated for booking ${request.bookingId}: ${cardId}`);

      return {
        success: true,
        cardId,
        cardNumber,
        cvv,
        expiryMonth: expiryDate.month,
        expiryYear: expiryDate.year,
        cardholderName: request.cardholderName || 'HOTEL BOOKING',
        amount: request.amount,
        currency: request.currency,
        status: 'active',
        externalId: cardId
      };
    } catch (error) {
      logger.error(`Stripe Issuing VCC generation failed for booking ${request.bookingId}:`, error);
      return {
        success: false,
        cardId: '',
        cardNumber: '',
        cvv: '',
        expiryMonth: '',
        expiryYear: '',
        cardholderName: '',
        amount: 0,
        currency: '',
        status: 'failed',
        error: error.message
      };
    }
  }

  async getVCCBalance(cardId: string): Promise<VCCBalance> {
    try {
      logger.info(`Fetching Stripe Issuing VCC balance for card: ${cardId}`);
      
      return {
        cardId,
        originalAmount: 1000.00,
        currentBalance: 750.00,
        usedAmount: 250.00,
        currency: 'USD',
        status: 'active',
        createdAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to fetch Stripe Issuing VCC balance for card ${cardId}:`, error);
      throw error;
    }
  }

  async updateVCCBalance(cardId: string, usedAmount: number): Promise<boolean> {
    try {
      logger.info(`Updating Stripe Issuing VCC balance for card ${cardId}: used ${usedAmount}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update Stripe Issuing VCC balance for card ${cardId}:`, error);
      return false;
    }
  }

  async closeVCC(cardId: string): Promise<boolean> {
    try {
      logger.info(`Closing Stripe Issuing VCC card: ${cardId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to close Stripe Issuing VCC card ${cardId}:`, error);
      return false;
    }
  }

  async getVCCUsage(cardId: string): Promise<VCCUsage[]> {
    try {
      logger.info(`Fetching Stripe Issuing VCC usage for card: ${cardId}`);
      
      return [
        {
          cardId,
          amount: 150.00,
          description: 'Hotel payment',
          merchantName: 'Hotel ABC',
          timestamp: new Date()
        }
      ];
    } catch (error) {
      logger.error(`Failed to fetch Stripe Issuing VCC usage for card ${cardId}:`, error);
      throw error;
    }
  }

  private generateCardNumber(): string {
    return `4${Math.random().toString().substr(2, 15)}`;
  }

  private generateCVV(): string {
    return Math.floor(Math.random() * 900) + 100;
  }

  private generateExpiryDate(expiryDays: number) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    
    return {
      month: (expiryDate.getMonth() + 1).toString().padStart(2, '0'),
      year: expiryDate.getFullYear().toString()
    };
  }
}

export class VCCProviderFactory {
  static createProvider(providerType: 'marqeta' | 'stripe' | 'mock'): VCCProvider {
    switch (providerType) {
      case 'marqeta':
        return new MarqetaVCCProvider();
      case 'stripe':
        return new StripeIssuingVCCProvider();
      case 'mock':
        return new MockVCCProvider();
      default:
        throw new Error(`Unsupported VCC provider: ${providerType}`);
    }
  }
}

export class MockVCCProvider extends VCCProvider {
  async generateVCC(request: VCCRequest): Promise<VCCResponse> {
    const cardId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cardNumber = `4${Math.random().toString().substr(2, 15)}`;
    const cvv = Math.floor(Math.random() * 900) + 100;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + request.expiryDays);

    logger.info(`Mock VCC generated for booking ${request.bookingId}: ${cardId}`);

    return {
      success: true,
      cardId,
      cardNumber,
      cvv,
      expiryMonth: (expiryDate.getMonth() + 1).toString().padStart(2, '0'),
      expiryYear: expiryDate.getFullYear().toString(),
      cardholderName: request.cardholderName || 'HOTEL BOOKING',
      amount: request.amount,
      currency: request.currency,
      status: 'active',
      externalId: cardId
    };
  }

  async getVCCBalance(cardId: string): Promise<VCCBalance> {
    return {
      cardId,
      originalAmount: 1000.00,
      currentBalance: 1000.00,
      usedAmount: 0.00,
      currency: 'USD',
      status: 'active',
      createdAt: new Date()
    };
  }

  async updateVCCBalance(cardId: string, usedAmount: number): Promise<boolean> {
    logger.info(`Mock VCC balance updated for card ${cardId}: used ${usedAmount}`);
    return true;
  }

  async closeVCC(cardId: string): Promise<boolean> {
    logger.info(`Mock VCC card closed: ${cardId}`);
    return true;
  }

  async getVCCUsage(cardId: string): Promise<VCCUsage[]> {
    return [];
  }
}
