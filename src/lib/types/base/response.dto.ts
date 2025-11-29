/**
 * Standard API Response DTOs
 *
 * Provides unified response format across all API endpoints for consistency.
 * Includes success/error handling, metadata, and type-safe responses.
 */

import { PaginationMeta } from '@backend/common/repositories/types';

/**
 * Standard error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;      // For validation errors
  timestamp?: number;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  timestamp: number;
  cached?: boolean;
  cacheAge?: number;      // Age in milliseconds
  requestId?: string;
  pagination?: PaginationMeta;
}

/**
 * Standard API Response wrapper
 * @template T - The type of data being returned
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

/**
 * Success response builder
 */
export class SuccessResponse {
  /**
   * Create a successful response
   */
  static create<T>(data: T, meta?: Partial<ResponseMeta>): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: Date.now(),
        ...meta,
      },
    };
  }

  /**
   * Create a successful response with pagination
   */
  static paginated<T>(
    data: T[],
    pagination: PaginationMeta,
    meta?: Partial<ResponseMeta>
  ): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        timestamp: Date.now(),
        pagination,
        ...meta,
      },
    };
  }

  /**
   * Create a successful response indicating data from cache
   */
  static cached<T>(data: T, cacheAge: number, meta?: Partial<ResponseMeta>): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: Date.now(),
        cached: true,
        cacheAge,
        ...meta,
      },
    };
  }

  /**
   * Create a successful response with no data (for DELETE operations)
   */
  static noContent(meta?: Partial<ResponseMeta>): ApiResponse<null> {
    return {
      success: true,
      data: null,
      meta: {
        timestamp: Date.now(),
        ...meta,
      },
    };
  }
}

/**
 * Error codes enum
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Rate limiting & Quota
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',

  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT = 'TIMEOUT',

  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

/**
 * Error response builder
 */
export class ErrorResponse {
  /**
   * Create an error response
   */
  static create(
    code: ErrorCode | string,
    message: string,
    details?: any,
    meta?: Partial<ResponseMeta>
  ): ApiResponse<never> {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: Date.now(),
      },
      meta: {
        timestamp: Date.now(),
        ...meta,
      },
    };
  }

  /**
   * Create a validation error response
   */
  static validation(
    message: string,
    field?: string,
    details?: any
  ): ApiResponse<never> {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message,
        field,
        details,
        timestamp: Date.now(),
      },
      meta: {
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Create an unauthorized error response
   */
  static unauthorized(message: string = 'Authentication required'): ApiResponse<never> {
    return ErrorResponse.create(ErrorCode.UNAUTHORIZED, message);
  }

  /**
   * Create a forbidden error response
   */
  static forbidden(message: string = 'Access denied'): ApiResponse<never> {
    return ErrorResponse.create(ErrorCode.FORBIDDEN, message);
  }

  /**
   * Create a not found error response
   */
  static notFound(resource: string = 'Resource'): ApiResponse<never> {
    return ErrorResponse.create(ErrorCode.NOT_FOUND, `${resource} not found`);
  }

  /**
   * Create a quota exceeded error response
   */
  static quotaExceeded(
    message: string = 'Quota limit exceeded',
    details?: any
  ): ApiResponse<never> {
    return ErrorResponse.create(ErrorCode.QUOTA_EXCEEDED, message, details);
  }

  /**
   * Create a rate limit exceeded error response
   */
  static rateLimitExceeded(
    message: string = 'Rate limit exceeded',
    details?: any
  ): ApiResponse<never> {
    return ErrorResponse.create(ErrorCode.RATE_LIMIT_EXCEEDED, message, details);
  }

  /**
   * Create an internal error response
   */
  static internal(message: string = 'Internal server error', details?: any): ApiResponse<never> {
    return ErrorResponse.create(ErrorCode.INTERNAL_ERROR, message, details);
  }

  /**
   * Create a bad request error response
   */
  static badRequest(message: string, details?: any): ApiResponse<never> {
    return ErrorResponse.create(ErrorCode.BAD_REQUEST, message, details);
  }

  /**
   * Create a duplicate resource error response
   */
  static duplicate(resource: string = 'Resource'): ApiResponse<never> {
    return ErrorResponse.create(
      ErrorCode.DUPLICATE_RESOURCE,
      `${resource} already exists`
    );
  }

  /**
   * Create a timeout error response
   */
  static timeout(message: string = 'Request timeout'): ApiResponse<never> {
    return ErrorResponse.create(ErrorCode.TIMEOUT, message);
  }
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: ApiResponse<any>): response is ApiResponse<never> & { error: ApiError } {
  return response.success === false && response.error !== undefined;
}
