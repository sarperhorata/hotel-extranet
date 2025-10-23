import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redis.service';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  skipCache?: boolean; // Skip cache for this request
  invalidatePattern?: string; // Pattern to invalidate related cache
}

export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip cache if explicitly requested
      if (options.skipCache || req.headers['x-skip-cache'] === 'true') {
        return next();
      }

      // Generate cache key
      const cacheKey = options.key || generateCacheKey(req);
      const ttl = options.ttl || 300; // Default 5 minutes

      // Try to get from cache
      const cachedData = await redisService.getCache(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        return res.json({
          ...cachedData,
          _cached: true,
          _cacheKey: cacheKey
        });
      }

      // Cache miss - continue with request
      logger.debug(`Cache MISS: ${cacheKey}`);
      
      // Store original res.json method
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = function(data: any) {
        // Cache the response
        redisService.setCache(cacheKey, data, ttl).catch(error => {
          logger.error(`Cache SET failed for key ${cacheKey}:`, error);
        });

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue on cache error
    }
  };
};

export const invalidateCache = async (pattern: string): Promise<void> => {
  try {
    await redisService.clearCache(pattern);
    logger.info(`Cache invalidated for pattern: ${pattern}`);
  } catch (error) {
    logger.error(`Cache invalidation failed for pattern ${pattern}:`, error);
  }
};

export const cacheUserData = async (userId: string, data: any, ttl: number = 3600): Promise<void> => {
  try {
    const key = `user:${userId}`;
    await redisService.setCache(key, data, ttl);
    logger.debug(`User data cached: ${key}`);
  } catch (error) {
    logger.error(`User data cache failed for user ${userId}:`, error);
  }
};

export const getCachedUserData = async (userId: string): Promise<any> => {
  try {
    const key = `user:${userId}`;
    return await redisService.getCache(key);
  } catch (error) {
    logger.error(`Get cached user data failed for user ${userId}:`, error);
    return null;
  }
};

export const cachePropertyData = async (propertyId: string, data: any, ttl: number = 1800): Promise<void> => {
  try {
    const key = `property:${propertyId}`;
    await redisService.setCache(key, data, ttl);
    logger.debug(`Property data cached: ${key}`);
  } catch (error) {
    logger.error(`Property data cache failed for property ${propertyId}:`, error);
  }
};

export const getCachedPropertyData = async (propertyId: string): Promise<any> => {
  try {
    const key = `property:${propertyId}`;
    return await redisService.getCache(key);
  } catch (error) {
    logger.error(`Get cached property data failed for property ${propertyId}:`, error);
    return null;
  }
};

export const cacheSearchResults = async (searchParams: any, results: any, ttl: number = 600): Promise<void> => {
  try {
    const key = `search:${generateSearchKey(searchParams)}`;
    await redisService.setCache(key, results, ttl);
    logger.debug(`Search results cached: ${key}`);
  } catch (error) {
    logger.error(`Search results cache failed:`, error);
  }
};

export const getCachedSearchResults = async (searchParams: any): Promise<any> => {
  try {
    const key = `search:${generateSearchKey(searchParams)}`;
    return await redisService.getCache(key);
  } catch (error) {
    logger.error(`Get cached search results failed:`, error);
    return null;
  }
};

export const cacheBookingData = async (bookingId: string, data: any, ttl: number = 3600): Promise<void> => {
  try {
    const key = `booking:${bookingId}`;
    await redisService.setCache(key, data, ttl);
    logger.debug(`Booking data cached: ${key}`);
  } catch (error) {
    logger.error(`Booking data cache failed for booking ${bookingId}:`, error);
  }
};

export const getCachedBookingData = async (bookingId: string): Promise<any> => {
  try {
    const key = `booking:${bookingId}`;
    return await redisService.getCache(key);
  } catch (error) {
    logger.error(`Get cached booking data failed for booking ${bookingId}:`, error);
    return null;
  }
};

export const cacheInventoryData = async (propertyId: string, date: string, data: any, ttl: number = 300): Promise<void> => {
  try {
    const key = `inventory:${propertyId}:${date}`;
    await redisService.setCache(key, data, ttl);
    logger.debug(`Inventory data cached: ${key}`);
  } catch (error) {
    logger.error(`Inventory data cache failed for property ${propertyId}:`, error);
  }
};

