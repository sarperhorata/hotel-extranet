import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { tenantMiddleware } from '../../middlewares/tenant';
import { authorize } from '../../middlewares/auth';
import {
  healthCheck,
  detailedHealthCheck,
  getPerformanceMetrics,
  setupUptimeRobotMonitor,
  getUptimeRobotMonitors,
  getSystemMetrics,
  logPerformanceMetric,
  getMonitoringDashboard,
  testExternalServices
} from './monitoring.controller';

const router = Router();

// Public health check endpoint (no authentication required)
router.get('/health', healthCheck);
router.get('/health/detailed', healthCheck);

// Protected monitoring routes
router.use(authenticateToken);
router.use(tenantMiddleware);

// Monitoring dashboard and metrics
router.get('/dashboard', authorize('admin', 'hotel_manager'), getMonitoringDashboard);
router.get('/metrics/performance', authorize('admin', 'hotel_manager'), getPerformanceMetrics);
router.get('/metrics/system', authorize('admin', 'hotel_manager'), getSystemMetrics);
router.post('/metrics/log', authorize('admin', 'hotel_manager'), logPerformanceMetric);

// UptimeRobot integration
router.post('/uptimerobot/setup', authorize('admin'), setupUptimeRobotMonitor);
router.get('/uptimerobot/monitors', authorize('admin', 'hotel_manager'), getUptimeRobotMonitors);

// External service testing
router.get('/test/:service', authorize('admin', 'hotel_manager'), testExternalServices);

export default router;
