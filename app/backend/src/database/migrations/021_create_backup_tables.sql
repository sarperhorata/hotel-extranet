-- Create database_backups table (Database backup tracking)
CREATE TABLE IF NOT EXISTS database_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id VARCHAR(255) NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    checksum VARCHAR(255),
    backup_type VARCHAR(50) NOT NULL, -- full, incremental, restore_point
    status VARCHAR(50) NOT NULL, -- pending, in_progress, completed, failed, restored
    error_message TEXT,
    cloud_storage_path VARCHAR(500),
    uploaded_to_cloud BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    restored_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_database_backups_backup_id ON database_backups(backup_id);
CREATE INDEX IF NOT EXISTS idx_database_backups_backup_type ON database_backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups(status);
CREATE INDEX IF NOT EXISTS idx_database_backups_created_at ON database_backups(created_at);
CREATE INDEX IF NOT EXISTS idx_database_backups_uploaded_to_cloud ON database_backups(uploaded_to_cloud);

-- Add updated_at trigger
CREATE TRIGGER update_database_backups_updated_at
    BEFORE UPDATE ON database_backups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create backup_settings table (Backup configuration)
CREATE TABLE IF NOT EXISTS backup_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    schedule VARCHAR(100) DEFAULT '0 2 * * *', -- Cron format
    retention_days INTEGER DEFAULT 30,
    compression_enabled BOOLEAN DEFAULT true,
    encryption_enabled BOOLEAN DEFAULT false,
    storage_provider VARCHAR(50) DEFAULT 'local', -- local, aws, gcs
    aws_bucket VARCHAR(255),
    aws_region VARCHAR(50),
    gcs_bucket VARCHAR(255),
    gcs_project_id VARCHAR(255),
    auto_cleanup_enabled BOOLEAN DEFAULT true,
    notification_emails TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique settings per tenant
    UNIQUE(tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_settings_tenant_id ON backup_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_settings_storage_provider ON backup_settings(storage_provider);

-- Add updated_at trigger
CREATE TRIGGER update_backup_settings_updated_at
    BEFORE UPDATE ON backup_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create backup_logs table (Backup operation logs)
CREATE TABLE IF NOT EXISTS backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    backup_id VARCHAR(255),
    operation VARCHAR(50) NOT NULL, -- create, restore, cleanup, verify
    status VARCHAR(50) NOT NULL, -- started, completed, failed
    message TEXT,
    duration_ms INTEGER,
    created_by UUID, -- user_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_logs_tenant_id ON backup_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_logs_backup_id ON backup_logs(backup_id);
CREATE INDEX IF NOT EXISTS idx_backup_logs_operation ON backup_logs(operation);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at);

-- Create backup_schedules table (Scheduled backup jobs)
CREATE TABLE IF NOT EXISTS backup_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    schedule_name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    backup_type VARCHAR(50) NOT NULL DEFAULT 'full',
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_schedules_tenant_id ON backup_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_schedule_name ON backup_schedules(schedule_name);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_is_active ON backup_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_next_run ON backup_schedules(next_run);

-- Add updated_at trigger
CREATE TRIGGER update_backup_schedules_updated_at
    BEFORE UPDATE ON backup_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create backup_notifications table (Backup notification settings)
CREATE TABLE IF NOT EXISTS backup_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- success, failure, warning
    email_enabled BOOLEAN DEFAULT true,
    webhook_enabled BOOLEAN DEFAULT false,
    webhook_url VARCHAR(500),
    notification_emails TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_notifications_tenant_id ON backup_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_notifications_type ON backup_notifications(notification_type);

-- Add updated_at trigger
CREATE TRIGGER update_backup_notifications_updated_at
    BEFORE UPDATE ON backup_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default backup settings for existing tenants
INSERT INTO backup_settings (
    tenant_id,
    schedule,
    retention_days,
    compression_enabled,
    storage_provider,
    auto_cleanup_enabled
)
SELECT
    t.id,
    '0 2 * * *', -- Daily at 2 AM
    30,
    true,
    'local',
    true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM backup_settings bs
    WHERE bs.tenant_id = t.id
);

