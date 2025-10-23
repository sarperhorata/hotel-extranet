# Hotel Extranet System

A comprehensive SaaS hotel management platform with search and booking engine, designed for hotels to manage their inventory, rates, and bookings while providing customers with a seamless booking experience.

## 🚀 Features

### Core Features
- **Multi-tenant Architecture**: Support for multiple hotels with complete data isolation
- **Property Management**: Comprehensive hotel and room management system
- **Booking Engine**: Advanced search and booking functionality
- **Rate Management**: Dynamic and static pricing with seasonal rates
- **Channel Manager Integration**: Sync with external booking platforms (SiteMinder, HotelRunner, etc.)
- **Payment Processing**: Secure payment handling with VCC support
- **Email Notifications**: Automated booking confirmations and notifications

### Advanced Features
- **Real-time Inventory**: Live availability tracking and updates
- **Performance Monitoring**: Comprehensive system health monitoring
- **Security First**: Enterprise-grade security with audit logging
- **Scalable Architecture**: Microservices design for horizontal scaling
- **API-First Design**: RESTful APIs with comprehensive documentation
- **Mobile Responsive**: Optimized for all device types

## 🏗️ Architecture

### Technology Stack

#### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: PostgreSQL with advanced indexing and partitioning
- **Cache**: Redis for high-performance caching
- **Authentication**: JWT with refresh token rotation
- **File Storage**: AWS S3 + Cloudinary for media management
- **Email**: Resend for transactional emails
- **Monitoring**: Winston + Sentry for logging and error tracking

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with responsive design
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **Forms**: React Hook Form with validation
- **UI Components**: CoreUI admin template

#### DevOps & Infrastructure
- **Deployment**: Render (backend), Netlify/Vercel (frontend)
- **Containerization**: Docker with multi-stage builds
- **Monitoring**: UptimeRobot for uptime monitoring
- **CDN**: Cloudflare for global content delivery
- **Security**: SSL/TLS with Let's Encrypt certificates

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm 8+
- PostgreSQL 14+
- Redis 6+
- Git

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/your-username/hotel-extranet.git
cd hotel-extranet
```

2. **Install dependencies**
```bash
# Backend dependencies
cd app/backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

3. **Environment setup**
```bash
# Copy environment templates
cp app/backend/.env.example app/backend/.env
cp app/frontend/.env.example app/frontend/.env

# Configure your environment variables
# See Environment Setup section below
```

4. **Database setup**
```bash
# Run database migrations
cd app/backend
npm run migrate

# Seed initial data (optional)
npm run seed
```

5. **Start development servers**
```bash
# Start backend (Terminal 1)
npm run dev

# Start frontend (Terminal 2)
cd ../frontend && npm run dev
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

## 🔧 Environment Setup

### Backend Configuration

Create `.env` file in `app/backend/`:

```bash
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/hotel_extranet
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_extranet
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Authentication
JWT_SECRET=your-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-minimum-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Hotel Extranet

# File Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your-redis-password

# Monitoring
UPTIMEROBOT_API_KEY=your-uptimerobot-key
SENTRY_DSN=your-sentry-dsn

# Payment Gateways
STRIPE_SECRET_KEY=your-stripe-secret-key
PAYPAL_CLIENT_ID=your-paypal-client-id
ADYEN_API_KEY=your-adyen-api-key

# VCC Providers
MARQETA_API_KEY=your-marqeta-api-key
MARQETA_API_SECRET=your-marqeta-api-secret

# Channel Managers
SITEMINDER_API_KEY=your-siteminder-key
HOTELRUNNER_API_KEY=your-hotelrunner-key

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

### Frontend Configuration

Create `.env` file in `app/frontend/`:

```bash
# API Configuration
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Hotel Extranet
VITE_APP_VERSION=1.0.0

# Environment
NODE_ENV=development
```

## 🚀 Deployment

### Production Deployment

#### Backend (Render)
```bash
# Deploy to Render
./scripts/deploy-backend.sh render production
```

#### Frontend (Netlify)
```bash
# Deploy to Netlify
./scripts/deploy-frontend.sh netlify production
```

#### Domain & SSL
```bash
# Setup custom domain and SSL
# Follow instructions in docs/DOMAIN_SSL_SETUP.md
```

### Development Deployment

#### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Manual Deployment
```bash
# Backend
cd app/backend
npm run build
npm start

# Frontend
cd app/frontend
npm run build
npm run preview
```

## 📚 Documentation

