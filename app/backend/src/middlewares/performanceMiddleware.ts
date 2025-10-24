import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to measure API endpoint performance
 */
export const measureApiPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;

    // Log performance
    logger.performance('API Performance', {
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode,
      userId: req.user?.id,
      tenantId: req.tenantId
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to measure file upload performance
 */
export const measureFileUploadPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;

    // Log file upload performance
    if (req.file) {
      logger.performance('File Upload Performance', {
        filename: req.file.originalname,
        fileSize: req.file.size,
        duration,
        userId: req.user?.id,
        tenantId: req.tenantId
      });
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to measure email sending performance
 */
export const measureEmailPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;

    // Log email performance
    logger.performance('Email Performance', {
      recipient: req.body?.email || req.body?.recipient,
      template: req.body?.template || req.body?.type,
      duration,
      userId: req.user?.id,
      tenantId: req.tenantId
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to measure WebSocket performance
 */
export const measureWebSocketPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;

    // Log WebSocket performance
    logger.performance('WebSocket Performance', {
      event: req.body?.event || req.path,
      duration,
      userId: req.user?.id,
      tenantId: req.tenantId
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to measure external API calls
 */
export const measureExternalApiPerformance = (service: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;

      // Log external API performance
      logger.performance('External API Performance', {
        service,
        endpoint: req.path,
        duration,
        statusCode: res.statusCode,
        userId: req.user?.id,
        tenantId: req.tenantId
      });

      // Call original end method
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};
