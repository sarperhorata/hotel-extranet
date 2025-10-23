import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { query } from '../config/database';

// Multi-tenant middleware to ensure data isolation
export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip tenant check for auth routes and public endpoints
    const publicRoutes = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh',
      '/health'
    ];

    if (publicRoutes.includes(req.path)) {
      next();
      return;
    }

    // Get tenant ID from request
    const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID required'
      });
      return;
    }

    // Verify tenant exists and is active
    const tenantResult = await query(
      'SELECT id, name, is_active FROM tenants WHERE id = $1 AND is_active = true',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Tenant not found or inactive'
      });
      return;
    }

    // Add tenant info to request for use in controllers
    req.tenantId = tenantId;

    next();
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Tenant validation failed'
    });
  }
};

// Add tenant_id to all database queries automatically
export const addTenantFilter = (req: Request, res: Response, next: NextFunction): void => {
  // Store original query method
  const originalQuery = req.query;

  // Override query to automatically add tenant_id filter
  req.query = {
    ...originalQuery,
    tenant_id: req.tenantId
  };

  next();
};

// Validate tenant access to specific resource
export const validateTenantAccess = (resourceTable: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resourceId = req.params.id;
      const tenantId = req.tenantId;

      if (!resourceId || !tenantId) {
        res.status(400).json({
          success: false,
          message: 'Resource ID and Tenant ID required'
        });
        return;
      }

      // Check if resource belongs to tenant
      const result = await query(
        `SELECT id FROM ${resourceTable} WHERE id = $1 AND tenant_id = $2`,
        [resourceId, tenantId]
      );

      if (result.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: 'Access denied: Resource does not belong to tenant'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Tenant access validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Tenant access validation failed'
      });
    }
  };
};

// Ensure all database operations are tenant-scoped
export const ensureTenantScope = (req: Request, res: Response, next: NextFunction): void => {
  // Add tenant_id to request body for POST/PUT operations
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (req.body && typeof req.body === 'object') {
      req.body.tenant_id = req.tenantId;
    }
  }

  // Add tenant_id to query parameters for GET operations
  if (req.method === 'GET') {
    req.query.tenant_id = req.tenantId;
  }

  next();
};
