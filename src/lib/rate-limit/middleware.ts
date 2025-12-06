/**
 * Rate Limit Middleware
 * 
 * Higher-order function that wraps API route handlers with rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  checkRateLimitWithFallback, 
  getRateLimitHeaders,
  RateLimitType 
} from './rate-limiter';
import { getUserProfile } from '@lib/auth/session';

export interface RateLimitedHandlerOptions {
  type?: RateLimitType;
  skipAuth?: boolean; // For public endpoints
}

type ApiHandler = (
  req: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wrap an API handler with rate limiting
 */
export function withRateLimit(
  handler: ApiHandler,
  options: RateLimitedHandlerOptions = {}
): ApiHandler {
  const { type = 'default', skipAuth = false } = options;

  return async (req: NextRequest, context?: { params: Record<string, string> }) => {
    // Get identifier
    let userId: string | null = null;
    if (!skipAuth) {
      try {
        const profile = await getUserProfile();
        userId = profile?.id || null;
      } catch {
        userId = null;
      }
    }

    // Get IP address (handle Vercel proxy)
    const ipAddress = 
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit
    const result = await checkRateLimitWithFallback(userId, ipAddress, type);

    // Add rate limit headers to all responses
    const headers = getRateLimitHeaders(result);
    // Convert to HeadersInit compatible format
    const headersInit: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        headersInit[key] = value;
      }
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please retry after ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: headersInit,
        }
      );
    }

    // Call the actual handler
    const response = await handler(req, context);

    // Add rate limit headers to successful response
    Object.entries(headersInit).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Simplified rate limit check for use within handlers
 */
export async function enforceRateLimit(
  req: NextRequest,
  type: RateLimitType = 'default'
): Promise<NextResponse | null> {
  const profile = await getUserProfile().catch(() => null);
  const userId = profile?.id || null;
  
  const ipAddress = 
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const result = await checkRateLimitWithFallback(userId, ipAddress, type);

  if (!result.success) {
    const headers = getRateLimitHeaders(result);
    // Convert to HeadersInit compatible format
    const headersInit: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        headersInit[key] = value;
      }
    });
    
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please retry after ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: headersInit,
      }
    );
  }

  return null; // No error, continue
}
