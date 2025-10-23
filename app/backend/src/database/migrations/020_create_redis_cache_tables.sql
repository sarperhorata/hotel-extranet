-- Create Redis cache configuration table
CREATE TABLE IF NOT EXISTS redis_cache_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    host VARCHAR(255) NOT NULL DEFAULT 'localhost',
    port INTEGER NOT NULL DEFAULT 6379,
    password VARCHAR(500),
    db INTEGER NOT NULL DEFAULT 0,
    max_connections INTEGER DEFAULT 10,
    retry_delay_on_failover INTEGER DEFAULT 100,
    max_retries_per_request INTEGER DEFAULT 3,
    lazy_connect BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique config per tenant
    UNIQUE(tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_redis_cache_config_tenant_id ON redis_cache_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_redis_cache_config_is_active ON redis_cache_config(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_redis_cache_config_updated_at 
    BEFORE UPDATE ON redis_cache_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create cache patterns table (Cache key patterns and TTLs)
CREATE TABLE IF NOT EXISTS cache_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    pattern_name VARCHAR(100) NOT NULL,
    pattern VARCHAR(255) NOT NULL,
    ttl_seconds INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique pattern per tenant
    UNIQUE(tenant_id, pattern_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cache_patterns_tenant_id ON cache_patterns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cache_patterns_pattern_name ON cache_patterns(pattern_name);
CREATE INDEX IF NOT EXISTS idx_cache_patterns_is_active ON cache_patterns(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_cache_patterns_updated_at 
    BEFORE UPDATE ON cache_patterns 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create cache performance logs table
CREATE TABLE IF NOT EXISTS cache_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL, -- get, set, del, exists
    cache_key VARCHAR(500) NOT NULL,
    response_time_ms INTEGER,
    hit BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cache_performance_logs_tenant_id ON cache_performance_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cache_performance_logs_operation ON cache_performance_logs(operation);
CREATE INDEX IF NOT EXISTS idx_cache_performance_logs_hit ON cache_performance_logs(hit);
CREATE INDEX IF NOT EXISTS idx_cache_performance_logs_created_at ON cache_performance_logs(created_at);

-- Create cache statistics table
CREATE TABLE IF NOT EXISTS cache_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_requests BIGINT DEFAULT 0,
    cache_hits BIGINT DEFAULT 0,
    cache_misses BIGINT DEFAULT 0,
    hit_rate DECIMAL(5,2) DEFAULT 0.00,
    average_response_time_ms DECIMAL(8,2) DEFAULT 0.00,
    total_response_time_ms BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique stats per tenant per date
    UNIQUE(tenant_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cache_statistics_tenant_id ON cache_statistics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_date ON cache_statistics(date);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_hit_rate ON cache_statistics(hit_rate);

-- Add updated_at trigger
CREATE TRIGGER update_cache_statistics_updated_at 
    BEFORE UPDATE ON cache_statistics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create cache invalidation logs table
CREATE TABLE IF NOT EXISTS cache_invalidation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    pattern VARCHAR(255) NOT NULL,
    keys_affected INTEGER DEFAULT 0,
    invalidation_type VARCHAR(50) NOT NULL, -- manual, automatic, scheduled
    triggered_by UUID, -- user_id who triggered
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_logs_tenant_id ON cache_invalidation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_logs_pattern ON cache_invalidation_logs(pattern);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_logs_type ON cache_invalidation_logs(invalidation_type);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_logs_created_at ON cache_invalidation_logs(created_at);

-- Insert default Redis cache configuration for existing tenants
INSERT INTO redis_cache_config (
    tenant_id, 
    host, 
    port, 
    db, 
    max_connections,
    is_active
)
SELECT 
    t.id,
    COALESCE(NULLIF(current_setting('app.redis_host', true), ''), 'localhost'),
    COALESCE(NULLIF(current_setting('app.redis_port', true), '')::INTEGER, 6379),
    COALESCE(NULLIF(current_setting('app.redis_db', true), '')::INTEGER, 0),
    10,
    true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM redis_cache_config rcc 
    WHERE rcc.tenant_id = t.id
);

-- Insert default cache patterns for existing tenants
INSERT INTO cache_patterns (tenant_id, pattern_name, pattern, ttl_seconds, description)
SELECT 
    t.id,
    'user',
    'user:*',
    3600,
    'User data cache - 1 hour TTL'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM cache_patterns cp 
    WHERE cp.tenant_id = t.id AND cp.pattern_name = 'user'
);

INSERT INTO cache_patterns (tenant_id, pattern_name, pattern, ttl_seconds, description)
SELECT 
    t.id,
    'property',
    'property:*',
    1800,
    'Property data cache - 30 minutes TTL'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM cache_patterns cp 
    WHERE cp.tenant_id = t.id AND cp.pattern_name = 'property'
);

INSERT INTO cache_patterns (tenant_id, pattern_name, pattern, ttl_seconds, description)
SELECT 
    t.id,
    'booking',
    'booking:*',
    3600,
    'Booking data cache - 1 hour TTL'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM cache_patterns cp 
    WHERE cp.tenant_id = t.id AND cp.pattern_name = 'booking'
);

INSERT INTO cache_patterns (tenant_id, pattern_name, pattern, ttl_seconds, description)
SELECT 
    t.id,
    'search',
    'search:*',
    600,
    'Search results cache - 10 minutes TTL'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM cache_patterns cp 
    WHERE cp.tenant_id = t.id AND cp.pattern_name = 'search'
);

