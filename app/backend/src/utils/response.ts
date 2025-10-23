import { Response } from 'express';

// Standard API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  errors?: any[];
}

// Success response helper
export const successResponse = <T>(
  res: Response,
  data?: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: any
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta
  };

  return res.status(statusCode).json(response);
};

// Error response helper
export const errorResponse = (
  res: Response,
  message: string = 'Error',
  statusCode: number = 400,
  errors?: any[]
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    errors
  };

  return res.status(statusCode).json(response);
};

// Pagination helper
export const paginate = (
  page: number = 1,
  limit: number = 10,
  total: number = 0
) => {
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    offset,
    total,
    totalPages
  };
};

// Paginated response helper
export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success'
): Response => {
  const pagination = paginate(page, limit, total);
  
  return successResponse(res, data, message, 200, pagination);
};

// Created response helper
export const createdResponse = <T>(
  res: Response,
  data?: T,
  message: string = 'Resource created successfully'
): Response => {
  return successResponse(res, data, message, 201);
};

// Updated response helper
export const updatedResponse = <T>(
  res: Response,
  data?: T,
  message: string = 'Resource updated successfully'
): Response => {
  return successResponse(res, data, message, 200);
};

// Deleted response helper
export const deletedResponse = (
  res: Response,
  message: string = 'Resource deleted successfully'
): Response => {
  return successResponse(res, null, message, 200);
};

// Not found response helper
export const notFoundResponse = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return errorResponse(res, message, 404);
};

// Validation error response helper
export const validationErrorResponse = (
  res: Response,
  errors: any[],
  message: string = 'Validation failed'
): Response => {
  return errorResponse(res, message, 400, errors);
};

// Unauthorized response helper
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return errorResponse(res, message, 401);
};

// Forbidden response helper
export const forbiddenResponse = (
  res: Response,
  message: string = 'Access denied'
): Response => {
  return errorResponse(res, message, 403);
};

// Conflict response helper
export const conflictResponse = (
  res: Response,
  message: string = 'Resource already exists'
): Response => {
  return errorResponse(res, message, 409);
};

// Internal server error response helper
export const serverErrorResponse = (
  res: Response,
  message: string = 'Internal server error'
): Response => {
  return errorResponse(res, message, 500);
};
