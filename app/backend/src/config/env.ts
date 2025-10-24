import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Parse DATABASE_URL and override individual DB variables if DATABASE_URL is provided
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    process.env.DB_HOST = url.hostname;
    process.env.DB_PORT = url.port;
    process.env.DB_NAME = url.pathname.slice(1); // Remove leading '/'
    process.env.DB_USER = url.username;
    process.env.DB_PASSWORD = url.password;
  } catch (error) {
    console.log('Failed to parse DATABASE_URL:', error);
  }
}

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
    .optional(),

  DB_PASSWORD: Joi.string()
    .optional(),
  
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

  SESSION_SECRET: Joi.string()
    .min(32)
    .required(),
  
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
  
  CORS_ORIGIN: Joi.alternatives()
    .try(
      Joi.string().uri(),
      Joi.string().pattern(/^https?:\/\/.+$/)
    )
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

// Validate that we have DB credentials
if (!process.env.DB_USER) {
  throw new Error('DB_USER must be provided (either directly or via DATABASE_URL)');
}
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD must be provided (either directly or via DATABASE_URL)');
}

// Export validated environment variables
export const config = {
  // Server
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  
  // JWT
  JWT_SECRET: envVars.JWT_SECRET,
  JWT_REFRESH_SECRET: envVars.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: envVars.JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: envVars.JWT_REFRESH_EXPIRES_IN,
  SESSION_SECRET: envVars.SESSION_SECRET,

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
  LOG_FILE: envVars.LOG_FILE,

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
  
  // External APIs
  UPTIME_ROBOT_API_KEY: envVars.UPTIME_ROBOT_API_KEY
};

export default config;
