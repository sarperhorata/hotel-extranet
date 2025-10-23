import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
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

// Create booking
export const createBooking = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    propertyId,
    roomId,
    ratePlanId,
    guestId,
    checkInDate,
    checkOutDate,
    adults = 1,
    children = 0,
    rooms = 1,
    guestInfo,
    specialRequests,
    channel = 'direct'
  } = req.body;

  // Validate required fields
  if (!propertyId || !roomId || !ratePlanId || !checkInDate || !checkOutDate) {
    return validationErrorResponse(res, [
      'Property ID, room ID, rate plan ID, check-in date, and check-out date are required'
    ]);
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  if (checkIn >= checkOut) {
    return validationErrorResponse(res, ['Check-out date must be after check-in date']);
  }

  if (checkIn < new Date()) {
    return validationErrorResponse(res, ['Check-in date cannot be in the past']);
  }

  // Check availability
  const availabilityResult = await query(`
    SELECT 
      ri.available_rooms,
      ri.price,
      ri.currency,
      ri.min_stay,
      ri.closed_to_arrival,
      ri.closed_to_departure,
      ri.stop_sell
    FROM room_inventory ri
    WHERE ri.tenant_id = $1 
    AND ri.room_id = $2 
    AND ri.rate_plan_id = $3
    AND ri.date >= $4 
    AND ri.date < $5
    AND ri.available_rooms >= $6
    AND ri.stop_sell = false
    ORDER BY ri.date
  `, [tenantId, roomId, ratePlanId, checkInDate, checkOutDate, rooms]);

  if (availabilityResult.rows.length === 0) {
    return errorResponse(res, 'No availability for the selected dates', 400);
  }

  // Check if all dates have sufficient availability
  const insufficientAvailability = availabilityResult.rows.some(row => 
    row.available_rooms < rooms || row.stop_sell
  );

  if (insufficientAvailability) {
    return errorResponse(res, 'Insufficient availability for the selected dates', 400);
  }

  // Check minimum stay requirements
  const minStayRequired = availabilityResult.rows[0].min_stay;
  if (minStayRequired && nights < minStayRequired) {
    return errorResponse(res, `Minimum stay of ${minStayRequired} nights required`, 400);
  }

  // Check closed to arrival/departure
  const firstDay = availabilityResult.rows[0];
  const lastDay = availabilityResult.rows[availabilityResult.rows.length - 1];
  
  if (firstDay.closed_to_arrival) {
    return errorResponse(res, 'Cannot arrive on this date', 400);
  }
  
  if (lastDay.closed_to_departure) {
    return errorResponse(res, 'Cannot depart on this date', 400);
  }

  // Calculate pricing
  const totalBasePrice = availabilityResult.rows.reduce((sum, row) => sum + parseFloat(row.price), 0);
  const taxes = totalBasePrice * 0.1; // 10% tax
  const fees = totalBasePrice * 0.05; // 5% service fee
  const totalAmount = totalBasePrice + taxes + fees;

  // Generate booking reference
  const bookingReference = `BK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  // Create booking in transaction
  const result = await transaction(async (client) => {
    // Create or update guest
    let finalGuestId = guestId;
    if (guestInfo && !guestId) {
      const guestResult = await client.query(`
        INSERT INTO guests (tenant_id, email, first_name, last_name, phone, nationality)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, email) 
        DO UPDATE SET 
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          nationality = EXCLUDED.nationality,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        tenantId, 
        guestInfo.email, 
        guestInfo.firstName, 
        guestInfo.lastName, 
        guestInfo.phone, 
        guestInfo.nationality
      ]);
      
      finalGuestId = guestResult.rows[0].id;
    }

    // Create booking
    const bookingResult = await client.query(`
      INSERT INTO bookings (
        tenant_id, property_id, room_id, rate_plan_id, guest_id,
        booking_reference, channel, check_in_date, check_out_date,
        adults, children, rooms, total_nights, base_price, taxes, fees,
        total_amount, currency, guest_info, special_requests, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING id, booking_reference, status, total_amount, currency, created_at
    `, [
      tenantId, propertyId, roomId, ratePlanId, finalGuestId,
      bookingReference, channel, checkInDate, checkOutDate,
      adults, children, rooms, nights, totalBasePrice, taxes, fees,
      totalAmount, availabilityResult.rows[0].currency, guestInfo, specialRequests, 'confirmed'
    ]);

    const booking = bookingResult.rows[0];

    // Update inventory
    for (const inventoryRow of availabilityResult.rows) {
      await client.query(`
        UPDATE room_inventory 
        SET available_rooms = available_rooms - $1, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $2 AND room_id = $3 AND rate_plan_id = $4 AND date = $5
      `, [rooms, tenantId, roomId, ratePlanId, inventoryRow.date]);
    }

    return booking;
  });

  logger.info(`Booking created: ${result.booking_reference} for ${nights} nights`);

  return createdResponse(res, {
    id: result.id,
    bookingReference: result.booking_reference,
    status: result.status,
    totalAmount: parseFloat(result.total_amount),
    currency: result.currency,
    createdAt: result.created_at
  }, 'Booking created successfully');
});