### System Documentation
- [API Documentation](docs/API.md) - Complete API reference
- [Database Schema](docs/DATABASE.md) - Database design and relationships
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [Security Guide](docs/SECURITY.md) - Security implementation details
- [Performance Guide](docs/PERFORMANCE.md) - Performance optimization strategies
- [Logging Guide](docs/LOGGING_SYSTEM.md) - Logging and error tracking
- [Backup Strategy](docs/BACKUP_STRATEGY.md) - Backup and disaster recovery
- [Integration Testing](docs/INTEGRATION_TESTING.md) - Testing external integrations
- [Domain & SSL Setup](docs/DOMAIN_SSL_SETUP.md) - Custom domain configuration
- [UptimeRobot Setup](docs/UPTIMEROBOT_SETUP.md) - Monitoring service setup

### API Documentation
- **Swagger UI**: http://localhost:5000/api-docs
- **OpenAPI Spec**: Available at `/api-docs.json`

## 🧪 Testing

### Run All Tests
```bash
# Backend tests
cd app/backend
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Frontend tests
cd ../frontend
npm test
```

### Test Coverage
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

### Performance Testing
```bash
# Load testing
./scripts/test-integrations.sh

# Performance monitoring
curl http://localhost:5000/api/v1/performance/dashboard
```

## 🔒 Security

### Security Features
- **JWT Authentication** with refresh token rotation
- **Rate Limiting** with Redis backend
- **Input Validation** and sanitization
- **SQL Injection Protection**
- **XSS Prevention**
- **CORS Configuration**
- **Security Headers** (Helmet.js)
- **Audit Logging** for all security events
- **Data Encryption** at rest and in transit

### Security Monitoring
- **Real-time Alerts** for suspicious activities
- **Failed Login Tracking**
- **Brute Force Protection**
- **IP Whitelisting/Blacklisting**
- **Security Event Correlation**

## 📊 Monitoring

### System Health
- **Uptime Monitoring**: UptimeRobot integration
- **Performance Metrics**: Response times, throughput, error rates
- **Resource Usage**: CPU, memory, disk utilization
- **Database Health**: Connection pools, query performance

### Error Tracking
- **Sentry Integration**: Error aggregation and tracking
- **Performance Monitoring**: Slow query detection
- **Custom Alerts**: Configurable notification rules
- **Error Correlation**: User impact analysis

### Dashboards
- **System Health**: /api/v1/monitoring/health
- **Performance Metrics**: /api/v1/performance/metrics
- **Security Events**: /api/v1/monitoring/audit
- **Database Stats**: /api/v1/performance/database

## 🔧 Development

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks
- **Commitlint**: Conventional commit messages

### Development Tools
```bash
# Code formatting
npm run lint:fix

# Type checking
npm run type-check

# Build check
npm run build

# Development server
npm run dev

# Watch mode
npm run dev:watch
```

### Database Development
```bash
# Create migration
npm run migrate:create migration_name

# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback

# Seed database
npm run seed

# Reset database (development only)
npm run db:reset
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
npm run db:check

# View database logs
npm run db:logs

# Reset database (development)
npm run db:reset
```

#### Redis Connection Issues
```bash
# Check Redis connectivity
redis-cli ping

# View Redis logs
redis-cli monitor

# Clear Redis cache
redis-cli flushall
```

#### Performance Issues
```bash
# Check system metrics
curl http://localhost:5000/api/v1/performance/system

# View slow queries
curl http://localhost:5000/api/v1/performance/slow-queries

# Check database performance
curl http://localhost:5000/api/v1/performance/database
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# View all logs
npm run logs

# Check application health
curl http://localhost:5000/health
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Standards
- **TypeScript**: All code must be typed
- **Testing**: 80%+ test coverage required
- **Documentation**: Update docs for new features
- **Security**: Security review for sensitive changes
- **Performance**: Performance impact assessment

### Pull Request Process
1. Update README.md if needed
2. Add tests for new features
3. Update API documentation
4. Ensure CI/CD passes
5. Request code review

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check the docs/ directory
- **Issues**: Use GitHub Issues for bugs and features
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@hotel-extranet.com

### Emergency Contacts
- **Security Issues**: security@hotel-extranet.com
- **Production Issues**: ops@hotel-extranet.com
- **Business Inquiries**: business@hotel-extranet.com

## 🔄 Changelog

### Version 1.0.0 (Current)
- Initial release with core functionality
- Multi-tenant architecture
- Comprehensive API documentation
- Production-ready deployment
- Security hardening
- Performance optimization

### Upcoming Features
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] AI-powered pricing optimization
- [ ] Multi-language support
- [ ] Advanced reporting features

## 🙏 Acknowledgments

- **CoreUI** for the admin template
- **Express.js** team for the web framework
- **PostgreSQL** team for the database
- **Redis** team for the caching solution
- **Winston** team for the logging framework
- **Sentry** team for error tracking
- **Resend** team for email services

---

**Hotel Extranet System** - A modern, scalable hotel management platform built with cutting-edge technologies and best practices.