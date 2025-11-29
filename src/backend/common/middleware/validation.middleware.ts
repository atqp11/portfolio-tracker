/**
 * Validation Middleware using Zod
 *
 * Provides request validation middleware using Zod schemas.
 * Validates request body, query parameters, and path parameters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { formatZodError } from '@lib/validators/schemas';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: any,
    public statusCode: number = 400
  ) {
    // Append details to message for better debugging in test runners
    super(`${message} - Details: ${JSON.stringify(details, null, 2)}`);
    this.name = 'ValidationError';
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: this.message,
          details: this.details,
        },
      },
      { status: this.statusCode }
    );
  }
}

/**
 * Validation schema type (Zod schema)
 */
export type ValidationSchema<T = any> = z.ZodSchema<T>;

/**
 * Validation Middleware class using Zod
 */
export class ValidationMiddleware {
  /**
   * Validate request body against Zod schema
   */
  static async validateBody<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    try {
      const body = await request.json();
      console.log('--- DEBUG: Request Body ---', body);
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formatted = formatZodError(error);
        throw new ValidationError('Validation failed', formatted.errors);
      }
      throw new ValidationError('Invalid request body', { message: 'Failed to parse JSON' });
    }
  }

  /**
   * Validate query parameters against Zod schema
   */
  static validateQuery<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
  ): T {
    try {
      const { searchParams } = new URL(request.url);
      const query: Record<string, any> = {};

      searchParams.forEach((value, key) => {
        // Try to parse JSON values, otherwise use as string
        try {
          query[key] = JSON.parse(value);
        } catch {
          query[key] = value;
        }
      });
      
      const result = schema.safeParse(query);

      if (!result.success) {
        throw new z.ZodError(result.error.issues);
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formatted = formatZodError(error);
        throw new ValidationError('Query validation failed', formatted.errors);
      }
      throw new ValidationError('Invalid query parameters', {});
    }
  }

  /**
   * Validate URL parameters against Zod schema
   */
  static validateParams<T>(
    params: Record<string, string | string[]>,
    schema: z.ZodSchema<T>
  ): T {
    try {
      return schema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formatted = formatZodError(error);
        throw new ValidationError('Parameter validation failed', formatted.errors);
      }
      throw new ValidationError('Invalid URL parameters', {});
    }
  }

  /**
   * Safe validation that returns a result object instead of throwing
   */
  static async safeValidateBody<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
  ): Promise<{ success: true; data: T } | { success: false; error: ValidationError }> {
    try {
      const data = await this.validateBody(request, schema);
      return { success: true, data };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { success: false, error };
      }
      return {
        success: false,
        error: new ValidationError('Validation failed', { message: 'Unknown error' }),
      };
    }
  }
}

/**
 * Decorator for Zod body validation
 */
export function ValidateBody<T>(schema: z.ZodSchema<T>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;

      try {
        const body = await ValidationMiddleware.validateBody(request, schema);
        // Inject validated body into context
        if (args[1]) {
          args[1].body = body;
        } else {
          args[1] = { body };
        }

        return originalMethod.apply(this, args);
      } catch (error) {
        if (error instanceof ValidationError) {
          return error.toResponse();
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for Zod query parameter validation
 */
export function ValidateQuery<T>(schema: z.ZodSchema<T>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;

      try {
        const query = ValidationMiddleware.validateQuery(request, schema);
        // Inject validated query into context
        if (args[1]) {
          args[1].query = query;
        } else {
          args[1] = { query };
        }

        return originalMethod.apply(this, args);
      } catch (error) {
        if (error instanceof ValidationError) {
          return error.toResponse();
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Higher-order function to wrap route handlers with validation
 */
export function withValidation<T, P = any>(
  bodySchema?: z.ZodSchema<T>,
  querySchema?: z.ZodSchema<P>
) {
  return function (
    handler: (
      request: NextRequest,
      context: { params?: any; body?: T; query?: P }
    ) => Promise<NextResponse>
  ) {
    return async function (
      request: NextRequest,
      context: { params?: any }
    ): Promise<NextResponse> {
      try {
        let body: T | undefined;
        let query: P | undefined;

        // Validate body if schema provided and method has body
        if (bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
          body = await ValidationMiddleware.validateBody(request, bodySchema);
        }

        // Validate query if schema provided
        if (querySchema) {
          query = ValidationMiddleware.validateQuery(request, querySchema);
        }

        return handler(request, { ...context, body, query });
      } catch (error) {
        if (error instanceof ValidationError) {
          return error.toResponse();
        }

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
            },
          },
          { status: 500 }
        );
      }
    };
  };
}
