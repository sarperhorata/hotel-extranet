# CI/CD Pipeline Guide

## Overview

This comprehensive CI/CD pipeline ensures code quality, security, and automated deployment for the Hotel Extranet system using GitHub Actions and modern DevOps practices.

## Pipeline Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Code Quality  │───►│   Security      │───►│   Testing       │
│   & Linting     │    │   Scanning      │    │   (Unit/E2E)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Docker Build  │    │   Performance   │    │   Deployment    │
│   & Testing     │    │   Testing       │    │   (Staging)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Production    │    │   Monitoring    │    │   Rollback      │
│   Deployment    │    │   & Alerts      │    │   (If Needed)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Pipeline Stages

### 1. Code Quality & Security

#### ESLint & TypeScript Checking
```yaml
- name: Run ESLint
  run: |
    cd app/backend && npm run lint
    cd ../frontend && npm run lint

- name: Run TypeScript check
  run: |
    cd app/backend && npm run type-check
    cd ../frontend && npm run type-check
```

#### Security Scanning
```yaml
- name: Run security audit
  run: |
    cd app/backend && npm audit --audit-level=moderate
    cd ../frontend && npm audit --audit-level=moderate

- name: Scan for secrets
  uses: trufflesecurity/trufflehog@main
```

### 2. Testing Pipeline

#### Backend Testing
```yaml
- name: Run unit tests
  run: cd app/backend && npm test

- name: Run integration tests
  run: cd app/backend && npm run test:integration

- name: Generate test coverage
  run: cd app/backend && npm run test:coverage
```

#### Frontend Testing
```yaml
- name: Run unit tests
  run: cd app/frontend && npm test

- name: Build frontend
  run: cd app/frontend && npm run build
```

#### E2E Testing
```yaml
- name: Run E2E tests
  run: cd app/frontend && npm run test:e2e
```

### 3. Performance Testing

#### Load Testing
```bash
# Artillery load testing
artillery run --config load-test.yml --output test-results.json

# Quick load test
artillery quick --count 100 --num 10 http://localhost:5000/api/v1/monitoring/health
```

#### Performance Monitoring
```typescript
// Monitor API response times
const startTime = Date.now();
// ... API operation ...
const responseTime = Date.now() - startTime;

// Alert on slow responses
if (responseTime > 5000) {
  sentryService.captureMessage(`Slow response: ${responseTime}ms`, 'warning');
}
```

### 4. Docker Build & Test

#### Multi-stage Docker Build
```dockerfile
# Backend Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine as runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
RUN npm ci --only=production
EXPOSE 5000
CMD ["npm", "start"]
```

#### Docker Testing
```yaml
- name: Test Docker images
  run: |
    docker run --rm hotel-extranet-backend:test npm run test
    docker run --rm -e NODE_ENV=production hotel-extranet-frontend:test npm run build
```

### 5. Deployment Pipeline

#### Staging Deployment
```yaml
- name: Deploy to Staging
  if: github.ref == 'refs/heads/develop'
  environment: staging
  steps:
    - name: Deploy backend to Railway
      uses: railway/app@v1

    - name: Deploy frontend to Netlify
      uses: netlify/actions/cli@master
```

#### Production Deployment
```yaml
- name: Deploy to Production
  if: github.ref == 'refs/heads/main'
  environment: production
  steps:
    - name: Deploy backend to Render
      uses: render-oss/render-deploy-action@v1

    - name: Deploy frontend to Netlify
      uses: netlify/actions/cli@master

    - name: Setup monitoring
      run: |
        # Create UptimeRobot monitors
        curl -X POST https://api.uptimerobot.com/v2/newMonitor \
          -d "api_key=${{ secrets.UPTIMEROBOT_API_KEY }}&url=https://production-url.com"
```

## Automated Testing

### 1. Unit Tests

#### Backend Unit Tests
```typescript
describe('Authentication Service', () => {
  test('should hash password correctly', async () => {
    const hashedPassword = await hashPassword('test123');
    expect(hashedPassword).not.toBe('test123');
    expect(await verifyPassword('test123', hashedPassword)).toBe(true);
  });

  test('should generate valid JWT token', async () => {
    const token = await generateToken({ userId: '123', role: 'admin' });
    expect(token).toBeDefined();
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('123');
  });
});
```

#### Frontend Unit Tests
```typescript
describe('BookingForm Component', () => {
  test('should validate required fields', () => {
    const { getByText } = render(<BookingForm />);
    fireEvent.click(getByText('Submit'));

    expect(getByText('Guest name is required')).toBeInTheDocument();
  });

  test('should submit booking successfully', async () => {
    // Mock API call
    const mockSubmit = jest.fn().mockResolvedValue({ success: true });

    // Test form submission
    expect(mockSubmit).toHaveBeenCalledWith(expectedBookingData);
  });
});
```

