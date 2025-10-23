-- Create payment gateways table (Payment gateway configurations)
CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gateway_type VARCHAR(50) NOT NULL, -- stripe, paypal, adyen, mock
    api_key VARCHAR(500),
    api_secret VARCHAR(500),
    webhook_secret VARCHAR(500),
    base_url VARCHAR(500),
    configuration JSONB, -- Gateway-specific configuration
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique name per tenant
    UNIQUE(tenant_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_gateways_tenant_id ON payment_gateways(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_gateway_type ON payment_gateways(gateway_type);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_is_active ON payment_gateways(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_is_default ON payment_gateways(is_default);

-- Add updated_at trigger
CREATE TRIGGER update_payment_gateways_updated_at 
    BEFORE UPDATE ON payment_gateways 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create payment refunds table
CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    refund_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
    external_refund_id VARCHAR(255), -- External gateway refund ID
    gateway_response JSONB, -- Gateway response data
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_refunds_tenant_id ON payment_refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id ON payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_refund_id ON payment_refunds(refund_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status ON payment_refunds(status);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_processed_at ON payment_refunds(processed_at);

-- Add updated_at trigger
CREATE TRIGGER update_payment_refunds_updated_at 
    BEFORE UPDATE ON payment_refunds 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create payment webhooks table (Webhook event tracking)
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    gateway_type VARCHAR(50) NOT NULL, -- stripe, paypal, adyen
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique event per gateway
    UNIQUE(gateway_type, event_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_tenant_id ON payment_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_type ON payment_webhooks(gateway_type);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_type ON payment_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_created_at ON payment_webhooks(created_at);

-- Create payment gateway settings table
CREATE TABLE IF NOT EXISTS payment_gateway_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    default_gateway VARCHAR(50) DEFAULT 'mock', -- stripe, paypal, adyen, mock
    auto_process_payments BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT false,
    max_payment_amount DECIMAL(10, 2),
    min_payment_amount DECIMAL(10, 2),
    allowed_currencies TEXT[] DEFAULT ARRAY['USD'],
    webhook_enabled BOOLEAN DEFAULT true,
    notification_emails TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique settings per tenant
    UNIQUE(tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_gateway_settings_tenant_id ON payment_gateway_settings(tenant_id);

-- Add updated_at trigger
CREATE TRIGGER update_payment_gateway_settings_updated_at 
    BEFORE UPDATE ON payment_gateway_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default payment gateway settings for existing tenants
INSERT INTO payment_gateway_settings (tenant_id, default_gateway, auto_process_payments, webhook_enabled)
SELECT 
    t.id,
    'mock',
    false,
    true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM payment_gateway_settings pgs 
    WHERE pgs.tenant_id = t.id
);

-- Insert default payment gateways for existing tenants
INSERT INTO payment_gateways (tenant_id, name, gateway_type, is_active, is_default)
SELECT 
    t.id,
    'Mock Payment Gateway',
    'mock',
    true,
    true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM payment_gateways pg 
    WHERE pg.tenant_id = t.id AND pg.gateway_type = 'mock'
);