// Get all bookings
export const getBookings = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { 
    page = 1, 
    limit = 10, 
    status,
    channel,
    propertyId,
    roomId,
    guestId,
    checkInDate,
    checkOutDate,
    search
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE b.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Add filters
  if (status) {
    whereClause += ` AND b.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (channel) {
    whereClause += ` AND b.channel = $${paramIndex}`;
    params.push(channel);
    paramIndex++;
  }

  if (propertyId) {
    whereClause += ` AND b.property_id = $${paramIndex}`;
    params.push(propertyId);
    paramIndex++;
  }

  if (roomId) {
    whereClause += ` AND b.room_id = $${paramIndex}`;
    params.push(roomId);
    paramIndex++;
  }

  if (guestId) {
    whereClause += ` AND b.guest_id = $${paramIndex}`;
    params.push(guestId);
    paramIndex++;
  }

  if (checkInDate) {
    whereClause += ` AND b.check_in_date >= $${paramIndex}`;
    params.push(checkInDate);
    paramIndex++;
  }

  if (checkOutDate) {
    whereClause += ` AND b.check_out_date <= $${paramIndex}`;
    params.push(checkOutDate);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (b.booking_reference ILIKE $${paramIndex} OR g.first_name ILIKE $${paramIndex} OR g.last_name ILIKE $${paramIndex} OR g.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Get bookings
  const bookingsResult = await query(`
    SELECT 
      b.id, b.booking_reference, b.channel, b.status, b.check_in_date, b.check_out_date,
      b.adults, b.children, b.rooms, b.total_nights, b.base_price, b.taxes, b.fees,
      b.total_amount, b.currency, b.payment_status, b.special_requests, b.guest_info,
      b.created_at, b.updated_at,
      p.id as property_id, p.name as property_name,
      r.id as room_id, r.name as room_name,
      g.id as guest_id, g.first_name, g.last_name, g.email, g.phone
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN rooms r ON b.room_id = r.id
    LEFT JOIN guests g ON b.guest_id = g.id
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM bookings b
    LEFT JOIN guests g ON b.guest_id = g.id
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);

  return paginatedResponse(res, bookingsResult.rows.map(booking => ({
    id: booking.id,
    bookingReference: booking.booking_reference,
    channel: booking.channel,
    status: booking.status,
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    adults: booking.adults,
    children: booking.children,
    rooms: booking.rooms,
    totalNights: booking.total_nights,
    basePrice: parseFloat(booking.base_price),
    taxes: parseFloat(booking.taxes),
    fees: parseFloat(booking.fees),
    totalAmount: parseFloat(booking.total_amount),
    currency: booking.currency,
    paymentStatus: booking.payment_status,
    specialRequests: booking.special_requests,
    guestInfo: booking.guest_info,
    property: {
      id: booking.property_id,
      name: booking.property_name
    },
    room: {
      id: booking.room_id,
      name: booking.room_name
    },
    guest: booking.guest_id ? {
      id: booking.guest_id,
      firstName: booking.first_name,
      lastName: booking.last_name,
      email: booking.email,
      phone: booking.phone
    } : null,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at
  })), Number(page), Number(limit), total);
});

