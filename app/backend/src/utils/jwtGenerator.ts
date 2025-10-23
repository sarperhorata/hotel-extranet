import crypto from 'crypto';
import { config } from '../config/env';

export class JWTGenerator {
  /**
   * Generate a secure random JWT secret
   */
  static generateSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate JWT secrets for the application
   */
  static generateJWTSecrets(): { jwtSecret: string; jwtRefreshSecret: string } {
    return {
      jwtSecret: this.generateSecret(32),
      jwtRefreshSecret: this.generateSecret(32)
    };
  }

  /**
   * Validate JWT secret format
   */
  static validateSecret(secret: string): boolean {
    return secret.length >= 32 && /^[a-f0-9]+$/i.test(secret);
  }

  /**
   * Generate environment variables for JWT
   */
  static generateEnvVars(): string {
    const secrets = this.generateJWTSecrets();
    return `
# JWT Authentication
JWT_SECRET=${secrets.jwtSecret}
JWT_REFRESH_SECRET=${secrets.jwtRefreshSecret}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
`;
  }

  /**
   * Check if current JWT secrets are secure
   */
  static checkJWTSecrets(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
      issues.push('JWT_SECRET must be at least 32 characters long');
    }
    
    if (!config.JWT_REFRESH_SECRET || config.JWT_REFRESH_SECRET.length < 32) {
      issues.push('JWT_REFRESH_SECRET must be at least 32 characters long');
    }
    
    if (config.JWT_SECRET === config.JWT_REFRESH_SECRET) {
      issues.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    }
    
    if (config.JWT_SECRET === 'your-32-character-secret-key-here') {
      issues.push('JWT_SECRET is using default value - please change it');
    }
    
    if (config.JWT_REFRESH_SECRET === 'your-32-character-refresh-secret-here') {
      issues.push('JWT_REFRESH_SECRET is using default value - please change it');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate secure session secret
   */
  static generateSessionSecret(): string {
    return this.generateSecret(32);
  }

  /**
   * Generate secure password reset token
   */
  static generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure email verification token
   */
  static generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure API key
   */
  static generateAPIKey(): string {
    return `ak_${this.generateSecret(24)}`;
  }

  /**
   * Generate secure webhook secret
   */
  static generateWebhookSecret(): string {
    return `whsec_${this.generateSecret(24)}`;
  }
}
