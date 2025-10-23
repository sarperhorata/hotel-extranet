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

// Get all rate plans
export const getRatePlans = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { 
    page = 1, 
    limit = 10, 
    propertyId,
    planType,
    isDynamic,
    isActive = 'true'
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE rp.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Add filters
  if (propertyId) {
    whereClause += ` AND rp.property_id = $${paramIndex}`;
    params.push(propertyId);
    paramIndex++;
  }

  if (planType) {
    whereClause += ` AND rp.plan_type = $${paramIndex}`;
    params.push(planType);
    paramIndex++;
  }

  if (isDynamic !== undefined) {
    whereClause += ` AND rp.is_dynamic = $${paramIndex}`;
    params.push(isDynamic === 'true');
    paramIndex++;
  }

  if (isActive !== 'all') {
    whereClause += ` AND rp.is_active = $${paramIndex}`;
    params.push(isActive === 'true');
    paramIndex++;
  }

  // Get rate plans
  const ratePlansResult = await query(`
    SELECT 
      rp.id, rp.name, rp.description, rp.plan_type, rp.base_price,
      rp.currency, rp.is_dynamic, rp.dynamic_rules, rp.restrictions,
      rp.is_active, rp.created_at, rp.updated_at,
      p.id as property_id, p.name as property_name
    FROM rate_plans rp
    JOIN properties p ON rp.property_id = p.id
    ${whereClause}
    ORDER BY rp.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM rate_plans rp
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);

  return paginatedResponse(res, ratePlansResult.rows.map(ratePlan => ({
    id: ratePlan.id,
    name: ratePlan.name,
    description: ratePlan.description,
    planType: ratePlan.plan_type,
    basePrice: parseFloat(ratePlan.base_price),
    currency: ratePlan.currency,
    isDynamic: ratePlan.is_dynamic,
    dynamicRules: ratePlan.dynamic_rules,
    restrictions: ratePlan.restrictions,
    isActive: ratePlan.is_active,
    property: {
      id: ratePlan.property_id,
      name: ratePlan.property_name
    },
    createdAt: ratePlan.created_at,
    updatedAt: ratePlan.updated_at
  })), Number(page), Number(limit), total);
});

// Get single rate plan
export const getRatePlan = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const ratePlanId = req.params.id;

  const ratePlanResult = await query(`
    SELECT 
      rp.id, rp.name, rp.description, rp.plan_type, rp.base_price,
      rp.currency, rp.is_dynamic, rp.dynamic_rules, rp.restrictions,
      rp.is_active, rp.created_at, rp.updated_at,
      p.id as property_id, p.name as property_name
    FROM rate_plans rp
    JOIN properties p ON rp.property_id = p.id
    WHERE rp.id = $1 AND rp.tenant_id = $2
  `, [ratePlanId, tenantId]);

  if (ratePlanResult.rows.length === 0) {
    return notFoundResponse(res, 'Rate plan not found');
  }

  const ratePlan = ratePlanResult.rows[0];

  return successResponse(res, {
    id: ratePlan.id,
    name: ratePlan.name,
    description: ratePlan.description,
    planType: ratePlan.plan_type,
    basePrice: parseFloat(ratePlan.base_price),
    currency: ratePlan.currency,
    isDynamic: ratePlan.is_dynamic,
    dynamicRules: ratePlan.dynamic_rules,
    restrictions: ratePlan.restrictions,
    isActive: ratePlan.is_active,
    property: {
      id: ratePlan.property_id,
      name: ratePlan.property_name
    },
    createdAt: ratePlan.created_at,
    updatedAt: ratePlan.updated_at
  });
});

// Create rate plan
export const createRatePlan = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    propertyId,
    name,
    description,
    planType = 'standard',
    basePrice = 0,
    currency = 'USD',
    isDynamic = false,
    dynamicRules = {},
    restrictions = {}
  } = req.body;

  // Validate required fields
  if (!propertyId || !name) {
    return validationErrorResponse(res, ['Property ID and name are required']);
  }

  // Check if property exists and belongs to tenant
  const propertyResult = await query(
    'SELECT id, name FROM properties WHERE id = $1 AND tenant_id = $2 AND is_active = true',
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    return notFoundResponse(res, 'Property not found');
  }

  // Check if rate plan name already exists for this property
  const existingRatePlan = await query(
    'SELECT id FROM rate_plans WHERE name = $1 AND property_id = $2',
    [name, propertyId]
  );

  if (existingRatePlan.rows.length > 0) {
    return errorResponse(res, 'Rate plan name already exists for this property', 409);
  }

  const ratePlanResult = await query(`
    INSERT INTO rate_plans (
      tenant_id, property_id, name, description, plan_type, base_price,
      currency, is_dynamic, dynamic_rules, restrictions
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    ) RETURNING id, name, description, plan_type, base_price, currency,
              is_dynamic, dynamic_rules, restrictions, is_active,
              created_at, updated_at
  `, [
    tenantId, propertyId, name, description, planType, basePrice,
    currency, isDynamic, dynamicRules, restrictions
  ]);

  const ratePlan = ratePlanResult.rows[0];

  logger.info(`Rate plan created: ${ratePlan.name} for property ${propertyId}`);

  return createdResponse(res, {
    id: ratePlan.id,
    name: ratePlan.name,
    description: ratePlan.description,
    planType: ratePlan.plan_type,
    basePrice: parseFloat(ratePlan.base_price),
    currency: ratePlan.currency,
    isDynamic: ratePlan.is_dynamic,
    dynamicRules: ratePlan.dynamic_rules,
    restrictions: ratePlan.restrictions,
    isActive: ratePlan.is_active,
    createdAt: ratePlan.created_at,
    updatedAt: ratePlan.updated_at
  });
});

// Update rate plan
export const updateRatePlan = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const ratePlanId = req.params.id;
  const updateData = req.body;

  // Check if rate plan exists
  const existingRatePlan = await query(
    'SELECT id, name, property_id FROM rate_plans WHERE id = $1 AND tenant_id = $2',
    [ratePlanId, tenantId]
  );

  if (existingRatePlan.rows.length === 0) {
    return notFoundResponse(res, 'Rate plan not found');
  }

  const ratePlan = existingRatePlan.rows[0];

  // Check if name is being changed and if it already exists
  if (updateData.name && updateData.name !== ratePlan.name) {
    const nameCheck = await query(
      'SELECT id FROM rate_plans WHERE name = $1 AND property_id = $2 AND id != $3',
      [updateData.name, ratePlan.property_id, ratePlanId]
    );

    if (nameCheck.rows.length > 0) {
      return errorResponse(res, 'Rate plan name already exists for this property', 409);
    }
  }

  // Build dynamic update query
  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'name', 'description', 'plan_type', 'base_price', 'currency',
    'is_dynamic', 'dynamic_rules', 'restrictions', 'is_active'
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
  values.push(ratePlanId, tenantId);

  const ratePlanResult = await query(`
    UPDATE rate_plans 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING id, name, description, plan_type, base_price, currency,
              is_dynamic, dynamic_rules, restrictions, is_active,
              created_at, updated_at
  `, values);

  const updatedRatePlan = ratePlanResult.rows[0];

  logger.info(`Rate plan updated: ${updatedRatePlan.name}`);

  return updatedResponse(res, {
    id: updatedRatePlan.id,
    name: updatedRatePlan.name,
    description: updatedRatePlan.description,
    planType: updatedRatePlan.plan_type,
    basePrice: parseFloat(updatedRatePlan.base_price),
    currency: updatedRatePlan.currency,
    isDynamic: updatedRatePlan.is_dynamic,
    dynamicRules: updatedRatePlan.dynamic_rules,
    restrictions: updatedRatePlan.restrictions,
    isActive: updatedRatePlan.is_active,
    createdAt: updatedRatePlan.created_at,
    updatedAt: updatedRatePlan.updated_at
  });
});

// Delete rate plan
export const deleteRatePlan = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const ratePlanId = req.params.id;

  // Check if rate plan exists
  const ratePlanResult = await query(
    'SELECT id, name FROM rate_plans WHERE id = $1 AND tenant_id = $2',
    [ratePlanId, tenantId]
  );

  if (ratePlanResult.rows.length === 0) {
    return notFoundResponse(res, 'Rate plan not found');
  }

  const ratePlan = ratePlanResult.rows[0];

  // Check if rate plan has active inventory
  const inventoryResult = await query(
    'SELECT COUNT(*) as count FROM room_inventory WHERE rate_plan_id = $1',
    [ratePlanId]
  );

  if (parseInt(inventoryResult.rows[0].count) > 0) {
    return errorResponse(res, 'Cannot delete rate plan with active inventory', 400);
  }

  // Soft delete rate plan
  await query(
    'UPDATE rate_plans SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [ratePlanId]
  );

  logger.info(`Rate plan deleted: ${ratePlan.name}`);

  return deletedResponse(res, 'Rate plan deleted successfully');
});

// Calculate dynamic pricing
export const calculateDynamicPricing = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    ratePlanId,
    roomId,
    date,
    basePrice,
    demandLevel = 'medium', // low, medium, high
    season = 'normal', // low_season, normal, high_season
    occupancyRate = 0.5 // 0-1
  } = req.body;

  // Validate required fields
  if (!ratePlanId || !roomId || !date || basePrice === undefined) {
    return validationErrorResponse(res, ['Rate plan ID, room ID, date, and base price are required']);
  }

  // Get rate plan dynamic rules
  const ratePlanResult = await query(
    'SELECT dynamic_rules FROM rate_plans WHERE id = $1 AND tenant_id = $2 AND is_dynamic = true',
    [ratePlanId, tenantId]
  );

  if (ratePlanResult.rows.length === 0) {
    return errorResponse(res, 'Rate plan not found or not dynamic', 404);
  }

  const dynamicRules = ratePlanResult.rows[0].dynamic_rules || {};
  
  // Calculate price based on dynamic rules
  let calculatedPrice = basePrice;
  
  // Apply base multiplier
  if (dynamicRules.base_multiplier) {
    calculatedPrice *= dynamicRules.base_multiplier;
  }

  // Apply demand multiplier
  if (dynamicRules.demand_multipliers && dynamicRules.demand_multipliers[demandLevel]) {
    calculatedPrice *= dynamicRules.demand_multipliers[demandLevel];
  }

  // Apply season multiplier
  if (dynamicRules.season_multipliers && dynamicRules.season_multipliers[season]) {
    calculatedPrice *= dynamicRules.season_multipliers[season];
  }

  // Apply occupancy-based pricing
  if (dynamicRules.occupancy_multipliers) {
    const { low_occupancy, high_occupancy } = dynamicRules.occupancy_multipliers;
    if (occupancyRate < 0.3 && low_occupancy) {
      calculatedPrice *= low_occupancy;
    } else if (occupancyRate > 0.8 && high_occupancy) {
      calculatedPrice *= high_occupancy;
    }
  }

  // Apply minimum and maximum price limits
  if (dynamicRules.min_price && calculatedPrice < dynamicRules.min_price) {
    calculatedPrice = dynamicRules.min_price;
  }
  
  if (dynamicRules.max_price && calculatedPrice > dynamicRules.max_price) {
    calculatedPrice = dynamicRules.max_price;
  }

  // Round to 2 decimal places
  calculatedPrice = Math.round(calculatedPrice * 100) / 100;

  return successResponse(res, {
    ratePlanId,
    roomId,
    date,
    basePrice: parseFloat(basePrice),
    calculatedPrice,
    demandLevel,
    season,
    occupancyRate,
    appliedRules: {
      baseMultiplier: dynamicRules.base_multiplier || 1,
      demandMultiplier: dynamicRules.demand_multipliers?.[demandLevel] || 1,
      seasonMultiplier: dynamicRules.season_multipliers?.[season] || 1,
      minPrice: dynamicRules.min_price,
      maxPrice: dynamicRules.max_price
    }
  });
});

// Get rate plan statistics
export const getRatePlanStats = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const ratePlanId = req.params.id;

  // Check if rate plan exists
  const ratePlanResult = await query(
    'SELECT id, name FROM rate_plans WHERE id = $1 AND tenant_id = $2',
    [ratePlanId, tenantId]
  );

  if (ratePlanResult.rows.length === 0) {
    return notFoundResponse(res, 'Rate plan not found');
  }

  // Get statistics
  const statsResult = await query(`
    SELECT 
      (SELECT COUNT(*) FROM room_inventory WHERE rate_plan_id = $1) as total_inventory_records,
      (SELECT COUNT(*) FROM bookings WHERE rate_plan_id = $1) as total_bookings,
      (SELECT COUNT(*) FROM bookings WHERE rate_plan_id = $1 AND status = 'confirmed') as confirmed_bookings,
      (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE rate_plan_id = $1 AND status = 'confirmed') as total_revenue,
      (SELECT COALESCE(AVG(price), 0) FROM room_inventory WHERE rate_plan_id = $1) as avg_price,
      (SELECT COALESCE(MIN(price), 0) FROM room_inventory WHERE rate_plan_id = $1) as min_price,
      (SELECT COALESCE(MAX(price), 0) FROM room_inventory WHERE rate_plan_id = $1) as max_price
  `, [ratePlanId]);

  const stats = statsResult.rows[0];

  return successResponse(res, {
    totalInventoryRecords: parseInt(stats.total_inventory_records),
    totalBookings: parseInt(stats.total_bookings),
    confirmedBookings: parseInt(stats.confirmed_bookings),
    totalRevenue: parseFloat(stats.total_revenue),
    avgPrice: parseFloat(stats.avg_price),
    minPrice: parseFloat(stats.min_price),
    maxPrice: parseFloat(stats.max_price)
  });
});
