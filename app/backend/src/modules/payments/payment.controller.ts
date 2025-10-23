import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  errorResponse, 
  createdResponse,
  updatedResponse,
  notFoundResponse,
  validationErrorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';

// Generate Virtual Credit Card
export const generateVCC = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    bookingId,
    amount,
    currency = 'USD',
    expiryDays = 30,
    description,
    channelId
  } = req.body;

  // Validate required fields
  if (!bookingId || !amount) {
    return validationErrorResponse(res, ['Booking ID and amount are required']);
  }

  // Check if booking exists
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

  // Generate VCC details (simulated - in real implementation, integrate with VCC provider)
  const vccNumber = `4${Math.random().toString().substr(2, 15)}`; // Visa format
  const cvv = Math.floor(Math.random() * 900) + 100;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  
  const vccDetails = {
    cardNumber: vccNumber,
    cvv: cvv.toString(),
    expiryMonth: (expiryDate.getMonth() + 1).toString().padStart(2, '0'),
    expiryYear: expiryDate.getFullYear().toString(),
    cardholderName: 'HOTEL BOOKING',
    amount: parseFloat(amount),
    currency,
    description: description || `Payment for booking ${booking.booking_reference}`
  };

  // Create payment record
  const paymentResult = await query(`
    INSERT INTO payments (
      tenant_id, booking_id, channel_id, payment_type, amount, currency,
      payment_method, payment_status, vcc_details, description
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    ) RETURNING id, payment_reference, amount, currency, payment_status, created_at
  `, [
    tenantId, bookingId, channelId, 'vcc', amount, currency,
    'virtual_card', 'generated', vccDetails, vccDetails.description
  ]);

  const payment = paymentResult.rows[0];

  logger.info(`VCC generated for booking ${booking.booking_reference}: ${payment.payment_reference}`);

  return createdResponse(res, {
    id: payment.id,
    paymentReference: payment.payment_reference,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    status: payment.payment_status,
    vccDetails: {
      cardNumber: vccDetails.cardNumber,
      cvv: vccDetails.cvv,
      expiryMonth: vccDetails.expiryMonth,
      expiryYear: vccDetails.expiryYear,
      cardholderName: vccDetails.cardholderName
    },
    createdAt: payment.created_at
  }, 'Virtual Credit Card generated successfully');
});

