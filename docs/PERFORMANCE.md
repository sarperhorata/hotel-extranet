# Performance Optimization Guide

## Overview

This comprehensive performance optimization guide covers all aspects of system performance, including database optimization, caching strategies, CDN configuration, and monitoring.

## Performance Architecture

### 1. Database Performance

#### Indexing Strategy

```sql
-- Primary performance indexes
CREATE INDEX idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_checkin_checkout ON bookings(check_in, check_out);
CREATE INDEX idx_properties_search_vector ON properties USING gin(to_tsvector('english', name || ' ' || city));

-- Composite indexes for complex queries
CREATE INDEX idx_bookings_property_dates_status ON bookings(property_id, check_in, check_out, status);
CREATE INDEX idx_inventory_property_room_dates ON room_inventory(property_id, room_id, date, available_rooms);

-- Partial indexes for active records
CREATE INDEX idx_users_active_tenant ON users(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_properties_active_tenant ON properties(tenant_id, is_active) WHERE is_active = true;
```

#### Query Optimization

```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM bookings WHERE tenant_id = 'tenant-123' AND status = 'confirmed';

-- Get slow queries
SELECT * FROM get_slow_queries(1000); -- Queries slower than 1 second

-- Optimize table statistics
ANALYZE bookings;
ANALYZE properties;
```

### 2. Caching Strategy

#### Multi-Level Caching

1. **Application Cache (Redis)**
   - User sessions and preferences
   - Frequently accessed data
   - API responses

2. **Database Query Cache**
   - Query result caching
   - Prepared statement caching

3. **CDN Cache**
   - Static assets
   - API responses
   - Media files

#### Cache TTL Strategy

```typescript
export const CACHE_TTL = {
  // Real-time data (changes frequently)
  INVENTORY: 300,     // 5 minutes
  SEARCH: 600,        // 10 minutes

  // Semi-static data (changes occasionally)
  RATE: 600,          // 10 minutes
  BOOKING: 3600,      // 1 hour

  // Static data (changes rarely)
  PROPERTY: 1800,     // 30 minutes
  USER: 3600,         // 1 hour

  // Long-term data (changes very rarely)
  CONFIG: 7200,       // 2 hours
  STATIC: 86400       // 24 hours
};
```

#### Cache Invalidation Strategies

```typescript
// Time-based invalidation
await redisService.setCache('property:123', propertyData, CACHE_TTL.PROPERTY);

// Event-based invalidation
await invalidateCache(CACHE_KEY_PATTERNS.PROPERTY_DETAILS);

// Manual invalidation
await redisService.del('property:123');
```

### 3. CDN Configuration

#### Nginx CDN Setup

```nginx
# Static assets with long-term caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options "nosniff";

    # Compression
    gzip_static on;
    brotli_static on;
}

# API responses with no caching
location /api/ {
    expires 0;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    proxy_pass http://backend:5000;
}
```

#### Cloud CDN Integration

```bash
# Cloudflare CDN setup
# Enable Cloudflare for domain
# Configure page rules for caching

# AWS CloudFront setup
aws cloudfront create-distribution --distribution-config file://cdn-config.json

# Google Cloud CDN setup
gcloud compute url-maps create cdn-lb --default-service backend-service
```

## Performance Monitoring

### 1. Real-time Monitoring

#### System Metrics
```typescript
// Monitor memory usage
const memoryUsage = process.memoryUsage();
const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

// Monitor CPU usage
const cpuUsage = process.cpuUsage();

// Monitor database connections
const connectionCount = await getDatabaseConnectionCount();
```

#### Performance Metrics
```typescript
// Track API response times
const startTime = Date.now();
// ... API operation ...
const responseTime = Date.now() - startTime;

// Track database query times
const queryStart = Date.now();
// ... database query ...
const queryTime = Date.now() - queryStart;
```

### 2. Performance Dashboards

#### Key Performance Indicators (KPIs)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Response Time | < 200ms | > 500ms | > 2000ms |
| Database Queries | < 10ms | > 100ms | > 1000ms |
| Memory Usage | < 70% | > 80% | > 90% |
| CPU Usage | < 60% | > 80% | > 95% |
| Cache Hit Rate | > 90% | > 70% | < 50% |
| Error Rate | < 1% | > 5% | > 10% |

#### Monitoring Endpoints

```bash
# Get performance metrics
curl http://localhost:5000/api/v1/performance/metrics?timeRange=1h

# Get system metrics
curl http://localhost:5000/api/v1/performance/system

# Get database metrics
curl http://localhost:5000/api/v1/performance/database

# Get cache metrics
curl http://localhost:5000/api/v1/performance/cache
```

### 3. Automated Performance Testing

