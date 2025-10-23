# Environment Setup Guide

## Overview

This guide covers setting up the environment variables and external services required for the Hotel Extranet System.

## 🔧 **Environment Variables**

### **Required Variables (Minimum Setup)**

```env
# Application
NODE_ENV=development
PORT=5000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/hotel_extranet

# JWT Authentication
JWT_SECRET=your-32-character-secret-key-here
JWT_REFRESH_SECRET=your-32-character-refresh-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Hotel Extranet

# Frontend URLs
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

### **Optional Variables (Enhanced Features)**

```env
# Channel Manager APIs
SITEMINDER_API_KEY=your_siteminder_api_key
SITEMINDER_API_SECRET=your_siteminder_api_secret
HOTELRUNNER_API_KEY=your_hotelrunner_api_key
HOTELRUNNER_API_SECRET=your_hotelrunner_api_secret
DINGUS_API_KEY=your_dingus_api_key
DINGUS_API_SECRET=your_dingus_api_secret
ELEKTRAWEB_API_KEY=your_elektraweb_api_key
ELEKTRAWEB_API_SECRET=your_elektraweb_api_secret

# VCC Provider
MARQETA_API_KEY=your_marqeta_api_key
MARQETA_API_SECRET=your_marqeta_api_secret
MARQETA_BASE_URL=https://sandbox-api.marqeta.com/v3

# Payment Gateway
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx

# File Storage
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=hotel-extranet-files

# Redis Cache
REDIS_URL=redis://username:password@host:port

# Monitoring
UPTIME_ROBOT_API_KEY=u1234567-xxxxxxxxxxxxxxxxxxxxxxxx
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## 🗄️ **Database Setup**

### **Option 1: Local PostgreSQL**

1. **Install PostgreSQL:**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database and user
   CREATE DATABASE hotel_extranet;
   CREATE USER hotel_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE hotel_extranet TO hotel_user;
   ```

3. **Update Environment:**
   ```env
   DATABASE_URL=postgresql://hotel_user:your_secure_password@localhost:5432/hotel_extranet
   ```

### **Option 2: Cloud Database**

#### **Render PostgreSQL (Recommended)**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Create new PostgreSQL service
3. Copy connection string to `DATABASE_URL`

#### **AWS RDS**
1. Create PostgreSQL instance in AWS RDS
2. Configure security groups
3. Copy connection details

#### **Supabase (Free Tier)**
1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Copy connection string

## 📧 **Email Service Setup**

### **Resend (Recommended)**

1. **Create Account:**
   - Go to [Resend Dashboard](https://resend.com)
   - Sign up for free account
   - Verify email address

2. **Generate API Key:**
   - Go to API Keys section
   - Create new API key
   - Copy the key (starts with `re_`)

3. **Configure Domain:**
   - Add your domain in Domains section
   - Verify domain ownership
   - Set up DNS records

4. **Update Environment:**
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME=Hotel Extranet
   ```

### **Alternative Email Services**

#### **SendGrid**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
```

#### **Mailgun**
```env
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
```

#### **AWS SES**
```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
FROM_EMAIL=noreply@yourdomain.com
```

## 🔐 **JWT Secret Generation**

### **Generate Secure Secrets**

```bash
# Generate 32-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use online generator
# https://generate-secret.vercel.app/32
```

### **Update Environment:**
```env
JWT_SECRET=your-generated-32-character-secret-here
JWT_REFRESH_SECRET=your-generated-32-character-refresh-secret-here
```

## 🌐 **Channel Manager APIs**

### **SiteMinder Integration**

1. **Register for API Access:**
   - Go to [SiteMinder Developer Portal](https://developer.siteminder.com)
   - Create developer account
   - Submit application for API access

2. **Get Credentials:**
   - Complete integration documentation
   - Receive API key and secret
   - Get hotel ID for your property

3. **Update Environment:**
   ```env
   SITEMINDER_API_KEY=your_siteminder_api_key
   SITEMINDER_API_SECRET=your_siteminder_api_secret
   SITEMINDER_HOTEL_ID=your_hotel_id
   ```

### **HotelRunner Integration**

1. **Contact HotelRunner:**
   - Email: api@hotelrunner.com
   - Request API access
   - Complete integration requirements

2. **Get Credentials:**
   - Receive API key and secret
   - Get hotel ID for your property

3. **Update Environment:**
   ```env
   HOTELRUNNER_API_KEY=your_hotelrunner_api_key
   HOTELRUNNER_API_SECRET=your_hotelrunner_api_secret
   HOTELRUNNER_HOTEL_ID=your_hotel_id
   ```

## 💳 **VCC Provider Setup**

### **Marqeta (Enterprise)**

1. **Apply for Account:**
   - Go to [Marqeta](https://www.marqeta.com)
   - Submit application
   - Complete KYC process

2. **Get Credentials:**
   - Receive API key and secret
   - Get base URL for your environment

3. **Update Environment:**
   ```env
   MARQETA_API_KEY=your_marqeta_api_key
   MARQETA_API_SECRET=your_marqeta_api_secret
   MARQETA_BASE_URL=https://sandbox-api.marqeta.com/v3
   ```

### **Stripe Issuing**

1. **Enable Stripe Issuing:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Enable Issuing in settings
   - Complete compliance requirements

2. **Get Credentials:**
   - Use existing Stripe API keys
   - Enable Issuing features

3. **Update Environment:**
   ```env
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_ISSUING_ENABLED=true
   ```

## 💰 **Payment Gateway Setup**

### **Stripe (Recommended)**

1. **Create Stripe Account:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Create account and verify business
   - Complete onboarding process

2. **Get API Keys:**
   - Go to Developers > API Keys
   - Copy publishable and secret keys
   - Set up webhooks

3. **Update Environment:**
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
   ```

