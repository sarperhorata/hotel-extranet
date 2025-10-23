import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  errorResponse, 
  createdResponse,
  updatedResponse,
  deletedResponse,
  notFoundResponse,
  validationErrorResponse,
  paginatedResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { PaymentPolicyService } from './paymentPolicy.service';

// Get all payment policies
export const getPaymentPolicies = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { 
    page = 1, 
    limit = 10, 
    policyType,
    isActive = 'true'
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE pp.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (policyType) {
    whereClause += ` AND pp.policy_type = $${paramIndex}`;
    params.push(policyType);
    paramIndex++;
  }

  if (isActive !== 'all') {
    whereClause += ` AND pp.is_active = $${paramIndex}`;
    params.push(isActive === 'true');
    paramIndex++;
  }

  const policiesResult = await query(`
    SELECT 
      pp.id, pp.name, pp.policy_type, pp.deposit_percentage, pp.deposit_amount,
      pp.payment_deadline, pp.vcc_expiry_days, pp.auto_close_card, pp.close_card_after_days,
      pp.is_active, pp.created_at, pp.updated_at
    FROM payment_policies pp
    ${whereClause}
    ORDER BY pp.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM payment_policies pp
    ${whereClause}
  `, params);

  const policies = policiesResult.rows.map(row => ({
    id: row.id,
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
  }));

  return paginatedResponse(res, policies, {
    page: Number(page),
    limit: Number(limit),
    total: parseInt(countResult.rows[0].total),
    pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
  });
});

// Get payment policy by ID
export const getPaymentPolicy = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const policyId = req.params.id;

  const result = await query(`
    SELECT 
      pp.id, pp.name, pp.policy_type, pp.deposit_percentage, pp.deposit_amount,
      pp.payment_deadline, pp.vcc_expiry_days, pp.auto_close_card, pp.close_card_after_days,
      pp.is_active, pp.created_at, pp.updated_at
    FROM payment_policies pp
    WHERE pp.id = $1 AND pp.tenant_id = $2
  `, [policyId, tenantId]);

  if (result.rows.length === 0) {
    return notFoundResponse(res, 'Payment policy not found');
  }

  const row = result.rows[0];
  const policy = {
    id: row.id,
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

  return successResponse(res, policy, 'Payment policy retrieved successfully');
});

// Create payment policy
export const createPaymentPolicy = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    name,
    policyType,
    depositPercentage,
    depositAmount,
    paymentDeadline,
    vccExpiryDays = 30,
    autoCloseCard = true,
    closeCardAfterDays = 1,
    isActive = true
  } = req.body;

  // Validate required fields
  if (!name || !policyType) {
    return validationErrorResponse(res, ['Name and policy type are required']);
  }

  // Validate policy type specific fields
  if (policyType === 'deposit') {
    if (!depositPercentage && !depositAmount) {
      return validationErrorResponse(res, ['Deposit percentage or amount is required for deposit policy']);
    }
  }

  // Check if policy name already exists
  const existingPolicy = await query(
    'SELECT id FROM payment_policies WHERE name = $1 AND tenant_id = $2',
    [name, tenantId]
  );

  if (existingPolicy.rows.length > 0) {
    return errorResponse(res, 'Payment policy name already exists', 409);
  }

  const policy = await PaymentPolicyService.createPaymentPolicy(tenantId, {
    name,
    policyType,
    depositPercentage,
    depositAmount,
    paymentDeadline,
    vccExpiryDays,
    autoCloseCard,
    closeCardAfterDays,
    isActive
  });

  logger.info(`Payment policy created: ${policy.name} (${policy.policyType}) for tenant ${tenantId}`);

  return createdResponse(res, policy, 'Payment policy created successfully');
});

