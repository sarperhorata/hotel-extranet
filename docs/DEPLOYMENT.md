# Deployment Guide

## Overview

This guide covers deploying the Hotel Extranet System to production using:

- **Backend:** Render.com (Node.js service with PostgreSQL)
- **Frontend:** Netlify (static site)
- **Monitoring:** UptimeRobot (keep-alive service)

## Prerequisites

### Required Services

1. **Render.com Account** - For backend deployment
2. **Netlify Account** - For frontend deployment
3. **PostgreSQL Database** - Can be hosted on Render, AWS RDS, or other providers
4. **Domain Name** (optional) - For custom domain setup

### Required Environment Variables

#### Backend (Render)
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com
```

#### Frontend (Netlify)
```bash
VITE_API_URL=https://your-backend-domain.com/api/v1
VITE_WS_URL=wss://your-backend-domain.com
```

## Backend Deployment (Render)

### Step 1: Prepare Repository

1. Ensure your code is in a Git repository (GitHub, GitLab, etc.)
2. Make sure all dependencies are in `package.json`
3. Create `render.yaml` configuration file

### Step 2: Create Render Service

1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your Git repository

2. **Configure Web Service**
   - **Name:** `hotel-extranet-backend`
   - **Runtime:** `Node.js`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

3. **Environment Variables**
   Add all required environment variables from the list above

4. **Database Setup**
   - Create a PostgreSQL database in Render
   - Copy the `DATABASE_URL` from the database service
   - Add it to your web service environment variables

### Step 3: Deploy

1. Click "Create Web Service"
2. Wait for the build to complete
3. Your backend will be available at `https://your-service-name.onrender.com`

## Frontend Deployment (Netlify)

### Step 1: Build Frontend

1. **Install Dependencies**
   ```bash
   cd app/frontend
   npm install
   npm run build
   ```

2. **Configure Environment**
   - Create `.env` file with production variables
   - Update `VITE_API_URL` to point to your Render backend

### Step 2: Deploy to Netlify

1. **Connect Repository**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository

2. **Build Settings**
   - **Base directory:** `app/frontend` (if using monorepo)
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18 or higher

3. **Environment Variables**
   Add `VITE_API_URL` pointing to your Render backend

4. **Deploy**
   - Click "Deploy site"
   - Wait for build completion

## Database Setup

### Option 1: Render PostgreSQL (Recommended)

1. In Render Dashboard, create a new PostgreSQL database
2. Copy the connection string
3. Run migrations after deployment:
   ```bash
   # Connect to your deployed backend
   curl https://your-backend-domain.com/api/v1/admin/migrate
   ```

### Option 2: External PostgreSQL

1. Create PostgreSQL database on your preferred provider
2. Update `DATABASE_URL` in Render environment variables
3. Run migrations (see above)

## Email Service (Resend)