### 2. Integration Tests

#### API Integration Tests
```typescript
describe('Booking API Integration', () => {
  test('should create booking and update inventory', async () => {
    // Create property and rooms
    const property = await createTestProperty();
    const room = await createTestRoom(property.id);

    // Create booking
    const bookingResponse = await request(app)
      .post('/api/v1/bookings')
      .send({
        propertyId: property.id,
        roomId: room.id,
        checkIn: '2024-01-15',
        checkOut: '2024-01-17'
      });

    expect(bookingResponse.status).toBe(201);

    // Verify inventory updated
    const inventory = await getInventory(room.id, '2024-01-15');
    expect(inventory.available).toBe(room.maxOccupancy - 1);
  });
});
```

### 3. E2E Tests

#### User Journey Tests
```typescript
describe('Complete Booking Journey', () => {
  test('should complete full booking process', async ({ page }) => {
    // Navigate to search page
    await page.goto('/search');

    // Fill search form
    await page.fill('input[name="destination"]', 'Test City');
    await page.fill('input[name="checkIn"]', '2024-01-15');
    await page.fill('input[name="checkOut"]', '2024-01-17');

    // Submit search and select property
    await page.click('button[type="submit"]');
    await page.click('div[data-testid="property-card"]:first-child');

    // Complete booking
    await page.click('text=Book Now');
    await page.fill('input[name="guestName"]', 'Test Guest');
    await page.fill('input[name="guestEmail"]', 'test@example.com');

    // Verify confirmation
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
  });
});
```

## Deployment Strategies

### 1. Blue-Green Deployment

#### Implementation
```yaml
# Blue-Green deployment strategy
- name: Deploy to blue environment
  if: github.ref == 'refs/heads/main'
  run: |
    # Deploy to blue environment
    ./scripts/deploy.sh blue

    # Run smoke tests
    ./scripts/smoke-test.sh blue

    # Switch traffic to blue
    ./scripts/switch-traffic.sh blue

    # Keep green as rollback option
```

#### Rollback Procedure
```bash
# Rollback to previous version
./scripts/switch-traffic.sh green
./scripts/verify-deployment.sh green
```

### 2. Canary Deployment

#### Implementation
```yaml
# Canary deployment strategy
- name: Deploy canary version
  run: |
    # Deploy 10% of traffic to new version
    ./scripts/deploy-canary.sh 10

    # Monitor for 15 minutes
    sleep 900

    # If successful, deploy 50%
    ./scripts/deploy-canary.sh 50

    # Monitor for another 15 minutes
    sleep 900

    # Full deployment
    ./scripts/deploy-canary.sh 100
```

### 3. Feature Flags

#### Implementation
```typescript
// Feature flag configuration
const featureFlags = {
  newBookingFlow: process.env.NEW_BOOKING_FLOW === 'true',
  advancedSearch: process.env.ADVANCED_SEARCH === 'true',
  paymentOptimization: process.env.PAYMENT_OPTIMIZATION === 'true'
};

// Conditional feature rendering
{featureFlags.newBookingFlow ? <NewBookingFlow /> : <LegacyBookingFlow />}
```

## Monitoring & Alerting

### 1. Deployment Monitoring

#### Health Checks
```bash
# Post-deployment health checks
curl -f https://production-url.com/api/v1/monitoring/health
curl -f https://production-url.com/api/v1/performance/system
curl -f https://production-url.com/api-docs
```

#### Performance Monitoring
```bash
# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://production-url.com/api/v1/monitoring/health

# Monitor error rates
curl -s https://production-url.com/api/v1/performance/metrics | jq '.report.operations.failed'
```

### 2. Automated Rollback

#### Rollback Triggers
```typescript
// Automatic rollback conditions
const rollbackConditions = {
  errorRate: errorRate > 10,                    // >10% error rate
  responseTime: avgResponseTime > 5000,         // >5s average response time
  memoryUsage: memoryUsage > 90,               // >90% memory usage
  databaseConnections: connections > maxConnections * 0.8 // >80% connection usage
};

if (rollbackConditions.errorRate || rollbackConditions.responseTime) {
  await triggerRollback();
}
```

### 3. Notification System

#### Deployment Notifications
```yaml
- name: Notify deployment
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '🚀 Deployment completed successfully!'
      })

- name: Slack notification
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-type: application/json' \
      -d '{"text": "🚀 Hotel Extranet deployed to production!"}'
```

## Quality Gates

### 1. Code Quality Gates

