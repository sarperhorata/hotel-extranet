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
import { VCCProviderFactory } from '../../services/vccProvider.service';

// Generate VCC using provider
export const generateVCC = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    bookingId,
    amount,
    currency = 'USD',
    expiryDays = 30,
    description,
    cardholderName,
    provider = 'mock' // marqeta, stripe, mock
  } = req.body;

  if (!bookingId || !amount) {
    return validationErrorResponse(res, ['Booking ID and amount are required']);
  }

  // Get booking details
  const bookingResult = await query(
    'SELECT id, booking_reference, total_amount, currency FROM bookings WHERE id = $1 AND tenant_id = $2',
    [bookingId, tenantId]
  );

  if (bookingResult.rows.length === 0) {
    return notFoundResponse(res, 'Booking not found');
  }

  const booking = bookingResult.rows[0];

  // Validate amount
  if (parseFloat(amount) > parseFloat(booking.total_amount)) {
    return errorResponse(res, 'VCC amount cannot exceed booking total', 400);
  }

  // Create VCC provider
  const vccProvider = VCCProviderFactory.createProvider(provider);

  // Generate VCC
  const vccRequest = {
    tenantId,
    bookingId,
    amount: parseFloat(amount),
    currency,
    expiryDays,
    description: description || `Payment for booking ${booking.booking_reference}`,
    cardholderName: cardholderName || 'HOTEL BOOKING'
  };

  const vccResponse = await vccProvider.generateVCC(vccRequest);

  if (!vccResponse.success) {
    return errorResponse(res, `VCC generation failed: ${vccResponse.error}`, 500);
  }

  // Save VCC to database
  const paymentResult = await query(`
    INSERT INTO payments (
      tenant_id, booking_id, payment_type, amount, currency,
      payment_method, payment_status, vcc_details, description
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    ) RETURNING id, payment_reference, amount, currency, payment_status, created_at
  `, [
    tenantId, bookingId, 'vcc', amount, currency,
    'virtual_card', 'generated', {
      cardId: vccResponse.cardId,
      cardNumber: vccResponse.cardNumber,
      cvv: vccResponse.cvv,
      expiryMonth: vccResponse.expiryMonth,
      expiryYear: vccResponse.expiryYear,
      cardholderName: vccResponse.cardholderName,
      provider,
      externalId: vccResponse.externalId
    }, vccResponse.description || `VCC for booking ${booking.booking_reference}`
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
    payment.id, tenantId, parseFloat(amount), parseFloat(amount),
    0, currency, 'active'
  ]);

  logger.info(`VCC generated for booking ${booking.booking_reference}: ${payment.payment_reference}`);

  return successResponse(res, {
    id: payment.id,
    paymentReference: payment.payment_reference,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    status: payment.payment_status,
    vccDetails: {
      cardId: vccResponse.cardId,
      cardNumber: vccResponse.cardNumber,
      cvv: vccResponse.cvv,
      expiryMonth: vccResponse.expiryMonth,
      expiryYear: vccResponse.expiryYear,
      cardholderName: vccResponse.cardholderName,
      provider,
      externalId: vccResponse.externalId
    },
    createdAt: payment.created_at
  }, 'Virtual Credit Card generated successfully');
});

// Get VCC balance
export const getVCCBalance = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;

  const balanceResult = await query(`
    SELECT 
      vb.id, vb.payment_id, vb.original_amount, vb.current_balance,
      vb.used_amount, vb.currency, vb.status, vb.created_at, vb.closed_at,
      p.payment_reference, p.vcc_details
    FROM vcc_balances vb
    JOIN payments p ON vb.payment_id = p.id
    WHERE vb.payment_id = $1 AND vb.tenant_id = $2
  `, [paymentId, tenantId]);

  if (balanceResult.rows.length === 0) {
    return notFoundResponse(res, 'VCC balance not found');
  }

  const balance = balanceResult.rows[0];

  return successResponse(res, {
    id: balance.id,
    paymentId: balance.payment_id,
    paymentReference: balance.payment_reference,
    originalAmount: parseFloat(balance.original_amount),
    currentBalance: parseFloat(balance.current_balance),
    usedAmount: parseFloat(balance.used_amount),
    currency: balance.currency,
    status: balance.status,
    vccDetails: balance.vcc_details,
    createdAt: balance.created_at,
    closedAt: balance.closed_at
  }, 'VCC balance retrieved successfully');
});

