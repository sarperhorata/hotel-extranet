# Required External Services & API Keys

## Overview

This document lists all external services and API keys required for the Hotel Extranet System to function properly in production.

## 🔑 **Required API Keys & Services**

### **1. Email Service (Required)**
- **Service:** Resend
- **Purpose:** Email notifications, booking confirmations, password resets
- **API Key:** `RESEND_API_KEY`
- **Setup:** [Resend Dashboard](https://resend.com)
- **Cost:** Free tier available (3,000 emails/month)
- **Alternative:** SendGrid, Mailgun, AWS SES

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Hotel Extranet
```

### **2. Database (Required)**
- **Service:** PostgreSQL
- **Purpose:** Primary database for all system data
- **Setup Options:**
  - **Render PostgreSQL** (Recommended for Render deployment)
  - **AWS RDS PostgreSQL**
  - **Google Cloud SQL**
  - **Supabase**
  - **PlanetScale** (MySQL alternative)

```env
DATABASE_URL=postgresql://username:password@host:port/database
# OR individual components:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_extranet
DB_USER=hotel_user
DB_PASSWORD=your_secure_password
```

### **3. Channel Manager APIs (Optional but Recommended)**
- **Purpose:** Integration with hotel distribution channels

#### **SiteMinder**
- **API Endpoint:** `https://api.siteminder.com/v1`
- **Credentials:** API Key + Secret
- **Setup:** [SiteMinder Developer Portal](https://developer.siteminder.com)

#### **HotelRunner**
- **API Endpoint:** `https://api.hotelrunner.com/v2`
- **Credentials:** API Key + Secret
- **Setup:** [HotelRunner API Documentation](https://docs.hotelrunner.com)

#### **Dingus**
- **API Endpoint:** `https://api.dingus.com/v1`
- **Credentials:** API Key + Secret
- **Setup:** [Dingus API Portal](https://api.dingus.com)

#### **Elektraweb**
- **API Endpoint:** `https://api.elektraweb.com/v1`
- **Credentials:** API Key + Secret
- **Setup:** [Elektraweb Developer Portal](https://developer.elektraweb.com)

### **4. VCC (Virtual Credit Card) Provider (Optional)**
- **Purpose:** Generate virtual credit cards for payments
- **Options:**
  - **Marqeta** - Enterprise VCC provider
  - **Stripe Issuing** - Stripe's card issuing platform
  - **Rapyd** - Global fintech platform
  - **Adyen** - Payment platform with VCC capabilities

```env
# Example for Marqeta
MARQETA_API_KEY=your_marqeta_api_key
MARQETA_API_SECRET=your_marqeta_api_secret
MARQETA_BASE_URL=https://sandbox-api.marqeta.com/v3

# Example for Stripe Issuing
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_ISSUING_ENABLED=true
```

### **5. Payment Gateway (Optional)**
- **Purpose:** Process payments, VCC transactions
- **Options:**
  - **Stripe** - Popular payment processor
  - **PayPal** - Global payment platform
  - **Adyen** - Enterprise payment platform
  - **Square** - Payment processing

```env
# Example for Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

### **6. Monitoring & Uptime (Optional)**
- **Service:** UptimeRobot
- **Purpose:** Keep-alive service, uptime monitoring
- **API Key:** `UPTIME_ROBOT_API_KEY`
- **Setup:** [UptimeRobot Dashboard](https://uptimerobot.com)
- **Cost:** Free tier available (50 monitors)

```env
UPTIME_ROBOT_API_KEY=u1234567-xxxxxxxxxxxxxxxxxxxxxxxx
```

### **7. File Storage (Optional)**
- **Purpose:** Store images, documents, attachments
- **Options:**
  - **AWS S3** (Recommended)
  - **Google Cloud Storage**
  - **Cloudinary** (Image optimization)
  - **Supabase Storage**

```env
# Example for AWS S3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=hotel-extranet-files
```

### **8. Redis Cache (Optional)**
- **Purpose:** Session storage, caching, rate limiting
- **Options:**
  - **Redis Cloud** (Recommended)
  - **AWS ElastiCache**
  - **Google Cloud Memorystore**
  - **Upstash Redis**

```env
REDIS_URL=redis://username:password@host:port
# OR individual components:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

## 🚀 **Deployment Services**

### **Backend Hosting**
- **Render.com** (Recommended)
  - **Cost:** $7/month for starter plan
  - **Features:** Auto-deploy, SSL, custom domains
  - **Setup:** Connect GitHub repository

- **Railway**
  - **Cost:** $5/month for hobby plan
  - **Features:** Auto-deploy, database included
  - **Setup:** Connect GitHub repository

- **Heroku**
  - **Cost:** $7/month for basic plan
  - **Features:** Add-ons, easy scaling
  - **Setup:** Connect GitHub repository

### **Frontend Hosting**
- **Netlify** (Recommended)
  - **Cost:** Free tier available
  - **Features:** Auto-deploy, CDN, custom domains
  - **Setup:** Connect GitHub repository

- **Vercel**
  - **Cost:** Free tier available
  - **Features:** Auto-deploy, edge functions
  - **Setup:** Connect GitHub repository

- **GitHub Pages**
  - **Cost:** Free
  - **Features:** Static site hosting
  - **Setup:** GitHub Actions

### **Database Hosting**
- **Render PostgreSQL** (Recommended for Render deployment)
  - **Cost:** $7/month for starter plan
  - **Features:** Automated backups, SSL

- **AWS RDS PostgreSQL**
  - **Cost:** $15-20/month for t3.micro
  - **Features:** High availability, automated backups

- **Supabase**
  - **Cost:** Free tier available
  - **Features:** PostgreSQL, real-time, auth

- **PlanetScale**
  - **Cost:** Free tier available
  - **Features:** MySQL, branching, scaling

## 📋 **Environment Variables Summary**

### **Required (Minimum Setup)**
```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Secrets
JWT_SECRET=your-32-character-secret-key
JWT_REFRESH_SECRET=your-32-character-refresh-secret

# Email (Optional but recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# Frontend URLs
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com
```

### **Optional (Enhanced Features)**
```env
# Channel Manager APIs
SITEMINDER_API_KEY=your_siteminder_api_key
SITEMINDER_API_SECRET=your_siteminder_api_secret
HOTELRUNNER_API_KEY=your_hotelrunner_api_key
HOTELRUNNER_API_SECRET=your_hotelrunner_api_secret

# VCC Provider
MARQETA_API_KEY=your_marqeta_api_key
MARQETA_API_SECRET=your_marqeta_api_secret

# Payment Gateway
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx

# File Storage
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=hotel-extranet-files

# Monitoring
UPTIME_ROBOT_API_KEY=u1234567-xxxxxxxxxxxxxxxxxxxxxxxx

# Cache
REDIS_URL=redis://username:password@host:port
```

## 💰 **Cost Estimation**

### **Minimum Setup (Free Tier)**
- **Database:** Free (Supabase/PlanetScale)
- **Backend:** Free (Railway/Render)
- **Frontend:** Free (Netlify/Vercel)
- **Email:** Free (Resend - 3,000 emails/month)
- **Total:** $0/month

### **Production Setup (Recommended)**
- **Database:** $7/month (Render PostgreSQL)
- **Backend:** $7/month (Render)
- **Frontend:** Free (Netlify)
- **Email:** Free (Resend - 3,000 emails/month)
- **Monitoring:** Free (UptimeRobot)
- **Total:** $14/month

### **Enterprise Setup (Full Features)**
- **Database:** $20/month (AWS RDS)
- **Backend:** $25/month (AWS EC2)
- **Frontend:** Free (Netlify)
- **Email:** $20/month (Resend Pro)
- **VCC Provider:** $50/month (Marqeta)
- **Payment Gateway:** 2.9% + $0.30 per transaction
- **File Storage:** $5/month (AWS S3)
- **Monitoring:** $10/month (UptimeRobot Pro)
- **Total:** $130/month + transaction fees

## 🔧 **Setup Instructions**

### **1. Email Service (Resend)**
1. Go to [Resend Dashboard](https://resend.com)
2. Create account and verify email
3. Generate API key
4. Add to environment variables

### **2. Database Setup**
1. **Render PostgreSQL:**
   - Create new PostgreSQL service in Render
   - Copy connection string to `DATABASE_URL`

2. **AWS RDS:**
   - Create PostgreSQL instance
   - Configure security groups
   - Copy connection details

### **3. Channel Manager APIs**
1. **SiteMinder:**
   - Register at [SiteMinder Developer Portal](https://developer.siteminder.com)
   - Create application
   - Generate API credentials

2. **HotelRunner:**
   - Contact HotelRunner for API access
   - Complete integration documentation
   - Receive API credentials

### **4. VCC Provider Setup**
1. **Marqeta:**
   - Apply for Marqeta account
   - Complete KYC process
   - Receive API credentials

2. **Stripe Issuing:**
   - Enable Stripe Issuing in dashboard
   - Complete compliance requirements
   - Generate API keys

## 📞 **Support & Documentation**

### **Service Documentation**
- **Resend:** [docs.resend.com](https://docs.resend.com)
- **Render:** [render.com/docs](https://render.com/docs)
- **Netlify:** [docs.netlify.com](https://docs.netlify.com)
- **SiteMinder:** [developer.siteminder.com](https://developer.siteminder.com)
- **Stripe:** [stripe.com/docs](https://stripe.com/docs)

### **Community Support**
- **GitHub Issues:** Report bugs and feature requests
- **Discord:** Join our community server
- **Email:** support@hotel-extranet.com

---

**Note:** This list covers all external services and API keys required for the Hotel Extranet System. Start with the minimum setup and add additional services as needed for your specific requirements.
