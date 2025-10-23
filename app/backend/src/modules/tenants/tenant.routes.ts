import { Router } from 'express';
import { 
  getTenantProfile,
  updateTenantProfile,
  getTenantStats,
  getTenantUsers,
  createUser,
  updateUser,
  deleteUser
} from './tenant.controller';
import { authenticateToken, authorize } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Tenant profile routes
router.get('/profile', getTenantProfile);
router.put('/profile', updateTenantProfile);

// Tenant statistics
router.get('/stats', getTenantStats);

// User management routes (admin only)
router.get('/users', authorize('admin'), getTenantUsers);
router.post('/users', authorize('admin'), createUser);
router.put('/users/:id', authorize('admin'), updateUser);
router.delete('/users/:id', authorize('admin'), deleteUser);

export default router;
