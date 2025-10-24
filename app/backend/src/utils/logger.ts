import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '../config/env';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  audit: 5,
  performance: 6
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  audit: 'cyan',
  performance: 'blue'
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Console transport for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
      const { timestamp, level, message, ...meta } = info;
      const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
      return `${timestamp} ${level}: ${message}${metaStr}`;
    })
  )
});

// File transports for production
const fileTransports: winston.transport[] = [];

// Error log with daily rotation
fileTransports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true
  })
);

// Combined log with daily rotation
fileTransports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true
  })
);

// HTTP access log
fileTransports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        return `${timestamp} ${meta.method} ${meta.url} ${meta.status} ${meta.responseTime}ms - ${meta.ip}`;
      })
    ),
    maxSize: '10m',
    maxFiles: '7d'
  })
);

// Audit log for security events
fileTransports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'audit',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: '10m',
    maxFiles: '90d' // Keep audit logs longer
  })
);

// Performance log
fileTransports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'performance-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'performance',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '30d'
  })
);

// Create the logger
const loggerInstance = winston.createLogger({
  level: config.LOG_LEVEL || 'info',
  levels,
  transports: process.env.NODE_ENV === 'production' ? fileTransports : [consoleTransport],
  exitOnError: false,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  loggerInstance.add(consoleTransport);
}

// Export logger with custom methods
export const logger = loggerInstance as any;
logger.audit = (message: string, meta?: any) => loggerInstance.log('audit', message, meta);
logger.performance = (message: string, meta?: any) => loggerInstance.log('performance', message, meta);

// Morgan stream for HTTP request logging
export const morganStream = {
  write: (message: string) => {
    const parts = message.trim().split(' ');
    const method = parts[0];
    const url = parts[1];
    const status = parts[2];
    const responseTime = parts[3];
    const ip = parts[4];

    logger.http('HTTP Request', {
      method,
      url,
      status: parseInt(status),
      responseTime: parseInt(responseTime),
      ip
    });
  }
};

// Logger utility functions
export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context
  });
};

export const logAudit = (action: string, userId: string, details?: any) => {
  logger.audit('Security Audit', {
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
    ip: details?.ip || 'unknown'
  });
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.performance('Performance Metric', {
    operation,
    duration,
    metadata
  });
};

export const logSecurity = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
  logger.warn(`Security Event: ${event}`, {
    severity,
    details,
    timestamp: new Date().toISOString()
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  logger.end(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  logger.end(() => {
    process.exit(0);
  });
});

// Production logger setup
if (process.env.NODE_ENV === 'production') {
  // Ensure logs directory exists
  const fs = require('fs');
  fs.mkdirSync(logsDir, { recursive: true });

  // Add log cleanup (keep only last 30 days for most logs, 90 for audit)
  logger.info('Logger initialized for production environment', {
    logLevel: config.LOG_LEVEL,
    logsDir,
    maxFiles: {
      error: '30d',
      combined: '14d',
      access: '7d',
      audit: '90d',
      performance: '30d'
    }
  });
}

export default logger;
