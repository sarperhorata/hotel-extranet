import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  validationErrorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { ChannelSyncService } from './channelSync.service';

// Sync inventory to channel
export const syncInventoryToChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;
  const { inventoryData } = req.body;

  if (!inventoryData || !Array.isArray(inventoryData)) {
    return validationErrorResponse(res, ['Inventory data array is required']);
  }

  try {
    const result = await ChannelSyncService.syncInventoryToChannel(
      tenantId,
      channelId,
      inventoryData
    );

    return successResponse(res, result, 'Inventory sync completed successfully');
  } catch (error) {
    logger.error(`Inventory sync failed for channel ${channelId}:`, error);
    return errorResponse(res, 'Inventory sync failed: ' + error.message, 500);
  }
});

// Sync booking to channel
export const syncBookingToChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;
  const { bookingData } = req.body;

  if (!bookingData) {
    return validationErrorResponse(res, ['Booking data is required']);
  }

  try {
    const result = await ChannelSyncService.syncBookingToChannel(
      tenantId,
      channelId,
      bookingData
    );

    return successResponse(res, result, 'Booking sync completed successfully');
  } catch (error) {
    logger.error(`Booking sync failed for channel ${channelId}:`, error);
    return errorResponse(res, 'Booking sync failed: ' + error.message, 500);
  }
});

// Pull bookings from channel
export const pullBookingsFromChannel = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const channelId = req.params.id;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return validationErrorResponse(res, ['Start date and end date are required']);
  }

  try {
    const result = await ChannelSyncService.pullBookingsFromChannel(
      tenantId,
      channelId,
      startDate,
      endDate
    );

    return successResponse(res, result, 'Bookings pulled successfully');
  } catch (error) {
    logger.error(`Failed to pull bookings from channel ${channelId}:`, error);
    return errorResponse(res, 'Failed to pull bookings: ' + error.message, 500);
  }
});
