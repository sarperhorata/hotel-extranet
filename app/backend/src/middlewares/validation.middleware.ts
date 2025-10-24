import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { sentryService } from '../services/sentry.service';

export interface ValidationRule {
  field: string;
  type: 'body' | 'param' | 'query';
  rules: any[];
  message?: string;
}

// Sanitization functions
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
};

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: sanitizeInput(error.value?.toString() || '')
    }));

    logger.warn('Validation errors detected', {
      url: req.originalUrl,
      method: req.method,
      errors: errorDetails,
      ip: req.ip
    });

    // Send to Sentry if validation errors are suspicious
    if (errorDetails.length > 5) {
      sentryService.captureMessage('Multiple validation errors detected', 'warning', {
        url: req.originalUrl,
        method: req.method,
        errorCount: errorDetails.length,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorDetails
    });
  }

  next();
};

// Common validation rules
export const commonValidations = {
  // Email validation
  email: body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .customSanitizer(sanitizeInput),

  // Password validation
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .customSanitizer(sanitizeInput),

  // Name validation
  name: body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeInput),

  // Phone validation
  phone: body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{10,}$/)
    .withMessage('Please provide a valid phone number')
    .customSanitizer(sanitizeInput),

  // UUID validation
  uuid: param('id')
    .isUUID()
    .withMessage('Invalid ID format'),

  // Date validation
  date: body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),

  // Amount validation
  amount: body('amount')
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Amount must be between 0 and 1,000,000'),

  // Currency validation
  currency: body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'TRY'])
    .withMessage('Invalid currency code'),

  // URL validation
  url: body('url')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),

  // Text area validation
  description: body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters')
    .customSanitizer(sanitizeInput)
};

// Authentication validation rules
export const authValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .customSanitizer(sanitizeInput),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),

  handleValidationErrors
];

// Registration validation rules
export const registrationValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .customSanitizer(sanitizeInput),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('firstName')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  handleValidationErrors
];

// Property validation rules
export const propertyValidation = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Property name must be between 3 and 100 characters')
    .customSanitizer(sanitizeInput),

  body('address')
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters')
    .customSanitizer(sanitizeInput),

  body('city')
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('City can only contain letters, spaces, hyphens, and apostrophes'),

  body('country')
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Country can only contain letters, spaces, hyphens, and apostrophes'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .customSanitizer(sanitizeInput),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),

  handleValidationErrors
];

// Room validation rules
export const roomValidation = [
  body('roomNumber')
    .isLength({ min: 1, max: 20 })
    .withMessage('Room number must be between 1 and 20 characters')
    .customSanitizer(sanitizeInput),

  body('roomType')
    .isIn(['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential'])
    .withMessage('Invalid room type'),

  body('maxOccupancy')
    .isInt({ min: 1, max: 20 })
    .withMessage('Maximum occupancy must be between 1 and 20'),

  body('baseRate')
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Base rate must be between 0 and 10,000'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .customSanitizer(sanitizeInput),

  handleValidationErrors
];

// Booking validation rules
export const bookingValidation = [
  body('propertyId')
    .isUUID()
    .withMessage('Invalid property ID'),

  body('guestName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Guest name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Guest name can only contain letters, spaces, hyphens, and apostrophes'),

  body('guestEmail')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('checkIn')
    .isISO8601()
    .withMessage('Please provide a valid check-in date'),

  body('checkOut')
    .isISO8601()
    .withMessage('Please provide a valid check-out date')
    .custom((checkOut, { req }) => {
      const checkIn = new Date(req.body.checkIn);
      const checkOutDate = new Date(checkOut);
      if (checkOutDate <= checkIn) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),

  body('guests')
    .isInt({ min: 1, max: 20 })
    .withMessage('Number of guests must be between 1 and 20'),

  body('specialRequests')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Special requests cannot exceed 500 characters')
    .customSanitizer(sanitizeInput),

  handleValidationErrors
];

// Payment validation rules
export const paymentValidation = [
  body('bookingId')
    .isUUID()
    .withMessage('Invalid booking ID'),

  body('amount')
    .isFloat({ min: 0.01, max: 100000 })
    .withMessage('Amount must be between 0.01 and 100,000'),

  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'TRY'])
    .withMessage('Invalid currency'),

  body('paymentMethod')
    .isIn(['card', 'bank_transfer', 'paypal', 'vcc'])
    .withMessage('Invalid payment method'),

  body('cardNumber')
    .if(body('paymentMethod').equals('card'))
    .isCreditCard()
    .withMessage('Invalid credit card number'),

  body('expiryMonth')
    .if(body('paymentMethod').equals('card'))
    .isInt({ min: 1, max: 12 })
    .withMessage('Invalid expiry month'),

  body('expiryYear')
    .if(body('paymentMethod').equals('card'))
    .isInt({ min: new Date().getFullYear(), max: new Date().getFullYear() + 20 })
    .withMessage('Invalid expiry year'),

  body('cvv')
    .if(body('paymentMethod').equals('card'))
    .isLength({ min: 3, max: 4 })
    .withMessage('Invalid CVV'),

  handleValidationErrors
];

