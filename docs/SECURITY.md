# Security Implementation Guide

## Overview

This comprehensive security guide covers all security measures implemented in the Hotel Extranet system, including authentication, authorization, input validation, rate limiting, and monitoring.

## Security Architecture

### 1. Authentication & Authorization

#### JWT Authentication
- **Token Type**: JSON Web Tokens (JWT)
- **Algorithm**: RS256 (asymmetric encryption)
- **Expiration**: 15 minutes (access token), 7 days (refresh token)
- **Security**: HTTPS only, secure cookie storage

#### Role-Based Access Control (RBAC)
- **Admin**: Full system access, user management, system configuration
- **Hotel Manager**: Property and booking management, reports
- **Staff**: Limited access to assigned properties
- **Guest**: Public access for search and booking

#### Multi-Tenancy Security
- **Tenant Isolation**: Complete data separation between tenants
- **Tenant Middleware**: Automatic tenant context injection
- **Cross-Tenant Protection**: Prevents data leakage between tenants

### 2. Input Validation & Sanitization

#### Request Validation
```typescript
// Email validation
body('email').isEmail().normalizeEmail().customSanitizer(sanitizeInput);

// Password validation
body('password')
  .isLength({ min: 8, max: 128 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/);

// UUID validation
param('id').isUUID();

// Custom sanitization
const sanitizeInput = (input: string) => {
  return input.trim().replace(/<[^>]*>/g, '').slice(0, 1000);
};
```

#### SQL Injection Protection
```typescript
// SQL injection detection middleware
export const sqlInjectionDetection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(;)|(\|\|)/g
  ];

  // Check for malicious patterns
  const suspiciousContent = [req.body, req.query, req.params].some(checkValue);
  if (suspiciousContent) {
    logger.warn('Potential SQL injection attempt', { ip: req.ip });
    return res.status(400).json({ message: 'Invalid request data' });
  }
  next();
};
```

#### XSS Protection
```typescript
// XSS detection middleware
export const xssDetection = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  // Check for malicious scripts
  const suspiciousContent = [req.body, req.query, req.params].some(checkValue);
  if (suspiciousContent) {
    logger.warn('Potential XSS attempt', { ip: req.ip });
    return res.status(400).json({ message: 'Invalid request data' });
  }
  next();
};
```

### 3. Rate Limiting

#### Multiple Rate Limiting Strategies

```typescript
// Authentication rate limiting (5 attempts per 15 minutes)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `auth:${getClientIP(req)}`
});

// API rate limiting (100 requests per 15 minutes)
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => `api:${req.tenantId}:${getClientIP(req)}`
});

// Payment rate limiting (3 attempts per minute)
export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: (req) => `payment:${req.tenantId}:${getClientIP(req)}`
});

// Admin rate limiting (50 requests per minute)
export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  skip: (req) => req.user?.role !== 'admin'
});
```

#### Distributed Rate Limiting
- **Redis Backend**: Distributed rate limiting across multiple servers
- **Sliding Window**: More accurate rate limiting
- **Burst Handling**: Allows temporary bursts while maintaining overall limits

### 4. Security Headers

#### Helmet Configuration
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

#### Security Headers
- **HSTS**: HTTP Strict Transport Security
- **CSP**: Content Security Policy
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Browser XSS filtering

### 5. Data Protection

#### Encryption at Rest
- **Database**: Encrypted database connections (SSL/TLS)
- **Backups**: AES-256 encrypted backup files
- **File Storage**: Server-side encryption for uploaded files

#### Encryption in Transit
- **HTTPS Only**: All communications encrypted with TLS 1.3
- **Certificate Pinning**: Prevents man-in-the-middle attacks
- **Perfect Forward Secrecy**: Each session uses unique keys

#### Sensitive Data Handling
```typescript
// Password hashing
const hashedPassword = await bcrypt.hash(password, 12);

// JWT token signing
const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

// Secure cookie storage
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000 // 15 minutes
});
```

## Security Monitoring

### 1. Audit Logging

```typescript
// Security event logging
logAudit('user_login', userId, {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  success: true,
  timestamp: new Date().toISOString()
});

logAudit('payment_processed', userId, {
  bookingId: booking.id,
  amount: booking.totalAmount,
  tenantId: req.tenantId
});
```

### 2. Security Event Detection

#### Failed Authentication Attempts
```typescript
// Track failed logins
if (loginAttempts > 5) {
  logSecurity('multiple_failed_logins', 'high', {
    userId: req.body.email,
    attempts: loginAttempts,
    ip: req.ip,
    timeWindow: '15m'
  });

  // Temporarily block IP
  await blockIP(req.ip, '15m');
}
```

