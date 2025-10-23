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
import { PaymentGatewayFactory } from '../../services/paymentGateway.service';

// Process payment
export const processPayment = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    bookingId,
    amount,
    currency = 'USD',
    paymentMethod,
    customerEmail,
    customerName,
    description,
    gateway = 'mock' // stripe, paypal, adyen, mock
  } = req.body;

  if (!bookingId || !amount || !paymentMethod || !customerEmail) {
    return validationErrorResponse(res, [
      'Booking ID, amount, payment method, and customer email are required'
    ]);
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
    return errorResponse(res, 'Payment amount cannot exceed booking total', 400);
  }

  // Create payment gateway
  const paymentGateway = PaymentGatewayFactory.createGateway(gateway);

  // Process payment
  const paymentRequest = {
    tenantId,
    bookingId,
    amount: parseFloat(amount),
    currency,
    paymentMethod,
    customerEmail,
    customerName: customerName || 'Guest',
    description: description || `Payment for booking ${booking.booking_reference}`,
    metadata: {
      booking_reference: booking.booking_reference,
      tenant_id: tenantId
    }
  };

  const paymentResponse = await paymentGateway.processPayment(paymentRequest);

  if (!paymentResponse.success) {
    return errorResponse(res, `Payment failed: ${paymentResponse.error}`, 500);
  }

  // Save payment to database
  const paymentResult = await query(`
    INSERT INTO payments (
      tenant_id, booking_id, payment_type, amount, currency,
      payment_method, payment_status, transaction_id, external_payment_id,
      gateway_response, description
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    ) RETURNING id, payment_reference, amount, currency, payment_status, created_at
  `, [
    tenantId, bookingId, 'payment', amount, currency,
    paymentMethod, paymentResponse.status, paymentResponse.transactionId,
    paymentResponse.externalId, paymentResponse.metadata, paymentRequest.description
  ]);

  const payment = paymentResult.rows[0];

  logger.info(`Payment processed for booking ${booking.booking_reference}: ${payment.payment_reference}`);

  return successResponse(res, {
    id: payment.id,
    paymentReference: payment.payment_reference,
    transactionId: paymentResponse.transactionId,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    status: payment.payment_status,
    paymentMethod,
    gateway,
    externalId: paymentResponse.externalId,
    createdAt: payment.created_at
  }, 'Payment processed successfully');
});

