import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  generateVCC,
  getVCCBalance,
  updateVCCBalance,
  closeVCC,
  getVCCUsage,
  listVCCs
} from './vccProvider.controller';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// VCC Provider routes
router.post('/generate', authorize('admin', 'hotel_manager'), generateVCC);
router.get('/:id/balance', authorize('admin', 'hotel_manager'), getVCCBalance);
router.put('/:id/balance', authorize('admin', 'hotel_manager'), updateVCCBalance);
router.post('/:id/close', authorize('admin', 'hotel_manager'), closeVCC);
router.get('/:id/usage', authorize('admin', 'hotel_manager'), getVCCUsage);
router.get('/', authorize('admin', 'hotel_manager'), listVCCs);

export default router;
