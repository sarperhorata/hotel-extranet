# Logging and Error Tracking System

## Overview

The Hotel Extranet system implements a comprehensive logging and error tracking system using Winston for structured logging and Sentry for error monitoring and performance tracking.

## Logging Architecture

### 1. Winston Logger

#### Log Levels

| Level | Value | Description |
|-------|-------|-------------|
| error | 0 | Error events that might still allow the application to continue running |
| warn | 1 | Warning events that don't cause immediate problems but should be investigated |
| info | 2 | General information about application flow |
| http | 3 | HTTP request logging |
| debug | 4 | Detailed debugging information |
| audit | 5 | Security and audit events |
| performance | 6 | Performance metrics and monitoring |

#### Log Transports

##### Development (Console)
- Colored output for better readability
- Formatted timestamps
- Stack traces for errors

##### Production (Files)
- **Error Log**: `error-YYYY-MM-DD.log` (rotated daily, 30 days retention)
- **Combined Log**: `combined-YYYY-MM-DD.log` (rotated daily, 14 days retention)
- **Access Log**: `access-YYYY-MM-DD.log` (rotated daily, 7 days retention)
- **Audit Log**: `audit-YYYY-MM-DD.log` (rotated daily, 90 days retention)
- **Performance Log**: `performance-YYYY-MM-DD.log` (rotated daily, 30 days retention)

### 2. Sentry Error Tracking

#### Features
- **Error Aggregation**: Groups similar errors together
- **Performance Monitoring**: Tracks slow requests and operations
- **Release Tracking**: Associates errors with specific deployments
- **User Context**: Tracks errors by user and tenant
- **Breadcrumbs**: Detailed context for error reproduction

#### Configuration

```typescript
// Sentry initialization
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1, // 10% of profiles
  beforeSend: customErrorFilter,
  integrations: [
    new Sentry.Integrations.Http(),
    new Sentry.Integrations.Console(),
    new ProfilingIntegration()
  ]
});
```

## Usage Examples

### 1. Basic Logging

```typescript
import { logger } from '../utils/logger';

// Different log levels
logger.error('Database connection failed', { error, context });
logger.warn('High memory usage detected', { usage: 85 });
logger.info('User logged in', { userId, tenantId });
logger.debug('Processing booking request', { bookingId });
logger.http('HTTP request processed', {
  method: 'POST',
  url: '/api/bookings',
  status: 201,
  responseTime: 150
});
```

### 2. Error Tracking

```typescript
import { sentryService } from '../services/sentry.service';

// Capture exceptions
try {
  // Some operation
} catch (error) {
  sentryService.captureException(error, {
    userId: req.user?.id,
    tenantId: req.tenantId,
    operation: 'booking_creation'
  });
}

// Capture messages
sentryService.captureMessage('Payment processing failed', 'error', {
  bookingId: req.params.id,
  amount: req.body.amount
});
```

### 3. Performance Monitoring

```typescript
import { logPerformance } from '../utils/logger';

// Log operation performance
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;

logPerformance('database_query', duration, {
  query: 'SELECT * FROM bookings WHERE tenant_id = ?',
  tenantId: req.tenantId
});
```

### 4. Audit Logging

```typescript
import { logAudit } from '../utils/logger';

// Log security events
logAudit('user_login', userId, {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  success: true
});

logAudit('booking_created', userId, {
  bookingId: newBooking.id,
  propertyId: newBooking.propertyId,
  tenantId: req.tenantId
});
```

### 5. Security Event Logging

```typescript
import { logSecurity } from '../utils/logger';

// Log security events
logSecurity('suspicious_activity', 'high', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  action: 'multiple_failed_logins',
  attempts: 5
});
```

## Middleware Integration

### 1. Performance Middleware

```typescript
import { performanceMiddleware } from '../middlewares/performance.middleware';

// Tracks request performance
app.use(performanceMiddleware);
```

### 2. Error Handler Middleware

```typescript
import { sentryService } from '../services/sentry.service';

// Sentry error handler
app.use(sentryService.getErrorHandler());
```