// Process refund
export const processRefund = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;
  const { amount, reason, gateway = 'mock' } = req.body;

  if (!amount || amount <= 0) {
    return validationErrorResponse(res, ['Refund amount must be greater than 0']);
  }

  // Get payment details
  const paymentResult = await query(
    'SELECT * FROM payments WHERE id = $1 AND tenant_id = $2',
    [paymentId, tenantId]
  );

  if (paymentResult.rows.length === 0) {
    return notFoundResponse(res, 'Payment not found');
  }

  const payment = paymentResult.rows[0];

  if (payment.payment_status !== 'completed') {
    return errorResponse(res, 'Only completed payments can be refunded', 400);
  }

  if (parseFloat(amount) > parseFloat(payment.amount)) {
    return errorResponse(res, 'Refund amount cannot exceed payment amount', 400);
  }

  // Create payment gateway
  const paymentGateway = PaymentGatewayFactory.createGateway(gateway);

  // Process refund
  const refundRequest = {
    transactionId: payment.transaction_id,
    amount: parseFloat(amount),
    reason: reason || 'Customer request'
  };

  const refundResponse = await paymentGateway.processRefund(refundRequest);

  if (!refundResponse.success) {
    return errorResponse(res, `Refund failed: ${refundResponse.error}`, 500);
  }

  // Update payment status
  await query(`
    UPDATE payments
    SET payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [paymentId]);

  // Create refund record
  await query(`
    INSERT INTO payment_refunds (
      tenant_id, payment_id, refund_id, amount, reason, status, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP
    )
  `, [
    tenantId, paymentId, refundResponse.refundId, amount,
    refundRequest.reason, refundResponse.status
  ]);

  logger.info(`Refund processed for payment ${payment.payment_reference}: ${refundResponse.refundId}`);

  return successResponse(res, {
    paymentId,
    refundId: refundResponse.refundId,
    amount: parseFloat(amount),
    status: refundResponse.status,
    reason: refundRequest.reason,
    processedAt: new Date().toISOString()
  }, 'Refund processed successfully');
});

// Get payment status
export const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;

  const paymentResult = await query(`
    SELECT 
      p.id, p.payment_reference, p.amount, p.currency, p.payment_method,
      p.payment_status, p.transaction_id, p.external_payment_id,
      p.gateway_response, p.created_at, p.updated_at,
      b.booking_reference
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    WHERE p.id = $1 AND p.tenant_id = $2
  `, [paymentId, tenantId]);

  if (paymentResult.rows.length === 0) {
    return notFoundResponse(res, 'Payment not found');
  }

  const payment = paymentResult.rows[0];

  return successResponse(res, {
    id: payment.id,
    paymentReference: payment.payment_reference,
    bookingReference: payment.booking_reference,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    paymentMethod: payment.payment_method,
    status: payment.payment_status,
    transactionId: payment.transaction_id,
    externalId: payment.external_payment_id,
    gatewayResponse: payment.gateway_response,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at
  }, 'Payment status retrieved successfully');
});

// List payments
export const listPayments = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { 
    status, 
    paymentMethod, 
    gateway,
    page = 1, 
    limit = 10,
    startDate,
    endDate
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE p.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND p.payment_status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (paymentMethod) {
    whereClause += ` AND p.payment_method = $${paramIndex}`;
    params.push(paymentMethod);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND p.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND p.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  const paymentsResult = await query(`
    SELECT 
      p.id, p.payment_reference, p.amount, p.currency, p.payment_method,
      p.payment_status, p.transaction_id, p.external_payment_id,
      p.gateway_response, p.created_at, p.updated_at,
      b.booking_reference
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM payments p
    ${whereClause}
  `, params);

  const payments = paymentsResult.rows.map(row => ({
    id: row.id,
    paymentReference: row.payment_reference,
    bookingReference: row.booking_reference,
    amount: parseFloat(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    status: row.payment_status,
    transactionId: row.transaction_id,
    externalId: row.external_payment_id,
    gatewayResponse: row.gateway_response,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  return successResponse(res, {
    payments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: parseInt(countResult.rows[0].total),
      pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
    }
  }, 'Payments retrieved successfully');
});

// Webhook handler
export const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const { gateway } = req.params;
  const signature = req.headers['stripe-signature'] || req.headers['paypal-signature'] || req.headers['adyen-signature'] || '';
  const payload = req.body;

  // Create payment gateway
  const paymentGateway = PaymentGatewayFactory.createGateway(gateway as any);

  // Validate webhook
  if (!paymentGateway.validateWebhook(payload, signature)) {
    return errorResponse(res, 'Invalid webhook signature', 401);
  }

  // Process webhook
  logger.info(`Webhook received from ${gateway}:`, payload);

  // Handle webhook based on gateway
  switch (gateway) {
    case 'stripe':
      await handleStripeWebhook(payload);
      break;
    case 'paypal':
      await handlePayPalWebhook(payload);
      break;
    case 'adyen':
      await handleAdyenWebhook(payload);
      break;
    default:
      logger.warn(`Unknown webhook gateway: ${gateway}`);
  }

  return successResponse(res, { received: true }, 'Webhook processed successfully');
});

// Handle Stripe webhook
async function handleStripeWebhook(payload: any) {
  logger.info('Processing Stripe webhook:', payload.type);
  // Implement Stripe webhook handling
}

// Handle PayPal webhook
async function handlePayPalWebhook(payload: any) {
  logger.info('Processing PayPal webhook:', payload.event_type);
  // Implement PayPal webhook handling
}

// Handle Adyen webhook
async function handleAdyenWebhook(payload: any) {
  logger.info('Processing Adyen webhook:', payload.notificationItems);
  // Implement Adyen webhook handling
}
