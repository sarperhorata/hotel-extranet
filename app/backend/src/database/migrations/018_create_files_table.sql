-- Create files table (File storage and management)
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- aws, cloudinary, local
    folder VARCHAR(100) DEFAULT 'uploads',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_files_provider ON files(provider);
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_is_active ON files(is_active);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_files_updated_at 
    BEFORE UPDATE ON files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create file_storage_settings table
CREATE TABLE IF NOT EXISTS file_storage_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    default_provider VARCHAR(50) DEFAULT 'local', -- aws, cloudinary, local
    max_file_size BIGINT DEFAULT 5242880, -- 5MB in bytes
    allowed_mime_types TEXT[] DEFAULT ARRAY[
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    auto_optimize_images BOOLEAN DEFAULT true,
    generate_thumbnails BOOLEAN DEFAULT true,
    cdn_enabled BOOLEAN DEFAULT false,
    cdn_url VARCHAR(500),
    retention_days INTEGER DEFAULT 365,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique settings per tenant
    UNIQUE(tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_storage_settings_tenant_id ON file_storage_settings(tenant_id);

-- Add updated_at trigger
CREATE TRIGGER update_file_storage_settings_updated_at 
    BEFORE UPDATE ON file_storage_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create file_thumbnails table (Image thumbnails)
CREATE TABLE IF NOT EXISTS file_thumbnails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    thumbnail_path VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    size BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_thumbnails_tenant_id ON file_thumbnails(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_thumbnails_file_id ON file_thumbnails(file_id);
CREATE INDEX IF NOT EXISTS idx_file_thumbnails_width_height ON file_thumbnails(width, height);

-- Create file_usage table (File usage tracking)
CREATE TABLE IF NOT EXISTS file_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- property, room, booking, user
    entity_id UUID NOT NULL,
    usage_type VARCHAR(50) NOT NULL, -- profile_image, gallery, document, attachment
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_usage_tenant_id ON file_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_usage_file_id ON file_usage(file_id);
CREATE INDEX IF NOT EXISTS idx_file_usage_entity_type ON file_usage(entity_type);
CREATE INDEX IF NOT EXISTS idx_file_usage_entity_id ON file_usage(entity_id);
CREATE INDEX IF NOT EXISTS idx_file_usage_usage_type ON file_usage(usage_type);

-- Insert default file storage settings for existing tenants
INSERT INTO file_storage_settings (
    tenant_id, 
    default_provider, 
    max_file_size, 
    auto_optimize_images, 
    generate_thumbnails
)
SELECT 
    t.id,
    'local',
    5242880, -- 5MB
    true,
    true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM file_storage_settings fss 
    WHERE fss.tenant_id = t.id
);

-- Create function to clean up old files
CREATE OR REPLACE FUNCTION cleanup_old_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    retention_days INTEGER;
BEGIN
    -- Get retention days from settings (default 365 days)
    SELECT COALESCE(
        (SELECT retention_days FROM file_storage_settings LIMIT 1), 
        365
    ) INTO retention_days;
    
    -- Delete old inactive files
    DELETE FROM files 
    WHERE is_active = false 
    AND created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get file storage statistics
CREATE OR REPLACE FUNCTION get_file_storage_stats(p_tenant_id UUID)
RETURNS TABLE (
    total_files BIGINT,
    total_size BIGINT,
    aws_files BIGINT,
    cloudinary_files BIGINT,
    local_files BIGINT,
    image_files BIGINT,
    document_files BIGINT,
    average_file_size NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(f.file_size), 0) as total_size,
        COUNT(CASE WHEN f.provider = 'aws' THEN 1 END) as aws_files,
        COUNT(CASE WHEN f.provider = 'cloudinary' THEN 1 END) as cloudinary_files,
        COUNT(CASE WHEN f.provider = 'local' THEN 1 END) as local_files,
        COUNT(CASE WHEN f.mime_type LIKE 'image/%' THEN 1 END) as image_files,
        COUNT(CASE WHEN f.mime_type LIKE 'application/%' THEN 1 END) as document_files,
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(SUM(f.file_size)::NUMERIC / COUNT(*), 2)
            ELSE 0 
        END as average_file_size
    FROM files f
    WHERE f.tenant_id = p_tenant_id AND f.is_active = true;
END;
$$ LANGUAGE plpgsql;
