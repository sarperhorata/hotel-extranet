-- Create payment policies table
CREATE TABLE IF NOT EXISTS payment_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(50) NOT NULL, -- deposit, full_payment, no_payment
    deposit_percentage DECIMAL(5, 2), -- Percentage for deposit
    deposit_amount DECIMAL(10, 2), -- Fixed amount for deposit
    payment_deadline INTEGER NOT NULL DEFAULT 0, -- Days before check-in
    vcc_expiry_days INTEGER DEFAULT 30, -- VCC expiry days
    auto_close_card BOOLEAN DEFAULT true, -- Auto close card after usage
    close_card_after_days INTEGER DEFAULT 1, -- Days after payment to close card
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique name per tenant
    UNIQUE(tenant_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_policies_tenant_id ON payment_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_policies_policy_type ON payment_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_payment_policies_is_active ON payment_policies(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_payment_policies_updated_at 
    BEFORE UPDATE ON payment_policies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
