import { Request, Response } from 'express';
import { query, transaction } from '../config/database';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  errorResponse, 
  updatedResponse,
  notFoundResponse,
  validationErrorResponse 
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { authorize } from '../../middlewares/auth';

// Get tenant profile
export const getTenantProfile = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;

  const tenantResult = await query(`
    SELECT 
      id, name, slug, email, phone, address, city, country, timezone, currency, language,
      logo_url, website, is_active, subscription_plan, subscription_expires_at,
      created_at, updated_at
    FROM tenants 
    WHERE id = $1 AND is_active = true
  `, [tenantId]);

  if (tenantResult.rows.length === 0) {
    return notFoundResponse(res, 'Tenant not found');
  }

  const tenant = tenantResult.rows[0];

  return successResponse(res, {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    email: tenant.email,
    phone: tenant.phone,
    address: tenant.address,
    city: tenant.city,
    country: tenant.country,
    timezone: tenant.timezone,
    currency: tenant.currency,
    language: tenant.language,
    logoUrl: tenant.logo_url,
    website: tenant.website,
    isActive: tenant.is_active,
    subscriptionPlan: tenant.subscription_plan,
    subscriptionExpiresAt: tenant.subscription_expires_at,
    createdAt: tenant.created_at,
    updatedAt: tenant.updated_at
  });
});

// Update tenant profile
export const updateTenantProfile = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    name,
    phone,
    address,
    city,
    country,
    timezone,
    currency,
    language,
    logoUrl,
    website
  } = req.body;

  const tenantResult = await query(`
    UPDATE tenants 
    SET 
      name = COALESCE($1, name),
      phone = COALESCE($2, phone),
      address = COALESCE($3, address),
      city = COALESCE($4, city),
      country = COALESCE($5, country),
      timezone = COALESCE($6, timezone),
      currency = COALESCE($7, currency),
      language = COALESCE($8, language),
      logo_url = COALESCE($9, logo_url),
      website = COALESCE($10, website),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $11 AND is_active = true
    RETURNING id, name, slug, email, phone, address, city, country, timezone, currency, language,
              logo_url, website, is_active, subscription_plan, subscription_expires_at,
              created_at, updated_at
  `, [name, phone, address, city, country, timezone, currency, language, logoUrl, website, tenantId]);

  if (tenantResult.rows.length === 0) {
    return notFoundResponse(res, 'Tenant not found');
  }

  const tenant = tenantResult.rows[0];

  logger.info(`Tenant profile updated: ${tenant.name} (${tenant.slug})`);

  return updatedResponse(res, {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    email: tenant.email,
    phone: tenant.phone,
    address: tenant.address,
    city: tenant.city,
    country: tenant.country,
    timezone: tenant.timezone,
    currency: tenant.currency,
    language: tenant.language,
    logoUrl: tenant.logo_url,
    website: tenant.website,
    isActive: tenant.is_active,
    subscriptionPlan: tenant.subscription_plan,
    subscriptionExpiresAt: tenant.subscription_expires_at,
    createdAt: tenant.created_at,
    updatedAt: tenant.updated_at
  });
});

