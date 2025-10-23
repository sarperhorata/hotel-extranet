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

// Get all rooms for a property
export const getRooms = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const propertyId = req.params.propertyId;
  const { 
    page = 1, 
    limit = 10, 
    search, 
    roomType, 
    maxOccupancy,
    isActive = 'true'
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE r.tenant_id = $1 AND r.property_id = $2';
  const params: any[] = [tenantId, propertyId];
  let paramIndex = 3;

  // Add filters
  if (search) {
    whereClause += ` AND (r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (roomType) {
    whereClause += ` AND r.room_type = $${paramIndex}`;
    params.push(roomType);
    paramIndex++;
  }

  if (maxOccupancy) {
    whereClause += ` AND r.max_occupancy >= $${paramIndex}`;
    params.push(Number(maxOccupancy));
    paramIndex++;
  }

  if (isActive !== 'all') {
    whereClause += ` AND r.is_active = $${paramIndex}`;
    params.push(isActive === 'true');
    paramIndex++;
  }

  // Get rooms
  const roomsResult = await query(`
    SELECT 
      r.id, r.name, r.slug, r.description, r.room_type, r.max_occupancy,
      r.max_adults, r.max_children, r.bed_type, r.bed_count, r.size_sqm,
      r.amenities, r.images, r.base_price, r.currency, r.is_active,
      r.created_at, r.updated_at,
      p.name as property_name
    FROM rooms r
    JOIN properties p ON r.property_id = p.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM rooms r
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);

  return paginatedResponse(res, roomsResult.rows.map(room => ({
    id: room.id,
    name: room.name,
    slug: room.slug,
    description: room.description,
    roomType: room.room_type,
    maxOccupancy: room.max_occupancy,
    maxAdults: room.max_adults,
    maxChildren: room.max_children,
    bedType: room.bed_type,
    bedCount: room.bed_count,
    sizeSqm: room.size_sqm,
    amenities: room.amenities,
    images: room.images,
    basePrice: room.base_price,
    currency: room.currency,
    isActive: room.is_active,
    propertyName: room.property_name,
    createdAt: room.created_at,
    updatedAt: room.updated_at
  })), Number(page), Number(limit), total);
});

// Get single room
export const getRoom = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const roomId = req.params.id;

  const roomResult = await query(`
    SELECT 
      r.id, r.name, r.slug, r.description, r.room_type, r.max_occupancy,
      r.max_adults, r.max_children, r.bed_type, r.bed_count, r.size_sqm,
      r.amenities, r.images, r.base_price, r.currency, r.is_active,
      r.created_at, r.updated_at,
      p.id as property_id, p.name as property_name
    FROM rooms r
    JOIN properties p ON r.property_id = p.id
    WHERE r.id = $1 AND r.tenant_id = $2
  `, [roomId, tenantId]);

  if (roomResult.rows.length === 0) {
    return notFoundResponse(res, 'Room not found');
  }

  const room = roomResult.rows[0];

  return successResponse(res, {
    id: room.id,
    name: room.name,
    slug: room.slug,
    description: room.description,
    roomType: room.room_type,
    maxOccupancy: room.max_occupancy,
    maxAdults: room.max_adults,
    maxChildren: room.max_children,
    bedType: room.bed_type,
    bedCount: room.bed_count,
    sizeSqm: room.size_sqm,
    amenities: room.amenities,
    images: room.images,
    basePrice: room.base_price,
    currency: room.currency,
    isActive: room.is_active,
    property: {
      id: room.property_id,
      name: room.property_name
    },
    createdAt: room.created_at,
    updatedAt: room.updated_at
  });
});

// Create room
export const createRoom = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const propertyId = req.params.propertyId;
  const {
    name,
    slug,
    description,
    roomType,
    maxOccupancy = 1,
    maxAdults = 1,
    maxChildren = 0,
    bedType,
    bedCount = 1,
    sizeSqm,
    amenities = [],
    images = [],
    basePrice,
    currency = 'USD'
  } = req.body;

  // Validate required fields
  if (!name || !slug || !roomType || !basePrice) {
    return validationErrorResponse(res, ['Name, slug, room type, and base price are required']);
  }

  // Check if property exists and belongs to tenant
  const propertyResult = await query(
    'SELECT id, name FROM properties WHERE id = $1 AND tenant_id = $2 AND is_active = true',
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    return notFoundResponse(res, 'Property not found');
  }

  // Check if slug already exists for this property
  const existingRoom = await query(
    'SELECT id FROM rooms WHERE slug = $1 AND property_id = $2',
    [slug, propertyId]
  );

  if (existingRoom.rows.length > 0) {
    return errorResponse(res, 'Room slug already exists for this property', 409);
  }

  const roomResult = await query(`
    INSERT INTO rooms (
      tenant_id, property_id, name, slug, description, room_type,
      max_occupancy, max_adults, max_children, bed_type, bed_count,
      size_sqm, amenities, images, base_price, currency
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    ) RETURNING id, name, slug, description, room_type, max_occupancy,
              max_adults, max_children, bed_type, bed_count, size_sqm,
              amenities, images, base_price, currency, is_active,
              created_at, updated_at
  `, [
    tenantId, propertyId, name, slug, description, roomType,
    maxOccupancy, maxAdults, maxChildren, bedType, bedCount,
    sizeSqm, amenities, images, basePrice, currency
  ]);

  const room = roomResult.rows[0];

  logger.info(`Room created: ${room.name} (${room.slug}) for property ${propertyId}`);

  return createdResponse(res, {
    id: room.id,
    name: room.name,
    slug: room.slug,
    description: room.description,
    roomType: room.room_type,
    maxOccupancy: room.max_occupancy,
    maxAdults: room.max_adults,
    maxChildren: room.max_children,
    bedType: room.bed_type,
    bedCount: room.bed_count,
    sizeSqm: room.size_sqm,
    amenities: room.amenities,
    images: room.images,
    basePrice: room.base_price,
    currency: room.currency,
    isActive: room.is_active,
    createdAt: room.created_at,
    updatedAt: room.updated_at
  });
});