#### Pre-commit Hooks
```bash
# Husky configuration
npx husky install
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/pre-commit "npm run type-check"
npx husky add .husky/pre-commit "npm run test"
```

#### Pull Request Checks
```yaml
# Required checks for PR merge
name: Pull Request Quality Gate
on: pull_request

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run quality checks
        run: |
          npm run lint
          npm run type-check
          npm run test
          npm run build

      - name: Check test coverage
        run: |
          npm run test:coverage
          # Fail if coverage < 80%
          if [ $(cat coverage/coverage-summary.json | jq -r '.total.lines.pct') < "80" ]; then
            exit 1
          fi
```

### 2. Security Gates

#### Security Scanning
```yaml
- name: Security scan
  uses: securecodewarrior/github-action-sast@master
  with:
    scan-type: 'full'
    severity-threshold: 'medium'

- name: Dependency security check
  run: |
    npm audit --audit-level=high
    # Fail if high-severity vulnerabilities found
```

#### Secrets Detection
```yaml
- name: Secrets detection
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: main
    head: HEAD
    extra_args: --only-verified
```

### 3. Performance Gates

#### Performance Budgets
```typescript
// Performance budget enforcement
const performanceBudget = {
  maxBundleSize: 500 * 1024,     // 500KB
  maxInitialLoadTime: 3000,      // 3 seconds
  maxAPIResponseTime: 1000,      // 1 second
  maxImageSize: 200 * 1024       // 200KB
};

// Budget checking
if (bundleSize > performanceBudget.maxBundleSize) {
  throw new Error(`Bundle size exceeds budget: ${bundleSize} > ${performanceBudget.maxBundleSize}`);
}
```

## Environment Management

### 1. Environment Configuration

#### Environment Variables
```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://localhost:5432/hotel_extranet_dev

# Staging
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_URL=${{ secrets.STAGING_DATABASE_URL }}

# Production
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=${{ secrets.PRODUCTION_DATABASE_URL }}
```

#### Secret Management
```yaml
# GitHub Secrets configuration
- name: Configure secrets
  run: |
    echo "${{ secrets.PRODUCTION_DATABASE_URL }}" > .env.production
    echo "${{ secrets.STRIPE_SECRET_KEY }}" >> .env.production
    echo "${{ secrets.SENTRY_DSN }}" >> .env.production
```

### 2. Database Migrations

#### Migration Strategy
```bash
# Zero-downtime migrations
# 1. Create new migration
npm run migrate:create add_user_preferences

# 2. Deploy to staging first
./scripts/deploy.sh staging

# 3. Test migration on staging
npm run migrate

# 4. Deploy migration to production
./scripts/deploy.sh production

# 5. Rollback if issues
npm run migrate:rollback
```

#### Migration Testing
```yaml
- name: Test database migrations
  run: |
    # Test migration up
    npm run migrate
    # Verify database structure
    psql $DATABASE_URL -c "\dt" | grep -E "(users|properties|bookings)"

    # Test migration down
    npm run migrate:rollback
    # Verify rollback
    psql $DATABASE_URL -c "\dt" | wc -l | grep "^0$"
```

## Monitoring & Observability

### 1. Application Monitoring

#### Custom Metrics
```typescript
// Application-specific metrics
const metrics = {
  bookings: {
    created: counter('bookings_created_total'),
    cancelled: counter('bookings_cancelled_total'),
    completed: counter('bookings_completed_total')
  },
  payments: {
    successful: counter('payments_successful_total'),
    failed: counter('payments_failed_total'),
    refunded: counter('payments_refunded_total')
  },
  performance: {
    responseTime: histogram('http_request_duration_seconds'),
    databaseQueryTime: histogram('db_query_duration_seconds')
  }
};
```

#### Health Checks
```typescript
// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});

app.get('/readiness', async (req, res) => {
  // Check database connectivity
  const dbHealth = await checkDatabaseConnection();
  res.json({ ready: dbHealth });
});
```

### 2. Infrastructure Monitoring

#### Container Health
```dockerfile
# Health check for containers
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1
```

#### Kubernetes Health
```yaml
# Kubernetes liveness and readiness probes
livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /readiness
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Troubleshooting

### 1. Pipeline Failures

#### Build Failures
```bash
# Check build logs
./scripts/debug-build.sh

# Clear build cache
npm run clean
rm -rf node_modules package-lock.json
npm install

# Check for dependency issues
npm ls --depth=0
```

#### Test Failures
```bash
# Run tests in debug mode
npm run test:debug

# Check test environment
npm run test:env-check

# Run specific failing test
npm run test -- --testNamePattern="failing test name"
```

#### Deployment Failures
```bash
# Check deployment logs
./scripts/check-deployment.sh

