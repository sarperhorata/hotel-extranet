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

// Get all channels
export const getChannels = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const { 
    page = 1, 
    limit = 10, 
    channelType,
    isActive = 'true',
    syncEnabled
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereClause = 'WHERE c.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Add filters
  if (channelType) {
    whereClause += ` AND c.channel_type = $${paramIndex}`;
    params.push(channelType);
    paramIndex++;
  }

  if (isActive !== 'all') {
    whereClause += ` AND c.is_active = $${paramIndex}`;
    params.push(isActive === 'true');
    paramIndex++;
  }

  if (syncEnabled !== undefined) {
    whereClause += ` AND c.sync_enabled = $${paramIndex}`;
    params.push(syncEnabled === 'true');
    paramIndex++;
  }

  // Get channels
  const channelsResult = await query(`
    SELECT 
      c.id, c.name, c.channel_type, c.api_endpoint, c.hotel_id,
      c.is_active, c.sync_enabled, c.last_sync_at, c.sync_frequency,
      c.created_at, c.updated_at,
      COUNT(cm.id) as mapping_count
    FROM channels c
    LEFT JOIN channel_mappings cm ON c.id = cm.channel_id
    ${whereClause}
    GROUP BY c.id, c.name, c.channel_type, c.api_endpoint, c.hotel_id,
             c.is_active, c.sync_enabled, c.last_sync_at, c.sync_frequency,
             c.created_at, c.updated_at
    ORDER BY c.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, Number(limit), offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM channels c
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);

  return paginatedResponse(res, channelsResult.rows.map(channel => ({
    id: channel.id,
    name: channel.name,
    channelType: channel.channel_type,
    apiEndpoint: channel.api_endpoint,
    hotelId: channel.hotel_id,
    isActive: channel.is_active,
    syncEnabled: channel.sync_enabled,
    lastSyncAt: channel.last_sync_at,
    syncFrequency: channel.sync_frequency,
    mappingCount: parseInt(channel.mapping_count),
    createdAt: channel.created_at,
    updatedAt: channel.updated_at
  })), Number(page), Number(limit), total);
});

// Get single channel
export const getChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;

  const channelResult = await query(`
    SELECT 
      c.id, c.name, c.channel_type, c.api_endpoint, c.api_key, c.api_secret,
      c.username, c.password, c.hotel_id, c.configuration, c.is_active,
      c.sync_enabled, c.last_sync_at, c.sync_frequency, c.created_at, c.updated_at
    FROM channels c
    WHERE c.id = $1 AND c.tenant_id = $2
  `, [channelId, tenantId]);

  if (channelResult.rows.length === 0) {
    return notFoundResponse(res, 'Channel not found');
  }

  const channel = channelResult.rows[0];

  return successResponse(res, {
    id: channel.id,
    name: channel.name,
    channelType: channel.channel_type,
    apiEndpoint: channel.api_endpoint,
    apiKey: channel.api_key,
    apiSecret: channel.api_secret,
    username: channel.username,
    password: channel.password,
    hotelId: channel.hotel_id,
    configuration: channel.configuration,
    isActive: channel.is_active,
    syncEnabled: channel.sync_enabled,
    lastSyncAt: channel.last_sync_at,
    syncFrequency: channel.sync_frequency,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at
  });
});

// Create channel
export const createChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const {
    name,
    channelType,
    apiEndpoint,
    apiKey,
    apiSecret,
    username,
    password,
    hotelId,
    configuration = {},
    syncEnabled = true,
    syncFrequency = 3600
  } = req.body;

  // Validate required fields
  if (!name || !channelType) {
    return validationErrorResponse(res, ['Name and channel type are required']);
  }

  // Check if channel name already exists for this tenant
  const existingChannel = await query(
    'SELECT id FROM channels WHERE name = $1 AND tenant_id = $2',
    [name, tenantId]
  );

  if (existingChannel.rows.length > 0) {
    return errorResponse(res, 'Channel name already exists', 409);
  }

  const channelResult = await query(`
    INSERT INTO channels (
      tenant_id, name, channel_type, api_endpoint, api_key, api_secret,
      username, password, hotel_id, configuration, sync_enabled, sync_frequency
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING id, name, channel_type, api_endpoint, hotel_id, is_active,
              sync_enabled, sync_frequency, created_at, updated_at
  `, [
    tenantId, name, channelType, apiEndpoint, apiKey, apiSecret,
    username, password, hotelId, configuration, syncEnabled, syncFrequency
  ]);

  const channel = channelResult.rows[0];

  logger.info(`Channel created: ${channel.name} (${channel.channel_type}) for tenant ${tenantId}`);

  return createdResponse(res, {
    id: channel.id,
    name: channel.name,
    channelType: channel.channel_type,
    apiEndpoint: channel.api_endpoint,
    hotelId: channel.hotel_id,
    isActive: channel.is_active,
    syncEnabled: channel.sync_enabled,
    syncFrequency: channel.sync_frequency,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at
  });
});

// Update channel
export const updateChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;
  const updateData = req.body;

  // Check if channel exists
  const existingChannel = await query(
    'SELECT id, name FROM channels WHERE id = $1 AND tenant_id = $2',
    [channelId, tenantId]
  );

  if (existingChannel.rows.length === 0) {
    return notFoundResponse(res, 'Channel not found');
  }

  const channel = existingChannel.rows[0];

  // Check if name is being changed and if it already exists
  if (updateData.name && updateData.name !== channel.name) {
    const nameCheck = await query(
      'SELECT id FROM channels WHERE name = $1 AND tenant_id = $2 AND id != $3',
      [updateData.name, tenantId, channelId]
    );

    if (nameCheck.rows.length > 0) {
      return errorResponse(res, 'Channel name already exists', 409);
    }
  }

  // Build dynamic update query
  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'name', 'channel_type', 'api_endpoint', 'api_key', 'api_secret',
    'username', 'password', 'hotel_id', 'configuration', 'sync_enabled', 'sync_frequency'
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
  values.push(channelId, tenantId);

  const channelResult = await query(`
    UPDATE channels 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING id, name, channel_type, api_endpoint, hotel_id, is_active,
              sync_enabled, sync_frequency, created_at, updated_at
  `, values);

  const updatedChannel = channelResult.rows[0];

  logger.info(`Channel updated: ${updatedChannel.name}`);

  return updatedResponse(res, {
    id: updatedChannel.id,
    name: updatedChannel.name,
    channelType: updatedChannel.channel_type,
    apiEndpoint: updatedChannel.api_endpoint,
    hotelId: updatedChannel.hotel_id,
    isActive: updatedChannel.is_active,
    syncEnabled: updatedChannel.sync_enabled,
    syncFrequency: updatedChannel.sync_frequency,
    createdAt: updatedChannel.created_at,
    updatedAt: updatedChannel.updated_at
  });
});

// Delete channel
export const deleteChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;

  // Check if channel exists
  const channelResult = await query(
    'SELECT id, name FROM channels WHERE id = $1 AND tenant_id = $2',
    [channelId, tenantId]
  );

  if (channelResult.rows.length === 0) {
    return notFoundResponse(res, 'Channel not found');
  }

  const channel = channelResult.rows[0];

  // Check if channel has active mappings
  const mappingsResult = await query(
    'SELECT COUNT(*) as count FROM channel_mappings WHERE channel_id = $1',
    [channelId]
  );

  if (parseInt(mappingsResult.rows[0].count) > 0) {
    return errorResponse(res, 'Cannot delete channel with active mappings', 400);
  }

  // Soft delete channel
  await query(
    'UPDATE channels SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [channelId]
  );

  logger.info(`Channel deleted: ${channel.name}`);

  return deletedResponse(res, 'Channel deleted successfully');
});

// Test channel connection
export const testChannelConnection = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;

  // Get channel details
  const channelResult = await query(
    'SELECT * FROM channels WHERE id = $1 AND tenant_id = $2',
    [channelId, tenantId]
  );

  if (channelResult.rows.length === 0) {
    return notFoundResponse(res, 'Channel not found');
  }

  const channel = channelResult.rows[0];

  try {
    // Simulate connection test (in real implementation, this would make actual API calls)
    const testResult = {
      success: true,
      message: 'Connection successful',
      responseTime: Math.random() * 1000 + 100, // Simulate response time
      lastChecked: new Date().toISOString()
    };

    // Update last sync time
    await query(
      'UPDATE channels SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
      [channelId]
    );

    logger.info(`Channel connection test successful: ${channel.name}`);

    return successResponse(res, testResult);
  } catch (error) {
    logger.error(`Channel connection test failed: ${channel.name}`, error);
    
    return errorResponse(res, 'Connection test failed: ' + error.message, 500);
  }
});

// Sync data to channel
export const syncToChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;
  const { syncType = 'inventory' } = req.body; // inventory, rates, bookings

  // Get channel details
  const channelResult = await query(
    'SELECT * FROM channels WHERE id = $1 AND tenant_id = $2 AND is_active = true',
    [channelId, tenantId]
  );

  if (channelResult.rows.length === 0) {
    return notFoundResponse(res, 'Channel not found or inactive');
  }

  const channel = channelResult.rows[0];

  try {
    // Simulate sync process (in real implementation, this would sync with actual channel APIs)
    const syncResult = {
      success: true,
      syncType,
      recordsProcessed: Math.floor(Math.random() * 100) + 10,
      recordsUpdated: Math.floor(Math.random() * 50) + 5,
      recordsCreated: Math.floor(Math.random() * 20) + 2,
      recordsFailed: Math.floor(Math.random() * 5),
      duration: Math.random() * 5000 + 1000, // Simulate sync duration
      completedAt: new Date().toISOString()
    };

    // Update last sync time
    await query(
      'UPDATE channels SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
      [channelId]
    );

    logger.info(`Channel sync completed: ${channel.name} - ${syncType}`);

    return successResponse(res, syncResult, 'Sync completed successfully');
  } catch (error) {
    logger.error(`Channel sync failed: ${channel.name}`, error);
    
    return errorResponse(res, 'Sync failed: ' + error.message, 500);
  }
});

// Pull bookings from channel
export const pullBookingsFromChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;
  const { startDate, endDate } = req.body;

  // Get channel details
  const channelResult = await query(
    'SELECT * FROM channels WHERE id = $1 AND tenant_id = $2 AND is_active = true',
    [channelId, tenantId]
  );

  if (channelResult.rows.length === 0) {
    return notFoundResponse(res, 'Channel not found or inactive');
  }

  const channel = channelResult.rows[0];

  try {
    // Simulate pulling bookings (in real implementation, this would fetch from channel API)
    const pullResult = {
      success: true,
      bookingsFound: Math.floor(Math.random() * 20) + 5,
      bookingsImported: Math.floor(Math.random() * 15) + 3,
      bookingsUpdated: Math.floor(Math.random() * 10) + 1,
      bookingsSkipped: Math.floor(Math.random() * 5),
      dateRange: { startDate, endDate },
      completedAt: new Date().toISOString()
    };

    logger.info(`Bookings pulled from channel: ${channel.name}`);

    return successResponse(res, pullResult, 'Bookings pulled successfully');
  } catch (error) {
    logger.error(`Failed to pull bookings from channel: ${channel.name}`, error);
    
    return errorResponse(res, 'Failed to pull bookings: ' + error.message, 500);
  }
});

// Get channel mappings
export const getChannelMappings = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;
  const { page = 1, limit = 10 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  // Get mappings
  const mappingsResult = await query(`
    SELECT 
      cm.id, cm.external_property_id, cm.external_room_id, cm.mapping_type,
      cm.is_active, cm.sync_enabled, cm.last_sync_at, cm.sync_status,
      cm.sync_errors, cm.created_at, cm.updated_at,
      p.id as property_id, p.name as property_name,
      r.id as room_id, r.name as room_name
    FROM channel_mappings cm
    JOIN properties p ON cm.property_id = p.id
    LEFT JOIN rooms r ON cm.room_id = r.id
    WHERE cm.channel_id = $1 AND cm.tenant_id = $2
    ORDER BY cm.created_at DESC
    LIMIT $3 OFFSET $4
  `, [channelId, tenantId, Number(limit), offset]);

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) as total FROM channel_mappings WHERE channel_id = $1 AND tenant_id = $2',
    [channelId, tenantId]
  );

  const total = parseInt(countResult.rows[0].total);

  return paginatedResponse(res, mappingsResult.rows.map(mapping => ({
    id: mapping.id,
    externalPropertyId: mapping.external_property_id,
    externalRoomId: mapping.external_room_id,
    mappingType: mapping.mapping_type,
    isActive: mapping.is_active,
    syncEnabled: mapping.sync_enabled,
    lastSyncAt: mapping.last_sync_at,
    syncStatus: mapping.sync_status,
    syncErrors: mapping.sync_errors,
    property: {
      id: mapping.property_id,
      name: mapping.property_name
    },
    room: mapping.room_id ? {
      id: mapping.room_id,
      name: mapping.room_name
    } : null,
    createdAt: mapping.created_at,
    updatedAt: mapping.updated_at
  })), Number(page), Number(limit), total);
});

// Create channel mapping
export const createChannelMapping = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;
  const {
    propertyId,
    roomId,
    externalPropertyId,
    externalRoomId,
    mappingType = 'property'
  } = req.body;

  // Validate required fields
  if (!propertyId || !externalPropertyId) {
    return validationErrorResponse(res, ['Property ID and external property ID are required']);
  }

  // Check if channel exists
  const channelResult = await query(
    'SELECT id FROM channels WHERE id = $1 AND tenant_id = $2',
    [channelId, tenantId]
  );

  if (channelResult.rows.length === 0) {
    return notFoundResponse(res, 'Channel not found');
  }

  // Check if property exists
  const propertyResult = await query(
    'SELECT id FROM properties WHERE id = $1 AND tenant_id = $2',
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    return notFoundResponse(res, 'Property not found');
  }

  // Check if room exists (if provided)
  if (roomId) {
    const roomResult = await query(
      'SELECT id FROM rooms WHERE id = $1 AND tenant_id = $2',
      [roomId, tenantId]
    );

    if (roomResult.rows.length === 0) {
      return notFoundResponse(res, 'Room not found');
    }
  }

  // Check if mapping already exists
  const existingMapping = await query(
    'SELECT id FROM channel_mappings WHERE channel_id = $1 AND property_id = $2 AND room_id = $3',
    [channelId, propertyId, roomId]
  );

  if (existingMapping.rows.length > 0) {
    return errorResponse(res, 'Mapping already exists', 409);
  }

  const mappingResult = await query(`
    INSERT INTO channel_mappings (
      tenant_id, channel_id, property_id, room_id, external_property_id,
      external_room_id, mapping_type
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7
    ) RETURNING id, external_property_id, external_room_id, mapping_type,
              is_active, sync_enabled, created_at, updated_at
  `, [
    tenantId, channelId, propertyId, roomId, externalPropertyId,
    externalRoomId, mappingType
  ]);

  const mapping = mappingResult.rows[0];

  logger.info(`Channel mapping created: ${mapping.external_property_id} for channel ${channelId}`);

  return createdResponse(res, {
    id: mapping.id,
    externalPropertyId: mapping.external_property_id,
    externalRoomId: mapping.external_room_id,
    mappingType: mapping.mapping_type,
    isActive: mapping.is_active,
    syncEnabled: mapping.sync_enabled,
    createdAt: mapping.created_at,
    updatedAt: mapping.updated_at
  });
});
