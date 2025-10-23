import { Router } from 'express';
import { 
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyStats
} from './property.controller';
import { authenticateToken, authorize } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Property routes
router.get('/', getProperties);
router.get('/:id', getProperty);
router.get('/:id/stats', getPropertyStats);
router.post('/', authorize('admin', 'hotel_manager'), createProperty);
router.put('/:id', authorize('admin', 'hotel_manager'), updateProperty);
router.delete('/:id', authorize('admin'), deleteProperty);

export default router;
