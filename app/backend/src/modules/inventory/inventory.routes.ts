import { Router } from 'express';
import { 
  checkAvailability,
  bulkUpdateInventory,
  getInventoryCalendar,
  updateInventory
} from './inventory.controller';
import { authenticateToken, authorize } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Inventory routes
router.post('/availability', checkAvailability);
router.put('/bulk-update', authorize('admin', 'hotel_manager'), bulkUpdateInventory);
router.get('/calendar', getInventoryCalendar);
router.put('/:id', authorize('admin', 'hotel_manager'), updateInventory);

export default router;
