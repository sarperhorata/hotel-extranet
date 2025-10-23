# Integration Testing Guide

## Overview

This guide covers comprehensive integration testing for the Hotel Extranet system, including external service integrations, API connections, and end-to-end workflows.

## Prerequisites

- Backend and frontend applications running
- All external services configured
- Test database and Redis instances
- Required API keys and credentials

## Test Categories

### 1. Backend Integration Tests

#### Database Integration
- Connection testing
- Query performance
- Transaction handling
- Migration testing

#### Redis Integration
- Cache operations
- Session management
- Rate limiting
- Pub/Sub functionality

#### API Integration
- Endpoint availability
- Response validation
- Error handling
- Authentication flow

### 2. External Service Tests

#### Email Service (Resend)
- Email sending
- Template rendering
- Delivery confirmation
- Error handling

#### File Storage (AWS S3/Cloudinary)
- File upload
- Image optimization
- Thumbnail generation
- File deletion

#### Payment Gateways
- Payment processing
- Refund handling
- Webhook processing
- Error scenarios

#### VCC Providers
- VCC generation
- Balance management
- Auto-closure
- Usage tracking

#### Channel Managers
- Connection testing
- Inventory sync
- Booking sync
- Rate updates

### 3. Frontend Integration Tests

#### User Interface
- Component rendering
- Form validation
- Navigation flow
- Responsive design

#### API Communication
- Data fetching
- Error handling
- Loading states
- Caching

### 4. End-to-End Tests

#### Complete Workflows
- User registration/login
- Property management
- Booking creation
- Payment processing
- Email notifications

#### Cross-Platform Testing
- Desktop browsers
- Mobile devices
- Tablet devices
- Different screen sizes

## Running Tests

### 1. Automated Test Script

```bash
# Run all integration tests
./scripts/test-integrations.sh

# Run with custom URLs
./scripts/test-integrations.sh --backend-url https://api.example.com --frontend-url https://app.example.com

# Run with custom timeout
./scripts/test-integrations.sh --timeout 60
```

### 2. Individual Test Categories

#### Backend Tests
```bash
cd app/backend
npm run test:integration
```

#### Frontend Tests
```bash
cd app/frontend
npm run test:e2e
```

#### E2E Tests
```bash
cd app/backend
npm run test:e2e
```

### 3. Manual Testing

#### API Testing with curl
```bash
# Health check
curl -X GET http://localhost:5000/api/v1/monitoring/health

# Authentication
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Property creation
curl -X POST http://localhost:5000/api/v1/properties \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Hotel","address":"123 Test St"}'
```

#### Frontend Testing
```bash
# Open browser and navigate to
http://localhost:3000

# Test login flow
# Test property management
# Test booking creation
# Test search functionality
```

## Test Data Setup

### 1. Database Seeding

```bash
# Seed test data
cd app/backend
npm run seed

# Or run specific seeders
npm run seed:tenants
npm run seed:users
npm run seed:properties
```

### 2. Test User Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@example.com | password123 | Full access |
| Hotel Manager | manager@example.com | password123 | Property management |
| Staff | staff@example.com | password123 | Limited access |

### 3. Test Properties

```json
{
  "name": "Test Hotel",
  "address": "123 Test Street",
  "city": "Test City",
  "country": "Test Country",
  "description": "A beautiful test hotel",
  "rooms": [
    {
      "roomNumber": "101",
      "roomType": "Standard",
      "maxOccupancy": 2,
      "baseRate": 100
    }
  ]
}
```

## Test Scenarios

### 1. Authentication Flow

#### Successful Login
1. Navigate to login page
2. Enter valid credentials
3. Verify redirect to dashboard
4. Check user session

#### Failed Login
1. Enter invalid credentials
2. Verify error message
3. Check no session created

#### Logout
1. Click logout button
2. Verify redirect to login
3. Check session cleared

### 2. Property Management

#### Create Property
1. Navigate to properties page
2. Click "Add Property"
3. Fill property form
4. Submit form
5. Verify property created

#### Edit Property
1. Click edit button
2. Modify property details
3. Save changes
4. Verify updates

#### Delete Property
1. Click delete button
2. Confirm deletion
3. Verify property removed

### 3. Booking Management

#### Create Booking
1. Navigate to bookings
2. Click "Add Booking"
3. Fill booking form
4. Submit booking
5. Verify booking created

#### Search Bookings
1. Use search functionality
2. Filter by date/guest
3. Verify results

#### Update Booking
1. Click edit booking
2. Modify details
3. Save changes
4. Verify updates

### 4. Search and Booking Flow

#### Guest Search
1. Navigate to search page
2. Enter search criteria
3. Submit search
4. Verify results

#### Property Selection
1. Click on property
2. View property details
3. Check availability
4. Select dates

#### Booking Process
1. Click "Book Now"
2. Fill guest information
3. Process payment
4. Confirm booking

### 5. Payment Processing

#### Payment Success
1. Enter valid payment details
2. Process payment
3. Verify transaction
4. Check confirmation

