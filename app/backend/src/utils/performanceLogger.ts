import { logger } from './logger';
import { Request } from 'express';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  userId?: string;
  tenantId?: string;
  details?: any;
  timestamp?: Date;
}

export class PerformanceLogger {
  private static metrics: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  static startTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}_${Math.random()}`;
    this.metrics.set(timerId, Date.now());
    return timerId;
  }

  /**
   * End timing an operation and log the result
   */
  static endTimer(timerId: string, operation: string, userId?: string, tenantId?: string, details?: any): void {
    const startTime = this.metrics.get(timerId);
    if (!startTime) {
      logger.warn(`Timer ${timerId} not found`);
      return;
    }

    const duration = Date.now() - startTime;
    this.metrics.delete(timerId);

    const metrics: PerformanceMetrics = {
      operation,
      duration,
      userId,
      tenantId,
      details,
      timestamp: new Date()
    };

    // Log performance metrics
    if (duration > 1000) { // Log slow operations (>1s)
      logger.warn('PERFORMANCE_SLOW', metrics);
    } else if (duration > 500) { // Log medium operations (>500ms)
      logger.info('PERFORMANCE_MEDIUM', metrics);
    } else {
      logger.debug('PERFORMANCE_FAST', metrics);
    }
  }

  /**
   * Log database query performance
   */
  static logDatabaseQuery(query: string, duration: number, userId?: string, tenantId?: string, rowCount?: number): void {
    const metrics: PerformanceMetrics = {
      operation: 'DATABASE_QUERY',
      duration,
      userId,
      tenantId,
      details: {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        rowCount
      },
      timestamp: new Date()
    };

    if (duration > 2000) { // Log slow queries (>2s)
      logger.warn('PERFORMANCE_DB_SLOW', metrics);
    } else if (duration > 1000) { // Log medium queries (>1s)
      logger.info('PERFORMANCE_DB_MEDIUM', metrics);
    } else {
      logger.debug('PERFORMANCE_DB_FAST', metrics);
    }
  }

  /**
   * Log API endpoint performance
   */
  static logApiEndpoint(method: string, path: string, duration: number, statusCode: number, userId?: string, tenantId?: string): void {
    const metrics: PerformanceMetrics = {
      operation: 'API_ENDPOINT',
      duration,
      userId,
      tenantId,
      details: {
        method,
        path,
        statusCode
      },
      timestamp: new Date()
    };

    if (duration > 3000) { // Log slow endpoints (>3s)
      logger.warn('PERFORMANCE_API_SLOW', metrics);
    } else if (duration > 1500) { // Log medium endpoints (>1.5s)
      logger.info('PERFORMANCE_API_MEDIUM', metrics);
    } else {
      logger.debug('PERFORMANCE_API_FAST', metrics);
    }
  }

  /**
   * Log external API call performance
   */
  static logExternalApi(service: string, endpoint: string, duration: number, statusCode: number, userId?: string, tenantId?: string): void {
    const metrics: PerformanceMetrics = {
      operation: 'EXTERNAL_API',
      duration,
      userId,
      tenantId,
      details: {
        service,
        endpoint,
        statusCode
      },
      timestamp: new Date()
    };

    if (duration > 5000) { // Log slow external calls (>5s)
      logger.warn('PERFORMANCE_EXTERNAL_SLOW', metrics);
    } else if (duration > 2000) { // Log medium external calls (>2s)
      logger.info('PERFORMANCE_EXTERNAL_MEDIUM', metrics);
    } else {
      logger.debug('PERFORMANCE_EXTERNAL_FAST', metrics);
    }
  }

  /**
   * Log file upload performance
   */
  static logFileUpload(filename: string, fileSize: number, duration: number, userId?: string, tenantId?: string): void {
    const metrics: PerformanceMetrics = {
      operation: 'FILE_UPLOAD',
      duration,
      userId,
      tenantId,
      details: {
        filename,
        fileSize,
        uploadSpeed: fileSize / (duration / 1000) // bytes per second
      },
      timestamp: new Date()
    };

    logger.info('PERFORMANCE_FILE_UPLOAD', metrics);
  }

  /**
   * Log email sending performance
   */
  static logEmailSend(recipient: string, template: string, duration: number, userId?: string, tenantId?: string): void {
    const metrics: PerformanceMetrics = {
      operation: 'EMAIL_SEND',
      duration,
      userId,
      tenantId,
      details: {
        recipient,
        template
      },
      timestamp: new Date()
    };

    logger.info('PERFORMANCE_EMAIL', metrics);
  }

  /**
   * Log WebSocket performance
   */
  static logWebSocket(event: string, duration: number, userId?: string, tenantId?: string): void {
    const metrics: PerformanceMetrics = {
      operation: 'WEBSOCKET',
      duration,
      userId,
      tenantId,
      details: {
        event
      },
      timestamp: new Date()
    };

    logger.debug('PERFORMANCE_WEBSOCKET', metrics);
  }

  /**
   * Log memory usage
   */
  static logMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const metrics: PerformanceMetrics = {
      operation: 'MEMORY_USAGE',
      duration: 0,
      details: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      timestamp: new Date()
    };

    logger.info('PERFORMANCE_MEMORY', metrics);
  }

  /**
   * Log CPU usage
   */
  static logCpuUsage(): void {
    const cpuUsage = process.cpuUsage();
    const metrics: PerformanceMetrics = {
      operation: 'CPU_USAGE',
      duration: 0,
      details: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      timestamp: new Date()
    };

    logger.info('PERFORMANCE_CPU', metrics);
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary(): any {
    return {
      activeTimers: this.metrics.size,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime()
    };
  }
}
