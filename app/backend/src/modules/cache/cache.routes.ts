import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  getCacheStats,
  getCacheKeys,
  getCacheValue,
  setCacheValue,
  deleteCacheValue,
  clearCacheByPattern,
  clearAllCache,
  getCacheTTL,
  setCacheTTL,
  cacheHealthCheck,
  getCachePerformance,
  warmUpCache,
  getCacheConfig,
  updateCacheConfig
} from './cache.controller';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// Cache management routes
router.get('/stats', authorize('admin', 'hotel_manager'), getCacheStats);
router.get('/keys', authorize('admin', 'hotel_manager'), getCacheKeys);
router.get('/value/:key', authorize('admin', 'hotel_manager'), getCacheValue);
router.post('/value', authorize('admin', 'hotel_manager'), setCacheValue);
router.delete('/value/:key', authorize('admin', 'hotel_manager'), deleteCacheValue);
router.post('/clear', authorize('admin'), clearCacheByPattern);
router.post('/clear-all', authorize('admin'), clearAllCache);

// Cache TTL management
router.get('/ttl/:key', authorize('admin', 'hotel_manager'), getCacheTTL);
router.put('/ttl/:key', authorize('admin', 'hotel_manager'), setCacheTTL);

// Cache health and performance
router.get('/health', authorize('admin', 'hotel_manager'), cacheHealthCheck);
router.get('/performance', authorize('admin', 'hotel_manager'), getCachePerformance);

// Cache operations
router.post('/warm-up', authorize('admin'), warmUpCache);
router.get('/config', authorize('admin', 'hotel_manager'), getCacheConfig);
router.put('/config', authorize('admin'), updateCacheConfig);

export default router;
