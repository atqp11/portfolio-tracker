/**
 * Cache and Quota Middleware
 *
 * Specialized middleware for routes that need cache-first-then-quota pattern.
 * Used by AI Chat and Risk Metrics routes.
 *
 * Pattern:
 * 1. Authenticate user
 * 2. Check cache FIRST (cached responses don't count against quota)
 * 3. If cache miss, check and track quota
 * 4. If quota approved, proceed to handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from './auth.middleware';
import { checkAndTrackUsage, type TierName, type UsageAction } from '@lib/tiers';
import { ErrorResponse } from '@lib/types/base/response.dto';
import { QuotaExceededError } from './error-handler.middleware';

/**
 * Quota type for tracking usage
 */
export type QuotaType = UsageAction;

/**
 * Cache check function type
 * Returns cached response if available, null otherwise
 */
export type CacheCheckFn<TRequest, TResponse> = (
  request: TRequest,
  userId: string
) => Promise<TResponse | null>;

/**
 * Context passed to handler after cache/quota checks
 */
export interface CacheQuotaContext {
  userId: string;
  userTier: TierName;
  cacheHit: boolean;
  cachedResponse?: any;
}

/**
 * Options for cache and quota middleware
 */
export interface CacheQuotaOptions<TRequest> {
  /** Type of quota to check */
  quotaType: QuotaType;
  /** Function to check cache - receives validated request body */
  checkCache?: CacheCheckFn<TRequest, any>;
  /** URL for upgrade prompt when quota exceeded */
  upgradeUrl?: string;
}

/**
 * Higher-order function to wrap route handlers with cache-first-then-quota logic
 * 
 * @param options - Configuration for cache and quota behavior
 * @param handler - The route handler to wrap
 * @returns Wrapped handler with cache/quota logic
 * 
 * @example
 * ```typescript
 * export const POST = withErrorHandler(
 *   withCacheAndQuota({
 *     quotaType: 'chatQuery',
 *     checkCache: (body, userId) => chatCacheService.get(body, userId),
 *   })(
 *     withValidation(chatRequestSchema)(
 *       (req, context) => aiController.chat(req, context)
 *     )
 *   )
 * );
 * ```
 */
export function withCacheAndQuota<TRequest = any>(
  options: CacheQuotaOptions<TRequest>
) {
  const { quotaType, checkCache, upgradeUrl = '/pricing' } = options;

  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (request: NextRequest, context: any = {}) => {
      // Step 1: Authenticate user
      const profile = await AuthMiddleware.getCurrentProfile();
      if (!profile) {
        return NextResponse.json(
          ErrorResponse.unauthorized(),
          { status: 401 }
        );
      }

      const userId = profile.id;
      const userTier = profile.tier as TierName;

      // Step 2: Check cache FIRST (if cache function provided)
      // Cached responses don't count against quota
      if (checkCache && context.body) {
        const cachedResponse = await checkCache(context.body as TRequest, userId);
        if (cachedResponse) {
          return NextResponse.json(cachedResponse);
        }
      }

      // Step 3: Cache miss - check and track quota
      const quotaCheck = await checkAndTrackUsage(userId, quotaType, userTier);

      if (!quotaCheck.allowed) {
        throw new QuotaExceededError(
          quotaCheck.reason || `${quotaType} quota exceeded`,
          { upgradeUrl }
        );
      }

      // Step 4: Add auth context and proceed to handler
      const enhancedContext: any = {
        ...context,
        auth: {
          userId,
          userTier,
          profile,
        },
      };

      return handler(request, enhancedContext);
    }) as T;
  };
}

/**
 * Simple auth middleware for routes that just need authentication
 * without cache/quota logic. Alternative to withAuth for consistency.
 */
export function withAuthContext<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (request: NextRequest, context: any = {}) => {
    const profile = await AuthMiddleware.getCurrentProfile();
    if (!profile) {
      return NextResponse.json(
        ErrorResponse.unauthorized(),
        { status: 401 }
      );
    }

    const enhancedContext: any = {
      ...context,
      auth: {
        userId: profile.id,
        userTier: profile.tier as TierName,
        profile,
      },
    };

    return handler(request, enhancedContext);
  }) as T;
}
