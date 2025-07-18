import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError, PrismaClientInitializationError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    });
    return;
  }

  // Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'A record with this information already exists',
          },
        });
        return;

      case 'P2025':
        // Record not found
        res.status(404).json({
          success: false,
          error: {
            code: 'RECORD_NOT_FOUND',
            message: 'The requested record was not found',
          },
        });
        return;

      case 'P2003':
        // Foreign key constraint violation
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REFERENCE',
            message: 'Invalid reference to related record',
          },
        });
        return;

      default:
        res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
          },
        });
        return;
    }
  }

  // Prisma client initialization errors
  if (error instanceof PrismaClientInitializationError) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Unable to connect to database',
      },
    });
    return;
  }

  // Custom API errors
  if ('statusCode' in error && error.statusCode) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: (error as ApiError).code || 'API_ERROR',
        message: error.message,
      },
    });
    return;
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
    },
  });
};

export const createApiError = (
  message: string,
  statusCode: number = 500,
  code?: string
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
};