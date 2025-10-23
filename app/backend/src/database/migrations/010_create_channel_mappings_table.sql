-- Create channel mappings table (Property/Room mappings to channels)
CREATE TABLE IF NOT EXISTS channel_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    external_property_id VARCHAR(255) NOT NULL, -- External property ID
    external_room_id VARCHAR(255), -- External room ID
    mapping_type VARCHAR(50) NOT NULL, -- property, room, rate_plan
    is_active BOOLEAN DEFAULT true,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending', -- pending, synced, failed
    sync_errors JSONB, -- Array of sync errors
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique mapping per channel
    UNIQUE(channel_id, property_id, room_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_channel_mappings_tenant_id ON channel_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_channel_id ON channel_mappings(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_property_id ON channel_mappings(property_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_room_id ON channel_mappings(room_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_external_property_id ON channel_mappings(external_property_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_external_room_id ON channel_mappings(external_room_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_sync_status ON channel_mappings(sync_status);

-- Add updated_at trigger
CREATE TRIGGER update_channel_mappings_updated_at 
    BEFORE UPDATE ON channel_mappings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
