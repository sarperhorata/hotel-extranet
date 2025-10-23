# UptimeRobot Setup Guide

## Overview

UptimeRobot is a monitoring service that checks the availability of your hotel extranet system and sends alerts when issues are detected. This guide covers the complete setup process.

## Prerequisites

- UptimeRobot account (free tier available)
- Hotel extranet system deployed and accessible
- API endpoints configured for health checks

## Step 1: Create UptimeRobot Account

1. Visit [UptimeRobot.com](https://uptimerobot.com)
2. Sign up for a free account
3. Verify your email address
4. Log in to your dashboard

## Step 2: Get API Key

1. Go to **My Settings** → **API Settings**
2. Click **Generate New API Key**
3. Copy and save the API key securely
4. Add to your environment variables:

```bash
UPTIMEROBOT_API_KEY=your_api_key_here
```

## Step 3: Configure Health Check Endpoints

### Backend Health Check

The system provides several health check endpoints:

- **Basic Health Check**: `GET /api/v1/monitoring/health`
- **Detailed Health Check**: `GET /api/v1/monitoring/health/detailed`
- **System Metrics**: `GET /api/v1/monitoring/metrics/system`

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "up",
      "responseTime": 15
  },
  "redis": {
    "status": "up",
    "responseTime": 5
  },
  "email": {
    "status": "up",
    "responseTime": 120
  }
  },
  "metrics": {
    "memory": {
      "used": 52428800,
      "total": 1073741824,
      "percentage": 4.88
    },
    "database": {
      "connections": 5,
      "maxConnections": 100,
      "activeQueries": 2,
      "slowQueries": 0
    }
  }
}
```

## Step 4: Set Up Monitors

### Backend Monitor

1. **Monitor Type**: HTTP(s)
2. **URL**: `https://your-backend-domain.com/api/v1/monitoring/health`
3. **Friendly Name**: Hotel Extranet Backend
4. **Monitoring Interval**: 5 minutes
5. **Timeout**: 30 seconds

### Frontend Monitor

1. **Monitor Type**: HTTP(s)
2. **URL**: `https://your-frontend-domain.com`
3. **Friendly Name**: Hotel Extranet Frontend
4. **Monitoring Interval**: 5 minutes
5. **Timeout**: 30 seconds

### Database Monitor (Optional)

1. **Monitor Type**: Port
2. **Host**: Your database host
3. **Port**: 5432 (PostgreSQL default)
4. **Friendly Name**: Hotel Extranet Database
5. **Monitoring Interval**: 5 minutes
6. **Timeout**: 30 seconds

## Step 5: Configure Alert Contacts

### Email Alerts

1. Go to **My Settings** → **Alert Contacts**
2. Click **Add Alert Contact**
3. Select **Email**
4. Enter your email address
5. Set alert frequency (immediate, hourly, daily)

### SMS Alerts (Paid Feature)

1. Add phone number
2. Verify with SMS code
3. Set alert frequency

### Webhook Alerts

1. **Webhook URL**: `https://your-backend-domain.com/api/v1/monitoring/webhook/uptimerobot`
2. **HTTP Method**: POST
3. **Content Type**: application/json

## Step 6: Set Up Automated Monitor Creation

The system can automatically create UptimeRobot monitors via API:

```bash
curl -X POST https://your-backend-domain.com/api/v1/monitoring/uptimerobot/setup \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "monitorUrl": "https://your-backend-domain.com/api/v1/monitoring/health",
    "monitorName": "Hotel Extranet Backend",
    "monitorType": "https",
    "checkInterval": 5,
    "timeout": 30
  }'
```

## Step 7: Configure Alert Thresholds

### System Alert Thresholds

```json
{
  "response_time": 5000,
  "memory_usage": 80,
  "cpu_usage": 80,
  "database_connections": 80
}
```

### UptimeRobot Alert Settings

1. **Down Alert**: Immediate
2. **Up Alert**: Immediate
3. **Pause Alerts**: Never
4. **Maintenance Windows**: Configure as needed

## Step 8: Test Monitoring Setup

### Test Health Check Endpoint

