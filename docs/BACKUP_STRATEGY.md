# Backup and Disaster Recovery Strategy

## Overview

This comprehensive backup and disaster recovery strategy ensures data protection, system availability, and business continuity for the Hotel Extranet system.

## Backup Types

### 1. Full Backups

- **Frequency**: Daily at 2:00 AM
- **Retention**: 30 days
- **Content**: Complete database snapshot
- **Storage**: Local + Cloud (AWS S3/GCS)

### 2. Incremental Backups

- **Frequency**: Every 6 hours
- **Retention**: 7 days
- **Content**: Changes since last backup
- **Storage**: Local + Cloud

### 3. Real-time Replication

- **Method**: PostgreSQL streaming replication
- **Purpose**: Hot standby for immediate failover
- **RPO**: Near zero (seconds)

## Backup Schedule

```
Full Backup:    0 2 * * *     (Daily at 2:00 AM)
Incremental:    0 */6 * * *   (Every 6 hours)
Cleanup:        0 3 * * *     (Daily at 3:00 AM)
Health Check:   */15 * * * *  (Every 15 minutes)
```

## Storage Strategy

### Local Storage

- **Location**: `/backups` directory on each server
- **Format**: Compressed SQL files
- **Encryption**: Optional (AES-256)
- **Access**: Restricted to backup user

### Cloud Storage

#### AWS S3
- **Bucket**: `hotel-extranet-backups-{environment}`
- **Region**: `us-east-1` (primary), `us-west-2` (replica)
- **Encryption**: SSE-S3 with KMS
- **Lifecycle**: Automatic deletion after 90 days

#### Google Cloud Storage
- **Bucket**: `hotel-extranet-backups-{environment}`
- **Region**: `us-central1`
- **Encryption**: Google-managed encryption
- **Lifecycle**: Automatic deletion after 90 days

## Database Backup Process

### 1. Pre-backup Checks

```bash
# Check database connectivity
pg_isready -h $DB_HOST -p $DB_PORT

# Check available disk space
df -h /backups

# Check backup user permissions
psql -h $DB_HOST -U backup_user -c "SELECT 1"
```

### 2. Backup Creation

```bash
# Full backup
pg_dump $DATABASE_URL -f backup-full-$(date +%Y%m%d-%H%M%S).sql --no-owner --no-privileges --clean

# Incremental backup (using WAL archiving)
pg_basebackup -D /backups/incremental -X stream -C -S backup_slot
```

### 3. Post-backup Verification

```bash
# Verify backup file integrity
pg_restore --schema-only backup.sql >/dev/null 2>&1

# Check backup file size
ls -lh backup.sql

# Verify table count
grep -c "CREATE TABLE" backup.sql
```

## Restore Procedures

### 1. Point-in-Time Recovery

```bash
# Stop application
systemctl stop hotel-extranet

# Restore from specific backup
pg_restore -d $DATABASE_URL backup.sql

# Apply WAL files for point-in-time recovery
pg_wal_replay /path/to/wal/files

# Start application
systemctl start hotel-extranet
```

### 2. Disaster Recovery

#### Scenario 1: Single Server Failure

1. **Automatic Failover**
   - Load balancer detects failure
   - Traffic routed to backup server
   - Database fails over to replica

2. **Manual Recovery**
   ```bash
   # Check replica status
   pg_stat_replication

   # Promote replica to primary
   pg_ctl promote -D /var/lib/postgresql/data
   ```

#### Scenario 2: Complete Data Center Failure

1. **Cloud Recovery**
   - Restore from latest cloud backup
   - Update DNS records
   - Restore application from code repository

2. **Cross-Region Recovery**
   - Fail over to secondary region
   - Restore from cross-region backups
   - Update regional endpoints

## Monitoring and Alerting

### Backup Monitoring

```sql
-- Check backup status
SELECT backup_id, status, created_at, file_size
FROM database_backups
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check backup health
SELECT * FROM check_backup_health();
```

### Alerting Rules

- **Critical**: No backup in last 24 hours
- **Warning**: Backup file size < 50% of expected
- **Info**: Incremental backup > 2x size of previous

### Notification Channels

- **Email**: Admin team and stakeholders
- **Slack**: Development team channel
- **PagerDuty**: On-call rotation for critical alerts
- **SMS**: Critical alerts only

## Security Considerations

### 1. Access Control

```sql
-- Create backup user with minimal privileges
CREATE USER backup_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE hotel_extranet TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
```

### 2. Encryption

- **At Rest**: AES-256 encryption for backup files
- **In Transit**: TLS 1.3 for all backup transfers
- **KMS**: AWS KMS for key management

### 3. Network Security

- **VPC**: Backup operations within private VPC
- **Security Groups**: Restricted access to backup ports
- **IAM**: Least privilege access for backup services

## Testing Strategy

### 1. Backup Testing

```bash
# Test backup creation
./scripts/backup-database.sh full

# Test backup restoration
./scripts/restore-database.sh backup-id

# Test backup integrity
./scripts/verify-backup.sh backup-file.sql
```