# Verify environment variables
./scripts/verify-env.sh

# Test deployment health
./scripts/health-check.sh
```

### 2. Performance Issues

#### Slow Pipeline
```bash
# Check for bottlenecks
./scripts/analyze-pipeline.sh

# Optimize caching
./scripts/optimize-cache.sh

# Parallelize tests
npm run test:parallel
```

#### Resource Issues
```bash
# Monitor resource usage
./scripts/monitor-resources.sh

# Scale CI/CD resources
# Update GitHub Actions runner size
# Add more parallel jobs
```

## Best Practices

### 1. Pipeline Optimization

#### Parallel Execution
```yaml
# Run tests in parallel
strategy:
  matrix:
    node-version: [16, 18, 20]
    os: [ubuntu-latest, windows-latest, macos-latest]

# Parallel test execution
npm run test:parallel
```

#### Caching Strategy
```yaml
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      node_modules
      app/*/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### 2. Security in CI/CD

#### Secure Secrets
```yaml
# Use GitHub Secrets for sensitive data
env:
  DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}

# Mask secrets in logs
- name: Mask secrets
  run: |
    echo "::add-mask::${{ secrets.DATABASE_URL }}"
    echo "::add-mask::${{ secrets.STRIPE_SECRET_KEY }}"
```

#### Vulnerability Scanning
```yaml
- name: Run vulnerability scan
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

### 3. Quality Assurance

#### Code Coverage Requirements
```typescript
// Coverage thresholds
const coverageThresholds = {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80
};

// Fail build if coverage too low
if (coverage.lines.pct < coverageThresholds.lines) {
  throw new Error(`Line coverage ${coverage.lines.pct}% below threshold ${coverageThresholds.lines}%`);
}
```

#### Performance Budgets
```typescript
// Bundle size budget
const bundleBudget = {
  maxSize: 500 * 1024, // 500KB
  maxGzippedSize: 150 * 1024 // 150KB gzipped
};

// Lighthouse performance budget
const lighthouseBudget = {
  performance: 85,
  accessibility: 90,
  bestPractices: 90,
  seo: 85
};
```

## Emergency Procedures

### 1. Critical Bug Rollback

#### Immediate Rollback
```bash
# Emergency rollback script
./scripts/emergency-rollback.sh

# Manual rollback steps:
# 1. Switch traffic to previous version
# 2. Deploy previous commit
# 3. Verify rollback success
# 4. Investigate root cause
```

#### Post-Rollback Actions
```bash
# Analyze rollback cause
./scripts/analyze-incident.sh

# Generate incident report
./scripts/generate-report.sh

# Update monitoring thresholds
./scripts/update-alerts.sh
```

### 2. Security Incident Response

#### Immediate Actions
```bash
# Isolate affected systems
./scripts/isolate-systems.sh

# Preserve evidence
./scripts/preserve-evidence.sh

# Notify security team
./scripts/notify-security.sh
```

#### Investigation Steps
```bash
# Analyze security logs
./scripts/analyze-security-logs.sh

# Check for data breaches
./scripts/check-data-breach.sh

# Generate security report
./scripts/generate-security-report.sh
```

## Maintenance

### 1. Pipeline Maintenance

#### Regular Updates
```bash
# Update GitHub Actions
npx github-actions-updater

# Update Docker base images
./scripts/update-base-images.sh

# Update Node.js version
./scripts/update-node-version.sh
```

#### Performance Optimization
```bash
# Optimize pipeline performance
./scripts/optimize-pipeline.sh

# Clean up old artifacts
./scripts/cleanup-artifacts.sh

# Archive old logs
./scripts/archive-logs.sh
```

### 2. Dependency Management

#### Automated Updates
```yaml
# Dependabot configuration
- package-ecosystem: "npm"
  directory: "/app/backend"
  schedule:
    interval: "weekly"
  open-pull-requests-limit: 10
  reviewers: ["dev-team"]
```

#### Manual Updates
```bash
# Update specific dependency
npm update express

# Check for security updates
npm audit fix

# Update major versions carefully
npm install express@latest
npm test  # Ensure no breaking changes
```

## Support

For CI/CD related issues:

1. **Pipeline Issues**: Check GitHub Actions logs
2. **Deployment Issues**: Check deployment service dashboards
3. **Performance Issues**: Monitor performance dashboards
4. **Security Issues**: Follow security incident response procedures

## Related Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Testing Guide](INTEGRATION_TESTING.md)
- [Security Guide](SECURITY.md)
- [Performance Guide](PERFORMANCE.md)
- [Monitoring Guide](UPTIMEROBOT_SETUP.md)
