# Domain & SSL Setup Guide

## Overview

This guide covers setting up custom domains and SSL certificates for the Hotel Extranet system across different deployment platforms.

## Prerequisites

- Domain name registered with a domain registrar
- Access to domain DNS settings
- Deployed backend and frontend applications
- Platform-specific account access

## Domain Configuration

### 1. Choose Your Domain

#### Recommended Domain Structure

- **Main Domain**: `hotel-extranet.com`
- **Backend API**: `api.hotel-extranet.com`
- **Frontend**: `app.hotel-extranet.com` or `hotel-extranet.com`
- **Admin Panel**: `admin.hotel-extranet.com`

#### Alternative Structure

- **Main Domain**: `hotel-extranet.com`
- **Backend API**: `hotel-extranet.com/api`
- **Frontend**: `hotel-extranet.com`
- **Admin Panel**: `hotel-extranet.com/admin`

### 2. DNS Configuration

#### A Records (IPv4)

```
hotel-extranet.com.     A    192.0.2.1
api.hotel-extranet.com. A    192.0.2.2
admin.hotel-extranet.com. A  192.0.2.3
```

#### CNAME Records

```
www.hotel-extranet.com.     CNAME hotel-extranet.com.
app.hotel-extranet.com.     CNAME hotel-extranet.com.
```

#### MX Records (Email)

```
hotel-extranet.com.     MX    10 mail.hotel-extranet.com.
```

## Platform-Specific Setup

### Netlify

#### 1. Add Custom Domain

```bash
# Using Netlify CLI
netlify sites:create --name hotel-extranet
netlify domains:add hotel-extranet.com
netlify domains:add www.hotel-extranet.com
```

#### 2. Configure DNS

In your domain registrar's DNS settings:

```
Type    Name                    Value
CNAME   www                     hotel-extranet.netlify.app
A       @                       Netlify IP (check Netlify docs)
```

#### 3. SSL Certificate

Netlify automatically provides SSL certificates via Let's Encrypt:

```bash
# Force SSL redirect
netlify redirects:add --from "http://hotel-extranet.com/*" --to "https://hotel-extranet.com/:splat" --status 301
```

#### 4. Environment Variables

```bash
# Set custom domain
netlify env:set VITE_APP_URL https://hotel-extranet.com
netlify env:set VITE_API_URL https://api.hotel-extranet.com
```

### Vercel

#### 1. Add Custom Domain

```bash
# Using Vercel CLI
vercel domains add hotel-extranet.com
vercel domains add www.hotel-extranet.com
```

#### 2. Configure DNS

In your domain registrar's DNS settings:

```
Type    Name                    Value
A       @                       Vercel IP (check Vercel docs)
CNAME   www                     cname.vercel-dns.com
```

#### 3. SSL Certificate

Vercel automatically provides SSL certificates:

```bash
# Configure redirects
vercel redirects add --from "http://hotel-extranet.com/*" --to "https://hotel-extranet.com/:splat" --status 301
```

### Render

#### 1. Add Custom Domain

1. Go to your Render service dashboard
2. Navigate to Settings → Custom Domains
3. Add your domain: `hotel-extranet.com`
4. Add www subdomain: `www.hotel-extranet.com`

#### 2. Configure DNS

In your domain registrar's DNS settings:

```
Type    Name                    Value
CNAME   @                       your-service.onrender.com
CNAME   www                     your-service.onrender.com
```

#### 3. SSL Certificate

Render automatically provides SSL certificates via Let's Encrypt.

### Railway

#### 1. Add Custom Domain

```bash
# Using Railway CLI
railway domain add hotel-extranet.com
railway domain add www.hotel-extranet.com
```

#### 2. Configure DNS

In your domain registrar's DNS settings:

```
Type    Name                    Value
CNAME   @                       your-app.railway.app
CNAME   www                     your-app.railway.app
```

### Heroku

#### 1. Add Custom Domain

```bash
# Using Heroku CLI
heroku domains:add hotel-extranet.com
heroku domains:add www.hotel-extranet.com
```

#### 2. Configure DNS

In your domain registrar's DNS settings:

```
Type    Name                    Value
CNAME   @                       your-app.herokuapp.com
CNAME   www                     your-app.herokuapp.com
```

#### 3. SSL Certificate

```bash
# Add SSL certificate
heroku certs:add --type endpoint
```

## SSL Certificate Setup

### 1. Let's Encrypt (Free)

#### Automatic (Recommended)

Most platforms provide automatic SSL certificates:

- **Netlify**: Automatic via Let's Encrypt
- **Vercel**: Automatic via Let's Encrypt
- **Render**: Automatic via Let's Encrypt
- **Railway**: Automatic via Let's Encrypt

#### Manual Setup

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d hotel-extranet.com -d www.hotel-extranet.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Commercial SSL Certificates

#### DigiCert

```bash
# Purchase certificate from DigiCert
# Download certificate files
# Upload to your platform
```

#### Comodo/Sectigo

```bash
# Purchase certificate from Comodo
# Download certificate files
# Upload to your platform
```

### 3. Wildcard Certificates

For multiple subdomains:

```bash
# Generate wildcard certificate
sudo certbot certonly --manual --preferred-challenges dns -d "*.hotel-extranet.com" -d hotel-extranet.com
```

## DNS Configuration Examples

### Cloudflare

#### 1. Add Domain to Cloudflare