```bash
# Load testing with Artillery
artillery run load-test.yml

# Stress testing
npm run test:stress

# Performance regression testing
npm run test:performance-regression
```

## Database Optimization

### 1. Query Optimization

#### Slow Query Detection

```sql
-- Find slow queries
SELECT query, calls, total_time, avg_time, max_time
FROM pg_stat_statements
WHERE avg_time > 100
ORDER BY avg_time DESC;

-- Analyze specific query
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bookings b
JOIN properties p ON b.property_id = p.id
WHERE b.tenant_id = 'tenant-123'
AND b.check_in >= '2024-01-01';
```

#### Index Optimization

```sql
-- Check index usage
SELECT * FROM get_index_usage_stats();

-- Find unused indexes
SELECT * FROM get_index_usage_stats() WHERE scans = 0;

-- Optimize table indexes
SELECT * FROM optimize_table_indexes('bookings');
```

### 2. Database Configuration

#### PostgreSQL Configuration

```ini
# Memory settings
shared_buffers = 2GB              # 25% of RAM
effective_cache_size = 6GB        # 75% of RAM
work_mem = 256MB                  # Per operation memory
maintenance_work_mem = 1GB        # For maintenance operations

# WAL settings
wal_buffers = 16MB
checkpoint_segments = 256
wal_writer_delay = 200ms

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Query planning
random_page_cost = 1.5
effective_io_concurrency = 200
```

#### Connection Pooling

```typescript
// Use connection pooling
const pool = new Pool({
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
  acquireTimeoutMillis: 2000
});
```

### 3. Table Partitioning

#### Time-based Partitioning

```sql
-- Create partitioned table for bookings
CREATE TABLE bookings (
    id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (check_in);

-- Create monthly partitions
CREATE TABLE bookings_2024_01 PARTITION OF bookings
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE bookings_2024_02 PARTITION OF bookings
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## Caching Optimization

### 1. Redis Optimization

#### Memory Management

```bash
# Monitor Redis memory
redis-cli INFO memory

# Set memory limits
redis-cli CONFIG SET maxmemory 1GB
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Memory defragmentation
redis-cli MEMORY DOCTOR
```

#### Persistence Optimization

```ini
# Redis configuration for performance
save 900 1           # Save every 15 minutes if 1 key changed
save 300 10          # Save every 5 minutes if 10 keys changed
save 60 10000        # Save every minute if 10000 keys changed

rdbcompression yes   # Compress RDB files
rdbchecksum yes      # Verify RDB integrity

appendonly yes       # Enable AOF
appendfsync everysec # Fsync every second
```

### 2. Application Caching

#### Cache Warming

```typescript
// Pre-load frequently accessed data
async function warmCache() {
  // Load popular properties
  const popularProperties = await getPopularProperties();
  await redisService.setCache('popular:properties', popularProperties, CACHE_TTL.PROPERTY);

  // Load rate data for next 30 days
  const futureRates = await getFutureRates(30);
  await redisService.setCache('future:rates', futureRates, CACHE_TTL.RATE);
}
```

#### Cache Invalidation

```typescript
// Smart cache invalidation
export const invalidateRelatedCaches = async (entityType: string, entityId: string) => {
  switch (entityType) {
    case 'property':
      await invalidateCache(CACHE_KEY_PATTERNS.PROPERTY_DETAILS);
      await invalidateCache(CACHE_KEY_PATTERNS.PROPERTY_LIST);
      await invalidateCache(CACHE_KEY_PATTERNS.SEARCH_RESULTS);
      break;

    case 'booking':
      await invalidateCache(CACHE_KEY_PATTERNS.BOOKING_DETAILS);
      await invalidateCache(CACHE_KEY_PATTERNS.INVENTORY_DATA);
      break;
  }
};
```

## Frontend Performance

### 1. Bundle Optimization

#### Code Splitting

```typescript
// Dynamic imports for code splitting
const PropertyDetails = lazy(() => import('./pages/PropertyDetails'));
const BookingForm = lazy(() => import('./components/BookingForm'));

// Route-based splitting
const routes = [
  { path: '/properties/:id', component: PropertyDetails },
  { path: '/bookings/new', component: BookingForm }
];
```

#### Tree Shaking

```javascript
// Only import used functions
import { format, parseISO } from 'date-fns';
// Instead of: import * as dateFns from 'date-fns';
```

### 2. Asset Optimization

#### Image Optimization

```typescript
// Responsive images with WebP
<picture>
  <source srcset="/images/hotel-400.webp 400w, /images/hotel-800.webp 800w" type="image/webp">
  <img srcset="/images/hotel-400.jpg 400w, /images/hotel-800.jpg 800w" alt="Hotel">
</picture>

