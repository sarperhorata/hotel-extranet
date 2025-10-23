import { Router } from 'express';
import { 
  getRatePlans,
  getRatePlan,
  createRatePlan,
  updateRatePlan,
  deleteRatePlan,
  calculateDynamicPricing,
  getRatePlanStats
} from './rate.controller';
import { authenticateToken, authorize } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Rate plan routes
router.get('/plans', getRatePlans);
router.get('/plans/:id', getRatePlan);
router.get('/plans/:id/stats', getRatePlanStats);
router.post('/plans', authorize('admin', 'hotel_manager'), createRatePlan);
router.put('/plans/:id', authorize('admin', 'hotel_manager'), updateRatePlan);
router.delete('/plans/:id', authorize('admin'), deleteRatePlan);

// Dynamic pricing routes
router.post('/calculate-dynamic', calculateDynamicPricing);

export default router;
