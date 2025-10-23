-- Add email notification settings to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_confirmation_email BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS password_reset_email BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS welcome_email BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS from_email VARCHAR(255) DEFAULT 'noreply@hotel-extranet.com';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS from_name VARCHAR(255) DEFAULT 'Hotel Extranet';

-- Add email notification settings to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS booking_notifications BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS system_notifications BOOLEAN DEFAULT true;

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- booking_confirmation, password_reset, welcome, etc.
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique template name per tenant
    UNIQUE(tenant_id, template_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_template_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email_type VARCHAR(50) NOT NULL, -- booking_confirmation, password_reset, welcome, etc.
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- sent, failed, pending
    sent_at TIMESTAMP,
    error_message TEXT,
    external_id VARCHAR(255), -- External service ID (e.g., Resend ID)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_id ON email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Insert default email templates
INSERT INTO email_templates (tenant_id, template_name, template_type, subject, html_content, text_content) 
SELECT 
    t.id,
    'booking_confirmation',
    'booking_confirmation',
    'Booking Confirmation - {{booking_reference}}',
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Booking Confirmation</title></head><body><h1>Booking Confirmation</h1><p>Hello {{guest_name}},</p><p>Your booking has been confirmed.</p><p>Booking Reference: {{booking_reference}}</p><p>Property: {{property_name}}</p><p>Check-in: {{check_in_date}}</p><p>Check-out: {{check_out_date}}</p><p>Total Amount: {{total_amount}} {{currency}}</p></body></html>',
    'Booking Confirmation\n\nHello {{guest_name}},\n\nYour booking has been confirmed.\n\nBooking Reference: {{booking_reference}}\nProperty: {{property_name}}\nCheck-in: {{check_in_date}}\nCheck-out: {{check_out_date}}\nTotal Amount: {{total_amount}} {{currency}}'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM email_templates et 
    WHERE et.tenant_id = t.id AND et.template_name = 'booking_confirmation'
);

INSERT INTO email_templates (tenant_id, template_name, template_type, subject, html_content, text_content) 
SELECT 
    t.id,
    'password_reset',
    'password_reset',
    'Password Reset Request',
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Password Reset</title></head><body><h1>Password Reset Request</h1><p>Hello {{user_name}},</p><p>You have requested to reset your password.</p><p>Click the link below to reset your password:</p><p><a href="{{reset_link}}">Reset Password</a></p><p>This link will expire at {{expiry_time}}.</p></body></html>',
    'Password Reset Request\n\nHello {{user_name}},\n\nYou have requested to reset your password.\n\nClick the link below to reset your password:\n{{reset_link}}\n\nThis link will expire at {{expiry_time}}.'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM email_templates et 
    WHERE et.tenant_id = t.id AND et.template_name = 'password_reset'
);

INSERT INTO email_templates (tenant_id, template_name, template_type, subject, html_content, text_content) 
SELECT 
    t.id,
    'welcome',
    'welcome',
    'Welcome to {{tenant_name}} - Hotel Extranet',
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Welcome</title></head><body><h1>Welcome to {{tenant_name}}!</h1><p>Hello {{user_name}},</p><p>Welcome to the {{tenant_name}} Hotel Extranet System!</p><p>Your account has been successfully created.</p><p><a href="{{login_url}}">Login to System</a></p></body></html>',
    'Welcome to {{tenant_name}}!\n\nHello {{user_name}},\n\nWelcome to the {{tenant_name}} Hotel Extranet System!\n\nYour account has been successfully created.\n\nLogin URL: {{login_url}}'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM email_templates et 
    WHERE et.tenant_id = t.id AND et.template_name = 'welcome'
);
