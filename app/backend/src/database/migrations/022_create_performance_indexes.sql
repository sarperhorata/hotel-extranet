-- Performance optimization indexes for Hotel Extranet database

-- User authentication performance
CREATE INDEX IF NOT EXISTS idx_users_email_tenant_active ON users(email, tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);

-- Property search performance
CREATE INDEX IF NOT EXISTS idx_properties_tenant_active ON properties(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(city, country, tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_search ON properties(name, city, country) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_properties_rating ON properties(rating DESC, tenant_id);

-- Room availability performance
CREATE INDEX IF NOT EXISTS idx_rooms_property_active ON rooms(property_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_type_occupancy ON rooms(room_type, max_occupancy, property_id);

-- Inventory performance (most critical for search and booking)
CREATE INDEX IF NOT EXISTS idx_room_inventory_property_date ON room_inventory(property_id, date);
CREATE INDEX IF NOT EXISTS idx_room_inventory_date_available ON room_inventory(date, available_rooms DESC) WHERE available_rooms > 0;
CREATE INDEX IF NOT EXISTS idx_room_inventory_tenant_date ON room_inventory(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_room_inventory_tenant_room_date ON room_inventory(tenant_id, room_id, date);

-- Booking performance
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_checkin_checkout ON bookings(check_in, check_out, tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email ON bookings(guest_email, tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_date ON bookings(property_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_reference_tenant ON bookings(booking_reference, tenant_id);

-- Payment performance
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON payments(tenant_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_tenant ON payments(booking_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_tenant ON payments(transaction_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at_tenant ON payments(created_at DESC, tenant_id);

-- Channel manager performance
CREATE INDEX IF NOT EXISTS idx_channels_tenant_active ON channels(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_channels_type_tenant ON channels(channel_type, tenant_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_tenant_external ON channel_mappings(tenant_id, external_id);

-- Search performance optimization
CREATE INDEX IF NOT EXISTS idx_properties_search_vector ON properties USING gin(to_tsvector('english', name || ' ' || city || ' ' || country));
CREATE INDEX IF NOT EXISTS idx_rooms_search_vector ON rooms USING gin(to_tsvector('english', room_type || ' ' || description));

-- Rate management performance
CREATE INDEX IF NOT EXISTS idx_rates_property_date ON rates(property_id, date);
CREATE INDEX IF NOT EXISTS idx_rates_tenant_date ON rates(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_rates_tenant_room_date ON rates(tenant_id, room_id, date);

-- Notification performance
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_type ON notifications(tenant_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_email_tenant ON notifications(email, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_tenant ON notifications(created_at DESC, tenant_id);

-- Audit log performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON audit_logs(tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_tenant ON audit_logs(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_tenant ON audit_logs(created_at DESC, tenant_id);

-- File management performance
CREATE INDEX IF NOT EXISTS idx_files_tenant_active ON files(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_files_tenant_folder ON files(tenant_id, folder);
CREATE INDEX IF NOT EXISTS idx_files_mime_type_tenant ON files(mime_type, tenant_id);

-- VCC performance
CREATE INDEX IF NOT EXISTS idx_vcc_balances_tenant_status ON vcc_balances(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vcc_balances_payment_tenant ON vcc_balances(payment_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_vcc_balances_created_at_tenant ON vcc_balances(created_at DESC, tenant_id);

-- Payment policy performance
CREATE INDEX IF NOT EXISTS idx_payment_policies_tenant_active ON payment_policies(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_payment_policies_tenant_type ON payment_policies(tenant_id, policy_type);

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_performance_logs_operation_tenant ON performance_logs(operation, tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_duration_tenant ON performance_logs(duration_ms DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at_tenant ON performance_logs(created_at DESC, tenant_id);

-- Backup performance
CREATE INDEX IF NOT EXISTS idx_database_backups_tenant_status ON database_backups(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_database_backups_type_tenant ON database_backups(backup_type, tenant_id);
CREATE INDEX IF NOT EXISTS idx_database_backups_created_at_tenant ON database_backups(created_at DESC, tenant_id);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates_status ON bookings(property_id, check_in, check_out, status);
CREATE INDEX IF NOT EXISTS idx_inventory_property_room_dates ON room_inventory(property_id, room_id, date, available_rooms);
CREATE INDEX IF NOT EXISTS idx_search_properties_location_dates ON properties(city, country, tenant_id) INCLUDE (name, rating, base_rate);

-- Partial indexes for active records (most commonly queried)
CREATE INDEX IF NOT EXISTS idx_users_active_tenant ON users(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_properties_active_tenant ON properties(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rooms_active_property ON rooms(property_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_channels_active_tenant ON channels(tenant_id, is_active) WHERE is_active = true;

-- GIN indexes for JSON fields (if used)
CREATE INDEX IF NOT EXISTS idx_properties_amenities ON properties USING gin(amenities);
CREATE INDEX IF NOT EXISTS idx_bookings_metadata ON bookings USING gin(booking_metadata);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_response ON payments USING gin(gateway_response);

-- BRIN indexes for time-series data (if dealing with large historical data)
-- Note: These are useful for very large tables with chronological data
-- CREATE INDEX IF NOT EXISTS idx_bookings_created_at_brin ON bookings USING brin(created_at);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_brin ON audit_logs USING brin(created_at);

-- Function to analyze table statistics for query optimization
CREATE OR REPLACE FUNCTION analyze_table_stats(table_name TEXT)
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    index_count INTEGER,
    table_size TEXT,
    index_size TEXT,
    last_analyze TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT
            %L::TEXT as table_name,
            (SELECT reltuples::BIGINT FROM pg_class WHERE relname = %L) as row_count,
            (SELECT count(*)::INTEGER FROM pg_indexes WHERE tablename = %L) as index_count,
            pg_size_pretty(pg_total_relation_size(%L)) as table_size,
            pg_size_pretty(pg_indexes_size(%L)) as index_size,
            (SELECT greatest(pg_stat_get_last_analyze_time(c.oid), pg_stat_get_last_vacuum_time(c.oid))
             FROM pg_class c WHERE c.relname = %L) as last_analyze
    ', table_name, table_name, table_name, table_name, table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Function to get slow queries for optimization
CREATE OR REPLACE FUNCTION get_slow_queries(threshold_ms INTEGER DEFAULT 1000)
RETURNS TABLE (
    query TEXT,
    calls BIGINT,
    total_time NUMERIC,
    avg_time NUMERIC,
    max_time NUMERIC,
    last_called TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        query,
        calls,
        total_time,
        avg_time,
        max_time,
        last_called
    FROM (
        SELECT
            query,
            calls,
            total_time,
            (total_time / calls) as avg_time,
            max_time,
            now() - (max_time / 1000 * interval '1 second') as last_called
        FROM pg_stat_statements
        WHERE total_time / calls > $1
        ORDER BY avg_time DESC
    ) slow_queries;
END;
$$ LANGUAGE plpgsql;

-- Function to optimize table indexes
CREATE OR REPLACE FUNCTION optimize_table_indexes(table_name TEXT)
RETURNS TABLE (
    recommendation TEXT,
    impact TEXT,
    command TEXT
) AS $$
DECLARE
    unused_indexes RECORD;
    missing_indexes RECORD;
    duplicate_indexes RECORD;
BEGIN
    -- Find unused indexes
    FOR unused_indexes IN
        SELECT
            schemaname,
            tablename,
            indexname,
            idx_scan as scans
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        AND tablename = table_name
        AND idx_scan = 0
        ORDER BY indexname
    LOOP
        recommendation := format('Drop unused index: %s', unused_indexes.indexname);
        impact := 'Low - No performance impact';
        command := format('DROP INDEX IF EXISTS %s;', unused_indexes.indexname);
        RETURN NEXT;
    END LOOP;

    -- Suggest missing indexes based on slow queries
    FOR missing_indexes IN
        SELECT
            'Missing index on frequently queried columns' as recommendation,
            'High - Significant performance improvement' as impact,
            format('CREATE INDEX CONCURRENTLY idx_%s_%s ON %s(%s);',
                   table_name, array_to_string(columns, '_'), table_name,
                   array_to_string(columns, ', ')) as command
        FROM (
            SELECT array_agg(column_name) as columns
            FROM (
                SELECT unnest(array['tenant_id', 'status', 'created_at']) as column_name
            ) cols
            WHERE NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE tablename = table_name
                AND indexdef LIKE '%' || column_name || '%'
            )
        ) missing
    LOOP
        RETURN NEXT;
    END LOOP;

    -- Find potentially redundant indexes
    FOR duplicate_indexes IN
        SELECT
            'Consider consolidating indexes' as recommendation,
            'Medium - Space and maintenance savings' as impact,
            format('DROP INDEX %s; CREATE INDEX CONCURRENTLY idx_%s_%s ON %s(%s);',
                   index1, table_name, 'consolidated', table_name, columns) as command
        FROM (
            SELECT
                i1.indexname as index1,
                i2.indexname as index2,
                array_agg(DISTINCT unnest(array[i1.column_names, i2.column_names])) as columns
            FROM (
                SELECT indexname, array_agg(attname ORDER BY attnum) as column_names
                FROM (
                    SELECT indexname, attname, attnum
                    FROM pg_indexes i
                    JOIN pg_attribute a ON a.attrelid = (SELECT oid FROM pg_class WHERE relname = i.tablename)
                    WHERE i.tablename = table_name
                ) idx_cols
                GROUP BY indexname
            ) i1
            JOIN (
                SELECT indexname, array_agg(attname ORDER BY attnum) as column_names
                FROM (
                    SELECT indexname, attname, attnum
                    FROM pg_indexes i
                    JOIN pg_attribute a ON a.attrelid = (SELECT oid FROM pg_class WHERE relname = i.tablename)
                    WHERE i.tablename = table_name
                ) idx_cols
                GROUP BY indexname
            ) i2 ON i1.column_names = i2.column_names
            WHERE i1.indexname < i2.indexname
            GROUP BY i1.indexname, i2.indexname, i1.column_names
        ) dupes
    LOOP
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create view for database performance monitoring
CREATE OR REPLACE VIEW database_performance_stats AS
SELECT
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation,
    CASE
        WHEN n_distinct > 0 THEN
            (SELECT count(*) FROM information_schema.columns
             WHERE table_schema = schemaname AND table_name = tablename) / n_distinct::float
        ELSE 0
    END as selectivity,
    CASE
        WHEN correlation > 0.9 THEN 'Highly correlated'
        WHEN correlation > 0.7 THEN 'Well correlated'
        WHEN correlation > 0.5 THEN 'Moderately correlated'
        ELSE 'Poorly correlated'
    END as correlation_status
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- Create materialized view for frequently accessed data (if needed)
-- Note: This is commented out as it depends on specific use cases
/*
CREATE MATERIALIZED VIEW property_search_cache AS
SELECT
    p.id,
    p.name,
    p.city,
    p.country,
    p.rating,
    p.base_rate,
    p.amenities,
    ri.available_rooms,
    ri.date
FROM properties p
LEFT JOIN room_inventory ri ON p.id = ri.property_id
WHERE p.is_active = true
AND ri.available_rooms > 0
AND ri.date >= CURRENT_DATE;

CREATE INDEX idx_property_search_cache_location_date ON property_search_cache(city, country, date);
CREATE INDEX idx_property_search_cache_availability ON property_search_cache(available_rooms DESC, date);

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_property_search_cache()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY property_search_cache;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (this would be handled by a cron job or scheduled task)
-- SELECT cron.schedule('refresh-property-cache', '0 3 * * *', 'SELECT refresh_property_search_cache();');
*/

-- Create function to get query execution plan for optimization
CREATE OR REPLACE FUNCTION explain_query(query_text TEXT)
RETURNS TABLE (
    execution_plan TEXT
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('EXPLAIN (ANALYZE, BUFFERS) %s', query_text);
END;
$$ LANGUAGE plpgsql;

-- Create function to check index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    scans BIGINT,
    size TEXT,
    last_used TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name,
        i.index_name,
        s.idx_scan as scans,
        pg_size_pretty(pg_relation_size(i.index_oid)) as size,
        s.last_used
    FROM (
        SELECT
            schemaname || '.' || tablename as table_name,
            indexname as index_name,
            indexrelid as index_oid
        FROM pg_indexes
        WHERE schemaname = 'public'
    ) i
    JOIN (
        SELECT
            schemaname || '.' || tablename as table_name,
            indexname,
            idx_scan,
            CASE
                WHEN idx_scan > 0 THEN now() - (pg_stat_get_last_vacuum_time(c.oid) * interval '1 second')
                ELSE NULL
            END as last_used
        FROM pg_stat_user_indexes s
        JOIN pg_class c ON c.relname = s.relname
        WHERE schemaname = 'public'
    ) s ON i.table_name = s.table_name AND i.index_name = s.indexname
    JOIN (
        SELECT
            schemaname || '.' || tablename as table_name
        FROM pg_tables
        WHERE schemaname = 'public'
    ) t ON i.table_name = t.table_name
    ORDER BY scans DESC, size DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to monitor table bloat
CREATE OR REPLACE FUNCTION get_table_bloat()
RETURNS TABLE (
    table_name TEXT,
    real_size TEXT,
    extra_size TEXT,
    extra_ratio NUMERIC,
    fill_factor NUMERIC,
    bloat_size TEXT,
    bloat_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        table_name,
        pg_size_pretty(real_size) as real_size,
        pg_size_pretty(extra_size) as extra_size,
        extra_ratio,
        fill_factor,
        pg_size_pretty(bloat_size) as bloat_size,
        bloat_ratio
    FROM (
        SELECT
            schemaname || '.' || tablename as table_name,
            pg_relation_size(schemaname || '.' || tablename) as real_size,
            pg_relation_size(schemaname || '.' || tablename) - pg_total_relation_size(schemaname || '.' || tablename) as extra_size,
            CASE
                WHEN pg_relation_size(schemaname || '.' || tablename) > 0 THEN
                    (pg_relation_size(schemaname || '.' || tablename) - pg_total_relation_size(schemaname || '.' || tablename))::numeric / pg_relation_size(schemaname || '.' || tablename)
                ELSE 0
            END as extra_ratio,
            fillfactor as fill_factor,
            CASE
                WHEN pg_relation_size(schemaname || '.' || tablename) > 0 THEN
                    pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename)
                ELSE 0
            END as bloat_size,
            CASE
                WHEN pg_relation_size(schemaname || '.' || tablename) > 0 THEN
                    (pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename))::numeric / pg_total_relation_size(schemaname || '.' || tablename)
                ELSE 0
            END as bloat_ratio
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE schemaname = 'public'
        AND pg_total_relation_size(schemaname || '.' || tablename) > 0
    ) bloat_stats
    WHERE extra_ratio > 0.2
    ORDER BY bloat_ratio DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get database connection statistics
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS TABLE (
    total_connections INTEGER,
    active_connections INTEGER,
    idle_connections INTEGER,
    waiting_connections INTEGER,
    max_connections INTEGER,
    connection_utilization NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as waiting_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        (count(*)::numeric / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')) * 100 as connection_utilization
    FROM pg_stat_activity
    WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql;

-- Create function to get lock statistics for performance monitoring
CREATE OR REPLACE FUNCTION get_lock_stats()
RETURNS TABLE (
    lock_type TEXT,
    lock_mode TEXT,
    count INTEGER,
    waiting BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        locktype as lock_type,
        mode as lock_mode,
        count(*) as count,
        granted as waiting
    FROM pg_locks
    WHERE NOT granted
    GROUP BY locktype, mode, granted
    UNION ALL
    SELECT
        locktype as lock_type,
        mode as lock_mode,
        count(*) as count,
        granted as waiting
    FROM pg_locks
    WHERE granted
    GROUP BY locktype, mode, granted
    ORDER BY waiting, count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to optimize database configuration for performance
CREATE OR REPLACE FUNCTION get_performance_recommendations()
RETURNS TABLE (
    category TEXT,
    recommendation TEXT,
    current_value TEXT,
    recommended_value TEXT,
    impact TEXT
) AS $$
BEGIN
    -- Memory configuration recommendations
    RETURN QUERY
    SELECT
        'Memory'::TEXT as category,
        'shared_buffers should be 25% of RAM'::TEXT as recommendation,
        (SELECT setting FROM pg_settings WHERE name = 'shared_buffers') as current_value,
        '25% of total RAM'::TEXT as recommended_value,
        'High'::TEXT as impact
    WHERE (SELECT setting FROM pg_settings WHERE name = 'shared_buffers')::int < (SELECT total_memory FROM (SELECT (memory_mb * 0.25)::int as total_memory FROM (SELECT (pg_size_bytes(setting) / 1024 / 1024)::int as memory_mb FROM pg_settings WHERE name = 'shared_buffers') mem) calc);

    -- Checkpoint configuration
    RETURN QUERY
    SELECT
        'Checkpoint'::TEXT as category,
        'checkpoint_segments should be increased'::TEXT as recommendation,
        (SELECT setting FROM pg_settings WHERE name = 'checkpoint_segments') as current_value,
        '256'::TEXT as recommended_value,
        'Medium'::TEXT as impact
    WHERE (SELECT setting FROM pg_settings WHERE name = 'checkpoint_segments')::int < 256;

    -- WAL configuration
    RETURN QUERY
    SELECT
        'WAL'::TEXT as category,
        'wal_buffers should be increased'::TEXT as recommendation,
        (SELECT setting FROM pg_settings WHERE name = 'wal_buffers') as current_value,
        '16MB'::TEXT as recommended_value,
        'Medium'::TEXT as impact
    WHERE pg_size_bytes((SELECT setting FROM pg_settings WHERE name = 'wal_buffers')) < 16 * 1024 * 1024;

    -- Connection configuration
    RETURN QUERY
    SELECT
        'Connections'::TEXT as category,
        'max_connections may be too high'::TEXT as recommendation,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as current_value,
        '200'::TEXT as recommended_value,
        'Low'::TEXT as impact
    WHERE (SELECT setting FROM pg_settings WHERE name = 'max_connections')::int > 200;

    -- Query planning
    RETURN QUERY
    SELECT
        'Query Planning'::TEXT as category,
        'effective_cache_size should be set'::TEXT as recommendation,
        (SELECT setting FROM pg_settings WHERE name = 'effective_cache_size') as current_value,
        '75% of total RAM'::TEXT as recommended_value,
        'High'::TEXT as impact
    WHERE (SELECT setting FROM pg_settings WHERE name = 'effective_cache_size') = '0';

    -- Maintenance work memory
    RETURN QUERY
    SELECT
        'Maintenance'::TEXT as category,
        'maintenance_work_mem should be increased'::TEXT as recommendation,
        (SELECT setting FROM pg_settings WHERE name = 'maintenance_work_mem') as current_value,
        '256MB'::TEXT as recommended_value,
        'Medium'::TEXT as impact
    WHERE pg_size_bytes((SELECT setting FROM pg_settings WHERE name = 'maintenance_work_mem')) < 256 * 1024 * 1024;
END;
$$ LANGUAGE plpgsql;

-- Create function to monitor long-running queries
CREATE OR REPLACE FUNCTION get_long_running_queries(threshold_minutes INTEGER DEFAULT 5)
RETURNS TABLE (
    pid INTEGER,
    duration INTERVAL,
    query TEXT,
    state TEXT,
    wait_event TEXT,
    state_change TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pid,
        now() - query_start as duration,
        query,
        state,
        wait_event,
        state_change
    FROM pg_stat_activity
    WHERE state = 'active'
    AND now() - query_start > interval '1 minute' * $1
    ORDER BY duration DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get table and index sizes for monitoring
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
    table_name TEXT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name,
        pg_size_pretty(pg_total_relation_size(t.table_name)) as table_size,
        pg_size_pretty(pg_indexes_size(t.table_name)) as index_size,
        pg_size_pretty(pg_total_relation_size(t.table_name) + pg_indexes_size(t.table_name)) as total_size,
        (SELECT n_tup_ins - n_tup_del FROM pg_stat_user_tables WHERE relname = t.table_name)::BIGINT as row_count
    FROM (
        SELECT
            schemaname || '.' || tablename as table_name
        FROM pg_tables
        WHERE schemaname = 'public'
    ) t
    ORDER BY pg_total_relation_size(t.table_name) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create view for comprehensive database health monitoring
CREATE OR REPLACE VIEW database_health_overview AS
SELECT
    'connections' as metric_category,
    json_build_object(
        'total_connections', total_connections,
        'active_connections', active_connections,
        'idle_connections', idle_connections,
        'waiting_connections', waiting_connections,
        'max_connections', max_connections,
        'connection_utilization', connection_utilization
    ) as metrics
FROM get_connection_stats()

UNION ALL

SELECT
    'performance' as metric_category,
    json_build_object(
        'cache_hit_ratio', (SELECT round(sum(blks_hit)::numeric / (sum(blks_hit) + sum(blks_read)), 4) * 100 FROM pg_stat_database WHERE datname = current_database()),
        'avg_query_time', (SELECT round(avg(total_time / calls), 4) FROM pg_stat_statements WHERE calls > 0),
        'slow_queries', (SELECT count(*) FROM pg_stat_statements WHERE total_time / calls > 1000)
    ) as metrics

UNION ALL

SELECT
    'storage' as metric_category,
    json_build_object(
        'database_size', pg_size_pretty(pg_database_size(current_database())),
        'wal_size', pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), pg_walfile_name(pg_current_wal_lsn()))::bigint),
        'largest_tables', (
            SELECT json_agg(json_build_object('table', table_name, 'size', total_size))
            FROM get_table_sizes()
            LIMIT 5
        )
    ) as metrics;

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION analyze_table_stats(TEXT) TO authenticated_user;
GRANT EXECUTE ON FUNCTION get_slow_queries(INTEGER) TO authenticated_user;
GRANT EXECUTE ON FUNCTION optimize_table_indexes(TEXT) TO authenticated_user;
GRANT EXECUTE ON FUNCTION explain_query(TEXT) TO authenticated_user;
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO authenticated_user;
GRANT EXECUTE ON FUNCTION get_table_bloat() TO authenticated_user;
GRANT EXECUTE ON FUNCTION get_connection_stats() TO authenticated_user;
GRANT EXECUTE ON FUNCTION get_lock_stats() TO authenticated_user;
GRANT EXECUTE ON FUNCTION get_performance_recommendations() TO authenticated_user;
GRANT EXECUTE ON FUNCTION get_long_running_queries(INTEGER) TO authenticated_user;
GRANT EXECUTE ON FUNCTION get_table_sizes() TO authenticated_user;
GRANT SELECT ON database_performance_stats TO authenticated_user;
GRANT SELECT ON database_health_overview TO authenticated_user;
