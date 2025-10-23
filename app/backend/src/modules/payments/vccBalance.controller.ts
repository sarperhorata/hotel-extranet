import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  validationErrorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { PaymentPolicyService } from './paymentPolicy.service';

// Get VCC balance for a payment
export const getVCCBalance = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;

  const balance = await PaymentPolicyService.getVCCBalance(paymentId, tenantId);

  if (!balance) {
    return notFoundResponse(res, 'VCC balance not found');
  }

  return successResponse(res, balance, 'VCC balance retrieved successfully');
});

// Update VCC balance (after usage)
export const updateVCCBalance = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;
  const { usedAmount } = req.body;

  if (!usedAmount || usedAmount <= 0) {
    return validationErrorResponse(res, ['Used amount must be greater than 0']);
  }

  const success = await PaymentPolicyService.updateVCCBalance(paymentId, usedAmount, tenantId);

  if (!success) {
    return errorResponse(res, 'Failed to update VCC balance', 500);
  }

  // Get updated balance
  const updatedBalance = await PaymentPolicyService.getVCCBalance(paymentId, tenantId);

  return successResponse(res, updatedBalance, 'VCC balance updated successfully');
});

// Auto-close VCC cards based on policy
export const autoCloseVCCCards = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;

  await PaymentPolicyService.autoCloseVCCCards(tenantId);

  return successResponse(res, null, 'VCC cards auto-close process completed');
});

// Get all VCC balances for tenant
export const getAllVCCBalances = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { status, page = 1, limit = 10 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE vb.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND vb.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const balancesResult = await query(`
    SELECT 
      vb.id, vb.payment_id, vb.original_amount, vb.current_balance,
      vb.used_amount, vb.currency, vb.status, vb.created_at, vb.closed_at,
      p.payment_reference, b.booking_reference
    FROM vcc_balances vb
    JOIN payments p ON vb.payment_id = p.id
    JOIN bookings b ON p.booking_id = b.id
    ${whereClause}
    ORDER BY vb.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM vcc_balances vb
    ${whereClause}
  `, params);

  const balances = balancesResult.rows.map(row => ({
    id: row.id,
    paymentId: row.payment_id,
    paymentReference: row.payment_reference,
    bookingReference: row.booking_reference,
    originalAmount: parseFloat(row.original_amount),
    currentBalance: parseFloat(row.current_balance),
    usedAmount: parseFloat(row.used_amount),
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    closedAt: row.closed_at
  }));

  return successResponse(res, {
    balances,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].total),
      pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
    }
  }, 'VCC balances retrieved successfully');
});

// Close VCC card manually
export const closeVCCCard = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;

  const result = await query(`
    UPDATE vcc_balances
    SET status = 'closed', closed_at = CURRENT_TIMESTAMP
    WHERE payment_id = $1 AND tenant_id = $2 AND status = 'active'
    RETURNING id, current_balance, used_amount
  `, [paymentId, tenantId]);

  if (result.rows.length === 0) {
    return notFoundResponse(res, 'VCC card not found or already closed');
  }

  const balance = result.rows[0];

  logger.info(`VCC card manually closed: ${paymentId}, balance: ${balance.current_balance}`);

  return successResponse(res, {
    paymentId,
    finalBalance: parseFloat(balance.current_balance),
    usedAmount: parseFloat(balance.used_amount),
    closedAt: new Date().toISOString()
  }, 'VCC card closed successfully');
});

// Get VCC usage statistics
export const getVCCUsageStats = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { startDate, endDate } = req.query;

  let whereClause = 'WHERE vb.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (startDate) {
    whereClause += ` AND vb.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND vb.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_cards,
      SUM(original_amount) as total_original_amount,
      SUM(current_balance) as total_current_balance,
      SUM(used_amount) as total_used_amount,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_cards,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_cards,
      COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_cards
    FROM vcc_balances vb
    ${whereClause}
  `, params);

  const stats = statsResult.rows[0];

  return successResponse(res, {
    totalCards: parseInt(stats.total_cards),
    totalOriginalAmount: parseFloat(stats.total_original_amount || '0'),
    totalCurrentBalance: parseFloat(stats.total_current_balance || '0'),
    totalUsedAmount: parseFloat(stats.total_used_amount || '0'),
    activeCards: parseInt(stats.active_cards),
    closedCards: parseInt(stats.closed_cards),
    expiredCards: parseInt(stats.expired_cards),
    utilizationRate: stats.total_original_amount > 0 
      ? (parseFloat(stats.total_used_amount || '0') / parseFloat(stats.total_original_amount)) * 100 
      : 0
  }, 'VCC usage statistics retrieved successfully');
});