#### Payment Failure
1. Enter invalid details
2. Attempt payment
3. Verify error handling
4. Check retry options

### 6. Email Notifications

#### Booking Confirmation
1. Complete booking
2. Verify email sent
3. Check email content
4. Test email delivery

#### Password Reset
1. Request password reset
2. Check email received
3. Follow reset link
4. Set new password

## Performance Testing

### 1. Load Testing

```bash
# Test API endpoints
ab -n 1000 -c 10 http://localhost:5000/api/v1/monitoring/health

# Test database queries
npm run test:performance

# Test file uploads
npm run test:upload-performance
```

### 2. Response Time Testing

```bash
# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/v1/monitoring/health

# Test database queries
npm run test:db-performance

# Test Redis operations
npm run test:redis-performance
```

### 3. Memory Usage Testing

```bash
# Monitor memory usage
npm run test:memory

# Test memory leaks
npm run test:memory-leaks

# Test garbage collection
npm run test:gc
```

## Security Testing

### 1. Authentication Testing

```bash
# Test JWT tokens
npm run test:jwt

# Test password hashing
npm run test:password

# Test session management
npm run test:sessions
```

### 2. Authorization Testing

```bash
# Test role-based access
npm run test:rbac

# Test API permissions
npm run test:permissions

# Test data isolation
npm run test:isolation
```

### 3. Input Validation Testing

```bash
# Test SQL injection
npm run test:sql-injection

# Test XSS prevention
npm run test:xss

# Test CSRF protection
npm run test:csrf
```

## Error Handling Testing

### 1. Network Errors

```bash
# Test network failures
npm run test:network-errors

# Test timeout handling
npm run test:timeouts

# Test retry mechanisms
npm run test:retries
```

### 2. Database Errors

```bash
# Test connection failures
npm run test:db-errors

# Test query failures
npm run test:query-errors

# Test transaction rollbacks
npm run test:transactions
```

### 3. External Service Errors

```bash
# Test email service failures
npm run test:email-errors

# Test payment gateway errors
npm run test:payment-errors

# Test file storage errors
npm run test:storage-errors
```

## Monitoring and Logging

### 1. Test Monitoring

```bash
# Check health endpoints
curl http://localhost:5000/api/v1/monitoring/health

# Check metrics
curl http://localhost:5000/api/v1/monitoring/metrics

# Check logs
npm run logs:test
```

### 2. Performance Monitoring

```bash
# Check response times
npm run monitor:response-times

# Check memory usage
npm run monitor:memory

# Check database performance
npm run monitor:db
```

### 3. Error Monitoring

```bash
# Check error rates
npm run monitor:errors

# Check failed requests
npm run monitor:failures

# Check external service status
npm run monitor:external
```

## Test Reports

### 1. Generate Reports

```bash
# Generate test report
npm run test:report

# Generate coverage report
npm run test:coverage

# Generate performance report
npm run test:performance-report
```

### 2. View Reports

```bash
# Open test report
open test-results/report.html

# Open coverage report
open coverage/index.html

# Open performance report
open performance-results/report.html
```

## Continuous Integration

### 1. GitHub Actions

```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run integration tests
        run: npm run test:integration
      - name: Run E2E tests
        run: npm run test:e2e
```

### 2. Test Automation

```bash
# Run tests on schedule
0 2 * * * /path/to/test-integrations.sh

# Run tests on deployment
npm run deploy:test

# Run tests on code changes
npm run test:watch
```

## Troubleshooting

### Common Issues

#### 1. Test Failures

```bash
# Check test logs
npm run test:debug

# Check database connection
npm run db:test

# Check Redis connection
npm run redis:test
```

#### 2. External Service Issues

```bash
# Check email service
npm run test:email

# Check payment gateway
npm run test:payment

# Check file storage
npm run test:storage
```

#### 3. Performance Issues

```bash
# Check response times
npm run test:performance

# Check memory usage
npm run test:memory

# Check database queries
npm run test:db-performance
```

### Debug Commands

```bash
# Enable debug logging
DEBUG=* npm run test:integration

# Run specific test
npm run test:integration -- --grep "authentication"

# Run tests with verbose output
npm run test:integration -- --verbose

# Run tests with coverage
npm run test:integration -- --coverage
```

## Best Practices

### 1. Test Organization

- Group related tests together
- Use descriptive test names
- Keep tests independent
- Clean up test data

### 2. Test Data Management

- Use fixtures for test data
- Clean up after tests
- Use realistic data
- Avoid hardcoded values

### 3. Error Handling

- Test error scenarios
- Verify error messages
- Check error logging
- Test recovery mechanisms

### 4. Performance

- Monitor test execution time
- Use appropriate timeouts
- Test under load
- Monitor resource usage

## Support

For integration testing issues:

1. Check test logs
2. Verify service configurations
3. Test individual components
4. Check external service status
5. Review test documentation

## Related Documentation

- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Monitoring Guide](UPTIMEROBOT_SETUP.md)
- [Security Guide](SECURITY.md)
