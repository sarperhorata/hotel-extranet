import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .default(5000),
  
  // Database
  DATABASE_URL: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  
  DB_HOST: Joi.string()
    .default('localhost'),
  
  DB_PORT: Joi.number()
    .default(5432),
  
  DB_NAME: Joi.string()
    .default('hotel_extranet'),
  
  DB_USER: Joi.string()
    .required(),
  
  DB_PASSWORD: Joi.string()
    .required(),
  
  // JWT
  JWT_SECRET: Joi.string()
    .min(32)
    .required(),
  
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required(),
  
  JWT_EXPIRES_IN: Joi.string()
    .default('15m'),
  
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .default('7d'),
  
  // Email
  RESEND_API_KEY: Joi.string()
    .optional(),
  
  FROM_EMAIL: Joi.string()
    .email()
    .default('noreply@hotel-extranet.com'),
  
  FROM_NAME: Joi.string()
    .default('Hotel Extranet'),
  
  // Frontend
  FRONTEND_URL: Joi.string()
    .uri()
    .default('http://localhost:5173'),
  
  CORS_ORIGIN: Joi.string()
    .uri()
    .default('http://localhost:5173'),
  
  // WebSocket
  WS_PORT: Joi.number()
    .default(5001),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .default(900000), // 15 minutes
  
  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .default(100),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  
  LOG_FILE: Joi.string()
    .default('logs/app.log'),
  
  // File Upload
  MAX_FILE_SIZE: Joi.number()
    .default(5242880), // 5MB
  
  UPLOAD_PATH: Joi.string()
    .default('uploads/'),
  
  // Security
  BCRYPT_ROUNDS: Joi.number()
    .default(12),
  
  SESSION_SECRET: Joi.string()
    .min(32)
    .required(),
  
  // External APIs
  UPTIME_ROBOT_API_KEY: Joi.string()
    .optional(),

  // Logging & Monitoring
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug', 'audit', 'performance')
    .default('info'),

  // Sentry Error Tracking
  SENTRY_DSN: Joi.string()
    .optional(),

  SENTRY_RELEASE: Joi.string()
    .optional(),

  SENTRY_SERVER_NAME: Joi.string()
    .default('hotel-extranet-backend'),

  SENTRY_TRACES_SAMPLE_RATE: Joi.number()
    .min(0)
    .max(1)
    .default(0.1),

  SENTRY_PROFILES_SAMPLE_RATE: Joi.number()
    .min(0)
    .max(1)
    .default(0.1),

  // Performance Monitoring
  PERFORMANCE_LOGGING_ENABLED: Joi.boolean()
    .default(true),

  SLOW_QUERY_THRESHOLD: Joi.number()
    .default(1000), // milliseconds

  SLOW_REQUEST_THRESHOLD: Joi.number()
    .default(5000), // milliseconds

  MEMORY_USAGE_THRESHOLD: Joi.number()
    .min(0)
    .max(100)
    .default(80), // percentage

  // Backup
  BACKUP_SCHEDULE: Joi.string()
    .default('0 2 * * *'),

  BACKUP_RETENTION_DAYS: Joi.number()
    .default(30),

  BACKUP_STORAGE_PROVIDER: Joi.string()
    .valid('local', 'aws', 'gcs')
    .default('local')
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

// Export validated environment variables
export const config = {
  // Server
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  
  // Database
  DATABASE_URL: envVars.DATABASE_URL,
  DB_HOST: envVars.DB_HOST,
  DB_PORT: envVars.DB_PORT,
  DB_NAME: envVars.DB_NAME,
  DB_USER: envVars.DB_USER,
  DB_PASSWORD: envVars.DB_PASSWORD,
  
  // JWT
  JWT_SECRET: envVars.JWT_SECRET,
  JWT_REFRESH_SECRET: envVars.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: envVars.JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: envVars.JWT_REFRESH_EXPIRES_IN,
  
  // Email
  RESEND_API_KEY: envVars.RESEND_API_KEY,
  FROM_EMAIL: envVars.FROM_EMAIL,
  FROM_NAME: envVars.FROM_NAME,
  
  // Frontend
  FRONTEND_URL: envVars.FRONTEND_URL,
  CORS_ORIGIN: envVars.CORS_ORIGIN,
  
  // WebSocket
  WS_PORT: envVars.WS_PORT,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: envVars.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: envVars.RATE_LIMIT_MAX_REQUESTS,
  
  // Logging & Monitoring
  LOG_LEVEL: envVars.LOG_LEVEL,

  // Sentry Error Tracking
  SENTRY_DSN: envVars.SENTRY_DSN,
  SENTRY_RELEASE: envVars.SENTRY_RELEASE,
  SENTRY_SERVER_NAME: envVars.SENTRY_SERVER_NAME,
  SENTRY_TRACES_SAMPLE_RATE: envVars.SENTRY_TRACES_SAMPLE_RATE,
  SENTRY_PROFILES_SAMPLE_RATE: envVars.SENTRY_PROFILES_SAMPLE_RATE,

  // Performance Monitoring
  PERFORMANCE_LOGGING_ENABLED: envVars.PERFORMANCE_LOGGING_ENABLED,
  SLOW_QUERY_THRESHOLD: envVars.SLOW_QUERY_THRESHOLD,
  SLOW_REQUEST_THRESHOLD: envVars.SLOW_REQUEST_THRESHOLD,
  MEMORY_USAGE_THRESHOLD: envVars.MEMORY_USAGE_THRESHOLD,

  // Backup
  BACKUP_SCHEDULE: envVars.BACKUP_SCHEDULE,
  BACKUP_RETENTION_DAYS: envVars.BACKUP_RETENTION_DAYS,
  BACKUP_STORAGE_PROVIDER: envVars.BACKUP_STORAGE_PROVIDER,
  
  // File Upload
  MAX_FILE_SIZE: envVars.MAX_FILE_SIZE,
  UPLOAD_PATH: envVars.UPLOAD_PATH,
  
  // Security
  BCRYPT_ROUNDS: envVars.BCRYPT_ROUNDS,
  SESSION_SECRET: envVars.SESSION_SECRET,
  
  // External APIs
  UPTIME_ROBOT_API_KEY: envVars.UPTIME_ROBOT_API_KEY
};

export default config;
