-- Create room inventory table (daily availability and pricing)
CREATE TABLE IF NOT EXISTS room_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    rate_plan_id UUID NOT NULL REFERENCES rate_plans(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_rooms INTEGER NOT NULL DEFAULT 0,
    total_rooms INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    min_stay INTEGER DEFAULT 1,
    max_stay INTEGER,
    closed_to_arrival BOOLEAN DEFAULT false,
    closed_to_departure BOOLEAN DEFAULT false,
    stop_sell BOOLEAN DEFAULT false,
    restrictions JSONB, -- Additional restrictions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination per day
    UNIQUE(room_id, rate_plan_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_room_inventory_tenant_id ON room_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_room_inventory_property_id ON room_inventory(property_id);
CREATE INDEX IF NOT EXISTS idx_room_inventory_room_id ON room_inventory(room_id);
CREATE INDEX IF NOT EXISTS idx_room_inventory_rate_plan_id ON room_inventory(rate_plan_id);
CREATE INDEX IF NOT EXISTS idx_room_inventory_date ON room_inventory(date);
CREATE INDEX IF NOT EXISTS idx_room_inventory_available ON room_inventory(available_rooms);
CREATE INDEX IF NOT EXISTS idx_room_inventory_stop_sell ON room_inventory(stop_sell);

-- Add updated_at trigger
CREATE TRIGGER update_room_inventory_updated_at 
    BEFORE UPDATE ON room_inventory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
