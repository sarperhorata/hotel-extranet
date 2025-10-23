import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  validationErrorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';

// Search available properties and rooms
export const searchAvailability = catchAsync(async (req: Request, res: Response) => {
  const {
    checkInDate,
    checkOutDate,
    adults = 1,
    children = 0,
    rooms = 1,
    propertyId,
    city,
    country,
    roomType,
    minPrice,
    maxPrice,
    amenities = [],
    sortBy = 'price', // price, rating, name
    sortOrder = 'asc' // asc, desc
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

  if (checkIn < new Date()) {
    return validationErrorResponse(res, ['Check-in date cannot be in the past']);
  }

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Build search query
  let whereClause = `
    WHERE ri.tenant_id = $1 
    AND ri.date >= $2 
    AND ri.date < $3
    AND ri.available_rooms >= $4
    AND ri.stop_sell = false
    AND r.max_occupancy >= $5
    AND r.max_adults >= $6
    AND r.max_children >= $7
    AND p.is_active = true
    AND r.is_active = true
    AND rp.is_active = true
  `;

  const params: any[] = [
    req.tenantId, 
    checkInDate, 
    checkOutDate, 
    rooms, 
    adults + children, 
    adults, 
    children
  ];
  let paramIndex = 8;

  // Add property filter
  if (propertyId) {
    whereClause += ` AND ri.property_id = $${paramIndex}`;
    params.push(propertyId);
    paramIndex++;
  }

  // Add location filters
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

  // Add room type filter
  if (roomType) {
    whereClause += ` AND r.room_type = $${paramIndex}`;
    params.push(roomType);
    paramIndex++;
  }

  // Add price filters
  if (minPrice !== undefined) {
    whereClause += ` AND ri.price >= $${paramIndex}`;
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined) {
    whereClause += ` AND ri.price <= $${paramIndex}`;
    params.push(maxPrice);
    paramIndex++;
  }

  // Add amenities filter
  if (amenities.length > 0) {
    whereClause += ` AND (${amenities.map((_, index) => `$${paramIndex + index} = ANY(r.amenities)`).join(' OR ')})`;
    params.push(...amenities);
    paramIndex += amenities.length;
  }

  // Build sort clause
  let orderClause = '';
  switch (sortBy) {
    case 'price':
      orderClause = `ORDER BY avg_price ${sortOrder.toUpperCase()}`;
      break;
    case 'rating':
      orderClause = `ORDER BY p.star_rating ${sortOrder.toUpperCase()}, avg_price ASC`;
      break;
    case 'name':
      orderClause = `ORDER BY p.name ${sortOrder.toUpperCase()}, avg_price ASC`;
      break;
    default:
      orderClause = 'ORDER BY avg_price ASC';
  }

  // Execute search query
  const searchResult = await query(`
    SELECT 
      ri.room_id,
      r.name as room_name,
      r.room_type,
      r.max_occupancy,
      r.max_adults,
      r.max_children,
      r.amenities as room_amenities,
      r.images as room_images,
      ri.rate_plan_id,
      rp.name as rate_plan_name,
      rp.plan_type,
      ri.property_id,
      p.name as property_name,
      p.star_rating,
      p.address,
      p.city,
      p.country,
      p.amenities as property_amenities,
      p.images as property_images,
      MIN(ri.available_rooms) as min_available_rooms,
      AVG(ri.price) as avg_price,
      MIN(ri.price) as min_price,
      MAX(ri.price) as max_price,
      ri.currency,
      ri.min_stay,
      ri.closed_to_arrival,
      ri.closed_to_departure
    FROM room_inventory ri
    JOIN rooms r ON ri.room_id = r.id
    JOIN properties p ON ri.property_id = p.id
    JOIN rate_plans rp ON ri.rate_plan_id = rp.id
    ${whereClause}
    GROUP BY ri.room_id, r.name, r.room_type, r.max_occupancy, r.max_adults, r.max_children,
             r.amenities, r.images, ri.rate_plan_id, rp.name, rp.plan_type,
             ri.property_id, p.name, p.star_rating, p.address, p.city, p.country,
             p.amenities, p.images, ri.currency, ri.min_stay, ri.closed_to_arrival, ri.closed_to_departure
    HAVING MIN(ri.available_rooms) >= $${paramIndex}
    ${orderClause}
  `, [...params, rooms]);

  // Group results by property and room
  const searchResults = new Map();
  
  searchResult.rows.forEach(row => {
    const propertyId = row.property_id;
    const roomId = row.room_id;
    const key = `${propertyId}-${roomId}`;
    
    if (!searchResults.has(key)) {
      searchResults.set(key, {
        property: {
          id: row.property_id,
          name: row.property_name,
          starRating: row.star_rating,
          address: row.address,
          city: row.city,
          country: row.country,
          amenities: row.property_amenities,
          images: row.property_images
        },
        room: {
          id: row.room_id,
          name: row.room_name,
          roomType: row.room_type,
          maxOccupancy: row.max_occupancy,
          maxAdults: row.max_adults,
          maxChildren: row.max_children,
          amenities: row.room_amenities,
          images: row.room_images
        },
        minAvailableRooms: parseInt(row.min_available_rooms),
        avgPrice: parseFloat(row.avg_price),
        minPrice: parseFloat(row.min_price),
        maxPrice: parseFloat(row.max_price),
        currency: row.currency,
        minStay: row.min_stay,
        closedToArrival: row.closed_to_arrival,
        closedToDeparture: row.closed_to_departure,
        ratePlans: []
      });
    }

    searchResults.get(key).ratePlans.push({
      ratePlanId: row.rate_plan_id,
      ratePlanName: row.rate_plan_name,
      planType: row.plan_type,
      avgPrice: parseFloat(row.avg_price),
      minPrice: parseFloat(row.min_price),
      maxPrice: parseFloat(row.max_price)
    });
  });

  // Calculate total price for the stay
  const results = Array.from(searchResults.values()).map(result => ({
    ...result,
    totalPrice: result.avgPrice * nights,
    totalNights: nights
  }));

  logger.info(`Search completed: ${results.length} results found for ${checkInDate} to ${checkOutDate}`);

  return successResponse(res, {
    searchCriteria: {
      checkInDate,
      checkOutDate,
      adults,
      children,
      rooms,
      nights,
      propertyId,
      city,
      country,
      roomType,
      minPrice,
      maxPrice,
      amenities,
      sortBy,
      sortOrder
    },
    totalResults: results.length,
    results
  });
});

// Get search suggestions
export const getSearchSuggestions = catchAsync(async (req: Request, res: Response) => {
  const { query: searchQuery, type } = req.query;

  if (!searchQuery || typeof searchQuery !== 'string') {
    return validationErrorResponse(res, ['Search query is required']);
  }

  const suggestions = [];

  // Get property suggestions
  if (!type || type === 'properties') {
    const propertyResult = await query(`
      SELECT DISTINCT p.id, p.name, p.city, p.country
      FROM properties p
      WHERE p.tenant_id = $1 
      AND p.is_active = true
      AND (p.name ILIKE $2 OR p.city ILIKE $2 OR p.country ILIKE $2)
      ORDER BY p.name
      LIMIT 10
    `, [req.tenantId, `%${searchQuery}%`]);

    suggestions.push(...propertyResult.rows.map(row => ({
      type: 'property',
      id: row.id,
      name: row.name,
      location: `${row.city}, ${row.country}`,
      display: `${row.name} - ${row.city}, ${row.country}`
    })));
  }

  // Get city suggestions
  if (!type || type === 'cities') {
    const cityResult = await query(`
      SELECT DISTINCT p.city, p.country
      FROM properties p
      WHERE p.tenant_id = $1 
      AND p.is_active = true
      AND p.city ILIKE $2
      ORDER BY p.city
      LIMIT 10
    `, [req.tenantId, `%${searchQuery}%`]);

    suggestions.push(...cityResult.rows.map(row => ({
      type: 'city',
      name: row.city,
      country: row.country,
      display: `${row.city}, ${row.country}`
    })));
  }

  return successResponse(res, {
    query: searchQuery,
    suggestions
  });
});

// Get popular destinations
export const getPopularDestinations = catchAsync(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  const destinationsResult = await query(`
    SELECT 
      p.city,
      p.country,
      COUNT(DISTINCT b.id) as booking_count,
      COUNT(DISTINCT p.id) as property_count,
      AVG(p.star_rating) as avg_rating
    FROM properties p
    LEFT JOIN bookings b ON p.id = b.property_id
    WHERE p.tenant_id = $1 
    AND p.is_active = true
    AND b.created_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY p.city, p.country
    HAVING COUNT(DISTINCT b.id) > 0
    ORDER BY booking_count DESC, property_count DESC
    LIMIT $2
  `, [req.tenantId, Number(limit)]);

  return successResponse(res, destinationsResult.rows.map(row => ({
    city: row.city,
    country: row.country,
    bookingCount: parseInt(row.booking_count),
    propertyCount: parseInt(row.property_count),
    avgRating: parseFloat(row.avg_rating) || 0
  })));
});

