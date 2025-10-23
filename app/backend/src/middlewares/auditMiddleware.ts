import { Request, Response, NextFunction } from 'express';
import { AuditLogger } from '../utils/auditLogger';

/**
 * Middleware to log API access
 */
export const auditApiAccess = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    // Log API access
    AuditLogger.logApiAccess(
      req.method,
      req.path,
      req.user?.id,
      req.tenantId,
      res.statusCode,
      responseTime,
      req
    );

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to log authentication events
 */
export const auditAuth = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log authentication event
    AuditLogger.logAuth(
      action,
      req.user?.id || 'anonymous',
      req.tenantId || 'unknown',
      {
        email: req.body?.email,
        success: res.statusCode < 400
      },
      req
    );

    next();
  };
};

/**
 * Middleware to log user management events
 */
export const auditUserManagement = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log user management event
    AuditLogger.logUserManagement(
      action,
      req.user?.id || 'system',
      req.tenantId || 'unknown',
      req.params.id || req.body?.userId,
      {
        targetEmail: req.body?.email,
        targetRole: req.body?.role,
        success: res.statusCode < 400
      },
      req
    );

    next();
  };
};

/**
 * Middleware to log property management events
 */
export const auditPropertyManagement = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log property management event
    AuditLogger.logPropertyManagement(
      action,
      req.user?.id || 'system',
      req.tenantId || 'unknown',
      req.params.id || req.body?.propertyId,
      {
        propertyName: req.body?.name,
        propertyType: req.body?.propertyType,
        success: res.statusCode < 400
      },
      req
    );

    next();
  };
};

/**
 * Middleware to log booking events
 */
export const auditBooking = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log booking event
    AuditLogger.logBooking(
      action,
      req.user?.id || 'system',
      req.tenantId || 'unknown',
      req.params.id || req.body?.bookingId,
      {
        bookingReference: req.body?.bookingReference,
        checkInDate: req.body?.checkInDate,
        checkOutDate: req.body?.checkOutDate,
        totalAmount: req.body?.totalAmount,
        success: res.statusCode < 400
      },
      req
    );

    next();
  };
};

/**
 * Middleware to log inventory events
 */
export const auditInventory = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log inventory event
    AuditLogger.logInventory(
      action,
      req.user?.id || 'system',
      req.tenantId || 'unknown',
      req.params.id || req.body?.inventoryId,
      {
        roomId: req.body?.roomId,
        date: req.body?.date,
        availableRooms: req.body?.availableRooms,
        price: req.body?.price,
        success: res.statusCode < 400
      },
      req
    );

    next();
  };
};

/**
 * Middleware to log payment events
 */
export const auditPayment = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log payment event
    AuditLogger.logPayment(
      action,
      req.user?.id || 'system',
      req.tenantId || 'unknown',
      req.params.id || req.body?.paymentId,
      {
        amount: req.body?.amount,
        currency: req.body?.currency,
        paymentMethod: req.body?.paymentMethod,
        success: res.statusCode < 400
      },
      req
    );

    next();
  };
};

/**
 * Middleware to log channel events
 */
export const auditChannel = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log channel event
    AuditLogger.logChannel(
      action,
      req.user?.id || 'system',
      req.tenantId || 'unknown',
      req.params.id || req.body?.channelId,
      {
        channelName: req.body?.name,
        channelType: req.body?.channelType,
        syncType: req.body?.syncType,
        success: res.statusCode < 400
      },
      req
    );

    next();
  };
};

/**
 * Middleware to log security events
 */
export const auditSecurity = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log security event
    AuditLogger.logSecurity(
      action,
      req.user?.id || 'anonymous',
      req.tenantId || 'unknown',
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        success: res.statusCode < 400
      },
      req
    );

    next();
  };
};
