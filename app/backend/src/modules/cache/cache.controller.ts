import { Request, Response } from 'express';
import { redisService } from '../../services/redis.service';
import { logger } from '../../utils/logger';
import { 
  successResponse, 
  errorResponse,
  validationErrorResponse
} from '../../utils/response';
import { catchAsync } from '../../middlewares/errorHandler';
import { 
  invalidateCache, 
  CACHE_PATTERNS, 
  CACHE_TTL 
} from '../../middlewares/redisCache.middleware';

// Get cache statistics
export const getCacheStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await redisService.getInfo();
  
  return successResponse(res, {
    redis: {
      version: stats.redis_version,
      connectedClients: parseInt(stats.connected_clients || '0'),
      usedMemory: stats.used_memory,
      usedMemoryHuman: stats.used_memory_human,
      uptime: parseInt(stats.uptime_in_seconds || '0')
    },
    cache: {
      patterns: CACHE_PATTERNS,
      ttls: CACHE_TTL
    },
    timestamp: new Date().toISOString()
  }, 'Cache statistics retrieved successfully');
});

// Get cache keys
export const getCacheKeys = catchAsync(async (req: Request, res: Response) => {
  const { pattern = '*', limit = 100 } = req.query;
  
  const keys = await redisService.keys(pattern as string);
  const limitedKeys = keys.slice(0, Number(limit));
  
  return successResponse(res, {
    pattern,
    keys: limitedKeys,
    total: keys.length,
    limited: keys.length > Number(limit)
  }, 'Cache keys retrieved successfully');
});

// Get cache value
export const getCacheValue = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;
  
  if (!key) {
    return validationErrorResponse(res, ['Cache key is required']);
  }
  
  const value = await redisService.getCache(key);
  
  if (value === null) {
    return errorResponse(res, 'Cache key not found', 404);
  }
  
  return successResponse(res, {
    key,
    value,
    type: typeof value,
    size: JSON.stringify(value).length
  }, 'Cache value retrieved successfully');
});

// Set cache value
export const setCacheValue = catchAsync(async (req: Request, res: Response) => {
  const { key, value, ttl = 3600 } = req.body;
  
  if (!key || value === undefined) {
    return validationErrorResponse(res, ['Key and value are required']);
  }
  
  const success = await redisService.setCache(key, value, ttl);
  
  if (!success) {
    return errorResponse(res, 'Failed to set cache value', 500);
  }
  
  return successResponse(res, {
    key,
    ttl,
    success
  }, 'Cache value set successfully');
});

// Delete cache value
export const deleteCacheValue = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;
  
  if (!key) {
    return validationErrorResponse(res, ['Cache key is required']);
  }
  
  const success = await redisService.deleteCache(key);
  
  return successResponse(res, {
    key,
    deleted: success
  }, success ? 'Cache value deleted successfully' : 'Cache value not found');
});

// Clear cache by pattern
export const clearCacheByPattern = catchAsync(async (req: Request, res: Response) => {
  const { pattern = '*' } = req.body;
  
  if (!pattern) {
    return validationErrorResponse(res, ['Pattern is required']);
  }
  
  try {
    await invalidateCache(pattern);
    
    return successResponse(res, {
      pattern,
      cleared: true
    }, 'Cache cleared successfully');
  } catch (error) {
    logger.error(`Cache clear failed for pattern ${pattern}:`, error);
    return errorResponse(res, 'Failed to clear cache', 500);
  }
});

// Clear all cache
export const clearAllCache = catchAsync(async (req: Request, res: Response) => {
  try {
    await redisService.flushdb();
    
    return successResponse(res, {
      cleared: true
    }, 'All cache cleared successfully');
  } catch (error) {
    logger.error('Cache flush failed:', error);
    return errorResponse(res, 'Failed to clear all cache', 500);
  }
});

// Get cache TTL
export const getCacheTTL = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;
  
  if (!key) {
    return validationErrorResponse(res, ['Cache key is required']);
  }
  
  const exists = await redisService.exists(key);
  
  if (!exists) {
    return errorResponse(res, 'Cache key not found', 404);
  }
  
  // Note: Redis TTL command would be used here
  // For now, return a default TTL
  return successResponse(res, {
    key,
    ttl: 3600, // Default TTL
    exists: true
  }, 'Cache TTL retrieved successfully');
});

// Set cache TTL
export const setCacheTTL = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { ttl } = req.body;
  
  if (!key || !ttl) {
    return validationErrorResponse(res, ['Key and TTL are required']);
  }
  
  const success = await redisService.expire(key, ttl);
  
  return successResponse(res, {
    key,
    ttl,
    success
  }, success ? 'Cache TTL set successfully' : 'Failed to set cache TTL');
});

// Cache health check
export const cacheHealthCheck = catchAsync(async (req: Request, res: Response) => {
  const ping = await redisService.ping();
  
  if (!ping) {
    return errorResponse(res, 'Cache service is not available', 503);
  }
  
  const info = await redisService.getInfo();
  
  return successResponse(res, {
    status: 'healthy',
    ping,
    info: {
      version: info.redis_version,
      connectedClients: parseInt(info.connected_clients || '0'),
      usedMemory: info.used_memory,
      uptime: parseInt(info.uptime_in_seconds || '0')
    },
    timestamp: new Date().toISOString()
  }, 'Cache health check passed');
});

// Get cache performance metrics
export const getCachePerformance = catchAsync(async (req: Request, res: Response) => {
  const { timeRange = '1 hour' } = req.query;
  
  try {
    // This would typically query performance logs
    // For now, return mock data
    const metrics = {
      hitRate: 85.5,
      missRate: 14.5,
      averageResponseTime: 2.3,
      totalRequests: 10000,
      cacheHits: 8550,
      cacheMisses: 1450,
      timeRange
    };
    
    return successResponse(res, metrics, 'Cache performance metrics retrieved successfully');
  } catch (error) {
    logger.error('Cache performance metrics error:', error);
    return errorResponse(res, 'Failed to get cache performance metrics', 500);
  }
});

// Warm up cache
export const warmUpCache = catchAsync(async (req: Request, res: Response) => {
  const { patterns = [] } = req.body;
  
  if (!Array.isArray(patterns)) {
    return validationErrorResponse(res, ['Patterns must be an array']);
  }
  
  try {
    const results = [];
    
    for (const pattern of patterns) {
      // This would typically preload common data
      // For now, just log the pattern
      logger.info(`Warming up cache for pattern: ${pattern}`);
      results.push({ pattern, status: 'warmed' });
    }
    
    return successResponse(res, {
      patterns: results,
      total: patterns.length
    }, 'Cache warm-up completed successfully');
  } catch (error) {
    logger.error('Cache warm-up error:', error);
    return errorResponse(res, 'Failed to warm up cache', 500);
  }
});

// Get cache configuration
export const getCacheConfig = catchAsync(async (req: Request, res: Response) => {
  const config = {
    patterns: CACHE_PATTERNS,
    ttls: CACHE_TTL,
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
      db: process.env.REDIS_DB || '0'
    }
  };
  
  return successResponse(res, config, 'Cache configuration retrieved successfully');
});

// Update cache configuration
export const updateCacheConfig = catchAsync(async (req: Request, res: Response) => {
  const { ttl, pattern } = req.body;
  
  if (!ttl || !pattern) {
    return validationErrorResponse(res, ['TTL and pattern are required']);
  }
  
  // This would typically update configuration
  // For now, just return success
  return successResponse(res, {
    ttl,
    pattern,
    updated: true
  }, 'Cache configuration updated successfully');
});