INSERT INTO cache_patterns (tenant_id, pattern_name, pattern, ttl_seconds, description)
SELECT 
    t.id,
    'inventory',
    'inventory:*',
    300,
    'Inventory data cache - 5 minutes TTL'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM cache_patterns cp 
    WHERE cp.tenant_id = t.id AND cp.pattern_name = 'inventory'
);

INSERT INTO cache_patterns (tenant_id, pattern_name, pattern, ttl_seconds, description)
SELECT 
    t.id,
    'rate',
    'rate:*',
    600,
    'Rate data cache - 10 minutes TTL'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM cache_patterns cp 
    WHERE cp.tenant_id = t.id AND cp.pattern_name = 'rate'
);

-- Create function to update cache statistics
CREATE OR REPLACE FUNCTION update_cache_statistics(
    p_tenant_id UUID,
    p_date DATE,
    p_hit BOOLEAN,
    p_response_time_ms INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO cache_statistics (
        tenant_id, date, total_requests, cache_hits, cache_misses,
        total_response_time_ms, average_response_time_ms, hit_rate
    )
    VALUES (
        p_tenant_id, p_date, 1,
        CASE WHEN p_hit THEN 1 ELSE 0 END,
        CASE WHEN p_hit THEN 0 ELSE 1 END,
        p_response_time_ms, p_response_time_ms,
        CASE WHEN p_hit THEN 100.00 ELSE 0.00 END
    )
    ON CONFLICT (tenant_id, date)
    DO UPDATE SET
        total_requests = cache_statistics.total_requests + 1,
        cache_hits = cache_statistics.cache_hits + CASE WHEN p_hit THEN 1 ELSE 0 END,
        cache_misses = cache_statistics.cache_misses + CASE WHEN p_hit THEN 0 ELSE 1 END,
        total_response_time_ms = cache_statistics.total_response_time_ms + p_response_time_ms,
        average_response_time_ms = (cache_statistics.total_response_time_ms + p_response_time_ms)::DECIMAL / (cache_statistics.total_requests + 1),
        hit_rate = (cache_statistics.cache_hits + CASE WHEN p_hit THEN 1 ELSE 0 END)::DECIMAL / (cache_statistics.total_requests + 1) * 100,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to get cache performance summary
CREATE OR REPLACE FUNCTION get_cache_performance_summary(
    p_tenant_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_requests BIGINT,
    cache_hits BIGINT,
    cache_misses BIGINT,
    hit_rate DECIMAL,
    avg_response_time DECIMAL,
    total_response_time BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(cs.total_requests), 0) as total_requests,
        COALESCE(SUM(cs.cache_hits), 0) as cache_hits,
        COALESCE(SUM(cs.cache_misses), 0) as cache_misses,
        CASE 
            WHEN SUM(cs.total_requests) > 0 THEN 
                ROUND((SUM(cs.cache_hits)::DECIMAL / SUM(cs.total_requests)) * 100, 2)
            ELSE 0 
        END as hit_rate,
        CASE 
            WHEN SUM(cs.total_requests) > 0 THEN 
                ROUND(SUM(cs.total_response_time_ms)::DECIMAL / SUM(cs.total_requests), 2)
            ELSE 0 
        END as avg_response_time,
        COALESCE(SUM(cs.total_response_time_ms), 0) as total_response_time
    FROM cache_statistics cs
    WHERE cs.tenant_id = p_tenant_id 
    AND cs.date >= CURRENT_DATE - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old cache performance logs
CREATE OR REPLACE FUNCTION cleanup_old_cache_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete cache performance logs older than 30 days
    DELETE FROM cache_performance_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
