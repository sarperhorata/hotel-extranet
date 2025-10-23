import { Router } from 'express';
import { 
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  cancelBooking,
  getBookingStats
} from './booking.controller';
import { authenticateToken, authorize } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Booking routes
router.post('/', createBooking);
router.get('/', getBookings);
router.get('/stats', getBookingStats);
router.get('/:id', getBooking);
router.put('/:id', authorize('admin', 'hotel_manager'), updateBooking);
router.put('/:id/cancel', authorize('admin', 'hotel_manager'), cancelBooking);

export default router;
