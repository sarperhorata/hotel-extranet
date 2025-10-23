import { Router } from 'express';
import { 
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomStats
} from './room.controller';
import { authenticateToken, authorize } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Room routes
router.get('/properties/:propertyId/rooms', getRooms);
router.get('/:id', getRoom);
router.get('/:id/stats', getRoomStats);
router.post('/properties/:propertyId/rooms', authorize('admin', 'hotel_manager'), createRoom);
router.put('/:id', authorize('admin', 'hotel_manager'), updateRoom);
router.delete('/:id', authorize('admin'), deleteRoom);

export default router;
