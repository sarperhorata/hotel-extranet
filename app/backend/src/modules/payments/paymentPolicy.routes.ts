import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  getPaymentPolicies,
  getPaymentPolicy,
  createPaymentPolicy,
  updatePaymentPolicy,
  deletePaymentPolicy,
  getPaymentPolicyForBooking,
  calculatePaymentAmount
} from './paymentPolicy.controller';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// Payment policy routes
router.get('/', authorize('admin', 'hotel_manager'), getPaymentPolicies);
router.get('/:id', authorize('admin', 'hotel_manager'), getPaymentPolicy);
router.post('/', authorize('admin', 'hotel_manager'), createPaymentPolicy);
router.put('/:id', authorize('admin', 'hotel_manager'), updatePaymentPolicy);
router.delete('/:id', authorize('admin', 'hotel_manager'), deletePaymentPolicy);

// Booking-specific payment policy routes
router.get('/booking/:bookingId', authorize('admin', 'hotel_manager'), getPaymentPolicyForBooking);
router.get('/booking/:bookingId/calculate', authorize('admin', 'hotel_manager'), calculatePaymentAmount);

export default router;
