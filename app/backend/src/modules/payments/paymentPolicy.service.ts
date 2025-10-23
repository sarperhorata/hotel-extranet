import { query, transaction } from '../../config/database';
import { logger } from '../../utils/logger';

export interface PaymentPolicy {
  id: string;
  tenantId: string;
  name: string;
  policyType: 'deposit' | 'full_payment' | 'no_payment';
  depositPercentage?: number;
  depositAmount?: number;
  paymentDeadline: number; // Days before check-in
  vccExpiryDays: number;
  autoCloseCard: boolean;
  closeCardAfterDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export class PaymentPolicyService {
  /**
   * Get payment policy for a booking
   */
  static async getPaymentPolicy(tenantId: string, bookingId: string): Promise<PaymentPolicy | null> {
    const result = await query(`
      SELECT 
        pp.id, pp.tenant_id, pp.name, pp.policy_type, pp.deposit_percentage,
        pp.deposit_amount, pp.payment_deadline, pp.vcc_expiry_days,
        pp.auto_close_card, pp.close_card_after_days, pp.is_active,
        pp.created_at, pp.updated_at
      FROM payment_policies pp
      JOIN bookings b ON b.tenant_id = pp.tenant_id
      WHERE pp.tenant_id = $1 AND b.id = $2 AND pp.is_active = true
      ORDER BY pp.created_at DESC
      LIMIT 1
    `, [tenantId, bookingId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      policyType: row.policy_type,
      depositPercentage: row.deposit_percentage,
      depositAmount: row.deposit_amount,
      paymentDeadline: row.payment_deadline,
      vccExpiryDays: row.vcc_expiry_days,
      autoCloseCard: row.auto_close_card,
      closeCardAfterDays: row.close_card_after_days,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Calculate payment amount based on policy
   */
  static calculatePaymentAmount(policy: PaymentPolicy, bookingAmount: number): number {
    switch (policy.policyType) {
      case 'full_payment':
        return bookingAmount;
      
      case 'deposit':
        if (policy.depositPercentage) {
          return (bookingAmount * policy.depositPercentage) / 100;
        } else if (policy.depositAmount) {
          return Math.min(policy.depositAmount, bookingAmount);
        }
        return bookingAmount;
      
      case 'no_payment':
        return 0;
      
      default:
        return bookingAmount;
    }
  }

  /**
   * Check if payment is required based on policy
   */
  static isPaymentRequired(policy: PaymentPolicy, checkInDate: Date): boolean {
    if (policy.policyType === 'no_payment') {
      return false;
    }

    const today = new Date();
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilCheckIn <= policy.paymentDeadline;
  }

  /**
   * Generate VCC with policy-based configuration
   */
  static async generateVCCWithPolicy(
    tenantId: string,
    bookingId: string,
    policy: PaymentPolicy,
    bookingAmount: number
  ): Promise<any> {
    const paymentAmount = this.calculatePaymentAmount(policy, bookingAmount);
    
    if (paymentAmount === 0) {
      return null; // No payment required
    }

    // Generate VCC details
    const vccNumber = `4${Math.random().toString().substr(2, 15)}`;
    const cvv = Math.floor(Math.random() * 900) + 100;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + policy.vccExpiryDays);
    
    const vccDetails = {
      cardNumber: vccNumber,
      cvv: cvv.toString(),
      expiryMonth: (expiryDate.getMonth() + 1).toString().padStart(2, '0'),
      expiryYear: expiryDate.getFullYear().toString(),
      cardholderName: 'HOTEL BOOKING',
      amount: paymentAmount,
      currency: 'USD',
      policyId: policy.id,
      autoClose: policy.autoCloseCard,
      closeAfterDays: policy.closeCardAfterDays
    };

    // Create payment record
    const paymentResult = await query(`
      INSERT INTO payments (
        tenant_id, booking_id, payment_type, amount, currency,
        payment_method, payment_status, vcc_details, description
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING id, payment_reference, amount, currency, payment_status, created_at
    `, [
      tenantId, bookingId, 'vcc', paymentAmount, 'USD',
      'virtual_card', 'generated', vccDetails, `Payment for booking ${bookingId}`
    ]);

    const payment = paymentResult.rows[0];

    // Create VCC balance record
    await query(`
      INSERT INTO vcc_balances (
        payment_id, tenant_id, original_amount, current_balance,
        used_amount, currency, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `, [
      payment.id, tenantId, paymentAmount, paymentAmount,
      0, 'USD', 'active'
    ]);

    logger.info(`VCC generated with policy ${policy.name} for booking ${bookingId}: ${payment.payment_reference}`);

    return {
      paymentId: payment.id,
      paymentReference: payment.payment_reference,
      vccDetails,
      policy
    };
  }

  /**
   * Update VCC balance after usage
   */
  static async updateVCCBalance(
    paymentId: string,
    usedAmount: number,
    tenantId: string
  ): Promise<boolean> {
    try {
      await transaction(async (client) => {
        // Get current balance
        const balanceResult = await client.query(`
          SELECT current_balance, used_amount FROM vcc_balances
          WHERE payment_id = $1 AND tenant_id = $2 AND status = 'active'
        `, [paymentId, tenantId]);

        if (balanceResult.rows.length === 0) {
          throw new Error('VCC balance not found');
        }

        const currentBalance = parseFloat(balanceResult.rows[0].current_balance);
        const currentUsed = parseFloat(balanceResult.rows[0].used_amount);

        if (usedAmount > currentBalance) {
          throw new Error('Insufficient balance on VCC');
        }

        const newBalance = currentBalance - usedAmount;
        const newUsed = currentUsed + usedAmount;

        // Update balance
        await client.query(`
          UPDATE vcc_balances
          SET current_balance = $1, used_amount = $2, updated_at = CURRENT_TIMESTAMP
          WHERE payment_id = $3 AND tenant_id = $4
        `, [newBalance, newUsed, paymentId, tenantId]);

        // Check if card should be closed
        if (newBalance <= 0) {
          await client.query(`
            UPDATE vcc_balances
            SET status = 'closed', closed_at = CURRENT_TIMESTAMP
            WHERE payment_id = $1 AND tenant_id = $2
          `, [paymentId, tenantId]);
        }
      });

      logger.info(`VCC balance updated for payment ${paymentId}: used ${usedAmount}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update VCC balance for payment ${paymentId}:`, error);
      return false;
    }
  }

  /**
   * Auto-close VCC cards based on policy
   */
  static async autoCloseVCCCards(tenantId: string): Promise<void> {
    try {
      // Find cards that should be closed
      const cardsToClose = await query(`
        SELECT vb.payment_id, vb.created_at, pp.close_card_after_days
        FROM vcc_balances vb
        JOIN payments p ON vb.payment_id = p.id
        JOIN payment_policies pp ON p.tenant_id = pp.tenant_id
        WHERE vb.tenant_id = $1 
        AND vb.status = 'active'
        AND pp.auto_close_card = true
        AND vb.created_at + INTERVAL '${pp.close_card_after_days} days' <= CURRENT_TIMESTAMP
      `, [tenantId]);

      for (const card of cardsToClose.rows) {
        await query(`
          UPDATE vcc_balances
          SET status = 'closed', closed_at = CURRENT_TIMESTAMP
          WHERE payment_id = $1 AND tenant_id = $2
        `, [card.payment_id, tenantId]);

        logger.info(`VCC card auto-closed: ${card.payment_id}`);
      }

      logger.info(`Auto-closed ${cardsToClose.rows.length} VCC cards for tenant ${tenantId}`);
    } catch (error) {
      logger.error(`Failed to auto-close VCC cards for tenant ${tenantId}:`, error);
    }
  }

  /**
   * Get VCC balance for a payment
   */
  static async getVCCBalance(paymentId: string, tenantId: string): Promise<VCCBalance | null> {
    const result = await query(`
      SELECT 
        vb.payment_id as card_id, vb.original_amount, vb.current_balance,
        vb.used_amount, vb.currency, vb.status, vb.created_at, vb.closed_at
      FROM vcc_balances vb
      WHERE vb.payment_id = $1 AND vb.tenant_id = $2
    `, [paymentId, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      cardId: row.card_id,
      originalAmount: parseFloat(row.original_amount),
      currentBalance: parseFloat(row.current_balance),
      usedAmount: parseFloat(row.used_amount),
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      closedAt: row.closed_at
    };
  }

  /**
   * Create payment policy
   */
  static async createPaymentPolicy(
    tenantId: string,
    policyData: Omit<PaymentPolicy, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<PaymentPolicy> {
    const result = await query(`
      INSERT INTO payment_policies (
        tenant_id, name, policy_type, deposit_percentage, deposit_amount,
        payment_deadline, vcc_expiry_days, auto_close_card, close_card_after_days, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING id, tenant_id, name, policy_type, deposit_percentage, deposit_amount,
                payment_deadline, vcc_expiry_days, auto_close_card, close_card_after_days,
                is_active, created_at, updated_at
    `, [
      tenantId, policyData.name, policyData.policyType, policyData.depositPercentage,
      policyData.depositAmount, policyData.paymentDeadline, policyData.vccExpiryDays,
      policyData.autoCloseCard, policyData.closeCardAfterDays, policyData.isActive
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      policyType: row.policy_type,
      depositPercentage: row.deposit_percentage,
      depositAmount: row.deposit_amount,
      paymentDeadline: row.payment_deadline,
      vccExpiryDays: row.vcc_expiry_days,
      autoCloseCard: row.auto_close_card,
      closeCardAfterDays: row.close_card_after_days,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