#### Suspicious Activity Detection
```typescript
// Detect unusual patterns
if (requestsFromIP > 1000) { // More than 1000 requests per hour
  logSecurity('unusual_traffic', 'medium', {
    ip: req.ip,
    requestCount: requestsFromIP,
    timeWindow: '1h'
  });
}
```

### 3. Real-time Security Alerts

```typescript
// Critical security events
const criticalEvents = [
  'unauthorized_access_attempt',
  'payment_fraud_detected',
  'data_breach_attempt',
  'privilege_escalation'
];

if (criticalEvents.includes(eventType)) {
  // Send immediate alerts
  await sendSecurityAlert(eventType, severity, details);

  // Block malicious IP
  await blockIP(req.ip, '1h');
}
```

## Access Control

### 1. API Security

#### Authentication Middleware
```typescript
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, publicKey) as JwtPayload;

    // Verify token hasn't been revoked
    const isRevoked = await checkTokenRevocation(token);
    if (isRevoked) {
      return res.status(401).json({ message: 'Token revoked' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid token attempt', { ip: req.ip });
    return res.status(403).json({ message: 'Invalid token' });
  }
};
```

#### Authorization Middleware
```typescript
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: roles,
        url: req.originalUrl
      });

      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};
```

### 2. Tenant Isolation

```typescript
export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract tenant ID from JWT token or subdomain
  const tenantId = req.user?.tenantId || extractTenantFromSubdomain(req);

  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID required' });
  }

  // Verify tenant exists and is active
  const tenant = await getTenantById(tenantId);
  if (!tenant || !tenant.isActive) {
    return res.status(403).json({ message: 'Invalid or inactive tenant' });
  }

  req.tenantId = tenantId;
  next();
};
```

## File Upload Security

### 1. File Validation

```typescript
// File type validation
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// File size limits
const maxFileSize = 5 * 1024 * 1024; // 5MB

// Virus scanning (if available)
const scanResult = await virusScanner.scanFile(file.path);
if (!scanResult.clean) {
  throw new Error('File contains malware');
}
```

### 2. Secure File Storage

```typescript
// Generate secure filename
const secureFilename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${originalName}`;

// Store with restricted permissions
fs.writeFileSync(filePath, file.buffer);
fs.chmodSync(filePath, 0o644); // Read/write for owner, read for others

// Upload to secure cloud storage
await uploadToSecureStorage(filePath, secureFilename);
```

## Payment Security

### 1. PCI DSS Compliance

#### Data Protection
- **Tokenization**: Replace sensitive card data with tokens
- **Encryption**: Encrypt stored payment information
- **Access Control**: Limit access to payment data
- **Audit Trail**: Log all payment operations

#### Secure Payment Processing
```typescript
// Use payment gateway SDK
const paymentResult = await stripe.paymentIntents.create({
  amount: booking.totalAmount * 100, // Convert to cents
  currency: 'usd',
  payment_method: paymentMethodId,
  confirm: true,
  return_url: `${frontendUrl}/booking/${booking.id}/confirmation`
});
```

### 2. VCC Security

```typescript
// Generate secure VCC
const vcc = await vccProvider.generateVCC({
  tenantId: req.tenantId,
  bookingId: booking.id,
  amount: booking.totalAmount,
  currency: 'USD',
  expiryDays: 30,
  cardholderName: 'HOTEL BOOKING'
});

// Store VCC details securely
await storeVCCSecurely(vcc.cardId, {
  encryptedCardNumber: encrypt(vcc.cardNumber),
  encryptedCvv: encrypt(vcc.cvv),
  expiryMonth: vcc.expiryMonth,
  expiryYear: vcc.expiryYear
});
```

## Network Security

### 1. Firewall Configuration

```bash
# iptables rules for production server
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -s your-admin-ip -j ACCEPT
iptables -A INPUT -p tcp --dport 5432 -s your-db-server-ip -j ACCEPT
iptables -A INPUT -j DROP
```

### 2. DDoS Protection

```typescript
// Rate limiting for DDoS protection
export const ddosProtection = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute per IP
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: (req) => getClientIP(req)
});
```

### 3. Web Application Firewall (WAF)

#### ModSecurity Rules
```apache
# SQL injection protection
SecRule ARGS "@rx (union|select|insert|update|delete|drop|create|alter|exec|execute)" \
  "phase:2,block,msg:'SQL Injection Attempt'"