// Search validation rules
export const searchValidation = [
  query('checkIn')
    .isISO8601()
    .withMessage('Please provide a valid check-in date'),

  query('checkOut')
    .isISO8601()
    .withMessage('Please provide a valid check-out date')
    .custom((checkOut, { req }) => {
      const checkIn = new Date(req.query.checkIn as string);
      const checkOutDate = new Date(checkOut);
      if (checkOutDate <= checkIn) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),

  query('guests')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Number of guests must be between 1 and 20'),

  query('destination')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Destination must be between 2 and 100 characters')
    .customSanitizer(sanitizeInput),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be greater than 0'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be greater than 0'),

  query('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),

  handleValidationErrors
];

// File upload validation rules
export const fileUploadValidation = [
  body('folder')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Folder name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Folder name can only contain letters, numbers, underscores, and hyphens'),

  // File validation will be handled by multer configuration
  handleValidationErrors
];

// Channel manager validation rules
export const channelValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Channel name must be between 2 and 100 characters')
    .customSanitizer(sanitizeInput),

  body('channelType')
    .isIn(['siteminder', 'hotelrunner', 'dingus', 'elektraweb', 'bookingcom', 'expedia'])
    .withMessage('Invalid channel type'),

  body('apiKey')
    .isLength({ min: 10, max: 255 })
    .withMessage('API key must be between 10 and 255 characters'),

  body('apiSecret')
    .isLength({ min: 10, max: 255 })
    .withMessage('API secret must be between 10 and 255 characters'),

  body('endpoint')
    .optional()
    .isURL()
    .withMessage('Please provide a valid endpoint URL'),

  handleValidationErrors
];

// Rate validation rules
export const rateValidation = [
  body('propertyId')
    .isUUID()
    .withMessage('Invalid property ID'),

  body('roomType')
    .isIn(['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential'])
    .withMessage('Invalid room type'),

  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),

  body('price')
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Price must be between 0 and 10,000'),

  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'TRY'])
    .withMessage('Invalid currency'),

  handleValidationErrors
];

// Inventory validation rules
export const inventoryValidation = [
  body('propertyId')
    .isUUID()
    .withMessage('Invalid property ID'),

  body('roomType')
    .isIn(['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential'])
    .withMessage('Invalid room type'),

  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),

  body('available')
    .isInt({ min: 0, max: 1000 })
    .withMessage('Available rooms must be between 0 and 1000'),

  body('booked')
    .isInt({ min: 0, max: 1000 })
    .withMessage('Booked rooms must be between 0 and 1000'),

  handleValidationErrors
];

// Notification validation rules
export const notificationValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('subject')
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters')
    .customSanitizer(sanitizeInput),

  body('message')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters')
    .customSanitizer(sanitizeInput),

  handleValidationErrors
];

// SQL injection detection middleware
export const sqlInjectionDetection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(;)|(\|\|))/g,
    /(<script|javascript:|vbscript:|onload=|onerror=)/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    } else if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Check request body, query parameters, and URL parameters
  const suspiciousContent = [
    req.body,
    req.query,
    req.params
  ].some(checkValue);

  if (suspiciousContent) {
    logger.warn('Potential SQL injection attempt detected', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: JSON.stringify(req.body).substring(0, 200),
      query: JSON.stringify(req.query).substring(0, 200)
    });

    sentryService.captureMessage('Potential SQL injection attempt', 'error', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'high'
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid request data detected'
    });
  }

  next();
};

// XSS detection middleware
export const xssDetection = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return xssPatterns.some(pattern => pattern.test(value));
    } else if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const suspiciousContent = [
    req.body,
    req.query,
    req.params
  ].some(checkValue);

  if (suspiciousContent) {
    logger.warn('Potential XSS attempt detected', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    sentryService.captureMessage('Potential XSS attempt', 'error', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      severity: 'high'
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid request data detected'
    });
  }

  next();
};

// Request size limiting middleware
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    logger.warn('Request size limit exceeded', {
      size: req.headers['content-length'],
      limit: maxSize,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }

  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // HSTS header (only for HTTPS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
};

// Content type validation middleware
export const contentTypeValidation = (req: Request, res: Response, next: NextFunction) => {
  const allowedTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data'
  ];

  const contentType = req.headers['content-type'];

  // Allow requests without content-type (like GET requests)
  if (!contentType) {
    return next();
  }

  // Check if content type is allowed
  const isAllowed = allowedTypes.some(type => contentType.includes(type));

  if (!isAllowed) {
    logger.warn('Invalid content type detected', {
      contentType,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    return res.status(415).json({
      success: false,
      message: 'Unsupported content type'
    });
  }

  next();
};
