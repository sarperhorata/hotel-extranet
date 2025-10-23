-- Create performance_logs table (Performance monitoring)
CREATE TABLE IF NOT EXISTS performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation VARCHAR(255) NOT NULL,
    duration_ms INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_performance_logs_operation ON performance_logs(operation);
CREATE INDEX IF NOT EXISTS idx_performance_logs_duration ON performance_logs(duration_ms);
CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at ON performance_logs(created_at);

-- Create health_checks table (Health check history)
CREATE TABLE IF NOT EXISTS health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL, -- healthy, unhealthy, degraded
    services JSONB NOT NULL,
    metrics JSONB,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at ON health_checks(created_at);

-- Create uptime_robot_monitors table (UptimeRobot monitor configurations)
CREATE TABLE IF NOT EXISTS uptime_robot_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL, -- http, https, ping, port
    status VARCHAR(50) NOT NULL, -- up, down, paused
    uptime_ratio DECIMAL(5,2),
    response_time INTEGER,
    last_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uptime_robot_monitors_monitor_id ON uptime_robot_monitors(monitor_id);
CREATE INDEX IF NOT EXISTS idx_uptime_robot_monitors_status ON uptime_robot_monitors(status);
CREATE INDEX IF NOT EXISTS idx_uptime_robot_monitors_last_check ON uptime_robot_monitors(last_check);

-- Add updated_at trigger
CREATE TRIGGER update_uptime_robot_monitors_updated_at 
    BEFORE UPDATE ON uptime_robot_monitors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create system_alerts table (System alerts and notifications)
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL, -- performance, health, security, maintenance
    severity VARCHAR(50) NOT NULL, -- low, medium, high, critical
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    service VARCHAR(100),
    metadata JSONB,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_alerts_alert_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_is_resolved ON system_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_system_alerts_updated_at 
    BEFORE UPDATE ON system_alerts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create monitoring_settings table (Monitoring configuration)
CREATE TABLE IF NOT EXISTS monitoring_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    uptimerobot_enabled BOOLEAN DEFAULT false,
    uptimerobot_api_key VARCHAR(500),
    health_check_interval INTEGER DEFAULT 300, -- 5 minutes in seconds
    performance_logging BOOLEAN DEFAULT true,
    alert_notifications BOOLEAN DEFAULT true,
    notification_emails TEXT[],
    alert_thresholds JSONB DEFAULT '{
        "response_time": 5000,
        "memory_usage": 80,
        "cpu_usage": 80,
        "database_connections": 80
    }',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique settings per tenant
    UNIQUE(tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_settings_tenant_id ON monitoring_settings(tenant_id);

-- Add updated_at trigger
CREATE TRIGGER update_monitoring_settings_updated_at 
    BEFORE UPDATE ON monitoring_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up old performance logs
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete performance logs older than 30 days
    DELETE FROM performance_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old health checks
CREATE OR REPLACE FUNCTION cleanup_old_health_checks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete health checks older than 7 days
    DELETE FROM health_checks 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get system health summary
CREATE OR REPLACE FUNCTION get_system_health_summary(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    total_checks BIGINT,
    healthy_checks BIGINT,
    unhealthy_checks BIGINT,
    degraded_checks BIGINT,
    avg_response_time NUMERIC,
    uptime_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_checks,
        COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy_checks,
        COUNT(CASE WHEN status = 'unhealthy' THEN 1 END) as unhealthy_checks,
        COUNT(CASE WHEN status = 'degraded' THEN 1 END) as degraded_checks,
        ROUND(AVG(response_time_ms), 2) as avg_response_time,
        ROUND(
            (COUNT(CASE WHEN status = 'healthy' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 
            2
        ) as uptime_percentage
    FROM health_checks
    WHERE created_at >= NOW() - INTERVAL '1 hour' * p_hours;
END;
$$ LANGUAGE plpgsql;

-- Create function to get performance summary
CREATE OR REPLACE FUNCTION get_performance_summary(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    operation VARCHAR,
    call_count BIGINT,
    avg_duration NUMERIC,
    min_duration NUMERIC,
    max_duration NUMERIC,
    p95_duration NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.operation,
        COUNT(*) as call_count,
        ROUND(AVG(pl.duration_ms), 2) as avg_duration,
        MIN(pl.duration_ms) as min_duration,
        MAX(pl.duration_ms) as max_duration,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pl.duration_ms), 2) as p95_duration
    FROM performance_logs pl
    WHERE pl.created_at >= NOW() - INTERVAL '1 hour' * p_hours
    GROUP BY pl.operation
    ORDER BY avg_duration DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert default monitoring settings for existing tenants
INSERT INTO monitoring_settings (
    tenant_id, 
    uptimerobot_enabled, 
    health_check_interval, 
    performance_logging, 
    alert_notifications
)
SELECT 
    t.id,
    false,
    300, -- 5 minutes
    true,
    true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM monitoring_settings ms 
    WHERE ms.tenant_id = t.id
);
