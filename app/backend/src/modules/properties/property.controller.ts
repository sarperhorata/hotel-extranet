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

// Get all properties
export const getProperties = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { 
    page = 1, 
    limit = 10, 
    search, 
    propertyType, 
    city, 
    country,
    isActive = 'true'
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE p.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Add filters
  if (search) {
    whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (propertyType) {
    whereClause += ` AND p.property_type = $${paramIndex}`;
    params.push(propertyType);
    paramIndex++;
  }

  if (city) {
    whereClause += ` AND p.city ILIKE $${paramIndex}`;
    params.push(`%${city}%`);
    paramIndex++;
  }

  if (country) {
    whereClause += ` AND p.country ILIKE $${paramIndex}`;
    params.push(`%${country}%`);
    paramIndex++;
  }

  if (isActive !== 'all') {
    whereClause += ` AND p.is_active = $${paramIndex}`;
    params.push(isActive === 'true');
    paramIndex++;
  }

  // Get properties with room counts
  const propertiesResult = await query(`
    SELECT 
      p.id, p.name, p.slug, p.description, p.property_type, p.star_rating,
      p.address, p.city, p.country, p.phone, p.email, p.website,
      p.check_in_time, p.check_out_time, p.timezone, p.currency, p.language,
      p.amenities, p.images, p.policies, p.is_active,
      p.created_at, p.updated_at,
      COUNT(r.id) as room_count
    FROM properties p
    LEFT JOIN rooms r ON p.id = r.property_id AND r.is_active = true
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM properties p
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);

  return paginatedResponse(res, propertiesResult.rows.map(property => ({
    id: property.id,
    name: property.name,
    slug: property.slug,
    description: property.description,
    propertyType: property.property_type,
    starRating: property.star_rating,
    address: property.address,
    city: property.city,
    country: property.country,
    phone: property.phone,
    email: property.email,
    website: property.website,
    checkInTime: property.check_in_time,
    checkOutTime: property.check_out_time,
    timezone: property.timezone,
    currency: property.currency,
    language: property.language,
    amenities: property.amenities,
    images: property.images,
    policies: property.policies,
    isActive: property.is_active,
    roomCount: parseInt(property.room_count),
    createdAt: property.created_at,
    updatedAt: property.updated_at
  })), Number(page), Number(limit), total);
});

// Get single property
export const getProperty = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const propertyId = req.params.id;

  const propertyResult = await query(`
    SELECT 
      p.id, p.name, p.slug, p.description, p.property_type, p.star_rating,
      p.address, p.city, p.country, p.phone, p.email, p.website,
      p.check_in_time, p.check_out_time, p.timezone, p.currency, p.language,
      p.amenities, p.images, p.policies, p.is_active,
      p.created_at, p.updated_at
    FROM properties p
    WHERE p.id = $1 AND p.tenant_id = $2
  `, [propertyId, tenantId]);

  if (propertyResult.rows.length === 0) {
    return notFoundResponse(res, 'Property not found');
  }

  const property = propertyResult.rows[0];

  return successResponse(res, {
    id: property.id,
    name: property.name,
    slug: property.slug,
    description: property.description,
    propertyType: property.property_type,
    starRating: property.star_rating,
    address: property.address,
    city: property.city,
    country: property.country,
    phone: property.phone,
    email: property.email,
    website: property.website,
    checkInTime: property.check_in_time,
    checkOutTime: property.check_out_time,
    timezone: property.timezone,
    currency: property.currency,
    language: property.language,
    amenities: property.amenities,
    images: property.images,
    policies: property.policies,
    isActive: property.is_active,
    createdAt: property.created_at,
    updatedAt: property.updated_at
  });
});

// Create property
export const createProperty = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    name,
    slug,
    description,
    propertyType = 'hotel',
    starRating,
    address,
    city,
    country,
    phone,
    email,
    website,
    checkInTime = '15:00:00',
    checkOutTime = '11:00:00',
    timezone = 'UTC',
    currency = 'USD',
    language = 'en',
    amenities = [],
    images = [],
    policies = {}
  } = req.body;

  // Validate required fields
  if (!name || !slug || !address || !city || !country) {
    return validationErrorResponse(res, ['Name, slug, address, city, and country are required']);
  }

  // Check if slug already exists for this tenant
  const existingProperty = await query(
    'SELECT id FROM properties WHERE slug = $1 AND tenant_id = $2',
    [slug, tenantId]
  );

  if (existingProperty.rows.length > 0) {
    return errorResponse(res, 'Property slug already exists', 409);
  }

  const propertyResult = await query(`
    INSERT INTO properties (
      tenant_id, name, slug, description, property_type, star_rating,
      address, city, country, phone, email, website,
      check_in_time, check_out_time, timezone, currency, language,
      amenities, images, policies
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    ) RETURNING id, name, slug, description, property_type, star_rating,
              address, city, country, phone, email, website,
              check_in_time, check_out_time, timezone, currency, language,
              amenities, images, policies, is_active, created_at, updated_at
  `, [
    tenantId, name, slug, description, propertyType, starRating,
    address, city, country, phone, email, website,
    checkInTime, checkOutTime, timezone, currency, language,
    amenities, images, policies
  ]);

  const property = propertyResult.rows[0];

  logger.info(`Property created: ${property.name} (${property.slug}) for tenant ${tenantId}`);

  return createdResponse(res, {
    id: property.id,
    name: property.name,
    slug: property.slug,
    description: property.description,
    propertyType: property.property_type,
    starRating: property.star_rating,
    address: property.address,
    city: property.city,
    country: property.country,
    phone: property.phone,
    email: property.email,
    website: property.website,
    checkInTime: property.check_in_time,
    checkOutTime: property.check_out_time,
    timezone: property.timezone,
    currency: property.currency,
    language: property.language,
    amenities: property.amenities,
    images: property.images,
    policies: property.policies,
    isActive: property.is_active,
    createdAt: property.created_at,
    updatedAt: property.updated_at
  });
});

// Update property
export const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const propertyId = req.params.id;
  const updateData = req.body;

  // Check if property exists
  const existingProperty = await query(
    'SELECT id, name FROM properties WHERE id = $1 AND tenant_id = $2',
    [propertyId, tenantId]
  );

  if (existingProperty.rows.length === 0) {
    return notFoundResponse(res, 'Property not found');
  }

  // Check if slug is being changed and if it already exists
  if (updateData.slug) {
    const slugCheck = await query(
      'SELECT id FROM properties WHERE slug = $1 AND tenant_id = $2 AND id != $3',
      [updateData.slug, tenantId, propertyId]
    );

    if (slugCheck.rows.length > 0) {
      return errorResponse(res, 'Property slug already exists', 409);
    }
  }

  // Build dynamic update query
  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'name', 'slug', 'description', 'property_type', 'star_rating',
    'address', 'city', 'country', 'phone', 'email', 'website',
    'check_in_time', 'check_out_time', 'timezone', 'currency', 'language',
    'amenities', 'images', 'policies', 'is_active'
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
  values.push(propertyId, tenantId);

  const propertyResult = await query(`
    UPDATE properties 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING id, name, slug, description, property_type, star_rating,
              address, city, country, phone, email, website,
              check_in_time, check_out_time, timezone, currency, language,
              amenities, images, policies, is_active, created_at, updated_at
  `, values);

  const property = propertyResult.rows[0];

  logger.info(`Property updated: ${property.name} (${property.slug})`);

  return updatedResponse(res, {
    id: property.id,
    name: property.name,
    slug: property.slug,
    description: property.description,
    propertyType: property.property_type,
    starRating: property.star_rating,
    address: property.address,
    city: property.city,
    country: property.country,
    phone: property.phone,
    email: property.email,
    website: property.website,
    checkInTime: property.check_in_time,
    checkOutTime: property.check_out_time,
    timezone: property.timezone,
    currency: property.currency,
    language: property.language,
    amenities: property.amenities,
    images: property.images,
    policies: property.policies,
    isActive: property.is_active,
    createdAt: property.created_at,
    updatedAt: property.updated_at
  });
});

// Delete property
export const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const propertyId = req.params.id;

  // Check if property exists
  const propertyResult = await query(
    'SELECT id, name FROM properties WHERE id = $1 AND tenant_id = $2',
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    return notFoundResponse(res, 'Property not found');
  }

  const property = propertyResult.rows[0];

  // Check if property has active bookings
  const bookingsResult = await query(
    'SELECT COUNT(*) as count FROM bookings WHERE property_id = $1 AND status IN ($2, $3)',
    [propertyId, 'confirmed', 'pending']
  );

  if (parseInt(bookingsResult.rows[0].count) > 0) {
    return errorResponse(res, 'Cannot delete property with active bookings', 400);
  }

  // Soft delete property and related data
  await transaction(async (client) => {
    // Deactivate property
    await client.query(
      'UPDATE properties SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [propertyId]
    );

    // Deactivate rooms
    await client.query(
      'UPDATE rooms SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE property_id = $1',
      [propertyId]
    );

    // Deactivate rate plans
    await client.query(
      'UPDATE rate_plans SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE property_id = $1',
      [propertyId]
    );
  });

  logger.info(`Property deleted: ${property.name} (${propertyId})`);

  return deletedResponse(res, 'Property deleted successfully');
});

// Get property statistics
export const getPropertyStats = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const propertyId = req.params.id;

  // Check if property exists
  const propertyResult = await query(
    'SELECT id, name FROM properties WHERE id = $1 AND tenant_id = $2',
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    return notFoundResponse(res, 'Property not found');
  }

  // Get statistics
  const statsResult = await query(`
    SELECT 
      (SELECT COUNT(*) FROM rooms WHERE property_id = $1 AND is_active = true) as total_rooms,
      (SELECT COUNT(*) FROM bookings WHERE property_id = $1) as total_bookings,
      (SELECT COUNT(*) FROM bookings WHERE property_id = $1 AND status = 'confirmed') as confirmed_bookings,
      (SELECT COUNT(*) FROM bookings WHERE property_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_bookings,
      (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE property_id = $1 AND status = 'confirmed') as total_revenue,
      (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE property_id = $1 AND status = 'confirmed' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_revenue
  `, [propertyId]);

  const stats = statsResult.rows[0];

  // Get occupancy rate (last 30 days)
  const occupancyResult = await query(`
    SELECT 
      COALESCE(AVG(
        CASE 
          WHEN total_rooms > 0 THEN (total_rooms - available_rooms)::DECIMAL / total_rooms * 100
          ELSE 0
        END
      ), 0) as avg_occupancy_rate
    FROM room_inventory ri
    JOIN rooms r ON ri.room_id = r.id
    WHERE r.property_id = $1 
    AND ri.date >= CURRENT_DATE - INTERVAL '30 days'
    AND ri.date < CURRENT_DATE
  `, [propertyId]);

  const occupancy = occupancyResult.rows[0];

  return successResponse(res, {
    totalRooms: parseInt(stats.total_rooms),
    totalBookings: parseInt(stats.total_bookings),
    confirmedBookings: parseInt(stats.confirmed_bookings),
    recentBookings: parseInt(stats.recent_bookings),
    totalRevenue: parseFloat(stats.total_revenue),
    recentRevenue: parseFloat(stats.recent_revenue),
    avgOccupancyRate: parseFloat(occupancy.avg_occupancy_rate)
  });
});