// Get search filters
export const getSearchFilters = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;

  // Get available room types
  const roomTypesResult = await query(`
    SELECT DISTINCT r.room_type
    FROM rooms r
    JOIN properties p ON r.property_id = p.id
    WHERE r.tenant_id = $1 
    AND r.is_active = true
    AND p.is_active = true
    ORDER BY r.room_type
  `, [tenantId]);

  // Get available amenities
  const amenitiesResult = await query(`
    SELECT DISTINCT unnest(p.amenities) as amenity
    FROM properties p
    WHERE p.tenant_id = $1 
    AND p.is_active = true
    AND p.amenities IS NOT NULL
    ORDER BY amenity
  `, [tenantId]);

  // Get price range
  const priceRangeResult = await query(`
    SELECT 
      MIN(ri.price) as min_price,
      MAX(ri.price) as max_price
    FROM room_inventory ri
    JOIN rooms r ON ri.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE ri.tenant_id = $1 
    AND ri.date >= CURRENT_DATE
    AND ri.date <= CURRENT_DATE + INTERVAL '1 year'
    AND p.is_active = true
    AND r.is_active = true
  `, [tenantId]);

  const priceRange = priceRangeResult.rows[0];

  return successResponse(res, {
    roomTypes: roomTypesResult.rows.map(row => row.room_type),
    amenities: amenitiesResult.rows.map(row => row.amenity),
    priceRange: {
      min: parseFloat(priceRange.min_price) || 0,
      max: parseFloat(priceRange.max_price) || 1000
    }
  });
});