-- Insert default backup notifications for existing tenants
INSERT INTO backup_notifications (
    tenant_id,
    notification_type,
    email_enabled,
    notification_emails
)
SELECT
    t.id,
    'success',
    true,
    ARRAY['admin@' || t.domain]
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM backup_notifications bn
    WHERE bn.tenant_id = t.id AND bn.notification_type = 'success'
);

INSERT INTO backup_notifications (
    tenant_id,
    notification_type,
    email_enabled,
    notification_emails
)
SELECT
    t.id,
    'failure',
    true,
    ARRAY['admin@' || t.domain]
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM backup_notifications bn
    WHERE bn.tenant_id = t.id AND bn.notification_type = 'failure'
);

-- Create function to get backup summary
CREATE OR REPLACE FUNCTION get_backup_summary(p_tenant_id UUID)
RETURNS TABLE (
    total_backups BIGINT,
    successful_backups BIGINT,
    failed_backups BIGINT,
    total_size BIGINT,
    latest_backup TIMESTAMP,
    next_scheduled_backup TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_backups,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_backups,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN file_size ELSE 0 END), 0) as total_size,
        MAX(created_at) as latest_backup,
        MIN(next_run) as next_scheduled_backup
    FROM database_backups db
    WHERE db.id IN (
        SELECT bs.id FROM backup_settings bs WHERE bs.tenant_id = p_tenant_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to check backup health
CREATE OR REPLACE FUNCTION check_backup_health(p_tenant_id UUID)
RETURNS TABLE (
    status VARCHAR,
    message TEXT,
    last_backup_age_hours INTEGER,
    backups_in_last_7_days BIGINT
) AS $$
DECLARE
    last_backup_time TIMESTAMP;
    backup_count_7d BIGINT;
BEGIN
    -- Get last backup time
    SELECT MAX(created_at) INTO last_backup_time
    FROM database_backups
    WHERE status = 'completed';

    -- Count backups in last 7 days
    SELECT COUNT(*) INTO backup_count_7d
    FROM database_backups
    WHERE created_at >= NOW() - INTERVAL '7 days'
    AND status = 'completed';

    -- Determine status
    IF last_backup_time IS NULL THEN
        RETURN QUERY SELECT 'critical'::VARCHAR, 'No backups found'::TEXT, NULL::INTEGER, backup_count_7d::BIGINT;
    ELSIF last_backup_time < NOW() - INTERVAL '24 hours' THEN
        RETURN QUERY SELECT 'warning'::VARCHAR, 'Last backup is older than 24 hours'::TEXT, EXTRACT(EPOCH FROM (NOW() - last_backup_time))/3600::INTEGER, backup_count_7d::BIGINT;
    ELSIF backup_count_7d < 7 THEN
        RETURN QUERY SELECT 'warning'::VARCHAR, 'Less than 7 backups in last 7 days'::TEXT, EXTRACT(EPOCH FROM (NOW() - last_backup_time))/3600::INTEGER, backup_count_7d::BIGINT;
    ELSE
        RETURN QUERY SELECT 'healthy'::VARCHAR, 'Backup system is healthy'::TEXT, EXTRACT(EPOCH FROM (NOW() - last_backup_time))/3600::INTEGER, backup_count_7d::BIGINT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to log backup operations
CREATE OR REPLACE FUNCTION log_backup_operation(
    p_tenant_id UUID,
    p_backup_id VARCHAR,
    p_operation VARCHAR,
    p_status VARCHAR,
    p_message TEXT,
    p_duration_ms INTEGER DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO backup_logs (
        tenant_id, backup_id, operation, status, message, duration_ms, created_by
    ) VALUES (
        p_tenant_id, p_backup_id, p_operation, p_status, p_message, p_duration_ms, p_created_by
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql;
