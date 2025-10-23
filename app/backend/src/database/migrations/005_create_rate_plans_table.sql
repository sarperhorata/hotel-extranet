-- Create rate plans table
CREATE TABLE IF NOT EXISTS rate_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type VARCHAR(50) NOT NULL, -- standard, member, corporate, dynamic
    base_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    is_dynamic BOOLEAN DEFAULT false,
    dynamic_rules JSONB, -- Rules for dynamic pricing
    restrictions JSONB, -- Minimum stay, closed dates, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique name per property
    UNIQUE(property_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_plans_tenant_id ON rate_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rate_plans_property_id ON rate_plans(property_id);
CREATE INDEX IF NOT EXISTS idx_rate_plans_plan_type ON rate_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_rate_plans_is_dynamic ON rate_plans(is_dynamic);
CREATE INDEX IF NOT EXISTS idx_rate_plans_is_active ON rate_plans(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_rate_plans_updated_at 
    BEFORE UPDATE ON rate_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
