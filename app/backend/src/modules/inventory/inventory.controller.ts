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

// Check availability
export const checkAvailability = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    propertyId,
    roomId,
    checkInDate,
    checkOutDate,
    adults = 1,
    children = 0,
    rooms = 1
  } = req.body;

  // Validate required fields
  if (!checkInDate || !checkOutDate) {
    return validationErrorResponse(res, ['Check-in date and check-out date are required']);
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (checkIn >= checkOut) {
    return validationErrorResponse(res, ['Check-out date must be after check-in date']);
  }

  // Build query conditions
  let whereClause = 'WHERE ri.tenant_id = $1 AND ri.date >= $2 AND ri.date < $3';
  const params: any[] = [tenantId, checkInDate, checkOutDate];
  let paramIndex = 4;

  if (propertyId) {
    whereClause += ` AND ri.property_id = $${paramIndex}`;
    params.push(propertyId);
    paramIndex++;
  }

  if (roomId) {
    whereClause += ` AND ri.room_id = $${paramIndex}`;
    params.push(roomId);
    paramIndex++;
  }

  // Get availability
  const availabilityResult = await query(`
    SELECT 
      ri.room_id,
      r.name as room_name,
      r.room_type,
      r.max_occupancy,
      r.max_adults,
      r.max_children,
      r.amenities,
      r.images,
      ri.rate_plan_id,
      rp.name as rate_plan_name,
      rp.plan_type,
      MIN(ri.available_rooms) as min_available_rooms,
      AVG(ri.price) as avg_price,
      MIN(ri.price) as min_price,
      MAX(ri.price) as max_price,
      ri.currency,
      ri.min_stay,
      ri.closed_to_arrival,
      ri.closed_to_departure,
      ri.stop_sell
    FROM room_inventory ri
    JOIN rooms r ON ri.room_id = r.id
    JOIN rate_plans rp ON ri.rate_plan_id = rp.id
    ${whereClause}
    AND ri.available_rooms >= $${paramIndex}
    AND r.max_occupancy >= $${paramIndex + 1}
    AND r.max_adults >= $${paramIndex + 2}
    AND r.max_children >= $${paramIndex + 3}
    AND ri.stop_sell = false
    GROUP BY ri.room_id, r.name, r.room_type, r.max_occupancy, r.max_adults, r.max_children,
             r.amenities, r.images, ri.rate_plan_id, rp.name, rp.plan_type,
             ri.currency, ri.min_stay, ri.closed_to_arrival, ri.closed_to_departure, ri.stop_sell
    HAVING MIN(ri.available_rooms) >= $${paramIndex}
    ORDER BY avg_price ASC
  `, [...params, rooms, adults + children, adults, children]);

  // Group results by room
  const roomAvailability = new Map();
  
  availabilityResult.rows.forEach(row => {
    const roomId = row.room_id;
    
    if (!roomAvailability.has(roomId)) {
      roomAvailability.set(roomId, {
        roomId: row.room_id,
        roomName: row.room_name,
        roomType: row.room_type,
        maxOccupancy: row.max_occupancy,
        maxAdults: row.max_adults,
        maxChildren: row.max_children,
        amenities: row.amenities,
        images: row.images,
        minAvailableRooms: parseInt(row.min_available_rooms),
        avgPrice: parseFloat(row.avg_price),
        minPrice: parseFloat(row.min_price),
        maxPrice: parseFloat(row.max_price),
        currency: row.currency,
        minStay: row.min_stay,
        closedToArrival: row.closed_to_arrival,
        closedToDeparture: row.closed_to_departure,
        stopSell: row.stop_sell,
        ratePlans: []
      });
    }

    roomAvailability.get(roomId).ratePlans.push({
      ratePlanId: row.rate_plan_id,
      ratePlanName: row.rate_plan_name,
      planType: row.plan_type,
      avgPrice: parseFloat(row.avg_price),
      minPrice: parseFloat(row.min_price),
      maxPrice: parseFloat(row.max_price)
    });
  });

  return successResponse(res, {
    checkInDate,
    checkOutDate,
    adults,
    children,
    rooms,
    nights: Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
    availableRooms: Array.from(roomAvailability.values())
  });
});

