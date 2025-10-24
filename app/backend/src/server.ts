import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

console.log('Starting Hotel Extranet Backend Server...');

// Import configurations
console.log('Importing configurations...');
import { connectDatabase } from './config/database';
console.log('Database config imported');
import { logger } from './utils/logger';
console.log('Logger imported');
import { errorHandler } from './middlewares/errorHandler';
console.log('Error handler imported');
import { rateLimiter } from './middlewares/rateLimiter';
console.log('Rate limiter imported');
// import { sentryService } from './services/sentry.service';
// console.log('Sentry service imported');
// import { performanceMonitor } from './services/performanceMonitor.service';
// console.log('Performance monitor imported');
// import {
//   performanceMiddleware,
//   databaseQueryMiddleware,
//   memoryUsageMiddleware
// } from './middlewares/performance.middleware';
// console.log('Performance middleware imported');
// import {
//   sqlInjectionDetection,
//   xssDetection,
//   requestSizeLimit,
//   securityHeaders,
//   contentTypeValidation
// } from './middlewares/validation.middleware';
// console.log('Validation middleware imported');

// Import routes
console.log('Importing routes...');
import authRoutes from './modules/auth/auth.routes';
console.log('Auth routes imported');
// import tenantRoutes from './modules/tenants/tenant.routes';
// console.log('Tenant routes imported');
// import propertyRoutes from './modules/properties/property.routes';
// console.log('Property routes imported');
// import roomRoutes from './modules/rooms/room.routes';
// console.log('Room routes imported');
// import inventoryRoutes from './modules/inventory/inventory.routes';
// console.log('Inventory routes imported');
// import rateRoutes from './modules/rates/rate.routes';
// console.log('Rate routes imported');
// import searchRoutes from './modules/search/search.routes';
// console.log('Search routes imported');
// import bookingRoutes from './modules/bookings/booking.routes';
// console.log('Booking routes imported');
// import channelRoutes from './modules/channels/channel.routes';
// console.log('Channel routes imported');
// import paymentRoutes from './modules/payments/payment.routes';
// console.log('Payment routes imported');
// import notificationRoutes from './modules/notifications/notification.routes';
// console.log('Notification routes imported');

// Import WebSocket setup
// import { initializeSocket } from './websocket/socket';

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
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:8080',
      'http://localhost:3000',
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
        return pattern?.test(origin);
      }
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin, ip: 'unknown' });
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
// app.use(sentryService.getRequestHandler());
// app.use(sentryService.getTracingHandler());

// Security middleware
// app.use(securityHeaders);
// app.use(contentTypeValidation);
// app.use(requestSizeLimit);
// app.use(sqlInjectionDetection);
// app.use(xssDetection);

// Performance monitoring middleware
// app.use(performanceMiddleware);
// app.use(memoryUsageMiddleware);

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

// API root endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'Hotel Extranet API is running',
    version: '1.0.0',
    endpoints: ['/api/v1/auth', '/api/v1/health']
  });
});

// Dashboard endpoint
app.get('/api/v1/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalProperties: 0,
      totalRooms: 0,
      totalBookings: 0,
      totalRevenue: 0,
      occupancyRate: 0,
      averageDailyRate: 0,
      recentBookings: [],
      revenueByMonth: []
    }
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/tenants', tenantRoutes);
// app.use('/api/v1/properties', propertyRoutes);
// app.use('/api/v1/rooms', roomRoutes);
// app.use('/api/v1/inventory', inventoryRoutes);
// app.use('/api/v1/rates', rateRoutes);
// app.use('/api/v1/search', searchRoutes);
// app.use('/api/v1/bookings', bookingRoutes);
// app.use('/api/v1/channels', channelRoutes);
// app.use('/api/v1/payments', paymentRoutes);
// app.use('/api/v1/notifications', notificationRoutes);

// Import monitoring routes
// import monitoringRoutes from './modules/monitoring/monitoring.routes';
// import performanceRoutes from './modules/monitoring/performance.routes';

// Monitoring routes
// app.use('/api/v1/monitoring', monitoringRoutes);
// app.use('/api/v1/performance', performanceRoutes);

// Swagger documentation
// import { setupSwagger, swaggerSpec } from './swagger/swagger.config';
// import { generateDocumentation } from './swagger/generate';

// Setup Swagger documentation
// setupSwagger(app);

// Generate documentation files on startup (development only)
// if (process.env.NODE_ENV !== 'production') {
//   generateDocumentation();
// }

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hotel Extranet Backend is running',
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler with Sentry integration
// app.use(sentryService.getErrorHandler());
app.use(errorHandler);

// Setup WebSocket
// initializeSocket(server);

// Graceful shutdown with Sentry cleanup
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);

  try {
    // Flush Sentry events before shutdown
    // await sentryService.flush(3000);
    // logger.info('Sentry events flushed');
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
    console.log('Initializing server...');

    // Initialize Sentry error tracking
    // console.log('Initializing Sentry...');
    // sentryService.initialize();
    // console.log('Sentry initialized');

    // Connect to database
    console.log('Connecting to database...');
    await connectDatabase();
    console.log('Database connected successfully');

    // Start performance monitoring
    // console.log('Starting performance monitoring...');
    // performanceMonitor.startMonitoring(60000); // Monitor every minute
    // logger.info('Performance monitoring started');
    // console.log('Performance monitoring started');

    // Start HTTP server
    console.log(`Starting HTTP server on port ${PORT}...`);
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`Server running on port ${PORT}`);

      // Flush Sentry events on startup
      // sentryService.flush(1000).then(() => {
      //   logger.info('Sentry error tracking initialized');
      // });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Failed to start server:', error);
    // sentryService.captureException(error as Error, { source: 'server_startup' });
    process.exit(1);
  }
};

console.log('About to start server...');
console.log('Calling startServer function...');
startServer().then(() => {
  console.log('startServer completed');
}).catch((error) => {
  console.error('startServer failed:', error);
});

export { app, server, io };

