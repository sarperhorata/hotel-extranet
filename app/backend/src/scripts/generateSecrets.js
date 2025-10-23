#!/usr/bin/env node

/**
 * Script to generate secure secrets for the Hotel Extranet System
 * Usage: node scripts/generateSecrets.js
 */

const crypto = require('crypto');

class SecretGenerator {
  /**
   * Generate a secure random secret
   */
  static generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate JWT secrets
   */
  static generateJWTSecrets() {
    return {
      jwtSecret: this.generateSecret(32),
      jwtRefreshSecret: this.generateSecret(32)
    };
  }

  /**
   * Generate session secret
   */
  static generateSessionSecret() {
    return this.generateSecret(32);
  }

  /**
   * Generate API key
   */
  static generateAPIKey() {
    return `ak_${this.generateSecret(24)}`;
  }

  /**
   * Generate webhook secret
   */
  static generateWebhookSecret() {
    return `whsec_${this.generateSecret(24)}`;
  }

  /**
   * Generate all secrets
   */
  static generateAllSecrets() {
    const jwtSecrets = this.generateJWTSecrets();
    
    return {
      ...jwtSecrets,
      sessionSecret: this.generateSessionSecret(),
      apiKey: this.generateAPIKey(),
      webhookSecret: this.generateWebhookSecret()
    };
  }

  /**
   * Generate environment variables string
   */
  static generateEnvVars() {
    const secrets = this.generateAllSecrets();
    
    return `
# Generated secrets for Hotel Extranet System
# Generated at: ${new Date().toISOString()}

# JWT Authentication
JWT_SECRET=${secrets.jwtSecret}
JWT_REFRESH_SECRET=${secrets.jwtRefreshSecret}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret
SESSION_SECRET=${secrets.sessionSecret}

# API Key (for external integrations)
API_KEY=${secrets.apiKey}

# Webhook Secret (for payment gateways)
WEBHOOK_SECRET=${secrets.webhookSecret}

# Database (update with your actual values)
DATABASE_URL=postgresql://username:password@localhost:5432/hotel_extranet

# Email Service (update with your actual values)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Hotel Extranet

# Frontend URLs
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Application
NODE_ENV=development
PORT=5000
`;
  }
}

// Main execution
if (require.main === module) {
  console.log('🔐 Generating secure secrets for Hotel Extranet System...\n');
  
  const secrets = SecretGenerator.generateAllSecrets();
  const envVars = SecretGenerator.generateEnvVars();
  
  console.log('✅ Generated secrets:');
  console.log(`JWT Secret: ${secrets.jwtSecret}`);
  console.log(`JWT Refresh Secret: ${secrets.jwtRefreshSecret}`);
  console.log(`Session Secret: ${secrets.sessionSecret}`);
  console.log(`API Key: ${secrets.apiKey}`);
  console.log(`Webhook Secret: ${secrets.webhookSecret}`);
  
  console.log('\n📝 Environment variables:');
  console.log(envVars);
  
  console.log('\n⚠️  Important Security Notes:');
  console.log('1. Never commit these secrets to version control');
  console.log('2. Store them securely in your deployment environment');
  console.log('3. Use different secrets for development, staging, and production');
  console.log('4. Rotate secrets regularly in production');
  console.log('5. Use environment variable management tools for production');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Copy the environment variables to your .env file');
  console.log('2. Update DATABASE_URL with your actual database connection');
  console.log('3. Update RESEND_API_KEY with your actual email service key');
  console.log('4. Update FROM_EMAIL with your actual email address');
  console.log('5. Test the application with these secrets');
}

module.exports = SecretGenerator;
