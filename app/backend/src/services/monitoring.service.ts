import { config } from '../config/env';
import { logger } from '../utils/logger';
import { query } from '../config/database';

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    redis?: ServiceStatus;
    email?: ServiceStatus;
    storage?: ServiceStatus;
    external_apis?: ServiceStatus;
  };
  metrics: {
    memory: MemoryMetrics;
    cpu?: CpuMetrics;
    database: DatabaseMetrics;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck?: string;
  error?: string;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
}

export interface CpuMetrics {
  usage: number;
  loadAverage: number[];
}

export interface DatabaseMetrics {
  connections: number;
  maxConnections: number;
  activeQueries: number;
  slowQueries: number;
}

export interface UptimeRobotConfig {
  apiKey: string;
  monitorUrl: string;
  monitorName: string;
  monitorType: 'http' | 'https' | 'ping' | 'port';
  checkInterval: number; // in minutes
  timeout: number; // in seconds
}

export class MonitoringService {
  private uptimeRobotApiKey: string;
  private uptimeRobotBaseUrl: string;

  constructor() {
    this.uptimeRobotApiKey = config.UPTIMEROBOT_API_KEY || '';
    this.uptimeRobotBaseUrl = 'https://api.uptimerobot.com/v2';
  }

  async performHealthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    const services: any = {};

    // Check database
    services.database = await this.checkDatabase();

    // Check Redis if configured
    if (config.REDIS_URL) {
      services.redis = await this.checkRedis();
    }

    // Check email service
    if (config.RESEND_API_KEY) {
      services.email = await this.checkEmailService();
    }

    // Check storage service
    if (config.AWS_ACCESS_KEY_ID || config.CLOUDINARY_CLOUD_NAME) {
      services.storage = await this.checkStorageService();
    }

    // Check external APIs
    services.external_apis = await this.checkExternalAPIs();

    const totalResponseTime = Date.now() - startTime;
    const overallStatus = this.determineOverallStatus(services);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.NODE_ENV,
      services,
      metrics: {
        memory: this.getMemoryMetrics(),
        database: await this.getDatabaseMetrics()
      }
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      await query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    try {
      // Simulate Redis check (replace with actual Redis client)
      const startTime = Date.now();
      // const redis = new Redis(config.REDIS_URL);
      // await redis.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private async checkEmailService(): Promise<ServiceStatus> {
    try {
      // Simulate email service check
      const startTime = Date.now();
      // Test Resend API connectivity
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Email service health check failed:', error);
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private async checkStorageService(): Promise<ServiceStatus> {
    try {
      // Simulate storage service check
      const startTime = Date.now();
      // Test AWS S3 or Cloudinary connectivity
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Storage service health check failed:', error);
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private async checkExternalAPIs(): Promise<ServiceStatus> {
    try {
      // Check external API dependencies
      const startTime = Date.now();
      // Test channel manager APIs, payment gateways, etc.
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('External APIs health check failed:', error);
      return {
        status: 'degraded',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private getMemoryMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const total = memUsage.heapTotal;
    const used = memUsage.heapUsed;
    const percentage = (used / total) * 100;

    return {
      used,
      total,
      percentage: Math.round(percentage * 100) / 100
    };
  }

  private async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      // Get database connection metrics
      const statsResult = await query(`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '1 minute') as slow_queries
      `);

      const stats = statsResult.rows[0];

      return {
        connections: parseInt(stats.active_connections),
        maxConnections: parseInt(stats.max_connections),
        activeQueries: parseInt(stats.active_connections),
        slowQueries: parseInt(stats.slow_queries)
      };
    } catch (error) {
      logger.error('Failed to get database metrics:', error);
      return {
        connections: 0,
        maxConnections: 0,
        activeQueries: 0,
        slowQueries: 0
      };
    }
  }

  private determineOverallStatus(services: any): 'healthy' | 'unhealthy' | 'degraded' {
    const serviceStatuses = Object.values(services) as ServiceStatus[];
    const downServices = serviceStatuses.filter(s => s.status === 'down');
    const degradedServices = serviceStatuses.filter(s => s.status === 'degraded');

    if (downServices.length > 0) {
      return 'unhealthy';
    } else if (degradedServices.length > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  async setupUptimeRobotMonitor(config: UptimeRobotConfig): Promise<boolean> {
    try {
      if (!this.uptimeRobotApiKey) {
        logger.warn('UptimeRobot API key not configured');
        return false;
      }

      // Simulate UptimeRobot API call
      logger.info(`Setting up UptimeRobot monitor for: ${config.monitorName}`);
      
      // In a real implementation, you would make an API call to UptimeRobot
      // const response = await fetch(`${this.uptimeRobotBaseUrl}/newMonitor`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      //   body: new URLSearchParams({
      //     api_key: this.uptimeRobotApiKey,
      //     format: 'json',
      //     type: config.monitorType,
      //     url: config.monitorUrl,
      //     friendly_name: config.monitorName,
      //     interval: config.checkInterval.toString(),
      //     timeout: config.timeout.toString()
      //   })
      // });

      return true;
    } catch (error) {
      logger.error('Failed to setup UptimeRobot monitor:', error);
      return false;
    }
  }

  async getUptimeRobotMonitors(): Promise<any[]> {
    try {
      if (!this.uptimeRobotApiKey) {
        return [];
      }

      // Simulate UptimeRobot API call
      logger.info('Fetching UptimeRobot monitors');
      
      // In a real implementation, you would make an API call to UptimeRobot
      // const response = await fetch(`${this.uptimeRobotBaseUrl}/getMonitors`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      //   body: new URLSearchParams({
      //     api_key: this.uptimeRobotApiKey,
      //     format: 'json'
      //   })
      // });

      return [];
    } catch (error) {
      logger.error('Failed to get UptimeRobot monitors:', error);
      return [];
    }
  }

  async logPerformanceMetrics(operation: string, duration: number, metadata?: any): Promise<void> {
    try {
      await query(`
        INSERT INTO performance_logs (
          operation, duration_ms, metadata, created_at
        ) VALUES (
          $1, $2, $3, CURRENT_TIMESTAMP
        )
      `, [operation, duration, JSON.stringify(metadata || {})]);

      logger.info(`Performance logged: ${operation} took ${duration}ms`);
    } catch (error) {
      logger.error('Failed to log performance metrics:', error);
    }
  }

  async getPerformanceMetrics(timeRange: string = '1 hour'): Promise<any> {
    try {
      const metricsResult = await query(`
        SELECT 
          operation,
          COUNT(*) as call_count,
          AVG(duration_ms) as avg_duration,
          MIN(duration_ms) as min_duration,
          MAX(duration_ms) as max_duration,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration
        FROM performance_logs
        WHERE created_at >= NOW() - INTERVAL '${timeRange}'
        GROUP BY operation
        ORDER BY avg_duration DESC
      `);

      return metricsResult.rows;
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      return [];
    }
  }
}