# XSS protection
SecRule ARGS "@rx <script[^>]*>.*?</script>" \
  "phase:2,block,msg:'XSS Attempt'"

# Path traversal protection
SecRule REQUEST_URI "@contains ../" \
  "phase:2,block,msg:'Path Traversal Attempt'"
```

## Security Testing

### 1. Automated Security Testing

```bash
# Run security tests
npm run test:security

# Check for vulnerabilities
npm audit

# Scan for secrets in code
npm run scan:secrets

# Test OWASP Top 10 vulnerabilities
npm run test:owasp
```

### 2. Penetration Testing

#### SQL Injection Testing
```bash
# Test SQL injection vulnerabilities
sqlmap -u "https://api.example.com/search?query=1" --batch --random-agent

# Test blind SQL injection
sqlmap -u "https://api.example.com/user/1" --technique=B --batch
```

#### XSS Testing
```bash
# Test reflected XSS
curl "https://api.example.com/search?q=<script>alert('xss')</script>"

# Test stored XSS
curl -X POST "https://api.example.com/properties" \
  -d "name=<script>alert('xss')</script>"
```

#### CSRF Testing
```bash
# Test CSRF protection
curl -X POST "https://api.example.com/booking" \
  -H "Content-Type: application/json" \
  -d '{"propertyId":"123","dates":"2024-01-01"}'
```

### 3. Security Scanning

#### Dependency Scanning
```bash
# Scan for vulnerable dependencies
npm audit --audit-level=moderate

# Check for security advisories
npx audit-ci --moderate

# Update vulnerable packages
npm audit fix
```

#### Container Security
```bash
# Scan Docker images
docker scan hotel-extranet-backend:latest

# Check for secrets in images
trivy image hotel-extranet-backend:latest

# Scan filesystem
trivy fs .
```

## Incident Response

### 1. Security Incident Response Plan

#### Detection Phase
1. **Monitoring**: Continuous monitoring for security events
2. **Alerting**: Automated alerts for suspicious activities
3. **Investigation**: Manual review of security logs

#### Containment Phase
1. **Isolation**: Isolate affected systems
2. **Evidence Preservation**: Preserve logs and evidence
3. **Communication**: Notify stakeholders

#### Recovery Phase
1. **System Restoration**: Restore from clean backups
2. **Security Updates**: Apply security patches
3. **Monitoring**: Enhanced monitoring post-incident

#### Lessons Learned
1. **Root Cause Analysis**: Identify incident cause
2. **Process Improvement**: Update security procedures
3. **Documentation**: Document incident and response

### 2. Emergency Contacts

| Role | Contact | Phone | Email |
|------|---------|-------|-------|
| Security Lead | John Doe | +1-555-0101 | security@hotel-extranet.com |
| System Admin | Jane Smith | +1-555-0102 | admin@hotel-extranet.com |
| Legal | Legal Team | +1-555-0103 | legal@hotel-extranet.com |
| PR | PR Team | +1-555-0104 | pr@hotel-extranet.com |

### 3. Incident Response Tools

#### Log Analysis
```bash
# Search for suspicious activity
grep "failed login" logs/security.log

# Check for brute force attacks
grep "multiple attempts" logs/security.log

# Monitor for data exfiltration
grep "large download" logs/access.log
```

#### Network Monitoring
```bash
# Check for unusual traffic
tcpdump -i eth0 -s 0 -w suspicious.pcap

# Monitor connections
netstat -an | grep LISTEN