## Log Analysis

### 1. Log File Locations

```
logs/
├── error-2024-01-15.log      # Error events
├── combined-2024-01-15.log   # All log events
├── access-2024-01-15.log     # HTTP access logs
├── audit-2024-01-15.log      # Security events
└── performance-2024-01-15.log # Performance metrics
```

### 2. Log Format

#### JSON Format (Production)
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "error",
  "message": "Database connection failed",
  "error": {
    "name": "ConnectionError",
    "message": "Connection timeout",
    "stack": "..."
  },
  "context": {
    "tenantId": "tenant-123",
    "operation": "user_login"
  }
}
```

#### Console Format (Development)
```
2024-01-15 10:30:00:123 error: Database connection failed
{
  "error": {
    "name": "ConnectionError",
    "message": "Connection timeout"
  },
  "context": {
    "tenantId": "tenant-123"
  }
}
```

## Monitoring Dashboard

### 1. Log Aggregation

```bash
# View recent errors
tail -f logs/error-$(date +%Y-%m-%d).log | jq .

# Count errors by type
grep '"level":"error"' logs/combined-*.log | jq -r '.message' | sort | uniq -c | sort -nr

# Monitor performance metrics
tail -f logs/performance-$(date +%Y-%m-%d).log | jq .
```

### 2. Sentry Dashboard

Access Sentry dashboard at: `https://sentry.io/organizations/your-org/projects/hotel-extranet/`

#### Key Metrics
- **Error Rate**: Percentage of requests resulting in errors
- **Performance**: Average response times and throughput
- **Release Health**: Error rates by deployment version
- **User Impact**: Users affected by errors

### 3. Custom Monitoring Scripts

```bash
# Monitor error rates
./scripts/monitor-errors.sh

# Monitor performance
./scripts/monitor-performance.sh

# Generate reports
./scripts/generate-logs-report.sh
```

## Alert Configuration

### 1. Error Rate Alerts

```typescript
// High error rate alert
if (errorRate > 5) { // 5% error rate
  sentryService.captureMessage('High error rate detected', 'warning', {
    errorRate,
    threshold: 5,
    timeWindow: '1h'
  });
}
```

### 2. Performance Alerts

```typescript
// Slow response time alert
if (responseTime > 10000) { // 10 seconds
  sentryService.captureMessage('Slow response time detected', 'warning', {
    responseTime,
    endpoint: req.originalUrl,
    method: req.method
  });
}
```

### 3. Security Alerts

```typescript
// Failed login attempts
if (failedLogins > 5) {
  logSecurity('multiple_failed_logins', 'high', {
    userId: req.body.email,
    attempts: failedLogins,
    ip: req.ip
  });
}
```

## Configuration

### 1. Environment Variables

```bash
# Logging
LOG_LEVEL=info

# Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Performance Monitoring
PERFORMANCE_LOGGING_ENABLED=true
SLOW_QUERY_THRESHOLD=1000
SLOW_REQUEST_THRESHOLD=5000
MEMORY_USAGE_THRESHOLD=80
```

### 2. Log Level Configuration

```typescript
// Configure log levels
logger.level = process.env.LOG_LEVEL || 'info';

// Custom log levels for different modules
logger.child({ module: 'auth' }).info('User authentication');
logger.child({ module: 'booking' }).info('Booking created');
logger.child({ module: 'payment' }).info('Payment processed');
```

## Best Practices

### 1. Logging Guidelines

- **Structured Logging**: Use JSON format for production
- **Contextual Information**: Include relevant IDs and metadata
- **Error Details**: Include stack traces and error context
- **Performance Impact**: Avoid expensive logging operations
- **Security**: Don't log sensitive information

### 2. Error Tracking

- **Error Grouping**: Use consistent error messages
- **Context**: Provide sufficient context for debugging
- **User Impact**: Track affected users and tenants
- **Performance**: Monitor error impact on system performance

### 3. Performance Monitoring

