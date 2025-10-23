import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  syncInventoryToChannel,
  syncBookingToChannel,
  pullBookingsFromChannel
} from './channelSync.controller';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// Channel sync routes
router.post('/:id/sync-inventory', authorize('admin', 'hotel_manager'), syncInventoryToChannel);
router.post('/:id/sync-booking', authorize('admin', 'hotel_manager'), syncBookingToChannel);
router.post('/:id/pull-bookings', authorize('admin', 'hotel_manager'), pullBookingsFromChannel);

export default router;
