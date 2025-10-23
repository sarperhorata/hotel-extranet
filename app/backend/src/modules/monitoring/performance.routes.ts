import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  getPerformanceMetrics,
  getSystemMetrics,
  getDatabaseMetrics,
  getCacheMetrics,
  getSlowQueries,
  getIndexUsage,
  getPerformanceRecommendations,
  getTableBloat,
  getLongRunningQueries,
  getConnectionStats,
  getTableSizes,
  optimizeDatabase,
  clearPerformanceCache,
  getPerformanceDashboard
} from './performance.controller';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateToken);
router.use(tenantMiddleware);

// Performance monitoring routes
router.get('/metrics', authorize('admin', 'hotel_manager'), getPerformanceMetrics);
router.get('/system', authorize('admin', 'hotel_manager'), getSystemMetrics);
router.get('/database', authorize('admin', 'hotel_manager'), getDatabaseMetrics);
router.get('/cache', authorize('admin', 'hotel_manager'), getCacheMetrics);
router.get('/slow-queries', authorize('admin', 'hotel_manager'), getSlowQueries);
router.get('/index-usage', authorize('admin', 'hotel_manager'), getIndexUsage);
router.get('/recommendations', authorize('admin', 'hotel_manager'), getPerformanceRecommendations);
router.get('/table-bloat', authorize('admin', 'hotel_manager'), getTableBloat);
router.get('/long-queries', authorize('admin', 'hotel_manager'), getLongRunningQueries);
router.get('/connections', authorize('admin', 'hotel_manager'), getConnectionStats);
router.get('/table-sizes', authorize('admin', 'hotel_manager'), getTableSizes);

// Performance management routes
router.post('/optimize', authorize('admin'), optimizeDatabase);
router.post('/clear-cache', authorize('admin'), clearPerformanceCache);

// Performance dashboard
router.get('/dashboard', authorize('admin', 'hotel_manager'), getPerformanceDashboard);

export default router;