# Check firewall logs
tail -f /var/log/firewall.log
```

## Compliance

### 1. GDPR Compliance

#### Data Protection
- **Consent Management**: Explicit consent for data collection
- **Data Minimization**: Collect only necessary data
- **Right to Access**: Users can access their data
- **Right to Deletion**: Users can delete their data

#### Privacy by Design
- **Data Protection Impact Assessment**: DPIA for new features
- **Privacy Notices**: Clear privacy policy
- **Data Breach Notification**: 72-hour notification requirement

### 2. PCI DSS Compliance

#### Payment Card Security
- **Cardholder Data Protection**: Encrypt stored card data
- **Secure Network**: Firewalls and network segmentation
- **Vulnerability Management**: Regular security testing
- **Access Control**: Limit access to cardholder data

### 3. Security Standards

#### OWASP Top 10
1. **Injection**: SQL injection protection ✅
2. **Broken Authentication**: Secure authentication ✅
3. **Sensitive Data Exposure**: Data encryption ✅
4. **XML External Entities**: Input validation ✅
5. **Broken Access Control**: RBAC implementation ✅
6. **Security Misconfiguration**: Secure defaults ✅
7. **Cross-Site Scripting**: XSS protection ✅
8. **Insecure Deserialization**: Input validation ✅
9. **Vulnerable Components**: Dependency scanning ✅
10. **Insufficient Logging**: Comprehensive logging ✅

## Security Best Practices

### 1. Development Security

#### Secure Coding
- **Input Validation**: Validate all inputs
- **Output Encoding**: Encode outputs to prevent XSS
- **Error Handling**: Don't expose sensitive information in errors
- **Session Management**: Secure session handling

#### Code Review
- **Security Review**: All code reviewed for security issues
- **Automated Scanning**: SAST and DAST tools
- **Dependency Management**: Regular vulnerability scanning

### 2. Infrastructure Security

#### Server Hardening
- **Minimal Installation**: Only necessary packages
- **Regular Updates**: Automated security updates
- **Firewall Configuration**: Restrictive firewall rules
- **SELinux/AppArmor**: Mandatory access control

#### Container Security
- **Minimal Base Images**: Use minimal base images
- **Non-root User**: Run containers as non-root
- **Resource Limits**: CPU and memory limits
- **Image Scanning**: Regular vulnerability scanning

### 3. Data Security

#### Database Security
- **Encryption at Rest**: Database encryption
- **Connection Encryption**: SSL/TLS connections
- **Access Control**: Principle of least privilege
- **Audit Logging**: All database operations logged

#### Backup Security
- **Encrypted Backups**: AES-256 encryption
- **Secure Storage**: Protected backup storage
- **Retention Policy**: Automated cleanup
- **Access Logging**: Track backup access

## Security Monitoring Dashboard

### 1. Key Security Metrics

- **Failed Login Attempts**: Track authentication failures
- **Suspicious Activity**: Monitor for unusual patterns
- **Data Access**: Track sensitive data access
- **System Vulnerabilities**: Monitor for security issues

### 2. Real-time Alerts

```typescript
// Critical security events
const criticalEvents = [
  'unauthorized_access',
  'data_breach_attempt',
  'privilege_escalation',
  'malware_detected'
];

if (criticalEvents.includes(event)) {
  await sendImmediateAlert(event, severity, details);
}
```

### 3. Security Reports

```bash
# Generate security report
./scripts/generate-security-report.sh

# Check compliance status
./scripts/check-compliance.sh

# Monitor security metrics
./scripts/monitor-security-metrics.sh
```

## Emergency Procedures

### 1. Security Breach Response

#### Immediate Actions
1. **Contain the Breach**: Isolate affected systems
2. **Preserve Evidence**: Don't modify affected systems
3. **Notify Stakeholders**: Inform management and legal
4. **Document Everything**: Maintain detailed incident log

#### Investigation Steps
1. **Determine Scope**: Identify affected systems and data
2. **Root Cause Analysis**: Identify how breach occurred
3. **Impact Assessment**: Assess data and system impact
4. **Recovery Planning**: Plan system restoration

### 2. Data Breach Notification

#### Required Notifications (72 hours)
- **GDPR**: Supervisory authority notification
- **Affected Users**: Notify users if data compromised
- **Payment Providers**: Notify if payment data affected
- **Insurance**: Notify cyber insurance provider

#### Notification Template
```typescript
const breachNotification = {
  incidentDate: new Date(),
  discoveryDate: new Date(),
  affectedUsers: userCount,
  dataTypes: ['email', 'payment_info'],
  actions: [
    'Reset passwords',
    'Monitor accounts',
    'Contact support if suspicious activity'
  ],
  supportContact: 'security@hotel-extranet.com'
};
```

## Security Checklist

### Pre-Deployment
- [ ] Security testing completed
- [ ] Vulnerability scanning performed
- [ ] Dependencies updated
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Authentication secure
- [ ] Authorization tested
- [ ] Encryption enabled
- [ ] Monitoring configured

### Post-Deployment
- [ ] Security monitoring active
- [ ] Alerting configured
- [ ] Backup testing completed
- [ ] Incident response plan ready
- [ ] Security documentation updated
- [ ] Team training completed

## Support

For security-related issues:

1. **Security Team**: security@hotel-extranet.com
2. **Emergency**: +1-555-SECURITY
3. **Incident Response**: Follow documented procedures
4. **Vulnerability Reporting**: Use secure reporting channel

## Related Documentation

- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Logging Guide](LOGGING_SYSTEM.md)
- [Backup Strategy](BACKUP_STRATEGY.md)