// Update payment policy
export const updatePaymentPolicy = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const policyId = req.params.id;
  const {
    name,
    policyType,
    depositPercentage,
    depositAmount,
    paymentDeadline,
    vccExpiryDays,
    autoCloseCard,
    closeCardAfterDays,
    isActive
  } = req.body;

  // Check if policy exists
  const existingPolicy = await query(
    'SELECT id FROM payment_policies WHERE id = $1 AND tenant_id = $2',
    [policyId, tenantId]
  );

  if (existingPolicy.rows.length === 0) {
    return notFoundResponse(res, 'Payment policy not found');
  }

  // Check if name already exists (if changed)
  if (name) {
    const nameCheck = await query(
      'SELECT id FROM payment_policies WHERE name = $1 AND tenant_id = $2 AND id != $3',
      [name, tenantId, policyId]
    );

    if (nameCheck.rows.length > 0) {
      return errorResponse(res, 'Payment policy name already exists', 409);
    }
  }

  const result = await query(`
    UPDATE payment_policies
    SET 
      name = COALESCE($1, name),
      policy_type = COALESCE($2, policy_type),
      deposit_percentage = COALESCE($3, deposit_percentage),
      deposit_amount = COALESCE($4, deposit_amount),
      payment_deadline = COALESCE($5, payment_deadline),
      vcc_expiry_days = COALESCE($6, vcc_expiry_days),
      auto_close_card = COALESCE($7, auto_close_card),
      close_card_after_days = COALESCE($8, close_card_after_days),
      is_active = COALESCE($9, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $10 AND tenant_id = $11
    RETURNING id, name, policy_type, deposit_percentage, deposit_amount,
              payment_deadline, vcc_expiry_days, auto_close_card, close_card_after_days,
              is_active, created_at, updated_at
  `, [
    name, policyType, depositPercentage, depositAmount, paymentDeadline,
    vccExpiryDays, autoCloseCard, closeCardAfterDays, isActive, policyId, tenantId
  ]);

  const row = result.rows[0];
  const policy = {
    id: row.id,
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

  logger.info(`Payment policy updated: ${policy.name} for tenant ${tenantId}`);

  return updatedResponse(res, policy, 'Payment policy updated successfully');
});

// Delete payment policy
export const deletePaymentPolicy = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const policyId = req.params.id;

  // Check if policy exists
  const existingPolicy = await query(
    'SELECT id FROM payment_policies WHERE id = $1 AND tenant_id = $2',
    [policyId, tenantId]
  );

  if (existingPolicy.rows.length === 0) {
    return notFoundResponse(res, 'Payment policy not found');
  }

  // Soft delete (set inactive)
  await query(`
    UPDATE payment_policies
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND tenant_id = $2
  `, [policyId, tenantId]);

  logger.info(`Payment policy deleted: ${policyId} for tenant ${tenantId}`);

  return deletedResponse(res, null, 'Payment policy deleted successfully');
});

// Get payment policy for booking
export const getPaymentPolicyForBooking = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const bookingId = req.params.bookingId;

  const policy = await PaymentPolicyService.getPaymentPolicy(tenantId, bookingId);

  if (!policy) {
    return notFoundResponse(res, 'No payment policy found for this booking');
  }

  return successResponse(res, policy, 'Payment policy retrieved successfully');
});

// Calculate payment amount for booking
export const calculatePaymentAmount = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const bookingId = req.params.bookingId;

  // Get booking details
  const bookingResult = await query(
    'SELECT total_amount, check_in_date FROM bookings WHERE id = $1 AND tenant_id = $2',
    [bookingId, tenantId]
  );

  if (bookingResult.rows.length === 0) {
    return notFoundResponse(res, 'Booking not found');
  }

  const booking = bookingResult.rows[0];
  const policy = await PaymentPolicyService.getPaymentPolicy(tenantId, bookingId);

  if (!policy) {
    return notFoundResponse(res, 'No payment policy found for this booking');
  }

  const paymentAmount = PaymentPolicyService.calculatePaymentAmount(policy, parseFloat(booking.total_amount));
  const isRequired = PaymentPolicyService.isPaymentRequired(policy, new Date(booking.check_in_date));

  return successResponse(res, {
    policy,
    bookingAmount: parseFloat(booking.total_amount),
    paymentAmount,
    isRequired,
    checkInDate: booking.check_in_date
  }, 'Payment calculation completed successfully');
});