## 📁 **File Storage Setup**

### **AWS S3 (Recommended)**

1. **Create AWS Account:**
   - Go to [AWS Console](https://aws.amazon.com)
   - Create account and verify
   - Set up billing information

2. **Create S3 Bucket:**
   - Go to S3 service
   - Create new bucket
   - Configure permissions

3. **Create IAM User:**
   - Go to IAM service
   - Create new user with S3 permissions
   - Generate access keys

4. **Update Environment:**
   ```env
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=hotel-extranet-files
   ```

## 🔍 **Monitoring Setup**

### **UptimeRobot (Free)**

1. **Create Account:**
   - Go to [UptimeRobot](https://uptimerobot.com)
   - Sign up for free account
   - Verify email address

2. **Add Monitor:**
   - Add HTTP monitor for your backend
   - Set up email notifications
   - Get API key

3. **Update Environment:**
   ```env
   UPTIME_ROBOT_API_KEY=u1234567-xxxxxxxxxxxxxxxxxxxxxxxx
   ```

### **Sentry (Error Tracking)**

1. **Create Account:**
   - Go to [Sentry](https://sentry.io)
   - Create free account
   - Create new project

2. **Get DSN:**
   - Copy DSN from project settings
   - Configure error tracking

3. **Update Environment:**
   ```env
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

## 🚀 **Deployment Environment**

### **Render (Backend)**

1. **Create Render Account:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Connect GitHub repository
   - Create new web service

2. **Set Environment Variables:**
   - Add all required environment variables
   - Set up database connection
   - Configure build settings

### **Netlify (Frontend)**

1. **Create Netlify Account:**
   - Go to [Netlify](https://netlify.com)
   - Connect GitHub repository
   - Set up build settings

2. **Set Environment Variables:**
   - Add frontend environment variables
   - Configure build commands
   - Set up custom domain

## 🔧 **Development Setup**

### **Local Development**

1. **Clone Repository:**
   ```bash
   git clone https://github.com/your-username/hotel-extranet.git
   cd hotel-extranet
   ```

2. **Install Dependencies:**
   ```bash
   # Backend
   cd app/backend
   npm install
   
   # Frontend
   cd app/frontend
   npm install
   ```

3. **Set Up Environment:**
   ```bash
   # Copy environment file
   cp .env.example .env
   
   # Update with your values
   nano .env
   ```

4. **Run Database Migrations:**
   ```bash
   cd app/backend
   npm run migrate
   npm run seed
   ```

5. **Start Development Servers:**
   ```bash
   # Backend
   cd app/backend
   npm run dev
   
   # Frontend
   cd app/frontend
   npm run dev
   ```

### **Docker Development**

1. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

2. **Access Services:**
   - Backend: http://localhost:5000
   - Frontend: http://localhost:5173
   - Database: localhost:5432

## 📋 **Environment Checklist**

### **Required for Basic Functionality**
- [ ] PostgreSQL database configured
- [ ] JWT secrets generated
- [ ] Email service (Resend) configured
- [ ] Frontend URLs set

### **Optional for Enhanced Features**
- [ ] Channel manager APIs configured
- [ ] VCC provider set up
- [ ] Payment gateway configured
- [ ] File storage configured
- [ ] Monitoring services set up
- [ ] Redis cache configured

### **Production Deployment**
- [ ] All environment variables set
- [ ] Database connection tested
- [ ] Email service tested
- [ ] External APIs tested
- [ ] Security measures configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented

## 🆘 **Troubleshooting**

### **Common Issues**

1. **Database Connection Failed:**
   - Check DATABASE_URL format
   - Verify database credentials
   - Ensure database is running

2. **Email Service Failed:**
   - Verify RESEND_API_KEY
   - Check FROM_EMAIL format
   - Test with simple email first

3. **JWT Authentication Failed:**
   - Verify JWT_SECRET length (32+ characters)
   - Check JWT_REFRESH_SECRET
   - Ensure secrets are different

4. **Channel Manager API Failed:**
   - Verify API credentials
   - Check API endpoints
   - Test connection first

### **Testing Environment**

```bash
# Test database connection
npm run test:db

# Test email service
npm run test:email

# Test all services
npm run test:integration
```

---

**Note:** This guide covers all environment setup requirements for the Hotel Extranet System. Start with the minimum setup and add additional services as needed for your specific requirements.