export const getCachedInventoryData = async (propertyId: string, date: string): Promise<any> => {
  try {
    const key = `inventory:${propertyId}:${date}`;
    return await redisService.getCache(key);
  } catch (error) {
    logger.error(`Get cached inventory data failed for property ${propertyId}:`, error);
    return null;
  }
};

export const cacheRateData = async (propertyId: string, date: string, data: any, ttl: number = 600): Promise<void> => {
  try {
    const key = `rate:${propertyId}:${date}`;
    await redisService.setCache(key, data, ttl);
    logger.debug(`Rate data cached: ${key}`);
  } catch (error) {
    logger.error(`Rate data cache failed for property ${propertyId}:`, error);
  }
};

export const getCachedRateData = async (propertyId: string, date: string): Promise<any> => {
  try {
    const key = `rate:${propertyId}:${date}`;
    return await redisService.getCache(key);
  } catch (error) {
    logger.error(`Get cached rate data failed for property ${propertyId}:`, error);
    return null;
  }
};

// Helper functions
function generateCacheKey(req: Request): string {
  const { method, originalUrl, query, body } = req;
  const tenantId = (req as any).tenantId || 'global';
  
  // Create a hash of the request
  const requestHash = JSON.stringify({
    method,
    url: originalUrl,
    query,
    body: method === 'POST' || method === 'PUT' ? body : undefined
  });
  
  return `${tenantId}:${method}:${originalUrl}:${hashString(requestHash)}`;
}

function generateSearchKey(searchParams: any): string {
  const sortedParams = Object.keys(searchParams)
    .sort()
    .reduce((result, key) => {
      result[key] = searchParams[key];
      return result;
    }, {} as any);
  
  return hashString(JSON.stringify(sortedParams));
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Cache invalidation patterns
export const CACHE_PATTERNS = {
  USER: 'user:*',
  PROPERTY: 'property:*',
  BOOKING: 'booking:*',
  SEARCH: 'search:*',
  INVENTORY: 'inventory:*',
  RATE: 'rate:*',
  ALL: '*'
};

// Cache TTL constants (optimized for performance)
export const CACHE_TTL = {
  USER: 3600, // 1 hour - User data changes infrequently
  PROPERTY: 1800, // 30 minutes - Property data is relatively static
  BOOKING: 3600, // 1 hour - Booking data for current user sessions
  SEARCH: 600, // 10 minutes - Search results are time-sensitive
  INVENTORY: 300, // 5 minutes - Inventory changes frequently
  RATE: 600, // 10 minutes - Rate data changes moderately
  SESSION: 3600, // 1 hour - Session data for active users
  RATE_LIMIT: 60, // 1 minute - Rate limiting cache
  CHANNEL: 900, // 15 minutes - Channel manager data
  PAYMENT: 1800, // 30 minutes - Payment status cache
  NOTIFICATION: 300, // 5 minutes - Notification status
  ANALYTICS: 3600, // 1 hour - Analytics data
  CONFIG: 7200, // 2 hours - Configuration data
  STATIC: 86400 // 24 hours - Static content
};

// Cache strategies for different data types
export const CACHE_STRATEGIES = {
  // Cache-First: Always serve from cache, update in background
  CACHE_FIRST: 'cache_first',

  // Network-First: Try network first, fall back to cache
  NETWORK_FIRST: 'network_first',

  // Stale-While-Revalidate: Serve stale cache while revalidating
  STALE_WHILE_REVALIDATE: 'stale_while_revalidate',

  // Time-Based: Cache with TTL, no background refresh
  TIME_BASED: 'time_based'
};

// Cache key patterns for invalidation
export const CACHE_KEY_PATTERNS = {
  USER_PROFILE: 'user:profile:*',
  USER_PREFERENCES: 'user:prefs:*',
  PROPERTY_DETAILS: 'property:details:*',
  PROPERTY_LIST: 'property:list:*',
  BOOKING_DETAILS: 'booking:details:*',
  BOOKING_LIST: 'booking:list:*',
  SEARCH_RESULTS: 'search:results:*',
  INVENTORY_DATA: 'inventory:data:*',
  RATE_DATA: 'rate:data:*',
  CHANNEL_DATA: 'channel:data:*',
  PAYMENT_STATUS: 'payment:status:*',
  NOTIFICATION_STATUS: 'notification:status:*',
  ANALYTICS_DATA: 'analytics:data:*',
  SESSION_DATA: 'session:data:*',
  CONFIG_DATA: 'config:data:*'
};