// Update VCC balance
export const updateVCCBalance = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;
  const { usedAmount, description } = req.body;

  if (!usedAmount || usedAmount <= 0) {
    return validationErrorResponse(res, ['Used amount must be greater than 0']);
  }

  // Get VCC details
  const vccResult = await query(`
    SELECT p.vcc_details, vb.current_balance
    FROM payments p
    JOIN vcc_balances vb ON p.id = vb.payment_id
    WHERE p.id = $1 AND p.tenant_id = $2 AND p.payment_type = 'vcc'
  `, [paymentId, tenantId]);

  if (vccResult.rows.length === 0) {
    return notFoundResponse(res, 'VCC payment not found');
  }

  const vcc = vccResult.rows[0];
  const currentBalance = parseFloat(vcc.current_balance);

  if (usedAmount > currentBalance) {
    return errorResponse(res, 'Insufficient balance on VCC', 400);
  }

  // Update balance in database
  await transaction(async (client) => {
    const newBalance = currentBalance - usedAmount;
    const newUsed = parseFloat(vcc.current_balance) - newBalance;

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

  return successResponse(res, {
    paymentId,
    usedAmount,
    newBalance: currentBalance - usedAmount,
    updatedAt: new Date().toISOString()
  }, 'VCC balance updated successfully');
});

// Close VCC
export const closeVCC = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;

  // Get VCC details
  const vccResult = await query(`
    SELECT p.vcc_details, vb.status
    FROM payments p
    JOIN vcc_balances vb ON p.id = vb.payment_id
    WHERE p.id = $1 AND p.tenant_id = $2 AND p.payment_type = 'vcc'
  `, [paymentId, tenantId]);

  if (vccResult.rows.length === 0) {
    return notFoundResponse(res, 'VCC payment not found');
  }

  const vcc = vccResult.rows[0];

  if (vcc.status === 'closed') {
    return errorResponse(res, 'VCC is already closed', 400);
  }

  // Close VCC in database
  await query(`
    UPDATE vcc_balances
    SET status = 'closed', closed_at = CURRENT_TIMESTAMP
    WHERE payment_id = $1 AND tenant_id = $2
  `, [paymentId, tenantId]);

  logger.info(`VCC closed for payment ${paymentId}`);

  return successResponse(res, {
    paymentId,
    status: 'closed',
    closedAt: new Date().toISOString()
  }, 'VCC closed successfully');
});

// Get VCC usage history
export const getVCCUsage = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;

  // Get VCC details
  const vccResult = await query(`
    SELECT p.vcc_details
    FROM payments p
    WHERE p.id = $1 AND p.tenant_id = $2 AND p.payment_type = 'vcc'
  `, [paymentId, tenantId]);

  if (vccResult.rows.length === 0) {
    return notFoundResponse(res, 'VCC payment not found');
  }

  const vcc = vccResult.rows[0];
  const vccDetails = vcc.vcc_details;

  // Get usage from VCC provider
  const provider = VCCProviderFactory.createProvider(vccDetails.provider || 'mock');
  const usage = await provider.getVCCUsage(vccDetails.cardId);

  return successResponse(res, {
    paymentId,
    cardId: vccDetails.cardId,
    usage
  }, 'VCC usage retrieved successfully');
});

// List all VCCs for tenant
export const listVCCs = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { status, page = 1, limit = 10 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE p.tenant_id = $1 AND p.payment_type = $2';
  const params: any[] = [tenantId, 'vcc'];
  let paramIndex = 3;

  if (status) {
    whereClause += ` AND vb.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const vccsResult = await query(`
    SELECT 
      p.id, p.payment_reference, p.amount, p.currency, p.payment_status,
      p.vcc_details, p.created_at,
      vb.original_amount, vb.current_balance, vb.used_amount, vb.status as vcc_status,
      b.booking_reference
    FROM payments p
    JOIN vcc_balances vb ON p.id = vb.payment_id
    JOIN bookings b ON p.booking_id = b.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM payments p
    JOIN vcc_balances vb ON p.id = vb.payment_id
    ${whereClause}
  `, params);

  const vccs = vccsResult.rows.map(row => ({
    id: row.id,
    paymentReference: row.payment_reference,
    bookingReference: row.booking_reference,
    amount: parseFloat(row.amount),
    currency: row.currency,
    status: row.payment_status,
    vccStatus: row.vcc_status,
    originalAmount: parseFloat(row.original_amount),
    currentBalance: parseFloat(row.current_balance),
    usedAmount: parseFloat(row.used_amount),
    vccDetails: row.vcc_details,
    createdAt: row.created_at
  }));

  return successResponse(res, {
    vccs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].total),
      pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
    }
  }, 'VCCs retrieved successfully');
});
