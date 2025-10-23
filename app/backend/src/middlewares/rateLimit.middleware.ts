import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redis.service';
import { logger } from '../utils/logger';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Skip rate limiting for successful requests
  skipFailedRequests?: boolean; // Skip rate limiting for failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
  skip?: (req: Request) => boolean; // Skip rate limiting condition
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export const rateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting if condition is met
      if (options.skip && options.skip(req)) {
        return next();
      }

      // Generate rate limit key
      const key = options.keyGenerator ? options.keyGenerator(req) : generateRateLimitKey(req);
      const windowSeconds = Math.floor(options.windowMs / 1000);
      
      // Get current rate limit count
      const current = await redisService.getRateLimit(key);
      
      // Check if limit is exceeded
      if (current >= options.max) {
        const resetTime = new Date(Date.now() + options.windowMs);
        const retryAfter = Math.ceil(options.windowMs / 1000);
        
        logger.warn(`Rate limit exceeded for key: ${key}, current: ${current}, limit: ${options.max}`);
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': options.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toISOString(),
          'Retry-After': retryAfter.toString()
        });
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: options.message || 'Rate limit exceeded. Please try again later.',
          limit: options.max,
          current,
          remaining: 0,
          resetTime,
          retryAfter
        });
      }
      
      // Increment rate limit counter
      const newCount = await redisService.incrementRateLimit(key, windowSeconds);
      
      // Set rate limit headers
      const remaining = Math.max(0, options.max - newCount);
      const resetTime = new Date(Date.now() + options.windowMs);
      
      res.set({
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toISOString()
      });
      
      // Add rate limit info to request
      (req as any).rateLimit = {
        limit: options.max,
        current: newCount,
        remaining,
        resetTime
      };
      
      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      next(); // Continue on rate limit error
    }
  };
};

// Predefined rate limit configurations
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts. Please try again later.',
  keyGenerator: (req) => `auth:${getClientIP(req)}`,
  skip: (req) => {
    // Skip rate limiting for successful logins
    return req.method === 'POST' && req.path === '/api/v1/auth/login' && res.statusCode === 200;
  }
});

export const strictAuthRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 attempts per minute
  message: 'Too many authentication attempts. Account temporarily locked.',
  keyGenerator: (req) => `strict_auth:${getClientIP(req)}:${req.body?.email || 'unknown'}`,
  skip: (req) => {
    // Skip for successful authentication
    return res.statusCode === 200;
  }
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'API rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `api:${(req as any).tenantId || 'global'}:${getClientIP(req)}`
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: 'Upload rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `upload:${(req as any).tenantId || 'global'}:${getClientIP(req)}`
});

export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 searches per minute
  message: 'Search rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `search:${(req as any).tenantId || 'global'}:${getClientIP(req)}`
});

export const bookingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 bookings per minute
  message: 'Booking rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `booking:${(req as any).tenantId || 'global'}:${getClientIP(req)}`
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 payment attempts per minute
  message: 'Payment rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `payment:${(req as any).tenantId || 'global'}:${getClientIP(req)}`
});

export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 admin requests per minute
  message: 'Admin rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `admin:${getClientIP(req)}`,
  skip: (req) => (req as any).user?.role !== 'admin'
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'API rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `api:${(req as any).tenantId || 'global'}:${getClientIP(req)}`
});

export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 searches per minute
  message: 'Search rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `search:${(req as any).tenantId || 'global'}:${getClientIP(req)}`
});

export const bookingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 bookings per minute
  message: 'Booking rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `booking:${(req as any).tenantId || 'global'}:${getClientIP(req)}`
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: 'Upload rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `upload:${(req as any).tenantId || 'global'}:${getClientIP(req)}`
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1, // 1 request per minute
  message: 'Strict rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `strict:${getClientIP(req)}`
});

// IP-based rate limiting
export const ipRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per IP per window
  message: 'IP rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `ip:${getClientIP(req)}`
});

