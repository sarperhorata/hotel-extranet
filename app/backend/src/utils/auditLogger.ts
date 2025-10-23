import { logger } from './logger';
import { Request } from 'express';

export interface AuditLogData {
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

export class AuditLogger {
  /**
   * Log user authentication events
   */
  static logAuth(action: string, userId: string, tenantId: string, details?: any, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: `AUTH_${action.toUpperCase()}`,
      resource: 'authentication',
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.info('AUDIT_AUTH', auditData);
  }

  /**
   * Log user management events
   */
  static logUserManagement(action: string, userId: string, tenantId: string, targetUserId?: string, details?: any, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: `USER_${action.toUpperCase()}`,
      resource: 'user',
      resourceId: targetUserId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.info('AUDIT_USER', auditData);
  }

  /**
   * Log property management events
   */
  static logPropertyManagement(action: string, userId: string, tenantId: string, propertyId?: string, details?: any, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: `PROPERTY_${action.toUpperCase()}`,
      resource: 'property',
      resourceId: details?.propertyId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.info('AUDIT_PROPERTY', auditData);
  }

  /**
   * Log booking events
   */
  static logBooking(action: string, userId: string, tenantId: string, bookingId?: string, details?: any, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: `BOOKING_${action.toUpperCase()}`,
      resource: 'booking',
      resourceId: bookingId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.info('AUDIT_BOOKING', auditData);
  }

  /**
   * Log inventory events
   */
  static logInventory(action: string, userId: string, tenantId: string, inventoryId?: string, details?: any, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: `INVENTORY_${action.toUpperCase()}`,
      resource: 'inventory',
      resourceId: inventoryId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.info('AUDIT_INVENTORY', auditData);
  }

  /**
   * Log payment events
   */
  static logPayment(action: string, userId: string, tenantId: string, paymentId?: string, details?: any, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: `PAYMENT_${action.toUpperCase()}`,
      resource: 'payment',
      resourceId: paymentId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.info('AUDIT_PAYMENT', auditData);
  }

  /**
   * Log channel management events
   */
  static logChannel(action: string, userId: string, tenantId: string, channelId?: string, details?: any, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: `CHANNEL_${action.toUpperCase()}`,
      resource: 'channel',
      resourceId: channelId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.info('AUDIT_CHANNEL', auditData);
  }

  /**
   * Log system events
   */
  static logSystem(action: string, details?: any, req?: Request) {
    const auditData: AuditLogData = {
      action: `SYSTEM_${action.toUpperCase()}`,
      resource: 'system',
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.info('AUDIT_SYSTEM', auditData);
  }

  /**
   * Log security events
   */
  static logSecurity(action: string, userId?: string, tenantId?: string, details?: any, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: `SECURITY_${action.toUpperCase()}`,
      resource: 'security',
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.warn('AUDIT_SECURITY', auditData);
  }

  /**
   * Log API access events
   */
  static logApiAccess(method: string, path: string, userId?: string, tenantId?: string, statusCode?: number, responseTime?: number, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: 'API_ACCESS',
      resource: 'api',
      details: {
        method,
        path,
        statusCode,
        responseTime
      },
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.info('AUDIT_API', auditData);
  }

  /**
   * Log error events
   */
  static logError(error: Error, userId?: string, tenantId?: string, context?: string, req?: Request) {
    const auditData: AuditLogData = {
      userId,
      tenantId,
      action: 'ERROR',
      resource: 'system',
      details: {
        error: error.message,
        stack: error.stack,
        context
      },
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    };

    logger.error('AUDIT_ERROR', auditData);
  }
}