// Get tenant statistics
export const getTenantStats = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;

  // Get basic counts
  const statsResult = await query(`
    SELECT 
      (SELECT COUNT(*) FROM properties WHERE tenant_id = $1 AND is_active = true) as total_properties,
      (SELECT COUNT(*) FROM rooms r 
       JOIN properties p ON r.property_id = p.id 
       WHERE p.tenant_id = $1 AND r.is_active = true) as total_rooms,
      (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1) as total_bookings,
      (SELECT COUNT(*) FROM guests WHERE tenant_id = $1) as total_guests,
      (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = true) as total_users
  `, [tenantId]);

  const stats = statsResult.rows[0];

  // Get recent bookings (last 30 days)
  const recentBookingsResult = await query(`
    SELECT 
      COUNT(*) as recent_bookings,
      COALESCE(SUM(total_amount), 0) as recent_revenue
    FROM bookings 
    WHERE tenant_id = $1 
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  `, [tenantId]);

  const recentStats = recentBookingsResult.rows[0];

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
    JOIN properties p ON r.property_id = p.id
    WHERE p.tenant_id = $1 
    AND ri.date >= CURRENT_DATE - INTERVAL '30 days'
    AND ri.date < CURRENT_DATE
  `, [tenantId]);

  const occupancy = occupancyResult.rows[0];

  return successResponse(res, {
    totalProperties: parseInt(stats.total_properties),
    totalRooms: parseInt(stats.total_rooms),
    totalBookings: parseInt(stats.total_bookings),
    totalGuests: parseInt(stats.total_guests),
    totalUsers: parseInt(stats.total_users),
    recentBookings: parseInt(recentStats.recent_bookings),
    recentRevenue: parseFloat(recentStats.recent_revenue),
    avgOccupancyRate: parseFloat(occupancy.avg_occupancy_rate)
  });
});

// Get tenant users
export const getTenantUsers = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { page = 1, limit = 10, role, search } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE u.tenant_id = $1 AND u.is_active = true';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Add role filter
  if (role) {
    whereClause += ` AND u.role = $${paramIndex}`;
    params.push(role);
    paramIndex++;
  }

  // Add search filter
  if (search) {
    whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Get users with pagination
  const usersResult = await query(`
    SELECT 
      u.id, u.email, u.first_name, u.last_name, u.role, u.phone, u.avatar_url,
      u.last_login_at, u.created_at
    FROM users u
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM users u
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / Number(limit));

  return successResponse(res, usersResult.rows.map(user => ({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at
  })), 'Users retrieved successfully', 200, {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages
  });
});

// Create new user
export const createUser = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    email,
    password,
    firstName,
    lastName,
    role = 'staff',
    phone
  } = req.body;

  // Check if email already exists
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    return errorResponse(res, 'Email already exists', 409);
  }

  // Hash password
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const userResult = await query(`
    INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, phone, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, email, first_name, last_name, role, phone, is_active, created_at
  `, [tenantId, email, hashedPassword, firstName, lastName, role, phone, true]);

  const user = userResult.rows[0];

  logger.info(`New user created: ${user.email} (${role}) for tenant ${tenantId}`);

  return successResponse(res, {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    phone: user.phone,
    isActive: user.is_active,
    createdAt: user.created_at
  }, 'User created successfully', 201);
});

// Update user
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const userId = req.params.id;
  const { firstName, lastName, role, phone, isActive } = req.body;

  const userResult = await query(`
    UPDATE users 
    SET 
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      role = COALESCE($3, role),
      phone = COALESCE($4, phone),
      is_active = COALESCE($5, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $6 AND tenant_id = $7
    RETURNING id, email, first_name, last_name, role, phone, is_active, created_at, updated_at
  `, [firstName, lastName, role, phone, isActive, userId, tenantId]);

  if (userResult.rows.length === 0) {
    return notFoundResponse(res, 'User not found');
  }

  const user = userResult.rows[0];

  logger.info(`User updated: ${user.email} (${user.role})`);

  return updatedResponse(res, {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    phone: user.phone,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  });
});

// Delete user
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const userId = req.params.id;

  // Check if user exists and belongs to tenant
  const userResult = await query(
    'SELECT id, email, role FROM users WHERE id = $1 AND tenant_id = $2',
    [userId, tenantId]
  );

  if (userResult.rows.length === 0) {
    return notFoundResponse(res, 'User not found');
  }

  const user = userResult.rows[0];

  // Prevent deleting admin users
  if (user.role === 'admin') {
    return errorResponse(res, 'Cannot delete admin users', 403);
  }

  // Soft delete user
  await query(
    'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [userId]
  );

  logger.info(`User deleted: ${user.email}`);

  return successResponse(res, null, 'User deleted successfully');
});