// Update room
export const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const roomId = req.params.id;
  const updateData = req.body;

  // Check if room exists
  const existingRoom = await query(
    'SELECT id, name, property_id FROM rooms WHERE id = $1 AND tenant_id = $2',
    [roomId, tenantId]
  );

  if (existingRoom.rows.length === 0) {
    return notFoundResponse(res, 'Room not found');
  }

  const room = existingRoom.rows[0];

  // Check if slug is being changed and if it already exists
  if (updateData.slug) {
    const slugCheck = await query(
      'SELECT id FROM rooms WHERE slug = $1 AND property_id = $2 AND id != $3',
      [updateData.slug, room.property_id, roomId]
    );

    if (slugCheck.rows.length > 0) {
      return errorResponse(res, 'Room slug already exists for this property', 409);
    }
  }

  // Build dynamic update query
  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'name', 'slug', 'description', 'room_type', 'max_occupancy',
    'max_adults', 'max_children', 'bed_type', 'bed_count', 'size_sqm',
    'amenities', 'images', 'base_price', 'currency', 'is_active'
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
  values.push(roomId, tenantId);

  const roomResult = await query(`
    UPDATE rooms 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING id, name, slug, description, room_type, max_occupancy,
              max_adults, max_children, bed_type, bed_count, size_sqm,
              amenities, images, base_price, currency, is_active,
              created_at, updated_at
  `, values);

  const updatedRoom = roomResult.rows[0];

  logger.info(`Room updated: ${updatedRoom.name} (${updatedRoom.slug})`);

  return updatedResponse(res, {
    id: updatedRoom.id,
    name: updatedRoom.name,
    slug: updatedRoom.slug,
    description: updatedRoom.description,
    roomType: updatedRoom.room_type,
    maxOccupancy: updatedRoom.max_occupancy,
    maxAdults: updatedRoom.max_adults,
    maxChildren: updatedRoom.max_children,
    bedType: updatedRoom.bed_type,
    bedCount: updatedRoom.bed_count,
    sizeSqm: updatedRoom.size_sqm,
    amenities: updatedRoom.amenities,
    images: updatedRoom.images,
    basePrice: updatedRoom.base_price,
    currency: updatedRoom.currency,
    isActive: updatedRoom.is_active,
    createdAt: updatedRoom.created_at,
    updatedAt: updatedRoom.updated_at
  });
});

// Delete room
export const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const roomId = req.params.id;

  // Check if room exists
  const roomResult = await query(
    'SELECT id, name FROM rooms WHERE id = $1 AND tenant_id = $2',
    [roomId, tenantId]
  );

  if (roomResult.rows.length === 0) {
    return notFoundResponse(res, 'Room not found');
  }

  const room = roomResult.rows[0];

  // Check if room has active bookings
  const bookingsResult = await query(
    'SELECT COUNT(*) as count FROM bookings WHERE room_id = $1 AND status IN ($2, $3)',
    [roomId, 'confirmed', 'pending']
  );

  if (parseInt(bookingsResult.rows[0].count) > 0) {
    return errorResponse(res, 'Cannot delete room with active bookings', 400);
  }

  // Soft delete room
  await query(
    'UPDATE rooms SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [roomId]
  );

  logger.info(`Room deleted: ${room.name} (${roomId})`);

  return deletedResponse(res, 'Room deleted successfully');
});

// Get room statistics
export const getRoomStats = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const roomId = req.params.id;

  // Check if room exists
  const roomResult = await query(
    'SELECT id, name FROM rooms WHERE id = $1 AND tenant_id = $2',
    [roomId, tenantId]
  );

  if (roomResult.rows.length === 0) {
    return notFoundResponse(res, 'Room not found');
  }

  // Get statistics
  const statsResult = await query(`
    SELECT 
      (SELECT COUNT(*) FROM bookings WHERE room_id = $1) as total_bookings,
      (SELECT COUNT(*) FROM bookings WHERE room_id = $1 AND status = 'confirmed') as confirmed_bookings,
      (SELECT COUNT(*) FROM bookings WHERE room_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_bookings,
      (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE room_id = $1 AND status = 'confirmed') as total_revenue,
      (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE room_id = $1 AND status = 'confirmed' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_revenue
  `, [roomId]);

  const stats = statsResult.rows[0];

  // Get average daily rate (last 30 days)
  const adrResult = await query(`
    SELECT 
      COALESCE(AVG(price), 0) as avg_daily_rate
    FROM room_inventory ri
    WHERE ri.room_id = $1 
    AND ri.date >= CURRENT_DATE - INTERVAL '30 days'
    AND ri.date < CURRENT_DATE
  `, [roomId]);

  const adr = adrResult.rows[0];

  return successResponse(res, {
    totalBookings: parseInt(stats.total_bookings),
    confirmedBookings: parseInt(stats.confirmed_bookings),
    recentBookings: parseInt(stats.recent_bookings),
    totalRevenue: parseFloat(stats.total_revenue),
    recentRevenue: parseFloat(stats.recent_revenue),
    avgDailyRate: parseFloat(adr.avg_daily_rate)
  });
});
