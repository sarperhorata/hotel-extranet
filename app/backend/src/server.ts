import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Import configurations
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import { rateLimiter } from './middlewares/rateLimiter';
import { sentryService } from './services/sentry.service';
import { performanceMonitor } from './services/performanceMonitor.service';
import {
  performanceMiddleware,
  databaseQueryMiddleware,
  memoryUsageMiddleware
} from './middlewares/performance.middleware';
import {
  sqlInjectionDetection,
  xssDetection,
  requestSizeLimit,
  securityHeaders,
  contentTypeValidation
} from './middlewares/validation.middleware';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import tenantRoutes from './modules/tenants/tenant.routes';
import propertyRoutes from './modules/properties/property.routes';
import roomRoutes from './modules/rooms/room.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import rateRoutes from './modules/rates/rate.routes';
import searchRoutes from './modules/search/search.routes';
import bookingRoutes from './modules/bookings/booking.routes';
import channelRoutes from './modules/channels/channel.routes';
import paymentRoutes from './modules/payments/payment.routes';
import notificationRoutes from './modules/notifications/notification.routes';

// Import WebSocket setup
import { initializeSocket } from './websocket/socket';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      process.env.FRONTEND_URL?.replace('https://', 'http://'), // HTTP version
      'https://hotel-extranet.netlify.app',
      'https://hotel-extranet.vercel.app',
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.vercel\.app$/,
      /^http:\/\/localhost:\d+$/, // Local development
      /^https:\/\/.*\.railway\.app$/,
      /^https:\/\/.*\.render\.com$/,
      /^https:\/\/.*\.herokuapp\.com$/
    ];

    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return pattern === origin;
      } else {
        return pattern.test(origin);
      }
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin, ip: req?.ip });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-ID',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
}));

// Compression middleware
app.use(compression());

// Sentry middleware for error tracking
app.use(sentryService.getRequestHandler());
app.use(sentryService.getTracingHandler());

// Security middleware
app.use(securityHeaders);
app.use(contentTypeValidation);
app.use(requestSizeLimit);
app.use(sqlInjectionDetection);
app.use(xssDetection);

// Performance monitoring middleware
app.use(performanceMiddleware);
app.use(memoryUsageMiddleware);

// Logging middleware
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));

// Rate limiting
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/rates', rateRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/channels', channelRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Import monitoring routes
import monitoringRoutes from './modules/monitoring/monitoring.routes';
import performanceRoutes from './modules/monitoring/performance.routes';

// Monitoring routes
app.use('/api/v1/monitoring', monitoringRoutes);
app.use('/api/v1/performance', performanceRoutes);

// Swagger documentation
import { setupSwagger, swaggerSpec } from './swagger/swagger.config';
import { generateDocumentation } from './swagger/generate';

// Setup Swagger documentation
setupSwagger(app);

// Generate documentation files on startup (development only)
if (process.env.NODE_ENV !== 'production') {
  generateDocumentation();
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler with Sentry integration
app.use(sentryService.getErrorHandler());
app.use(errorHandler);

// Setup WebSocket
initializeSocket(server);

// Graceful shutdown with Sentry cleanup
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);

  try {
    // Flush Sentry events before shutdown
    await sentryService.flush(3000);
    logger.info('Sentry events flushed');
  } catch (error) {
    logger.error('Error flushing Sentry events:', error);
  }

  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Initialize Sentry error tracking
    sentryService.initialize();

    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start performance monitoring
    performanceMonitor.startMonitoring(60000); // Monitor every minute
    logger.info('Performance monitoring started');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);

      // Flush Sentry events on startup
      sentryService.flush(1000).then(() => {
        logger.info('Sentry error tracking initialized');
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    sentryService.captureException(error as Error, { source: 'server_startup' });
    process.exit(1);
  }
};

startServer();

export { app, server, io };

