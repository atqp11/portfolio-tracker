/**
 * AI Generate API Route
 *
 * Thin route handler using middleware chain.
 * Follows MVC pattern: Route → Controller → Service → AI Provider
 *
 * Pipeline:
 * 1. Error handling (withErrorHandler)
 * 2. Cache check + Quota (withCacheAndQuota)
 * 3. Service → AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withCacheAndQuota } from '@backend/common/middleware/cache-quota.middleware';
import { generateService, RateLimitError } from '@backend/modules/ai/service/generate.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/ai/generate
 * Generate AI content with smart model routing
 */
export const POST = withErrorHandler(
  withCacheAndQuota({
    quotaType: 'chatQuery',
    checkCache: async (body) => {
      // Always check cache first - cached responses are free
      const cached = generateService.checkCache(body);
      if (cached) {
        return {
          text: cached.text,
          cached: true,
          cacheAge: cached.cacheAge,
          model: cached.model,
          tier: cached.tier,
        };
      }
      // No cache hit - quota will be checked by middleware
      return null;
    },
    upgradeUrl: '/pricing',
  })(
    async (req: NextRequest, context: any) => {
      try {
        const body = context.body || await req.json();
        
        // Check rate limit
        const rateLimitStatus = generateService.isRateLimited();
        if (rateLimitStatus.limited) {
          return NextResponse.json({
            error: 'AI rate limit active. Please wait a moment and try again.',
            rateLimitExceeded: true,
            resetTime: rateLimitStatus.resetTime,
          }, { status: 429 });
        }
        
        // Generate AI response
        const response = await generateService.generate(body);
        
        return NextResponse.json(response);
      } catch (err: any) {
        if (err instanceof RateLimitError) {
          return NextResponse.json({
            error: err.message,
            rateLimitExceeded: true,
            resetTime: err.resetTime,
          }, { status: 429 });
        }
        
        console.error('AI generate error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
      }
    }
  )
);