```bash
curl -X GET https://your-backend-domain.com/api/v1/monitoring/health
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

### Test UptimeRobot Integration

```bash
curl -X GET https://your-backend-domain.com/api/v1/monitoring/uptimerobot/monitors \
  -H "Authorization: Bearer your_jwt_token"
```

## Step 9: Configure Maintenance Windows

### Scheduled Maintenance

1. Go to **My Settings** → **Maintenance Windows**
2. Click **Add Maintenance Window**
3. Set maintenance period
4. Select affected monitors
5. Choose alert behavior (pause or continue)

### Emergency Maintenance

1. Use the maintenance window feature
2. Or temporarily pause monitors
3. Resume after maintenance

## Step 10: Monitor Dashboard

### UptimeRobot Dashboard

- **Uptime Ratio**: Target 99.9%
- **Response Time**: Target < 2 seconds
- **Status**: Monitor for any "Down" status

### System Dashboard

Access the monitoring dashboard at:
`https://your-backend-domain.com/api/v1/monitoring/dashboard`

## Best Practices

### 1. Monitor Multiple Endpoints

- Backend health check
- Frontend availability
- Database connectivity
- External API dependencies

### 2. Set Appropriate Intervals

- **Critical services**: 1-2 minutes
- **Standard services**: 5 minutes
- **Non-critical services**: 15 minutes

### 3. Configure Alert Escalation

- **Level 1**: Email notification
- **Level 2**: SMS notification (after 15 minutes)
- **Level 3**: Phone call (after 30 minutes)

### 4. Use Maintenance Windows

- Schedule maintenance during low-traffic periods
- Notify users in advance
- Pause monitoring during maintenance

### 5. Monitor Performance Metrics

- Response time trends
- Memory usage patterns
- Database performance
- Error rates

## Troubleshooting

### Common Issues

1. **Health Check Fails**
   - Verify endpoint is accessible
   - Check authentication requirements
   - Review server logs

2. **False Alerts**
   - Adjust timeout settings
   - Review network connectivity
   - Check server load

3. **Missing Alerts**
   - Verify alert contact configuration
   - Check email spam folders
   - Review alert frequency settings

### Debug Commands

```bash
# Test health check locally
curl -X GET http://localhost:5000/api/v1/monitoring/health

# Check system metrics
curl -X GET http://localhost:5000/api/v1/monitoring/metrics/system

# Test external service connectivity
curl -X GET http://localhost:5000/api/v1/monitoring/test/database
```

## Cost Considerations

### Free Tier Limits

- **50 monitors**
- **5-minute intervals**
- **Basic alert contacts**

### Paid Plans

- **Pro Plan**: $7/month
  - 50 monitors
  - 1-minute intervals
  - Advanced alerting
  - SMS notifications

- **Pro Plus Plan**: $16/month
  - 200 monitors
  - 30-second intervals
  - Advanced features
  - Priority support

## Security Considerations

### API Key Security

- Store API keys in environment variables
- Never commit keys to version control
- Rotate keys regularly
- Use least privilege access

### Webhook Security

- Validate webhook signatures
- Use HTTPS endpoints
- Implement rate limiting
- Log all webhook events

## Integration with Other Services

### Slack Integration

1. Create Slack webhook
2. Configure UptimeRobot webhook alerts
3. Set up Slack channel for monitoring

### Discord Integration

1. Create Discord webhook
2. Configure alert forwarding
3. Set up Discord server for monitoring

### PagerDuty Integration

1. Connect UptimeRobot to PagerDuty
2. Configure escalation policies
3. Set up on-call rotations

## Monitoring Checklist

- [ ] UptimeRobot account created
- [ ] API key configured
- [ ] Health check endpoints working
- [ ] Monitors created and active
- [ ] Alert contacts configured
- [ ] Alert thresholds set
- [ ] Maintenance windows scheduled
- [ ] Dashboard accessible
- [ ] Test alerts working
- [ ] Documentation updated

## Support

For issues with UptimeRobot setup:

1. Check UptimeRobot documentation
2. Review system logs
3. Test health check endpoints
4. Verify API key permissions
5. Contact support if needed

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](API.md)
- [Monitoring System](LOGGING_SYSTEM.md)
- [Environment Setup](ENVIRONMENT_SETUP.md)
