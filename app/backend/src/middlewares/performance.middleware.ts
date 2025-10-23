import { Request, Response, NextFunction } from 'express';
import { logger, logPerformance } from '../utils/logger';
import { sentryService } from '../services/sentry.service';

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  databaseQueries?: number;
  externalRequests?: number;
}

declare global {
  namespace Express {
    interface Request {
      performance?: PerformanceMetrics;
    }
  }
}

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Initialize performance metrics
  req.performance = {
    startTime: Date.now(),
    databaseQueries: 0,
    externalRequests: 0
  };

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void)) {
    req.performance!.endTime = Date.now();
    req.performance!.duration = req.performance!.endTime - req.performance!.startTime;

    // Log performance metrics
    logPerformanceMetrics(req, res);

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

export const logPerformanceMetrics = (req: Request, res: Response) => {
  const metrics = req.performance!;
  const responseTime = metrics.duration || 0;

  // Log slow requests
  if (responseTime > 5000) { // 5 seconds
    logger.warn('Slow request detected', {
      method: req.method,
      url: req.originalUrl,
      responseTime,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      tenantId: (req as any).tenantId,
      userId: (req as any).userId
    });
  }

  // Log performance metrics for API endpoints
  if (req.originalUrl.startsWith('/api/')) {
    logPerformance('api_request', responseTime, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      tenantId: (req as any).tenantId,
      userId: (req as any).userId,
      databaseQueries: metrics.databaseQueries,
      externalRequests: metrics.externalRequests
    });
  }

  // Send to Sentry for performance monitoring
  if (responseTime > 10000) { // Very slow requests (>10s)
    sentryService.captureMessage(`Very slow request: ${responseTime}ms`, 'warning', {
      method: req.method,
      url: req.originalUrl,
      responseTime,
      statusCode: res.statusCode,
      ip: req.ip
    });
  }
};

export const databaseQueryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Track database queries
  const originalQuery = (req as any).query;

  (req as any).query = async function(...args: any[]) {
    if (!req.performance) {
      req.performance = { startTime: Date.now(), databaseQueries: 0, externalRequests: 0 };
    }

    const queryStart = Date.now();
    req.performance.databaseQueries = (req.performance.databaseQueries || 0) + 1;

    try {
      const result = await originalQuery.apply(this, args);
      const queryTime = Date.now() - queryStart;

      // Log slow database queries
      if (queryTime > 1000) { // 1 second
        logger.warn('Slow database query detected', {
          query: args[0]?.substring(0, 100), // First 100 chars of query
          duration: queryTime,
          url: req.originalUrl,
          method: req.method
        });
      }

      return result;
    } catch (error) {
      // Log database errors
      logger.error('Database query error', {
        error: error.message,
        query: args[0]?.substring(0, 100),
        url: req.originalUrl,
        method: req.method
      });
      throw error;
    }
  };

  next();
};

export const memoryUsageMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Track memory usage periodically
  const memoryUsage = process.memoryUsage();
  const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  // Log high memory usage
  if (memoryPercentage > 80) {
    logger.warn('High memory usage detected', {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      percentage: memoryPercentage,
      external: memoryUsage.external,
      rss: memoryUsage.rss
    });

    // Send to Sentry if very high
    if (memoryPercentage > 90) {
      sentryService.captureMessage(`Critical memory usage: ${memoryPercentage.toFixed(2)}%`, 'error', {
        memoryUsage,
        percentage: memoryPercentage
      });
    }
  }

  next();
};

export const getPerformanceMetrics = (req: Request): PerformanceMetrics | undefined => {
  return req.performance;
};

export const trackExternalRequest = (req: Request, service: string, duration: number) => {
  if (!req.performance) {
    req.performance = { startTime: Date.now(), databaseQueries: 0, externalRequests: 0 };
  }

  req.performance.externalRequests = (req.performance.externalRequests || 0) + 1;

  // Log slow external requests
  if (duration > 3000) { // 3 seconds
    logger.warn('Slow external request detected', {
      service,
      duration,
      url: req.originalUrl,
      method: req.method
    });
  }
};