// Send VCC to Channel
export const sendVCCToChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;
  const { channelId, sendMethod = 'api' } = req.body;

  // Get payment details
  const paymentResult = await query(
    'SELECT * FROM payments WHERE id = $1 AND tenant_id = $2 AND payment_type = $3',
    [paymentId, tenantId, 'vcc']
  );

  if (paymentResult.rows.length === 0) {
    return notFoundResponse(res, 'VCC payment not found');
  }

  const payment = paymentResult.rows[0];

  // Get channel details
  const channelResult = await query(
    'SELECT * FROM channels WHERE id = $1 AND tenant_id = $2 AND is_active = true',
    [channelId || payment.channel_id, tenantId]
  );

  if (channelResult.rows.length === 0) {
    return notFoundResponse(res, 'Channel not found or inactive');
  }

  const channel = channelResult.rows[0];

  try {
    // Simulate sending VCC to channel (in real implementation, integrate with channel APIs)
    const sendResult = {
      success: true,
      channelId: channel.id,
      channelName: channel.name,
      sendMethod,
      sentAt: new Date().toISOString(),
      response: {
        status: 'success',
        message: 'VCC sent successfully to channel',
        externalReference: `CH${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      }
    };

    // Update payment status
    await query(
      'UPDATE payments SET payment_status = $1, channel_response = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['sent', sendResult.response, paymentId]
    );

    logger.info(`VCC sent to channel ${channel.name} for payment ${payment.payment_reference}`);

    return successResponse(res, sendResult, 'VCC sent to channel successfully');
  } catch (error) {
    logger.error(`Failed to send VCC to channel: ${channel.name}`, error);
    
    // Update payment status to failed
    await query(
      'UPDATE payments SET payment_status = $1, channel_response = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['failed', { error: error.message }, paymentId]
    );

    return errorResponse(res, 'Failed to send VCC to channel: ' + error.message, 500);
  }
});

// Get payment details
export const getPayment = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;

  const paymentResult = await query(`
    SELECT 
      p.id, p.payment_reference, p.booking_id, p.channel_id, p.payment_type,
      p.amount, p.currency, p.payment_method, p.payment_status, p.vcc_details,
      p.channel_response, p.description, p.created_at, p.updated_at,
      b.booking_reference, b.check_in_date, b.check_out_date,
      c.name as channel_name
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    LEFT JOIN channels c ON p.channel_id = c.id
    WHERE p.id = $1 AND p.tenant_id = $2
  `, [paymentId, tenantId]);

  if (paymentResult.rows.length === 0) {
    return notFoundResponse(res, 'Payment not found');
  }

  const payment = paymentResult.rows[0];

  return successResponse(res, {
    id: payment.id,
    paymentReference: payment.payment_reference,
    bookingId: payment.booking_id,
    bookingReference: payment.booking_reference,
    channelId: payment.channel_id,
    channelName: payment.channel_name,
    paymentType: payment.payment_type,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    paymentMethod: payment.payment_method,
    paymentStatus: payment.payment_status,
    vccDetails: payment.vcc_details,
    channelResponse: payment.channel_response,
    description: payment.description,
    bookingDates: {
      checkIn: payment.check_in_date,
      checkOut: payment.check_out_date
    },
    createdAt: payment.created_at,
    updatedAt: payment.updated_at
  });
});

// Get all payments
export const getPayments = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { 
    page = 1, 
    limit = 10, 
    paymentType,
    paymentStatus,
    channelId,
    bookingId,
    startDate,
    endDate
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE p.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Add filters
  if (paymentType) {
    whereClause += ` AND p.payment_type = $${paramIndex}`;
    params.push(paymentType);
    paramIndex++;
  }

  if (paymentStatus) {
    whereClause += ` AND p.payment_status = $${paramIndex}`;
    params.push(paymentStatus);
    paramIndex++;
  }

  if (channelId) {
    whereClause += ` AND p.channel_id = $${paramIndex}`;
    params.push(channelId);
    paramIndex++;
  }

  if (bookingId) {
    whereClause += ` AND p.booking_id = $${paramIndex}`;
    params.push(bookingId);
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

  // Get payments
  const paymentsResult = await query(`
    SELECT 
      p.id, p.payment_reference, p.booking_id, p.channel_id, p.payment_type,
      p.amount, p.currency, p.payment_method, p.payment_status, p.vcc_details,
      p.channel_response, p.description, p.created_at, p.updated_at,
      b.booking_reference, b.check_in_date, b.check_out_date,
      c.name as channel_name
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    LEFT JOIN channels c ON p.channel_id = c.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM payments p
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);

  return successResponse(res, {
    payments: paymentsResult.rows.map(payment => ({
      id: payment.id,
      paymentReference: payment.payment_reference,
      bookingId: payment.booking_id,
      bookingReference: payment.booking_reference,
      channelId: payment.channel_id,
      channelName: payment.channel_name,
      paymentType: payment.payment_type,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      paymentStatus: payment.payment_status,
      vccDetails: payment.vcc_details,
      channelResponse: payment.channel_response,
      description: payment.description,
      bookingDates: {
        checkIn: payment.check_in_date,
        checkOut: payment.check_out_date
      },
      createdAt: payment.created_at,
      updatedAt: payment.updated_at
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  });
});

// Update payment status
export const updatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const paymentId = req.params.id;
  const { status, channelResponse } = req.body;

  // Validate status
  const validStatuses = ['generated', 'sent', 'confirmed', 'failed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return validationErrorResponse(res, [`Invalid status. Must be one of: ${validStatuses.join(', ')}`]);
  }

  // Check if payment exists
  const paymentResult = await query(
    'SELECT id, payment_reference FROM payments WHERE id = $1 AND tenant_id = $2',
    [paymentId, tenantId]
  );

  if (paymentResult.rows.length === 0) {
    return notFoundResponse(res, 'Payment not found');
  }

  const payment = paymentResult.rows[0];

  // Update payment status
  const updateResult = await query(`
    UPDATE payments 
    SET payment_status = $1, channel_response = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3 AND tenant_id = $4
    RETURNING id, payment_reference, payment_status, updated_at
  `, [status, channelResponse, paymentId, tenantId]);

  const updatedPayment = updateResult.rows[0];

  logger.info(`Payment status updated: ${updatedPayment.payment_reference} - ${updatedPayment.payment_status}`);

  return updatedResponse(res, {
    id: updatedPayment.id,
    paymentReference: updatedPayment.payment_reference,
    paymentStatus: updatedPayment.payment_status,
    updatedAt: updatedPayment.updated_at
  });
});

// Get payment statistics
export const getPaymentStats = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { period = '30' } = req.query;

  const days = parseInt(period as string);

  // Get payment statistics
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_payments,
      COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) as confirmed_payments,
      COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_payments,
      COUNT(CASE WHEN payment_type = 'vcc' THEN 1 END) as vcc_payments,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '${days} days' THEN 1 END) as recent_payments,
      COALESCE(SUM(CASE WHEN payment_status = 'confirmed' THEN amount ELSE 0 END), 0) as total_amount,
      COALESCE(SUM(CASE WHEN payment_status = 'confirmed' AND created_at >= CURRENT_DATE - INTERVAL '${days} days' THEN amount ELSE 0 END), 0) as recent_amount,
      COALESCE(AVG(CASE WHEN payment_status = 'confirmed' THEN amount END), 0) as avg_payment_amount
    FROM payments 
    WHERE tenant_id = $1
  `, [tenantId]);

  const stats = statsResult.rows[0];

  // Get payment type breakdown
  const typeResult = await query(`
    SELECT 
      payment_type,
      COUNT(*) as payment_count,
      COALESCE(SUM(amount), 0) as total_amount
    FROM payments 
    WHERE tenant_id = $1 AND payment_status = 'confirmed'
    GROUP BY payment_type
    ORDER BY payment_count DESC
  `, [tenantId]);

  // Get daily payments for the period
  const dailyResult = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as payment_count,
      COALESCE(SUM(amount), 0) as total_amount
    FROM payments 
    WHERE tenant_id = $1 
    AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, [tenantId]);

  return successResponse(res, {
    totalPayments: parseInt(stats.total_payments),
    confirmedPayments: parseInt(stats.confirmed_payments),
    failedPayments: parseInt(stats.failed_payments),
    vccPayments: parseInt(stats.vcc_payments),
    recentPayments: parseInt(stats.recent_payments),
    totalAmount: parseFloat(stats.total_amount),
    recentAmount: parseFloat(stats.recent_amount),
    avgPaymentAmount: parseFloat(stats.avg_payment_amount),
    typeBreakdown: typeResult.rows.map(row => ({
      paymentType: row.payment_type,
      paymentCount: parseInt(row.payment_count),
      totalAmount: parseFloat(row.total_amount)
    })),
    dailyPayments: dailyResult.rows.map(row => ({
      date: row.date,
      paymentCount: parseInt(row.payment_count),
      totalAmount: parseFloat(row.total_amount)
    }))
  });
});
