import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/env';
import { query, transaction } from '../../config/database';
import { logger } from '../../utils/logger';
import {
  successResponse,
  errorResponse,
  createdResponse,
  unauthorizedResponse,
  validationErrorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { authRateLimiter } from '../../middlewares/rateLimiter';

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: admin@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: password123
 *         rememberMe:
 *           type: boolean
 *           example: false
 *
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - tenantName
 *         - tenantSlug
 *         - tenantEmail
 *         - adminEmail
 *         - adminPassword
 *       properties:
 *         tenantName:
 *           type: string
 *           example: Hotel Chain ABC
 *         tenantSlug:
 *           type: string
 *           example: hotel-chain-abc
 *         tenantEmail:
 *           type: string
 *           format: email
 *           example: info@hotelchain.com
 *         tenantPhone:
 *           type: string
 *           example: +1-555-0123
 *         tenantAddress:
 *           type: string
 *           example: 123 Main St, City, State
 *         tenantCity:
 *           type: string
 *           example: New York
 *         tenantCountry:
 *           type: string
 *           example: United States
 *         adminEmail:
 *           type: string
 *           format: email
 *           example: admin@hotelchain.com
 *         adminPassword:
 *           type: string
 *           format: password
 *           example: securePassword123
 *         adminFirstName:
 *           type: string
 *           example: John
 *         adminLastName:
 *           type: string
 *           example: Doe
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         refreshToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           $ref: '#/components/schemas/User'
 *         tenant:
 *           $ref: '#/components/schemas/Tenant'
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register new tenant and admin user
 *     description: Creates a new tenant (SaaS client) and initial admin user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/AuthResponse' }
 *                 message: { type: string, example: 'Registration successful' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Tenant already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const register = catchAsync(async (req: Request, res: Response) => {
  const {
    tenantName,
    tenantSlug,
    tenantEmail,
    tenantPhone,
    tenantAddress,
    tenantCity,
    tenantCountry,
    adminEmail,
    adminPassword,
    adminFirstName,
    adminLastName
  } = req.body;

  // Validate required fields
  if (!tenantName || !tenantSlug || !tenantEmail || !adminEmail || !adminPassword) {
    return validationErrorResponse(res, ['Tenant name, slug, email, admin email, and password are required']);
  }

  // Check if tenant slug already exists
  const existingTenant = await query(
    'SELECT id FROM tenants WHERE slug = $1',
    [tenantSlug]
  );

  if (existingTenant.rows.length > 0) {
    return errorResponse(res, 'Tenant slug already exists', 409);
  }

  // Check if admin email already exists
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1',
    [adminEmail]
  );

  if (existingUser.rows.length > 0) {
    return errorResponse(res, 'Admin email already exists', 409);
  }

  // Create tenant and admin user in transaction
  const result = await transaction(async (client) => {
    // Create tenant
    const tenantResult = await client.query(`
      INSERT INTO tenants (name, slug, email, phone, address, city, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, slug, email
    `, [tenantName, tenantSlug, tenantEmail, tenantPhone, tenantAddress, tenantCity, tenantCountry]);

    const tenant = tenantResult.rows[0];

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, config.BCRYPT_ROUNDS);

    // Create admin user
    const userResult = await client.query(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, role
    `, [tenant.id, adminEmail, hashedPassword, adminFirstName, adminLastName, 'admin', true]);

    const user = userResult.rows[0];

    return { tenant, user };
  });

  logger.info(`New tenant registered: ${result.tenant.name} (${result.tenant.slug})`);

  return createdResponse(res, {
    tenant: result.tenant,
    user: result.user
  }, 'Tenant and admin user created successfully');
});

// Login user
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return access/refresh tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/AuthResponse' }
 *                 message: { type: string, example: 'Login successful' }
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return validationErrorResponse(res, ['Email and password are required']);
  }

  // Find user with tenant info
  const userResult = await query(`
    SELECT 
      u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.is_active,
      u.tenant_id, t.name as tenant_name, t.slug as tenant_slug
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email = $1 AND u.is_active = true AND t.is_active = true
  `, [email]);

  if (userResult.rows.length === 0) {
    return unauthorizedResponse(res, 'Invalid email or password');
  }

  const user = userResult.rows[0];

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return unauthorizedResponse(res, 'Invalid email or password');
  }

  // Generate tokens
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
  );

  // Store refresh token in database
  const refreshTokenExpires = new Date();
  refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7); // 7 days

  await query(
    'UPDATE users SET refresh_token = $1, refresh_token_expires_at = $2, last_login_at = CURRENT_TIMESTAMP WHERE id = $3',
    [refreshToken, refreshTokenExpires, user.id]
  );

  logger.info(`User logged in: ${user.email} (${user.tenant_name})`);

  return successResponse(res, {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
      tenantSlug: user.tenant_slug
    },
    accessToken,
    refreshToken
  }, 'Login successful');
});

// Refresh access token
export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return validationErrorResponse(res, ['Refresh token is required']);
  }

  // Verify refresh token
  const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as any;

  // Check if user exists and refresh token is valid
  const userResult = await query(`
    SELECT 
      u.id, u.email, u.role, u.is_active, u.refresh_token, u.refresh_token_expires_at,
      t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = $1 AND u.is_active = true AND t.is_active = true
  `, [decoded.userId]);

  if (userResult.rows.length === 0) {
    return unauthorizedResponse(res, 'Invalid refresh token');
  }

  const user = userResult.rows[0];

  // Check if refresh token matches and is not expired
  if (user.refresh_token !== refreshToken || new Date() > new Date(user.refresh_token_expires_at)) {
    return unauthorizedResponse(res, 'Refresh token expired or invalid');
  }

  // Generate new access token
  const newAccessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  return successResponse(res, {
    accessToken: newAccessToken
  }, 'Token refreshed successfully');
});

// Logout user
export const logout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (userId) {
    // Clear refresh token
    await query(
      'UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = $1',
      [userId]
    );

    logger.info(`User logged out: ${req.user?.email}`);
  }

  return successResponse(res, null, 'Logout successful');
});

// Get current user profile
export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const userResult = await query(`
    SELECT 
      u.id, u.email, u.first_name, u.last_name, u.role, u.phone, u.avatar_url,
      u.last_login_at, u.created_at,
      t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = $1 AND u.is_active = true
  `, [userId]);

  if (userResult.rows.length === 0) {
    return errorResponse(res, 'User not found', 404);
  }

  const user = userResult.rows[0];

  return successResponse(res, {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    tenant: {
      id: user.tenant_id,
      name: user.tenant_name,
      slug: user.tenant_slug
    }
  });
});

// Update user profile
export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { firstName, lastName, phone, avatarUrl } = req.body;

  const userResult = await query(`
    UPDATE users 
    SET first_name = $1, last_name = $2, phone = $3, avatar_url = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5 AND is_active = true
    RETURNING id, email, first_name, last_name, phone, avatar_url
  `, [firstName, lastName, phone, avatarUrl, userId]);

  if (userResult.rows.length === 0) {
    return errorResponse(res, 'User not found', 404);
  }

  const user = userResult.rows[0];

  logger.info(`User profile updated: ${user.email}`);

  return successResponse(res, {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    avatarUrl: user.avatar_url
  }, 'Profile updated successfully');
});

// Change password
export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return validationErrorResponse(res, ['Current password and new password are required']);
  }

  // Get current user
  const userResult = await query(
    'SELECT password_hash FROM users WHERE id = $1 AND is_active = true',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return errorResponse(res, 'User not found', 404);
  }

  const user = userResult.rows[0];

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    return unauthorizedResponse(res, 'Current password is incorrect');
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

  // Update password
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [hashedNewPassword, userId]
  );

  logger.info(`Password changed for user: ${req.user?.email}`);

  return successResponse(res, null, 'Password changed successfully');
});