- **Key Metrics**: Track response times, database queries, memory usage
- **Thresholds**: Set appropriate warning and error thresholds
- **Trending**: Monitor performance trends over time
- **Optimization**: Use metrics to identify optimization opportunities

## Troubleshooting

### 1. Common Issues

#### Log Files Not Created
```bash
# Check directory permissions
ls -la logs/

# Check disk space
df -h

# Check logger configuration
tail -f logs/error.log | head -10
```

#### Sentry Not Reporting
```bash
# Check DSN configuration
echo $SENTRY_DSN

# Test Sentry connection
curl -X POST https://your-dsn@sentry.io/api/project-id/envelope/ \
  -H "Content-Type: application/x-sentry-envelope" \
  -d '{"sent_at":"2024-01-15T10:30:00.000Z"}'
```

#### Performance Issues
```bash
# Check slow queries
grep "duration" logs/performance.log | jq .

# Monitor memory usage
node -e "console.log(process.memoryUsage())"

# Check database performance
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### 2. Debug Commands

```bash
# View recent errors
tail -f logs/error.log | jq .

# Search for specific errors
grep "authentication" logs/combined.log

# Monitor real-time logs
tail -f logs/combined.log | grep -E "(error|warn)"

# Check log file sizes
du -sh logs/*
```

## Security Considerations

### 1. Sensitive Data

```typescript
// Don't log sensitive information
logger.info('User action', {
  userId: user.id,
  // Don't log: password, tokens, payment info
});

// Sanitize error messages
const sanitizedError = {
  message: error.message,
  code: error.code,
  // Don't include: stack traces with sensitive paths
};
```

### 2. Access Control

- **File Permissions**: Restrict access to log files
- **Network Security**: Use TLS for log shipping
- **Retention**: Implement log retention policies
- **Encryption**: Encrypt sensitive log data

### 3. Compliance

- **GDPR**: Implement data retention and deletion
- **PCI DSS**: Protect payment-related logs
- **Audit Trails**: Maintain security event logs
- **Data Minimization**: Only log necessary information

## Maintenance

### 1. Log Rotation

```bash
# Manual log rotation
mv logs/combined.log logs/combined.log.1
touch logs/combined.log

# Compress old logs
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;

# Clean up old logs
find logs/ -name "*.log.gz" -mtime +30 -delete
```

### 2. Log Analysis

```bash
# Generate log summary
./scripts/analyze-logs.sh

# Check error patterns
./scripts/check-error-patterns.sh

# Performance analysis
./scripts/analyze-performance.sh
```

### 3. System Health

```bash
# Check logger health
curl http://localhost:5000/api/v1/monitoring/health

# Check log file integrity
ls -la logs/

# Monitor disk usage
df -h | grep logs
```

## Integration Examples

### 1. Database Operations

```typescript
// Log database operations
const startTime = Date.now();
try {
  const result = await query('SELECT * FROM bookings WHERE tenant_id = $1', [tenantId]);
  const duration = Date.now() - startTime;

  logPerformance('database_query', duration, {
    query: 'SELECT * FROM bookings',
    tenantId,
    rowCount: result.rows.length
  });

  return result;
} catch (error) {
  sentryService.captureException(error, {
    query: 'SELECT * FROM bookings',
    tenantId
  });
  throw error;
}
```

### 2. External API Calls

```typescript
// Log external API calls
const startTime = Date.now();
try {
  const response = await axios.post('https://api.payment-gateway.com/charge', paymentData);
  const duration = Date.now() - startTime;

  logPerformance('external_api', duration, {
    service: 'payment_gateway',
    endpoint: '/charge',
    status: response.status
  });

  return response.data;
} catch (error) {
  sentryService.captureException(error, {
    service: 'payment_gateway',
    operation: 'charge'
  });
  throw error;
}
```

## Related Documentation

- [Monitoring Guide](UPTIMEROBOT_SETUP.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Security Guide](SECURITY.md)
- [Performance Guide](PERFORMANCE.md)