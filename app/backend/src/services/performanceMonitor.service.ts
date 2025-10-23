import { logger, logPerformance } from '../utils/logger';
import { sentryService } from './sentry.service';
import { redisService } from './redis.service';
import { config } from '../config/env';

export interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: any;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface SystemMetrics {
  timestamp: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  uptime: number;
  loadAverage: number[];
  database: {
    connections: number;
    activeQueries: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    keysCount: number;
  };
  externalAPIs: {
    responseTimes: { [service: string]: number };
    errorRates: { [service: string]: number };
  };
}

export class PerformanceMonitorService {
  private metricsBuffer: PerformanceMetrics[] = [];
  private systemMetricsBuffer: SystemMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  startMonitoring(interval: number = 60000): void {
    if (this.isMonitoring) {
      logger.warn('Performance monitoring already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting performance monitoring', { interval });

    // Monitor system metrics
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.flushMetrics();
      } catch (error) {
        logger.error('Error in performance monitoring cycle:', error);
      }
    }, interval);

    // Start CPU monitoring
    this.startCPUMonitoring();
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Performance monitoring stopped');
  }

  recordOperation(operation: string, duration: number, success: boolean = true, metadata?: any): void {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
      metadata,
      memoryUsage: process.memoryUsage()
    };

    this.metricsBuffer.push(metric);

    // Log slow operations immediately
    if (duration > config.SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow operation detected', {
        operation,
        duration,
        threshold: config.SLOW_REQUEST_THRESHOLD,
        success,
        metadata
      });

      // Send to Sentry for very slow operations
      if (duration > config.SLOW_REQUEST_THRESHOLD * 2) {
        sentryService.captureMessage(`Very slow operation: ${operation}`, 'warning', {
          operation,
          duration,
          threshold: config.SLOW_REQUEST_THRESHOLD,
          metadata
        });
      }
    }

    // Performance logging
    logPerformance(operation, duration, metadata);
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const systemMetrics: SystemMetrics = {
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        loadAverage: require('os').loadavg(),
        database: await this.getDatabaseMetrics(),
        cache: await this.getCacheMetrics(),
        externalAPIs: await this.getExternalAPIMetrics()
      };

      this.systemMetricsBuffer.push(systemMetrics);

      // Check for performance issues
      this.checkPerformanceThresholds(systemMetrics);
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  private async getDatabaseMetrics(): Promise<SystemMetrics['database']> {
    try {
      // This would query actual database metrics
      return {
        connections: 5,
        activeQueries: 2,
        slowQueries: 0
      };
    } catch (error) {
      logger.error('Error getting database metrics:', error);
      return {
        connections: 0,
        activeQueries: 0,
        slowQueries: 0
      };
    }
  }

  private async getCacheMetrics(): Promise<SystemMetrics['cache']> {
    try {
      // Get Redis info
      const info = await redisService.getInfo();

      return {
        hitRate: 85.5, // Would calculate from actual metrics
        missRate: 14.5,
        keysCount: parseInt(info.connected_clients || '0')
      };
    } catch (error) {
      logger.error('Error getting cache metrics:', error);
      return {
        hitRate: 0,
        missRate: 0,
        keysCount: 0
      };
    }
  }

  private async getExternalAPIMetrics(): Promise<SystemMetrics['externalAPIs']> {
    try {
      // This would track external API response times and errors
      return {
        responseTimes: {
          'email_service': 150,
          'payment_gateway': 300,
          'file_storage': 80
        },
        errorRates: {
          'email_service': 0.02,
          'payment_gateway': 0.05,
          'file_storage': 0.01
        }
      };
    } catch (error) {
      logger.error('Error getting external API metrics:', error);
      return {
        responseTimes: {},
        errorRates: {}
      };
    }
  }

  private checkPerformanceThresholds(metrics: SystemMetrics): void {
    // Memory usage check
    const memoryPercentage = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
    if (memoryPercentage > config.MEMORY_USAGE_THRESHOLD) {
      logger.warn('High memory usage detected', {
        percentage: memoryPercentage,
        threshold: config.MEMORY_USAGE_THRESHOLD,
        heapUsed: metrics.memory.heapUsed,
        heapTotal: metrics.memory.heapTotal
      });

      sentryService.captureMessage(`High memory usage: ${memoryPercentage.toFixed(2)}%`, 'warning', {
        memoryUsage: metrics.memory,
        percentage: memoryPercentage,
        threshold: config.MEMORY_USAGE_THRESHOLD
      });
    }

    // Database connection check
    if (metrics.database.connections > 80) { // 80% of max connections
      logger.warn('High database connection usage', {
        connections: metrics.database.connections,
        percentage: (metrics.database.connections / 100) * 100
      });
    }

    // Cache performance check
    if (metrics.cache.hitRate < 70) {
      logger.warn('Low cache hit rate', {
        hitRate: metrics.cache.hitRate,
        missRate: metrics.cache.missRate
      });
    }

    // External API performance check
    Object.entries(metrics.externalAPIs.responseTimes).forEach(([service, responseTime]) => {
      if (responseTime > 5000) { // 5 seconds
        logger.warn(`Slow external API response: ${service}`, {
          service,
          responseTime,
          threshold: 5000
        });
      }
    });
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0 && this.systemMetricsBuffer.length === 0) {
      return;
    }

    try {
      // Store metrics in Redis for analysis
      if (this.metricsBuffer.length > 0) {
        const metricsKey = `performance:metrics:${Date.now()}`;
        await redisService.setCache(metricsKey, this.metricsBuffer, 3600); // 1 hour
      }

      if (this.systemMetricsBuffer.length > 0) {
        const systemKey = `performance:system:${Date.now()}`;
        await redisService.setCache(systemKey, this.systemMetricsBuffer, 3600);
      }

      // Clear buffers
      this.metricsBuffer = [];
      this.systemMetricsBuffer = [];

    } catch (error) {
      logger.error('Error flushing performance metrics:', error);
    }
  }

  private startCPUMonitoring(): void {
    // CPU monitoring is already included in system metrics
    // Additional CPU-specific monitoring can be added here if needed
  }

  async getPerformanceReport(timeRange: string = '1h'): Promise<any> {
    try {
      const endTime = Date.now();
      const startTime = endTime - this.parseTimeRange(timeRange);

      // Get metrics from Redis
      const metricsKeys = await redisService.keys(`performance:metrics:*`);
      const systemKeys = await redisService.keys(`performance:system:*`);

      const allMetrics: PerformanceMetrics[] = [];
      const allSystemMetrics: SystemMetrics[] = [];

      // Collect metrics within time range
      for (const key of metricsKeys) {
        const metrics = await redisService.getCache(key);
        if (metrics && Array.isArray(metrics)) {
          const filteredMetrics = metrics.filter((m: PerformanceMetrics) =>
            m.timestamp >= startTime && m.timestamp <= endTime
          );
          allMetrics.push(...filteredMetrics);
        }
      }

      for (const key of systemKeys) {
        const systemMetrics = await redisService.getCache(key);
        if (systemMetrics && Array.isArray(systemMetrics)) {
          const filteredMetrics = systemMetrics.filter((m: SystemMetrics) =>
            m.timestamp >= startTime && m.timestamp <= endTime
          );
          allSystemMetrics.push(...filteredMetrics);
        }
      }

      return this.analyzePerformanceData(allMetrics, allSystemMetrics);
    } catch (error) {
      logger.error('Error generating performance report:', error);
      return {};
    }
  }

  private parseTimeRange(timeRange: string): number {
    const units: { [key: string]: number } = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = timeRange.match(/^(\d+)([mhd])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      return value * units[unit];
    }

    return 60 * 60 * 1000; // Default 1 hour
  }

  private analyzePerformanceData(metrics: PerformanceMetrics[], systemMetrics: SystemMetrics[]): any {
    if (metrics.length === 0) {
      return { message: 'No performance data available' };
    }

    // Calculate averages and statistics
    const durations = metrics.map(m => m.duration);
    const successfulOps = metrics.filter(m => m.success);

    const report = {
      timeRange: {
        start: new Date(Math.min(...metrics.map(m => m.timestamp))),
        end: new Date(Math.max(...metrics.map(m => m.timestamp)))
      },
      operations: {
        total: metrics.length,
        successful: successfulOps.length,
        failed: metrics.length - successfulOps.length,
        successRate: (successfulOps.length / metrics.length) * 100
      },
      performance: {
        averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
        minResponseTime: Math.min(...durations),
        maxResponseTime: Math.max(...durations),
        medianResponseTime: this.calculateMedian(durations),
        p95ResponseTime: this.calculatePercentile(durations, 95),
        p99ResponseTime: this.calculatePercentile(durations, 99)
      },
      operationsByType: this.groupByOperation(metrics),
      slowOperations: metrics.filter(m => m.duration > config.SLOW_REQUEST_THRESHOLD).length,
      memoryUsage: systemMetrics.length > 0 ? {
        averageHeapUsed: systemMetrics.reduce((sum, m) => sum + m.memory.heapUsed, 0) / systemMetrics.length,
        maxHeapUsed: Math.max(...systemMetrics.map(m => m.memory.heapUsed)),
        averageHeapTotal: systemMetrics.reduce((sum, m) => sum + m.memory.heapTotal, 0) / systemMetrics.length
      } : null,
      cachePerformance: systemMetrics.length > 0 ? {
        averageHitRate: systemMetrics.reduce((sum, m) => sum + m.cache.hitRate, 0) / systemMetrics.length,
        averageMissRate: systemMetrics.reduce((sum, m) => sum + m.cache.missRate, 0) / systemMetrics.length
      } : null
    };

    return report;
  }

  private groupByOperation(metrics: PerformanceMetrics[]): { [operation: string]: number } {
    return metrics.reduce((groups, metric) => {
      groups[metric.operation] = (groups[metric.operation] || 0) + 1;
      return groups;
    }, {} as { [operation: string]: number });
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  // Middleware for automatic performance tracking
  getPerformanceTrackingMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void)) {
        const duration = Date.now() - startTime;

        // Record the operation
        this.recordOperation(`${req.method} ${req.originalUrl}`, duration, res.statusCode < 400, {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          tenantId: req.tenantId,
          userId: req.user?.id
        });

        // Call original end method
        return originalEnd.call(this, chunk, encoding);
      }.bind(this);

      next();
    };
  }

  recordOperation(operation: string, duration: number, success: boolean = true, metadata?: any): void {
    this.recordOperation(operation, duration, success, metadata);
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitorService();
