import { Router } from 'express';
import { 
  getChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  testChannelConnection,
  syncToChannel,
  pullBookingsFromChannel,
  getChannelMappings,
  createChannelMapping
} from './channel.controller';
import { authenticateToken, authorize } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Channel routes
router.get('/', getChannels);
router.get('/:id', getChannel);
router.post('/', authorize('admin'), createChannel);
router.put('/:id', authorize('admin'), updateChannel);
router.delete('/:id', authorize('admin'), deleteChannel);

// Channel operations
router.post('/:id/test-connection', authorize('admin', 'hotel_manager'), testChannelConnection);
router.post('/:id/sync', authorize('admin', 'hotel_manager'), syncToChannel);
router.post('/:id/pull-bookings', authorize('admin', 'hotel_manager'), pullBookingsFromChannel);

// Channel mappings
router.get('/:id/mappings', getChannelMappings);
router.post('/:id/mappings', authorize('admin', 'hotel_manager'), createChannelMapping);

export default router;