// Bulk update inventory
export const bulkUpdateInventory = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { updates } = req.body;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return validationErrorResponse(res, ['Updates array is required']);
  }

  const results = await transaction(async (client) => {
    const results = [];

    for (const update of updates) {
      const {
        roomId,
        ratePlanId,
        date,
        availableRooms,
        totalRooms,
        price,
        minStay,
        closedToArrival = false,
        closedToDeparture = false,
        stopSell = false,
        restrictions = {}
      } = update;

      // Validate required fields
      if (!roomId || !ratePlanId || !date) {
        results.push({
          roomId,
          ratePlanId,
          date,
          success: false,
          error: 'Room ID, rate plan ID, and date are required'
        });
        continue;
      }

      try {
        // Check if inventory record exists
        const existingResult = await client.query(
          'SELECT id FROM room_inventory WHERE room_id = $1 AND rate_plan_id = $2 AND date = $3 AND tenant_id = $4',
          [roomId, ratePlanId, date, tenantId]
        );

        if (existingResult.rows.length > 0) {
          // Update existing record
          const updateResult = await client.query(`
            UPDATE room_inventory 
            SET 
              available_rooms = COALESCE($1, available_rooms),
              total_rooms = COALESCE($2, total_rooms),
              price = COALESCE($3, price),
              min_stay = COALESCE($4, min_stay),
              closed_to_arrival = COALESCE($5, closed_to_arrival),
              closed_to_departure = COALESCE($6, closed_to_departure),
              stop_sell = COALESCE($7, stop_sell),
              restrictions = COALESCE($8, restrictions),
              updated_at = CURRENT_TIMESTAMP
            WHERE room_id = $9 AND rate_plan_id = $10 AND date = $11 AND tenant_id = $12
            RETURNING id
          `, [
            availableRooms, totalRooms, price, minStay,
            closedToArrival, closedToDeparture, stopSell, restrictions,
            roomId, ratePlanId, date, tenantId
          ]);

          results.push({
            roomId,
            ratePlanId,
            date,
            success: true,
            action: 'updated',
            inventoryId: updateResult.rows[0].id
          });
        } else {
          // Create new record
          const insertResult = await client.query(`
            INSERT INTO room_inventory (
              tenant_id, room_id, rate_plan_id, date, available_rooms, total_rooms,
              price, min_stay, closed_to_arrival, closed_to_departure, stop_sell, restrictions
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            ) RETURNING id
          `, [
            tenantId, roomId, ratePlanId, date, availableRooms, totalRooms,
            price, minStay, closedToArrival, closedToDeparture, stopSell, restrictions
          ]);

          results.push({
            roomId,
            ratePlanId,
            date,
            success: true,
            action: 'created',
            inventoryId: insertResult.rows[0].id
          });
        }
      } catch (error) {
        logger.error('Bulk update error:', error);
        results.push({
          roomId,
          ratePlanId,
          date,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  });

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  logger.info(`Bulk inventory update completed: ${successCount} successful, ${failureCount} failed`);

  return successResponse(res, {
    totalUpdates: updates.length,
    successful: successCount,
    failed: failureCount,
    results
  }, 'Bulk inventory update completed');
});

// Get inventory calendar
export const getInventoryCalendar = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { 
    propertyId, 
    roomId, 
    ratePlanId,
    startDate, 
    endDate,
    page = 1,
    limit = 100
  } = req.query;

  if (!startDate || !endDate) {
    return validationErrorResponse(res, ['Start date and end date are required']);
  }

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE ri.tenant_id = $1 AND ri.date >= $2 AND ri.date <= $3';
  const params: any[] = [tenantId, startDate, endDate];
  let paramIndex = 4;

  if (propertyId) {
    whereClause += ` AND ri.property_id = $${paramIndex}`;
    params.push(propertyId);
    paramIndex++;
  }

  if (roomId) {
    whereClause += ` AND ri.room_id = $${paramIndex}`;
    params.push(roomId);
    paramIndex++;
  }

  if (ratePlanId) {
    whereClause += ` AND ri.rate_plan_id = $${paramIndex}`;
    params.push(ratePlanId);
    paramIndex++;
  }

  // Get inventory data
  const inventoryResult = await query(`
    SELECT 
      ri.id,
      ri.room_id,
      r.name as room_name,
      r.room_type,
      ri.rate_plan_id,
      rp.name as rate_plan_name,
      rp.plan_type,
      ri.date,
      ri.available_rooms,
      ri.total_rooms,
      ri.price,
      ri.currency,
      ri.min_stay,
      ri.closed_to_arrival,
      ri.closed_to_departure,
      ri.stop_sell,
      ri.restrictions,
      ri.created_at,
      ri.updated_at
    FROM room_inventory ri
    JOIN rooms r ON ri.room_id = r.id
    JOIN rate_plans rp ON ri.rate_plan_id = rp.id
    ${whereClause}
    ORDER BY ri.date ASC, r.name ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM room_inventory ri
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);

  return successResponse(res, {
    inventory: inventoryResult.rows.map(row => ({
      id: row.id,
      roomId: row.room_id,
      roomName: row.room_name,
      roomType: row.room_type,
      ratePlanId: row.rate_plan_id,
      ratePlanName: row.rate_plan_name,
      planType: row.plan_type,
      date: row.date,
      availableRooms: row.available_rooms,
      totalRooms: row.total_rooms,
      price: parseFloat(row.price),
      currency: row.currency,
      minStay: row.min_stay,
      closedToArrival: row.closed_to_arrival,
      closedToDeparture: row.closed_to_departure,
      stopSell: row.stop_sell,
      restrictions: row.restrictions,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  });
});

// Update single inventory record
export const updateInventory = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const inventoryId = req.params.id;
  const updateData = req.body;

  // Check if inventory record exists
  const existingResult = await query(
    'SELECT id, room_id, rate_plan_id, date FROM room_inventory WHERE id = $1 AND tenant_id = $2',
    [inventoryId, tenantId]
  );

  if (existingResult.rows.length === 0) {
    return notFoundResponse(res, 'Inventory record not found');
  }

  // Build dynamic update query
  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'available_rooms', 'total_rooms', 'price', 'min_stay',
    'closed_to_arrival', 'closed_to_departure', 'stop_sell', 'restrictions'
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
  values.push(inventoryId, tenantId);

  const inventoryResult = await query(`
    UPDATE room_inventory 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING id, room_id, rate_plan_id, date, available_rooms, total_rooms,
              price, currency, min_stay, closed_to_arrival, closed_to_departure,
              stop_sell, restrictions, created_at, updated_at
  `, values);

  const inventory = inventoryResult.rows[0];

  logger.info(`Inventory updated: ${inventory.room_id} - ${inventory.date}`);

  return updatedResponse(res, {
    id: inventory.id,
    roomId: inventory.room_id,
    ratePlanId: inventory.rate_plan_id,
    date: inventory.date,
    availableRooms: inventory.available_rooms,
    totalRooms: inventory.total_rooms,
    price: parseFloat(inventory.price),
    currency: inventory.currency,
    minStay: inventory.min_stay,
    closedToArrival: inventory.closed_to_arrival,
    closedToDeparture: inventory.closed_to_departure,
    stopSell: inventory.stop_sell,
    restrictions: inventory.restrictions,
    createdAt: inventory.created_at,
    updatedAt: inventory.updated_at
  });
});