// Lazy loading
<img loading="lazy" src="/images/hotel.jpg" alt="Hotel">
```

#### Compression

```bash
# Enable gzip compression in build
# Vite/Rollup handles this automatically in production

# Brotli compression for better performance
npm install -D rollup-plugin-brotli
```

### 3. Service Worker Caching

```javascript
// Service Worker for offline caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('hotel-extranet-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

## Load Balancing

### 1. Application Load Balancer

```nginx
# Nginx load balancer configuration
upstream backend {
    server backend1:5000 weight=3;
    server backend2:5000 weight=2;
    server backend3:5000 weight=1;
    keepalive 32;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Database Load Balancing

#### Read/Write Splitting

```sql
-- Configure read replicas
ALTER SYSTEM SET synchronous_standby_names = 'replica1, replica2';

-- Route read queries to replicas
/* Application logic to route SELECT queries to read replicas */
```

#### Connection Pooling

```bash
# PgBouncer configuration
[databases]
hotel_extranet = host=localhost port=5432 dbname=hotel_extranet

[pgbouncer]
pool_mode = transaction
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
```

## Performance Testing

### 1. Load Testing

#### Artillery Configuration

```yaml
# load-test.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: 'Warm up'
    - duration: 300
      arrivalRate: 20
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 50
      name: 'Peak load'

scenarios:
  - name: 'API health check'
    flow:
      - get:
          url: '/api/v1/monitoring/health'

  - name: 'Property search'
    flow:
      - get:
          url: '/api/v1/search/properties'
          qs:
            checkIn: '2024-01-15'
            checkOut: '2024-01-17'
            guests: 2
```

#### Running Load Tests

```bash
# Run load test
artillery run load-test.yml

# Generate report
artillery report artillery-report.json

# Quick load test
artillery quick --count 100 --num 10 http://localhost:5000/api/v1/monitoring/health
```

### 2. Stress Testing

```bash
# Stress test with different loads
for i in {1..10}; do
  echo "Testing with $i concurrent users"
  artillery run --config load-test.yml stress-test-$i.yml
done

# Memory stress test
npm run test:memory-stress

# CPU stress test
npm run test:cpu-stress
```

### 3. Performance Regression Testing

```typescript
// Automated performance regression tests
describe('Performance Regression', () => {
  test('API response time should not exceed baseline', async () => {
    const startTime = Date.now();
    const response = await request(app).get('/api/v1/properties');
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(1000); // Should be under 1 second
  });

  test('Database query should not exceed baseline', async () => {
    const startTime = Date.now();
    const bookings = await getBookings({ tenantId: 'test' });
    const queryTime = Date.now() - startTime;

    expect(queryTime).toBeLessThan(500); // Should be under 500ms
  });
});
```

## Performance Optimization Tools

### 1. Profiling Tools

#### Node.js Profiling

```bash
# CPU profiling
node --prof app.js
node --prof-process isolate-*.log > prof.txt

# Memory profiling
node --inspect app.js
# Use Chrome DevTools to profile memory

# Heap snapshots
npm install -g heapdump
# Add to code: require('heapdump').writeSnapshot()
```

#### Database Profiling

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View query statistics
SELECT query, calls, total_time, avg_time, max_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Enable slow query log
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_statement = 'all';
```

### 2. Monitoring Tools

#### Application Monitoring

```typescript
// Custom performance monitoring
const monitor = new PerformanceMonitor();

// Track API performance
app.use('/api/*', (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    monitor.recordAPI(req.path, duration, res.statusCode);
  });

  next();
});
```

#### Infrastructure Monitoring

```bash
# System monitoring
htop                    # Process monitoring
iotop                   # I/O monitoring
nethogs                 # Network monitoring
atop                    # Advanced system monitoring

# Database monitoring
pg_top                  # PostgreSQL process monitoring
pg_stat_activity        # Query monitoring
pg_stat_bgwriter        # Background writer stats
```

## Performance Best Practices

### 1. Database Performance

#### Query Optimization
- **Use indexes** for all frequently queried columns
- **Avoid SELECT *** in production queries
- **Use LIMIT** for pagination
- **Optimize JOIN** operations
- **Use prepared statements** for repeated queries

#### Connection Management
- **Use connection pooling** (PgBouncer)
- **Set appropriate connection limits**
- **Monitor connection usage**
- **Close connections** properly

### 2. Application Performance

#### Memory Management
- **Monitor memory usage** regularly
- **Avoid memory leaks** in long-running processes
- **Use streaming** for large data sets
- **Implement garbage collection** hints

#### CPU Optimization
- **Use async/await** for I/O operations
- **Implement worker threads** for CPU-intensive tasks
- **Cache expensive computations**
- **Optimize loops** and iterations