1. **Create Resend Account**
   - Go to [Resend](https://resend.com)
   - Sign up and get your API key

2. **Domain Setup**
   - Add your domain to Resend
   - Verify domain ownership
   - Update `FROM_EMAIL` and `RESEND_API_KEY`

3. **Environment Variables**
   ```bash
   RESEND_API_KEY=re_your_resend_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ```

## Domain Configuration

### Custom Domain Setup

#### Backend (Render)
1. In Render Dashboard, go to your web service
2. Click "Custom Domains"
3. Add your domain/subdomain
4. Update DNS records as instructed

#### Frontend (Netlify)
1. In Netlify Dashboard, go to your site
2. Click "Domain settings"
3. Add custom domain
4. Update DNS records as instructed

## Monitoring & Health Checks

### UptimeRobot Setup

1. **Create Account**
   - Go to [UptimeRobot](https://uptimerobot.com)
   - Sign up for a free account

2. **Add Monitor**
   - Click "Add New Monitor"
   - **Monitor Type:** HTTP(s)
   - **URL:** `https://your-backend-domain.com/health`
   - **Monitoring Interval:** 5 minutes

3. **Alerts** (Optional)
   - Configure email/SMS notifications
   - Set up escalation policies

### Health Check Endpoint

The backend includes a health check endpoint:
- **URL:** `https://your-backend-domain.com/health`
- **Response:** `{"status": "healthy", "timestamp": "..."}`

## SSL/TLS Certificates

### Automatic (Render/Netlify)
Both Render and Netlify provide free SSL certificates:
- Render: Automatic for custom domains
- Netlify: Automatic for all sites

### Manual SSL (Optional)
For additional security or custom certificates:
- Use services like Let's Encrypt
- Configure in your hosting provider

## Production Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Email service configured
- [ ] Domain DNS configured
- [ ] SSL certificates active

### Post-Deployment
- [ ] Backend health check passes
- [ ] Frontend loads correctly
- [ ] Database connectivity verified
- [ ] Email notifications work
- [ ] WebSocket connections functional

### Monitoring
- [ ] UptimeRobot monitors configured
- [ ] Error logging active
- [ ] Performance monitoring setup
- [ ] Backup strategy implemented

## Troubleshooting

### Common Issues

#### Backend Issues
1. **Database Connection Failed**
   - Verify `DATABASE_URL` format
   - Check database credentials
   - Ensure database is accessible

2. **Environment Variables Not Loading**
   - Check variable names match exactly
   - Ensure no extra spaces
   - Verify values are correct

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies installed
   - Check for TypeScript errors

#### Frontend Issues
1. **API Connection Failed**
   - Verify `VITE_API_URL` points to correct backend
   - Check CORS configuration
   - Ensure backend is running

2. **Build Failures**
   - Check Node.js version
   - Verify all dependencies installed
   - Check for environment variable issues

#### Email Issues
1. **Emails Not Sending**
   - Verify Resend API key
   - Check domain verification in Resend
   - Ensure `FROM_EMAIL` is authorized

## Scaling Considerations

### Database Scaling
- **Read Replicas:** For high read traffic
- **Connection Pooling:** Already configured
- **Indexing:** Monitor and optimize query performance

### Application Scaling
- **Horizontal Scaling:** Add more Render instances
- **CDN:** Use for static assets
- **Caching:** Implement Redis for session storage

### Monitoring & Alerts
- **Application Metrics:** Response times, error rates
- **Database Metrics:** Connection count, query performance
- **Business Metrics:** Booking volume, revenue tracking

## Security Considerations

### Production Security
- [ ] Rotate JWT secrets regularly
- [ ] Enable database SSL in production
- [ ] Configure rate limiting appropriately
- [ ] Set up proper CORS policies
- [ ] Enable security headers (helmet.js)
- [ ] Regular dependency updates
- [ ] Monitor for vulnerabilities

### Data Protection
- [ ] Database backups configured
- [ ] GDPR compliance (data deletion, export)
- [ ] Payment data handling (PCI compliance)
- [ ] Guest data protection measures

## Support & Maintenance

### Regular Tasks
- [ ] Monitor application logs
- [ ] Check database performance
- [ ] Update dependencies monthly
- [ ] Review security advisories
- [ ] Backup verification
- [ ] SSL certificate renewal

### Emergency Procedures
- [ ] Database backup restoration process
- [ ] Application rollback procedure
- [ ] Incident response plan
- [ ] Customer communication templates

## Costs (Estimated)

### Monthly Costs (Basic Setup)
- **Render Web Service:** $7 (512MB RAM)
- **Render PostgreSQL:** $7 (512MB RAM)
- **Netlify:** Free (hobby plan)
- **Resend Email:** Free (3000 emails/month)
- **UptimeRobot:** Free (50 monitors)
- **Domain:** $10-20/year

**Total:** ~$25-35/month for basic production setup

### Scaling Costs
- Additional Render instances: +$7 each
- Larger database: +$15-50/month
- Additional email volume: +$20/100k emails

## Next Steps After Deployment

1. **Initial Testing**
   - Test all core functionality
   - Verify email notifications
   - Check WebSocket connections
   - Test booking flow end-to-end

2. **Performance Optimization**
   - Monitor response times
   - Optimize database queries
   - Implement caching if needed
   - Consider CDN for assets

3. **Feature Enhancements**
   - Mobile app development
   - Advanced analytics
   - Multi-language support
   - Payment gateway integration

4. **Business Operations**
   - Customer onboarding process
   - Support documentation
   - Training materials
   - Marketing strategy

---

**Questions?** Contact the development team or check the [API Documentation](https://your-backend-domain.com/api-docs) for technical details.
