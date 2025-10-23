# Hotel Extranet Deployment Guide

## Overview

This guide covers the complete deployment process for the Hotel Extranet system, including backend and frontend deployments to various platforms.

## Prerequisites

### Required Tools

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm 8+** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **Docker** (optional) - [Download](https://www.docker.com/)

### Platform-Specific Tools

#### Render
- **Render CLI** - `npm install -g @render/cli`
- **Render Account** - [Sign up](https://render.com/)

#### Railway
- **Railway CLI** - `npm install -g @railway/cli`
- **Railway Account** - [Sign up](https://railway.app/)

#### Heroku
- **Heroku CLI** - [Download](https://devcenter.heroku.com/articles/heroku-cli)
- **Heroku Account** - [Sign up](https://heroku.com/)

#### Netlify
- **Netlify CLI** - `npm install -g netlify-cli`
- **Netlify Account** - [Sign up](https://netlify.com/)

#### Vercel
- **Vercel CLI** - `npm install -g vercel`
- **Vercel Account** - [Sign up](https://vercel.com/)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/hotel-extranet.git
cd hotel-extranet
```

### 2. Install Dependencies

```bash
# Backend dependencies
cd app/backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Variables

Create environment files for each environment:

#### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://host:port/database

# Authentication
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Email
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com

# Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

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
```

#### Frontend (.env)

```bash
VITE_API_URL=https://your-backend-url.com/api/v1
VITE_APP_NAME=Hotel Extranet
VITE_APP_VERSION=1.0.0
```

## Backend Deployment

### Option 1: Render (Recommended)

#### 1. Prepare for Deployment

```bash
# Build the application
cd app/backend
npm run build

# Test the build
npm start
```

#### 2. Deploy to Render

```bash
# Login to Render
render auth login

# Create a new web service
render services create \
  --name hotel-extranet-backend \
  --type web \
  --env node \
  --build-command "npm install && npm run build" \
  --start-command "npm start" \
  --plan starter \
  --region oregon
```

#### 3. Configure Environment Variables

In the Render dashboard:
1. Go to your service
2. Navigate to Environment tab
3. Add all required environment variables

#### 4. Set Up Database

1. Create a PostgreSQL database in Render
2. Copy the database URL
3. Add it to your environment variables

#### 5. Run Migrations

```bash
# Connect to your Render service
render services shell hotel-extranet-backend

# Run migrations
npm run migrate
```

### Option 2: Railway

#### 1. Deploy to Railway

```bash
# Login to Railway
railway login

# Create a new project
railway project create hotel-extranet-backend

# Deploy
railway up
```

#### 2. Configure Environment Variables

```bash
# Set environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=your-database-url
railway variables set REDIS_URL=your-redis-url
# ... add all other variables
```

### Option 3: Heroku

#### 1. Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create a new app
heroku create hotel-extranet-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Add Redis addon
heroku addons:create heroku-redis:mini

# Deploy
git push heroku main
```

#### 2. Configure Environment Variables

```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=$(heroku config:get DATABASE_URL)
heroku config:set REDIS_URL=$(heroku config:get REDIS_URL)
# ... add all other variables
```

### Option 4: Docker

#### 1. Build Docker Image

```bash
cd app/backend
docker build -t hotel-extranet-backend .
```

#### 2. Run Docker Container

```bash
docker run -d \
  --name hotel-extranet-backend \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=your-database-url \
  -e REDIS_URL=your-redis-url \
  hotel-extranet-backend
```

## Frontend Deployment

### Option 1: Netlify (Recommended)

#### 1. Build Frontend

```bash
cd app/frontend
npm run build
```

#### 2. Deploy to Netlify

```bash
# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

#### 3. Configure Environment Variables

In Netlify dashboard:
1. Go to Site settings
2. Navigate to Environment variables
3. Add all required variables

### Option 2: Vercel

#### 1. Deploy to Vercel

```bash
cd app/frontend
vercel --prod
```

#### 2. Configure Environment Variables

```bash
vercel env add VITE_API_URL
vercel env add VITE_APP_NAME
# ... add all other variables
```

## Database Setup

### 1. Run Migrations

```bash
cd app/backend
npm run migrate
```

### 2. Seed Database (Optional)

```bash
npm run seed
```

### 3. Verify Database

```bash
# Check database connection
npm run db:check

# View database status
npm run db:status
```

## Monitoring Setup

### 1. UptimeRobot

1. Sign up at [UptimeRobot](https://uptimerobot.com)
2. Get your API key
3. Add it to your environment variables
4. Set up monitors for your endpoints

### 2. Sentry (Optional)

1. Sign up at [Sentry](https://sentry.io)
2. Create a new project
3. Get your DSN
4. Add it to your environment variables

## SSL/HTTPS Setup

### 1. Custom Domain

1. Purchase a domain
2. Configure DNS records
3. Set up SSL certificates

### 2. Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com
```

## Health Checks

### 1. Backend Health Check

```bash
curl https://your-backend-url.com/api/v1/monitoring/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "database": {"status": "up"},
    "redis": {"status": "up"},
    "email": {"status": "up"}
  }
}
```

### 2. Frontend Health Check

```bash
curl https://your-frontend-url.com
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database URL
echo $DATABASE_URL

# Test connection
npm run db:test
```

#### 2. Redis Connection Failed

```bash
# Check Redis URL
echo $REDIS_URL

# Test Redis connection
npm run redis:test
```

#### 3. Build Failures

```bash
# Clear cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 4. Environment Variables Not Loading

```bash
# Check if variables are set
env | grep NODE_ENV

# Verify .env file
cat .env
```

### Debug Commands

```bash
# Check application logs
npm run logs

# Check database status
npm run db:status

# Check Redis status
npm run redis:status

# Check all services
npm run health:check
```

## Performance Optimization

### 1. Database Optimization

```bash
# Run database optimization
npm run db:optimize

# Check slow queries
npm run db:slow-queries
```

### 2. Redis Optimization

```bash
# Check Redis memory usage
npm run redis:memory

# Optimize Redis configuration
npm run redis:optimize
```

### 3. Application Optimization

```bash
# Check application performance
npm run perf:check

# Generate performance report
npm run perf:report
```

## Security Checklist

- [ ] Environment variables are secure
- [ ] Database connections use SSL
- [ ] Redis connections are secure
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is in place
- [ ] Authentication is secure
- [ ] HTTPS is enabled
- [ ] Security headers are set
- [ ] Dependencies are up to date

## Backup Strategy

### 1. Database Backup

```bash
# Create backup
npm run db:backup

# Restore backup
npm run db:restore backup-file.sql
```

### 2. File Storage Backup

```bash
# Backup uploaded files
npm run storage:backup

# Restore files
npm run storage:restore
```

## Maintenance

### 1. Regular Updates

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### 2. Monitoring

```bash
# Check system health
npm run health:check

# View performance metrics
npm run perf:metrics

# Check error logs
npm run logs:errors
```

## Support

For deployment issues:

1. Check the logs: `npm run logs`
2. Verify environment variables
3. Test database connectivity
4. Check Redis connectivity
5. Review application configuration

## Related Documentation

- [API Documentation](API.md)
- [Environment Setup](ENVIRONMENT_SETUP.md)
- [Monitoring Guide](UPTIMEROBOT_SETUP.md)
- [Security Guide](SECURITY.md)
- [Performance Guide](PERFORMANCE.md)