### 3. Network Performance

#### API Optimization
- **Use compression** (gzip, brotli)
- **Implement pagination** for large result sets
- **Use appropriate HTTP status codes**
- **Enable HTTP/2** for multiplexing

#### CDN Optimization
- **Cache static assets** at edge locations
- **Use appropriate cache headers**
- **Implement cache invalidation** strategies
- **Monitor CDN performance**

### 4. Frontend Performance

#### Loading Optimization
- **Implement code splitting**
- **Use lazy loading** for components
- **Preload critical resources**
- **Optimize font loading**

#### Runtime Performance
- **Use React.memo** for component optimization
- **Implement virtualization** for large lists
- **Debounce** user inputs
- **Use Web Workers** for heavy computations

## Performance Monitoring Dashboard

### 1. Real-time Metrics

```typescript
// Dashboard metrics
const metrics = {
  responseTime: {
    p50: 120,      // 50th percentile
    p95: 350,      // 95th percentile
    p99: 800       // 99th percentile
  },
  throughput: {
    requestsPerSecond: 150,
    errorsPerSecond: 2
  },
  resources: {
    memoryUsage: 65,      // Percentage
    cpuUsage: 45,         // Percentage
    diskUsage: 30         // Percentage
  },
  database: {
    activeConnections: 12,
    slowQueries: 3,
    cacheHitRate: 94
  }
};
```

### 2. Performance Alerts

```typescript
// Performance alerting
const alerts = {
  highResponseTime: responseTime > 1000,
  highMemoryUsage: memoryUsage > 80,
  highErrorRate: errorRate > 5,
  databaseIssues: activeConnections > maxConnections * 0.8,
  cacheIssues: hitRate < 70
};

// Send alerts
if (alerts.highResponseTime) {
  await sendAlert('High response time detected', 'warning', {
    responseTime,
    threshold: 1000
  });
}
```

## Cost Optimization

### 1. Infrastructure Costs

#### Database Optimization
- **Right-size instances** based on actual usage
- **Use read replicas** for read-heavy workloads
- **Implement auto-scaling** based on load
- **Archive old data** to cheaper storage

#### CDN Optimization
- **Use appropriate cache headers**
- **Implement cache purging** strategies
- **Monitor CDN usage** and costs
- **Optimize asset delivery**

### 2. Operational Costs

#### Monitoring Costs
- **Optimize log retention** periods
- **Use sampling** for high-volume metrics
- **Implement log aggregation** strategies
- **Archive old monitoring data**

#### Backup Costs
- **Compress backups** to reduce storage
- **Use lifecycle policies** for cloud storage
- **Implement incremental backups**
- **Monitor backup storage** usage

## Troubleshooting

### 1. Performance Issues

#### Slow API Responses

```bash
# Check slow queries
tail -f logs/performance.log | grep "duration"

# Monitor database performance
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check memory usage
node -e "console.log(process.memoryUsage())"
```

#### High Memory Usage

```bash
# Check for memory leaks
npm run test:memory-leaks

# Monitor garbage collection
node --trace-gc app.js 2> gc.log

# Check Redis memory usage
redis-cli INFO memory
```

#### Database Performance Issues

```bash
# Check table bloat
SELECT * FROM get_table_bloat() WHERE bloat_ratio > 0.2;

# Check index usage
SELECT * FROM get_index_usage_stats() WHERE scans = 0;

# Check lock contention
SELECT * FROM get_lock_stats() WHERE waiting = true;
```

### 2. Debug Commands

```bash
# Check system performance
htop

# Monitor network connections
netstat -an | grep :5000

# Check disk I/O
iostat -x 1

# Monitor Redis performance
redis-cli --latency

# Check PostgreSQL performance
pg_stat_statements
```

## Performance Checklist

### Pre-deployment
- [ ] Database indexes optimized
- [ ] Caching strategy implemented
- [ ] CDN configured
- [ ] Compression enabled
- [ ] Performance monitoring active
- [ ] Load testing completed
- [ ] Performance budget defined

### Post-deployment
- [ ] Performance monitoring active
- [ ] Alerts configured
- [ ] Regular performance testing scheduled
- [ ] Performance reports generated
- [ ] Optimization opportunities identified

## Support

For performance-related issues:

1. **Performance Team**: performance@hotel-extranet.com
2. **Emergency**: +1-555-PERF
3. **Monitoring Dashboard**: /api/v1/performance/dashboard
4. **Performance Reports**: /api/v1/performance/metrics

## Related Documentation

- [Monitoring Guide](UPTIMEROBOT_SETUP.md)
- [Logging Guide](LOGGING_SYSTEM.md)
- [Security Guide](SECURITY.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
