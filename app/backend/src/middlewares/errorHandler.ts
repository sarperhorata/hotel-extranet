import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error types
export const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// Create specific error types
export const createValidationError = (message: string) => 
  new AppError(message, 400);

export const createAuthenticationError = (message: string = 'Authentication failed') => 
  new AppError(message, 401);

export const createAuthorizationError = (message: string = 'Access denied') => 
  new AppError(message, 403);

export const createNotFoundError = (message: string = 'Resource not found') => 
  new AppError(message, 404);

export const createDuplicateError = (message: string = 'Resource already exists') => 
  new AppError(message, 409);

export const createDatabaseError = (message: string = 'Database operation failed') => 
  new AppError(message, 500);

export const createExternalAPIError = (message: string = 'External API error') => 
  new AppError(message, 502);

// Handle different types of errors
const handleValidationError = (error: any): AppError => {
  const message = Object.values(error.errors).map((val: any) => val.message).join(', ');
  return createValidationError(message);
};

const handleDuplicateKeyError = (error: any): AppError => {
  const field = Object.keys(error.keyValue)[0];
  const message = `${field} already exists`;
  return createDuplicateError(message);
};

const handleCastError = (error: any): AppError => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return createValidationError(message);
};

const handleJWTError = (): AppError => 
  createAuthenticationError('Invalid token. Please log in again!');

const handleJWTExpiredError = (): AppError => 
  createAuthenticationError('Your token has expired! Please log in again.');

// Send error response in development
const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Send error response in production
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
};

// Global error handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'ValidationError') {
      error = handleValidationError(error);
    }
    
    if (error.code === 11000) {
      error = handleDuplicateKeyError(error);
    }
    
    if (error.name === 'CastError') {
      error = handleCastError(error);
    }
    
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    // Handle PostgreSQL errors
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique violation
          error = createDuplicateError('Resource already exists');
          break;
        case '23503': // Foreign key violation
          error = createValidationError('Referenced resource does not exist');
          break;
        case '23502': // Not null violation
          error = createValidationError('Required field is missing');
          break;
        case '42P01': // Undefined table
          error = createDatabaseError('Database table not found');
          break;
        default:
          error = createDatabaseError('Database operation failed');
      }
    }

    sendErrorProd(error, res);
  }
};

// Async error wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler for undefined routes
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = createNotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};