// User-based rate limiting
export const userRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per user per minute
  message: 'User rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `user:${(req as any).userId || 'anonymous'}`,
  skip: (req) => !(req as any).userId // Skip if no user ID
});

// Tenant-based rate limiting
export const tenantRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per tenant per minute
  message: 'Tenant rate limit exceeded. Please try again later.',
  keyGenerator: (req) => `tenant:${(req as any).tenantId || 'global'}`,
  skip: (req) => !(req as any).tenantId // Skip if no tenant ID
});

// Dynamic rate limiting based on user role
export const roleBasedRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).user?.role;
  const tenantId = (req as any).tenantId;
  
  let maxRequests: number;
  let windowMs: number;
  
  switch (userRole) {
    case 'admin':
      maxRequests = 1000;
      windowMs = 60 * 1000; // 1 minute
      break;
    case 'hotel_manager':
      maxRequests = 500;
      windowMs = 60 * 1000; // 1 minute
      break;
    case 'staff':
      maxRequests = 100;
      windowMs = 60 * 1000; // 1 minute
      break;
    default:
      maxRequests = 50;
      windowMs = 60 * 1000; // 1 minute
  }
  
  const roleRateLimit = rateLimit({
    windowMs,
    max: maxRequests,
    message: `Rate limit exceeded for role: ${userRole}`,
    keyGenerator: (req) => `role:${userRole}:${tenantId || 'global'}:${getClientIP(req)}`
  });
  
  return roleRateLimit(req, res, next);
};

// Rate limit status endpoint
export const getRateLimitStatus = async (req: Request, res: Response) => {
  try {
    const key = `api:${(req as any).tenantId || 'global'}:${getClientIP(req)}`;
    const current = await redisService.getRateLimit(key);
    
    const status: RateLimitInfo = {
      limit: 100,
      current,
      remaining: Math.max(0, 100 - current),
      resetTime: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
    };
    
    res.json({
      rateLimit: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Rate limit status error:', error);
    res.status(500).json({
      error: 'Failed to get rate limit status'
    });
  }
};

// Clear rate limit for specific key
export const clearRateLimit = async (key: string): Promise<boolean> => {
  try {
    await redisService.del(key, { prefix: 'rate' });
    logger.info(`Rate limit cleared for key: ${key}`);
    return true;
  } catch (error) {
    logger.error(`Failed to clear rate limit for key ${key}:`, error);
    return false;
  }
};

// Get rate limit info for specific key
export const getRateLimitInfo = async (key: string): Promise<RateLimitInfo | null> => {
  try {
    const current = await redisService.getRateLimit(key);
    
    return {
      limit: 100, // Default limit
      current,
      remaining: Math.max(0, 100 - current),
      resetTime: new Date(Date.now() + 15 * 60 * 1000)
    };
  } catch (error) {
    logger.error(`Failed to get rate limit info for key ${key}:`, error);
    return null;
  }
};

// Helper functions
function generateRateLimitKey(req: Request): string {
  const ip = getClientIP(req);
  const tenantId = (req as any).tenantId || 'global';
  const userId = (req as any).userId || 'anonymous';
  
  return `rate_limit:${tenantId}:${userId}:${ip}`;
}

function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         'unknown';
}

// Rate limit bypass for specific conditions
export const bypassRateLimit = (req: Request): boolean => {
  // Bypass for health checks
  if (req.path === '/health' || req.path === '/api/v1/monitoring/health') {
    return true;
  }
  
  // Bypass for internal requests
  if (req.headers['x-internal-request'] === 'true') {
    return true;
  }
  
  // Bypass for admin users
  if ((req as any).user?.role === 'admin') {
    return true;
  }
  
  return false;
};

// Rate limit configuration for different endpoints
export const RATE_LIMIT_CONFIG = {
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5
  },
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  },
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    max: 20
  },
  BOOKING: {
    windowMs: 60 * 1000, // 1 minute
    max: 5
  },
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    max: 10
  },
  STRICT: {
    windowMs: 60 * 1000, // 1 minute
    max: 1
  }
};
