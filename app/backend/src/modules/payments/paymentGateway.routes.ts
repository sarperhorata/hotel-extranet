import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  processPayment,
  processRefund,
  getPaymentStatus,
  listPayments,
  handleWebhook
} from './paymentGateway.controller';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// Payment Gateway routes
router.post('/process', authorize('admin', 'hotel_manager'), processPayment);
router.post('/:id/refund', authorize('admin', 'hotel_manager'), processRefund);
router.get('/:id/status', authorize('admin', 'hotel_manager'), getPaymentStatus);
router.get('/', authorize('admin', 'hotel_manager'), listPayments);

// Webhook routes (no authentication required for webhooks)
router.post('/webhook/:gateway', handleWebhook);

export default router;