### 2. Disaster Recovery Testing

#### Tabletop Exercises
- Review recovery procedures quarterly
- Document lessons learned
- Update procedures based on findings

#### Technical Testing
- Failover testing every 6 months
- Cross-region recovery testing annually
- Full system restoration testing annually

## Compliance and Auditing

### 1. Backup Compliance

- **GDPR**: Data retention and deletion policies
- **PCI DSS**: Payment data encryption
- **SOX**: Financial data integrity
- **HIPAA**: Healthcare data protection (if applicable)

### 2. Audit Trail

```sql
-- Track all backup operations
SELECT * FROM backup_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Track backup file access
SELECT * FROM backup_access_logs
WHERE accessed_at >= NOW() - INTERVAL '30 days';
```

## Performance Optimization

### 1. Backup Performance

```bash
# Parallel backup processing
pg_dump -j 4 $DATABASE_URL -f backup.sql

# Compression optimization
pg_dump $DATABASE_URL -f backup.sql --compress=9

# Network optimization
pg_dump -h $DB_HOST $DATABASE_URL -f backup.sql --jobs=4
```

### 2. Storage Optimization

- **Compression**: gzip with level 9
- **Deduplication**: Block-level deduplication
- **Tiering**: Hot data on SSD, cold data on HDD

### 3. Recovery Performance

- **Parallel Restore**: Use multiple workers
- **Index Recreation**: Delayed index creation
- **Connection Pooling**: Optimize connection usage

## Cost Management

### 1. Storage Costs

- **Local Storage**: $0.10/GB/month
- **AWS S3 Standard**: $0.023/GB/month
- **AWS S3 Glacier**: $0.004/GB/month (for long-term)
- **GCS Standard**: $0.020/GB/month

### 2. Transfer Costs

- **AWS Data Transfer**: $0.09/GB (outbound)
- **GCS Data Transfer**: $0.12/GB (outbound)
- **Inter-region**: Additional charges apply

### 3. Optimization Strategies

- **Lifecycle Policies**: Move old backups to cheaper storage
- **Compression**: Reduce storage by 70-80%
- **Deduplication**: Eliminate redundant data
- **Regional Selection**: Choose cost-effective regions

## Troubleshooting

### Common Issues

#### 1. Backup Failures

```bash
# Check pg_dump logs
tail -f /var/log/postgresql/pg_dump.log

# Check disk space
df -h /backups

# Check database locks
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

#### 2. Restore Failures

```bash
# Check database permissions
psql -c "SELECT current_user;"

# Check table existence
psql -c "\dt"

# Check foreign key constraints
psql -c "SELECT * FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';"
```

#### 3. Performance Issues

```bash
# Monitor backup progress
ps aux | grep pg_dump

# Check I/O statistics
iostat -x 1

# Monitor memory usage
free -h
```

### Debug Commands

```bash
# Test database connectivity
pg_isready -h $DB_HOST -p $DB_PORT

# Check backup file integrity
file backup.sql

# Verify backup content
head -20 backup.sql

# Check backup size
du -sh backup.sql

# Monitor backup process
ps aux | grep pg_dump
```

## Best Practices

### 1. Backup Strategy

- **3-2-1 Rule**: 3 copies, 2 media types, 1 offsite
- **Regular Testing**: Test restores quarterly
- **Documentation**: Document all procedures
- **Automation**: Automate all backup processes

### 2. Security

- **Encryption**: Encrypt all backup files
- **Access Control**: Limit backup file access
- **Audit Logging**: Log all backup operations
- **Regular Audits**: Review backup security annually

### 3. Performance

- **Off-peak Scheduling**: Run backups during low-traffic periods
- **Resource Allocation**: Allocate sufficient resources
- **Monitoring**: Monitor backup performance
- **Optimization**: Regularly optimize backup processes

### 4. Recovery

- **RTO**: Recovery Time Objective < 4 hours
- **RPO**: Recovery Point Objective < 1 hour
- **Testing**: Regular disaster recovery testing
- **Documentation**: Maintain current recovery procedures

## Emergency Procedures

### 1. Critical Data Loss

1. **Immediate Actions**
   - Stop all write operations
   - Isolate affected systems
   - Notify stakeholders

2. **Recovery Steps**
   - Identify latest valid backup
   - Restore to test environment first
   - Validate data integrity
   - Restore to production

3. **Post-Recovery**
   - Investigate root cause
   - Implement preventive measures
   - Update recovery procedures

### 2. Ransomware Attack

1. **Immediate Response**
   - Isolate infected systems
   - Preserve evidence
   - Notify security team

2. **Recovery Process**
   - Restore from clean backup
   - Scan for malware
   - Update security measures
   - Monitor for re-infection

## Support

For backup and disaster recovery issues:

1. Check backup logs
2. Verify system health
3. Test backup integrity
4. Review recovery procedures
5. Contact support if needed

## Related Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Database Guide](DATABASE_SETUP.md)
- [Security Guide](SECURITY.md)
- [Monitoring Guide](UPTIMEROBOT_SETUP.md)
