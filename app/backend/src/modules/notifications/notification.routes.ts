import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  sendBookingConfirmation,
  sendPasswordReset,
  sendWelcomeEmail,
  sendTestEmail,
  getNotificationSettings,
  updateNotificationSettings
} from './notification.controller';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// Notification routes
router.post('/booking-confirmation', authorize('admin', 'hotel_manager'), sendBookingConfirmation);
router.post('/password-reset', sendPasswordReset);
router.post('/welcome', authorize('admin', 'hotel_manager'), sendWelcomeEmail);
router.post('/test-email', authorize('admin', 'hotel_manager'), sendTestEmail);

// Notification settings
router.get('/settings', authorize('admin', 'hotel_manager'), getNotificationSettings);
router.put('/settings', authorize('admin', 'hotel_manager'), updateNotificationSettings);

export default router;