// Get single booking
export const getBooking = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const bookingId = req.params.id;

  const bookingResult = await query(`
    SELECT 
      b.id, b.booking_reference, b.channel, b.channel_booking_id, b.status,
      b.check_in_date, b.check_out_date, b.adults, b.children, b.rooms,
      b.total_nights, b.base_price, b.taxes, b.fees, b.total_amount, b.currency,
      b.payment_status, b.payment_method, b.special_requests, b.guest_info,
      b.cancellation_policy, b.cancellation_deadline, b.created_at, b.updated_at,
      p.id as property_id, p.name as property_name, p.address, p.city, p.country,
      r.id as room_id, r.name as room_name, r.room_type,
      rp.id as rate_plan_id, rp.name as rate_plan_name,
      g.id as guest_id, g.first_name, g.last_name, g.email, g.phone, g.nationality
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN rooms r ON b.room_id = r.id
    JOIN rate_plans rp ON b.rate_plan_id = rp.id
    LEFT JOIN guests g ON b.guest_id = g.id
    WHERE b.id = $1 AND b.tenant_id = $2
  `, [bookingId, tenantId]);

  if (bookingResult.rows.length === 0) {
    return notFoundResponse(res, 'Booking not found');
  }

  const booking = bookingResult.rows[0];

  return successResponse(res, {
    id: booking.id,
    bookingReference: booking.booking_reference,
    channel: booking.channel,
    channelBookingId: booking.channel_booking_id,
    status: booking.status,
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    adults: booking.adults,
    children: booking.children,
    rooms: booking.rooms,
    totalNights: booking.total_nights,
    basePrice: parseFloat(booking.base_price),
    taxes: parseFloat(booking.taxes),
    fees: parseFloat(booking.fees),
    totalAmount: parseFloat(booking.total_amount),
    currency: booking.currency,
    paymentStatus: booking.payment_status,
    paymentMethod: booking.payment_method,
    specialRequests: booking.special_requests,
    guestInfo: booking.guest_info,
    cancellationPolicy: booking.cancellation_policy,
    cancellationDeadline: booking.cancellation_deadline,
    property: {
      id: booking.property_id,
      name: booking.property_name,
      address: booking.address,
      city: booking.city,
      country: booking.country
    },
    room: {
      id: booking.room_id,
      name: booking.room_name,
      roomType: booking.room_type
    },
    ratePlan: {
      id: booking.rate_plan_id,
      name: booking.rate_plan_name
    },
    guest: booking.guest_id ? {
      id: booking.guest_id,
      firstName: booking.first_name,
      lastName: booking.last_name,
      email: booking.email,
      phone: booking.phone,
      nationality: booking.nationality
    } : null,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at
  });
});

// Update booking
export const updateBooking = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const bookingId = req.params.id;
  const updateData = req.body;

  // Check if booking exists
  const existingBooking = await query(
    'SELECT id, status FROM bookings WHERE id = $1 AND tenant_id = $2',
    [bookingId, tenantId]
  );

  if (existingBooking.rows.length === 0) {
    return notFoundResponse(res, 'Booking not found');
  }

  const booking = existingBooking.rows[0];

  // Check if booking can be modified
  if (booking.status === 'cancelled') {
    return errorResponse(res, 'Cannot modify cancelled booking', 400);
  }

  // Build dynamic update query
  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'status', 'adults', 'children', 'rooms', 'special_requests', 'guest_info',
    'payment_status', 'payment_method'
  ];

  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields.includes(key) && value !== undefined) {
      updateFields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    return errorResponse(res, 'No valid fields to update', 400);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(bookingId, tenantId);

  const bookingResult = await query(`
    UPDATE bookings 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING id, booking_reference, status, total_amount, currency, updated_at
  `, values);

  const updatedBooking = bookingResult.rows[0];

  logger.info(`Booking updated: ${updatedBooking.booking_reference} - Status: ${updatedBooking.status}`);

  return updatedResponse(res, {
    id: updatedBooking.id,
    bookingReference: updatedBooking.booking_reference,
    status: updatedBooking.status,
    totalAmount: parseFloat(updatedBooking.total_amount),
    currency: updatedBooking.currency,
    updatedAt: updatedBooking.updated_at
  });
});

