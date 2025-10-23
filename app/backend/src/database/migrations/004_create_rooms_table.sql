-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    room_type VARCHAR(100) NOT NULL, -- Standard, Deluxe, Suite, etc.
    max_occupancy INTEGER NOT NULL DEFAULT 1,
    max_adults INTEGER NOT NULL DEFAULT 1,
    max_children INTEGER DEFAULT 0,
    bed_type VARCHAR(100), -- Single, Double, Queen, King, etc.
    bed_count INTEGER DEFAULT 1,
    size_sqm DECIMAL(8, 2), -- Room size in square meters
    amenities TEXT[], -- Array of room amenities
    images JSONB, -- Array of image objects
    base_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique slug per property
    UNIQUE(property_id, slug)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rooms_tenant_id ON rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_property_id ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_max_occupancy ON rooms(max_occupancy);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON rooms(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_rooms_updated_at 
    BEFORE UPDATE ON rooms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
