-- Create VCC balances table (Virtual Credit Card balance tracking)
CREATE TABLE IF NOT EXISTS vcc_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    original_amount DECIMAL(10, 2) NOT NULL,
    current_balance DECIMAL(10, 2) NOT NULL,
    used_amount DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'active', -- active, closed, expired
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique payment per tenant
    UNIQUE(payment_id, tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vcc_balances_payment_id ON vcc_balances(payment_id);
CREATE INDEX IF NOT EXISTS idx_vcc_balances_tenant_id ON vcc_balances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vcc_balances_status ON vcc_balances(status);
CREATE INDEX IF NOT EXISTS idx_vcc_balances_created_at ON vcc_balances(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_vcc_balances_updated_at 
    BEFORE UPDATE ON vcc_balances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
