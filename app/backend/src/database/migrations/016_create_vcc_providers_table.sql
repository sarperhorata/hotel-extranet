-- Create VCC providers table (Virtual Credit Card provider configurations)
CREATE TABLE IF NOT EXISTS vcc_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- marqeta, stripe, mock
    api_key VARCHAR(500),
    api_secret VARCHAR(500),
    base_url VARCHAR(500),
    configuration JSONB, -- Provider-specific configuration
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique name per tenant
    UNIQUE(tenant_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vcc_providers_tenant_id ON vcc_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vcc_providers_provider_type ON vcc_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_vcc_providers_is_active ON vcc_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_vcc_providers_is_default ON vcc_providers(is_default);

-- Add updated_at trigger
CREATE TRIGGER update_vcc_providers_updated_at 
    BEFORE UPDATE ON vcc_providers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create VCC transactions table (VCC usage tracking)
CREATE TABLE IF NOT EXISTS vcc_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    card_id VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- charge, refund, adjustment
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    merchant_name VARCHAR(255),
    merchant_category VARCHAR(100),
    external_transaction_id VARCHAR(255), -- External provider transaction ID
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vcc_transactions_tenant_id ON vcc_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vcc_transactions_payment_id ON vcc_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_vcc_transactions_card_id ON vcc_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_vcc_transactions_transaction_type ON vcc_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_vcc_transactions_status ON vcc_transactions(status);
CREATE INDEX IF NOT EXISTS idx_vcc_transactions_processed_at ON vcc_transactions(processed_at);

-- Add updated_at trigger
CREATE TRIGGER update_vcc_transactions_updated_at 
    BEFORE UPDATE ON vcc_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create VCC provider settings table
CREATE TABLE IF NOT EXISTS vcc_provider_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    default_provider VARCHAR(50) DEFAULT 'mock', -- marqeta, stripe, mock
    auto_generate_vcc BOOLEAN DEFAULT false,
    vcc_expiry_days INTEGER DEFAULT 30,
    auto_close_after_days INTEGER DEFAULT 1,
    require_approval BOOLEAN DEFAULT false,
    max_vcc_amount DECIMAL(10, 2),
    min_vcc_amount DECIMAL(10, 2),
    allowed_currencies TEXT[] DEFAULT ARRAY['USD'],
    notification_emails TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique settings per tenant
    UNIQUE(tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vcc_provider_settings_tenant_id ON vcc_provider_settings(tenant_id);

-- Add updated_at trigger
CREATE TRIGGER update_vcc_provider_settings_updated_at 
    BEFORE UPDATE ON vcc_provider_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default VCC provider settings for existing tenants
INSERT INTO vcc_provider_settings (tenant_id, default_provider, auto_generate_vcc, vcc_expiry_days, auto_close_after_days)
SELECT 
    t.id,
    'mock',
    false,
    30,
    1
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM vcc_provider_settings vps 
    WHERE vps.tenant_id = t.id
);

-- Insert default VCC providers for existing tenants
INSERT INTO vcc_providers (tenant_id, name, provider_type, is_active, is_default)
SELECT 
    t.id,
    'Mock VCC Provider',
    'mock',
    true,
    true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM vcc_providers vp 
    WHERE vp.tenant_id = t.id AND vp.provider_type = 'mock'
);
