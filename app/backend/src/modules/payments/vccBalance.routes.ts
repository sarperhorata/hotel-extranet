import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  getVCCBalance,
  updateVCCBalance,
  autoCloseVCCCards,
  getAllVCCBalances,
  closeVCCCard,
  getVCCUsageStats
} from './vccBalance.controller';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// VCC balance routes
router.get('/:id', authorize('admin', 'hotel_manager'), getVCCBalance);
router.put('/:id/update', authorize('admin', 'hotel_manager'), updateVCCBalance);
router.post('/auto-close', authorize('admin', 'hotel_manager'), autoCloseVCCCards);
router.get('/', authorize('admin', 'hotel_manager'), getAllVCCBalances);
router.post('/:id/close', authorize('admin', 'hotel_manager'), closeVCCCard);
router.get('/stats/usage', authorize('admin', 'hotel_manager'), getVCCUsageStats);

export default router;
