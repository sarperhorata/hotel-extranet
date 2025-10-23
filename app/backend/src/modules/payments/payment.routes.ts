import { Router } from 'express';
import { 
  generateVCC,
  sendVCCToChannel,
  getPayment,
  getPayments,
  updatePaymentStatus,
  getPaymentStats
} from './payment.controller';
import { authenticateToken, authorize } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Payment routes
router.post('/vcc/generate', authorize('admin', 'hotel_manager'), generateVCC);
router.post('/vcc/:id/send', authorize('admin', 'hotel_manager'), sendVCCToChannel);
router.get('/stats', getPaymentStats);
router.get('/:id', getPayment);
router.get('/', getPayments);
router.put('/:id/status', authorize('admin', 'hotel_manager'), updatePaymentStatus);

export default router;
