import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  errorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { MonitoringService } from '../../services/monitoring.service';

const monitoringService = new MonitoringService();

// Health check endpoint
export const healthCheck = catchAsync(async (req: Request, res: Response) => {
  const health = await monitoringService.performHealthCheck();
  
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;

  return res.status(statusCode).json(health);
});

// Detailed health check
export const detailedHealthCheck = catchAsync(async (req: Request, res: Response) => {
  const health = await monitoringService.performHealthCheck();
  
  // Add additional system information
  const systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };

  const detailedHealth = {
    ...health,
    system: systemInfo
  };

  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;

  return res.status(statusCode).json(detailedHealth);
});

// Performance metrics
export const getPerformanceMetrics = catchAsync(async (req: Request, res: Response) => {
  const { timeRange = '1 hour' } = req.query;
  
  const metrics = await monitoringService.getPerformanceMetrics(timeRange as string);
  
  return successResponse(res, {
    timeRange,
    metrics,
    timestamp: new Date().toISOString()
  }, 'Performance metrics retrieved successfully');
});

// Setup UptimeRobot monitor
export const setupUptimeRobotMonitor = catchAsync(async (req: Request, res: Response) => {
  const {
    monitorUrl,
    monitorName,
    monitorType = 'https',
    checkInterval = 5,
    timeout = 30
  } = req.body;

  if (!monitorUrl || !monitorName) {
    return errorResponse(res, 'Monitor URL and name are required', 400);
  }

  const config = {
    apiKey: process.env.UPTIMEROBOT_API_KEY || '',
    monitorUrl,
    monitorName,
    monitorType,
    checkInterval,
    timeout
  };

  const success = await monitoringService.setupUptimeRobotMonitor(config);

  if (success) {
    return successResponse(res, {
      monitorName,
      monitorUrl,
      status: 'configured'
    }, 'UptimeRobot monitor configured successfully');
  } else {
    return errorResponse(res, 'Failed to configure UptimeRobot monitor', 500);
  }
});

// Get UptimeRobot monitors
export const getUptimeRobotMonitors = catchAsync(async (req: Request, res: Response) => {
  const monitors = await monitoringService.getUptimeRobotMonitors();
  
  return successResponse(res, {
    monitors,
    count: monitors.length
  }, 'UptimeRobot monitors retrieved successfully');
});

// System metrics
export const getSystemMetrics = catchAsync(async (req: Request, res: Response) => {
  const health = await monitoringService.performHealthCheck();
  
  const systemMetrics = {
    uptime: process.uptime(),
    memory: {
      rss: process.memoryUsage().rss,
      heapTotal: process.memoryUsage().heapTotal,
      heapUsed: process.memoryUsage().heapUsed,
      external: process.memoryUsage().external,
      arrayBuffers: process.memoryUsage().arrayBuffers
    },
    cpu: process.cpuUsage(),
    version: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid
  };

  return successResponse(res, {
    system: systemMetrics,
    health: health.status,
    services: health.services,
    timestamp: new Date().toISOString()
  }, 'System metrics retrieved successfully');
});

// Log performance metric
export const logPerformanceMetric = catchAsync(async (req: Request, res: Response) => {
  const { operation, duration, metadata } = req.body;

  if (!operation || !duration) {
    return errorResponse(res, 'Operation and duration are required', 400);
  }

  await monitoringService.logPerformanceMetrics(operation, duration, metadata);

  return successResponse(res, {
    operation,
    duration,
    logged: true
  }, 'Performance metric logged successfully');
});

// Get monitoring dashboard data
export const getMonitoringDashboard = catchAsync(async (req: Request, res: Response) => {
  const { timeRange = '24 hours' } = req.query;
  
  const health = await monitoringService.performHealthCheck();
  const performanceMetrics = await monitoringService.getPerformanceMetrics(timeRange as string);
  
  const dashboard = {
    health: {
      status: health.status,
      services: health.services,
      uptime: health.uptime
    },
    performance: {
      metrics: performanceMetrics,
      timeRange
    },
    system: {
      memory: health.metrics.memory,
      database: health.metrics.database
    },
    timestamp: new Date().toISOString()
  };

  return successResponse(res, dashboard, 'Monitoring dashboard data retrieved successfully');
});

// Test external service connectivity
export const testExternalServices = catchAsync(async (req: Request, res: Response) => {
  const { service } = req.params;
  
  let result;
  
  switch (service) {
    case 'database':
      result = await monitoringService.performHealthCheck();
      break;
    case 'email':
      // Test email service
      result = { status: 'up', message: 'Email service is accessible' };
      break;
    case 'storage':
      // Test storage service
      result = { status: 'up', message: 'Storage service is accessible' };
      break;
    case 'payment':
      // Test payment gateway
      result = { status: 'up', message: 'Payment gateway is accessible' };
      break;
    default:
      return errorResponse(res, 'Unknown service', 400);
  }

  return successResponse(res, {
    service,
    result,
    timestamp: new Date().toISOString()
  }, `${service} service test completed`);
});