1. Sign up at [Cloudflare](https://cloudflare.com)
2. Add your domain
3. Update nameservers at your domain registrar

#### 2. Configure DNS Records

```
Type    Name                    Content                 TTL
A       @                       Your server IP          Auto
CNAME   www                     hotel-extranet.com      Auto
CNAME   api                     your-backend-url.com    Auto
CNAME   admin                   your-admin-url.com      Auto
```

#### 3. Enable SSL/TLS

1. Go to SSL/TLS → Overview
2. Set encryption mode to "Full (strict)"
3. Enable "Always Use HTTPS"

### AWS Route 53

#### 1. Create Hosted Zone

```bash
# Using AWS CLI
aws route53 create-hosted-zone --name hotel-extranet.com --caller-reference $(date +%s)
```

#### 2. Configure DNS Records

```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "hotel-extranet.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "your-alb.amazonaws.com",
          "EvaluateTargetHealth": false,
          "HostedZoneId": "Z35SXDOTRQ7X7K"
        }
      }
    }
  ]
}
```

### Google Cloud DNS

#### 1. Create DNS Zone

```bash
# Using gcloud CLI
gcloud dns managed-zones create hotel-extranet-zone --dns-name=hotel-extranet.com --description="Hotel Extranet DNS Zone"
```

#### 2. Configure DNS Records

```bash
# Add A record
gcloud dns record-sets create hotel-extranet.com. --zone=hotel-extranet-zone --type=A --ttl=300 --rrdatas=192.0.2.1

# Add CNAME record
gcloud dns record-sets create www.hotel-extranet.com. --zone=hotel-extranet-zone --type=CNAME --ttl=300 --rrdatas=hotel-extranet.com.
```

## Security Headers

### 1. HTTP Security Headers

```nginx
# Nginx configuration
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 2. Platform-Specific Headers

#### Netlify

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
```

#### Vercel

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

## SSL Testing

### 1. SSL Labs Test

Visit [SSL Labs](https://www.ssllabs.com/ssltest/) and test your domain:

```
https://www.ssllabs.com/ssltest/analyze.html?d=hotel-extranet.com
```

### 2. Command Line Testing

```bash
# Test SSL certificate
openssl s_client -connect hotel-extranet.com:443 -servername hotel-extranet.com

# Check certificate details
openssl x509 -in certificate.crt -text -noout

# Test SSL configuration
nmap --script ssl-enum-ciphers -p 443 hotel-extranet.com
```

### 3. Browser Testing

1. Open your domain in a browser
2. Check the SSL certificate in browser developer tools
3. Verify the lock icon in the address bar
4. Test HTTPS redirect

## Troubleshooting

### Common Issues

#### 1. DNS Propagation

```bash
# Check DNS propagation
dig hotel-extranet.com
nslookup hotel-extranet.com

# Wait for propagation (up to 48 hours)
```

#### 2. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in certificate.crt -text -noout

# Verify certificate chain
openssl verify -CAfile ca-bundle.crt certificate.crt
```

#### 3. Mixed Content Issues

```javascript
// Force HTTPS for all requests
if (location.protocol !== 'https:') {
  location.replace('https:' + window.location.href.substring(window.location.protocol.length));
}
```

### Debug Commands

```bash
# Check DNS resolution
dig +trace hotel-extranet.com

# Test SSL connection
openssl s_client -connect hotel-extranet.com:443

# Check HTTP headers
curl -I https://hotel-extranet.com

# Test redirects
curl -L https://hotel-extranet.com
```

## Best Practices

### 1. Domain Management

- Use a reputable domain registrar
- Enable domain privacy protection
- Set up domain auto-renewal
- Use strong registrar account passwords

### 2. SSL Certificate Management

- Use Let's Encrypt for free certificates
- Set up automatic renewal
- Monitor certificate expiration
- Use strong encryption (TLS 1.2+)

### 3. DNS Management

- Use a reliable DNS provider
- Set appropriate TTL values
- Monitor DNS propagation
- Keep DNS records organized

### 4. Security

- Enable HSTS (HTTP Strict Transport Security)
- Use strong SSL/TLS configurations
- Implement security headers
- Monitor for SSL vulnerabilities

## Monitoring

### 1. SSL Certificate Monitoring

```bash
# Check certificate expiration
openssl x509 -in certificate.crt -noout -dates

# Set up monitoring alerts
# Monitor certificate expiration (30 days before expiry)
```

### 2. DNS Monitoring

```bash
# Monitor DNS resolution
# Set up alerts for DNS failures
# Monitor DNS propagation times
```

### 3. Uptime Monitoring

```bash
# Use UptimeRobot or similar service
# Monitor HTTPS endpoints
# Set up alerts for SSL issues
```

## Cost Considerations

### 1. Domain Registration

- **.com domain**: $10-15/year
- **.org domain**: $10-15/year
- **Premium domains**: $100-1000+/year

### 2. SSL Certificates

- **Let's Encrypt**: Free
- **Commercial certificates**: $50-500/year
- **Wildcard certificates**: $100-1000/year

### 3. DNS Services

- **Cloudflare**: Free tier available
- **AWS Route 53**: $0.50/hosted zone + $0.40/million queries
- **Google Cloud DNS**: $0.20/hosted zone + $0.40/million queries

## Support

For domain and SSL issues:

1. Check DNS propagation status
2. Verify SSL certificate validity
3. Test HTTPS connectivity
4. Review platform-specific documentation
5. Contact domain registrar support
6. Contact SSL certificate provider support

## Related Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Security Guide](SECURITY.md)
- [Monitoring Guide](UPTIMEROBOT_SETUP.md)
- [Performance Guide](PERFORMANCE.md)
