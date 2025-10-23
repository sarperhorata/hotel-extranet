import { Request, Response, NextFunction } from 'express';
import { PerformanceLogger } from '../utils/performanceLogger';

/**
 * Middleware to measure API endpoint performance
 */
export const measureApiPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const timerId = PerformanceLogger.startTimer(`API_${req.method}_${req.path}`);

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    // Log API performance
    PerformanceLogger.logApiEndpoint(
      req.method,
      req.path,
      duration,
      res.statusCode,
      req.user?.id,
      req.tenantId
    );

    // End the timer
    PerformanceLogger.endTimer(
      timerId,
      `API_${req.method}_${req.path}`,
      req.user?.id,
      req.tenantId,
      {
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length')
      }
    );

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to measure database query performance
 */
export const measureDatabasePerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const timerId = PerformanceLogger.startTimer(`DB_${req.method}_${req.path}`);

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    // Log database performance
    PerformanceLogger.logDatabaseQuery(
      `${req.method} ${req.path}`,
      duration,
      req.user?.id,
      req.tenantId
    );

    // End the timer
    PerformanceLogger.endTimer(
      timerId,
      `DB_${req.method}_${req.path}`,
      req.user?.id,
      req.tenantId
    );

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to measure file upload performance
 */
export const measureFileUploadPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const timerId = PerformanceLogger.startTimer(`FILE_UPLOAD_${req.path}`);

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) => {
    const duration = Date.now() - startTime;
    
    // Log file upload performance
    if (req.file) {
      PerformanceLogger.logFileUpload(
        req.file.originalname,
        req.file.size,
        duration,
        req.user?.id,
        req.tenantId
      );
    }

    // End the timer
    PerformanceLogger.endTimer(
      timerId,
      `FILE_UPLOAD_${req.path}`,
      req.user?.id,
      req.tenantId,
      {
        filename: req.file?.originalname,
        fileSize: req.file?.size
      }
    );

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to measure email sending performance
 */
export const measureEmailPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const timerId = PerformanceLogger.startTimer(`EMAIL_${req.path}`);

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    // Log email performance
    PerformanceLogger.logEmailSend(
      req.body?.email || req.body?.recipient,
      req.body?.template || req.body?.type,
      duration,
      req.user?.id,
      req.tenantId
    );

    // End the timer
    PerformanceLogger.endTimer(
      timerId,
      `EMAIL_${req.path}`,
      req.user?.id,
      req.tenantId,
      {
        recipient: req.body?.email || req.body?.recipient,
        template: req.body?.template || req.body?.type
      }
    );

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to measure WebSocket performance
 */
export const measureWebSocketPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const timerId = PerformanceLogger.startTimer(`WEBSOCKET_${req.path}`);

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    // Log WebSocket performance
    PerformanceLogger.logWebSocket(
      req.body?.event || req.path,
      duration,
      req.user?.id,
      req.tenantId
    );

    // End the timer
    PerformanceLogger.endTimer(
      timerId,
      `WEBSOCKET_${req.path}`,
      req.user?.id,
      req.tenantId,
      {
        event: req.body?.event
      }
    );

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to measure external API calls
 */
export const measureExternalApiPerformance = (service: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const timerId = PerformanceLogger.startTimer(`EXTERNAL_API_${service}`);

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;
      
      // Log external API performance
      PerformanceLogger.logExternalApi(
        service,
        req.path,
        duration,
        res.statusCode,
        req.user?.id,
        req.tenantId
      );

      // End the timer
      PerformanceLogger.endTimer(
        timerId,
        `EXTERNAL_API_${service}`,
        req.user?.id,
        req.tenantId,
        {
          service,
          endpoint: req.path,
          statusCode: res.statusCode
        }
      );

      // Call original end method
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};
