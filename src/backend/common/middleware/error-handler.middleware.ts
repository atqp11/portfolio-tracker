/**
 * Error Handler Middleware
 *
 * Centralized error handling for all API routes.
 * Converts various error types to standardized API responses.
 */

import { NextResponse } from 'next/server';
import { ValidationError } from './validation.middleware';
import { RepositoryError, RepositoryErrorType } from '../repositories/types';
import { ApiResponse, ErrorResponse, ErrorCode } from '@lib/types/base/response.dto';

/**
 * Custom error classes
 */
export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class QuotaExceededError extends Error {
  constructor(
    message: string = 'Quota limit exceeded',
    public details?: any
  ) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * Error Handler Middleware
 */
export class ErrorHandlerMiddleware {
  /**
   * Handle error and return appropriate NextResponse
   */
  static handle(error: Error): NextResponse {
    // Only log unexpected errors, not expected ones like quota/rate limit
    const isExpectedError = 
      error instanceof ValidationError ||
      error instanceof NotFoundError ||
      error instanceof UnauthorizedError ||
      error instanceof ForbiddenError ||
      error instanceof QuotaExceededError ||
      error instanceof RateLimitError ||
      error instanceof ConflictError;
    
    if (!isExpectedError) {
      console.error('Error in API route:', error);
    }

    // Validation errors
    if (error instanceof ValidationError) {
      const response = ErrorResponse.validation(error.message, undefined, error.details);
      return NextResponse.json(response, { status: error.statusCode || 400 });
    }

    // Repository errors
    if (error instanceof RepositoryError) {
      return this.handleRepositoryError(error);
    }

    // Not found error
    if (error instanceof NotFoundError) {
      const response = ErrorResponse.notFound(error.message);
      return NextResponse.json(response, { status: 404 });
    }
    
    // Conflict error
    if (error instanceof ConflictError) {
      const response = ErrorResponse.duplicate(error.message);
      return NextResponse.json(response, { status: 409 });
    }

    // Unauthorized error
    if (error instanceof UnauthorizedError) {
      const response = ErrorResponse.unauthorized(error.message);
      return NextResponse.json(response, { status: 401 });
    }

    // Forbidden error
    if (error instanceof ForbiddenError) {
      const response = ErrorResponse.forbidden(error.message);
      return NextResponse.json(response, { status: 403 });
    }

    // Quota exceeded error
    if (error instanceof QuotaExceededError) {
      const response = ErrorResponse.quotaExceeded(error.message, error.details);
      return NextResponse.json(response, { status: 429 });
    }

    // Rate limit error
    if (error instanceof RateLimitError) {
      const response = ErrorResponse.rateLimitExceeded(error.message, {
        retryAfter: error.retryAfter,
      });
      const headers: Record<string, string> = {};
      if (error.retryAfter) {
        headers['Retry-After'] = String(error.retryAfter);
      }
      return NextResponse.json(response, { status: 429, headers });
    }

    // External service error
    if (error instanceof ExternalServiceError) {
      const response = ErrorResponse.create(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        error.message,
        { service: error.service }
      );
      return NextResponse.json(response, { status: 502 });
    }

    // Generic error
    const response = ErrorResponse.internal(
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message
    );
    return NextResponse.json(response, { status: 500 });
  }

  /**
   * Handle repository-specific errors
   */
  private static handleRepositoryError(error: RepositoryError): NextResponse {
    switch (error.type) {
      case RepositoryErrorType.NOT_FOUND:
        const notFoundResponse = ErrorResponse.notFound();
        return NextResponse.json(notFoundResponse, { status: 404 });

      case RepositoryErrorType.DUPLICATE_KEY:
        const duplicateResponse = ErrorResponse.duplicate();
        return NextResponse.json(duplicateResponse, { status: 409 });

      case RepositoryErrorType.VALIDATION_ERROR:
        const validationResponse = ErrorResponse.validation(error.message);
        return NextResponse.json(validationResponse, { status: 400 });

      case RepositoryErrorType.TRANSACTION_ERROR:
      case RepositoryErrorType.DATABASE_ERROR:
      default:
        const dbErrorResponse = ErrorResponse.internal('Database error occurred');
        return NextResponse.json(dbErrorResponse, { status: 500 });
    }
  }

  /**
   * Wrap async route handler with error handling
   */
  static wrap(handler: (...args: any[]) => Promise<NextResponse>) {
    return async (...args: any[]): Promise<NextResponse> => {
      try {
        return await handler(...args);
      } catch (error) {
        return this.handle(error as Error);
      }
    };
  }

  /**
   * Create API response from error
   */
  static toApiResponse(error: Error): ApiResponse<never> {
    if (error instanceof ValidationError) {
      return ErrorResponse.validation(error.message, undefined, error.details);
    }

    if (error instanceof NotFoundError) {
      return ErrorResponse.notFound();
    }
    
    if (error instanceof ConflictError) {
        return ErrorResponse.duplicate();
    }

    if (error instanceof UnauthorizedError) {
      return ErrorResponse.unauthorized(error.message);
    }

    if (error instanceof ForbiddenError) {
      return ErrorResponse.forbidden(error.message);
    }

    if (error instanceof QuotaExceededError) {
      return ErrorResponse.quotaExceeded(error.message, error.details);
    }

    if (error instanceof RateLimitError) {
      return ErrorResponse.rateLimitExceeded(error.message);
    }

    return ErrorResponse.internal(error.message);
  }
}

/**
 * Helper function to wrap route handlers
 */
export function withErrorHandler(
  handler: (...args: any[]) => Promise<NextResponse>
) {
  return ErrorHandlerMiddleware.wrap(handler);
}