// Cancel booking
export const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const bookingId = req.params.id;
  const { reason } = req.body;

  // Check if booking exists
  const bookingResult = await query(
    'SELECT id, booking_reference, status, room_id, rate_plan_id, check_in_date, check_out_date, rooms FROM bookings WHERE id = $1 AND tenant_id = $2',
    [bookingId, tenantId]
  );

  if (bookingResult.rows.length === 0) {
    return notFoundResponse(res, 'Booking not found');
  }

  const booking = bookingResult.rows[0];

  // Check if booking can be cancelled
  if (booking.status === 'cancelled') {
    return errorResponse(res, 'Booking is already cancelled', 400);
  }

  if (booking.status === 'completed') {
    return errorResponse(res, 'Cannot cancel completed booking', 400);
  }

  // Cancel booking and restore inventory
  await transaction(async (client) => {
    // Update booking status
    await client.query(`
      UPDATE bookings 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [bookingId]);

    // Restore inventory
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const currentDate = new Date(checkIn);
    
    while (currentDate < checkOut) {
      await client.query(`
        UPDATE room_inventory 
        SET available_rooms = available_rooms + $1, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $2 AND room_id = $3 AND rate_plan_id = $4 AND date = $5
      `, [booking.rooms, tenantId, booking.room_id, booking.rate_plan_id, currentDate.toISOString().split('T')[0]]);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  logger.info(`Booking cancelled: ${booking.booking_reference} - Reason: ${reason || 'No reason provided'}`);

  return successResponse(res, {
    id: booking.id,
    bookingReference: booking.booking_reference,
    status: 'cancelled',
    reason
  }, 'Booking cancelled successfully');
});

// Get booking statistics
export const getBookingStats = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { period = '30' } = req.query;

  const days = parseInt(period as string);

  // Get booking statistics
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_bookings,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '${days} days' THEN 1 END) as recent_bookings,
      COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN status = 'confirmed' AND created_at >= CURRENT_DATE - INTERVAL '${days} days' THEN total_amount ELSE 0 END), 0) as recent_revenue,
      COALESCE(AVG(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as avg_booking_value
    FROM bookings 
    WHERE tenant_id = $1
  `, [tenantId]);

  const stats = statsResult.rows[0];

  // Get channel breakdown
  const channelResult = await query(`
    SELECT 
      channel,
      COUNT(*) as booking_count,
      COALESCE(SUM(total_amount), 0) as revenue
    FROM bookings 
    WHERE tenant_id = $1 AND status = 'confirmed'
    GROUP BY channel
    ORDER BY booking_count DESC
  `, [tenantId]);

  // Get daily bookings for the period
  const dailyResult = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as bookings,
      COALESCE(SUM(total_amount), 0) as revenue
    FROM bookings 
    WHERE tenant_id = $1 
    AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, [tenantId]);

  return successResponse(res, {
    totalBookings: parseInt(stats.total_bookings),
    confirmedBookings: parseInt(stats.confirmed_bookings),
    cancelledBookings: parseInt(stats.cancelled_bookings),
    completedBookings: parseInt(stats.completed_bookings),
    recentBookings: parseInt(stats.recent_bookings),
    totalRevenue: parseFloat(stats.total_revenue),
    recentRevenue: parseFloat(stats.recent_revenue),
    avgBookingValue: parseFloat(stats.avg_booking_value),
    channelBreakdown: channelResult.rows.map(row => ({
      channel: row.channel,
      bookingCount: parseInt(row.booking_count),
      revenue: parseFloat(row.revenue)
    })),
    dailyBookings: dailyResult.rows.map(row => ({
      date: row.date,
      bookings: parseInt(row.bookings),
      revenue: parseFloat(row.revenue)
    }))
  });
});
