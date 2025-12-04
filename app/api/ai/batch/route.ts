/**
 * AI Batch Generate API Route
 *
 * Handles batch AI queries for portfolio data (news, filings, sentiment).
 *
 * KEY DIFFERENCES from /api/ai/generate:
 * - Does NOT count against chat query quota
 * - Only checks cache and rate limits
 * - Portfolio change quota is checked/tracked separately via /api/ai/portfolio-change
 *
 * Flow:
 * 1. Authenticate user
 * 2. Check cache first (cache hits are free and fast)
 * 3. Check rate limit (prevent abuse)
 * 4. Generate AI response (no quota tracking)
 * 5. Return response
 *
 * Portfolio Change Quota Flow (handled by client):
 * - Client detects portfolio change via localStorage
 * - Client checks quota: GET /api/ai/portfolio-change
 * - Client calls this endpoint if allowed
 * - Client tracks change: POST /api/ai/portfolio-change (after success)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withAuthContext } from '@backend/common/middleware/cache-quota.middleware';
import { generateService, RateLimitError } from '@backend/modules/ai/service/generate.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/ai/batch
 * Generate AI content for batch portfolio queries
 * Does NOT count against chat query quota
 */
export const POST = withErrorHandler(
  withAuthContext(
    async (req: NextRequest, context: any) => {
      try {
        const body = await req.json();

        // Check cache first - cached responses are free
        const cached = await generateService.checkCache(body);
        if (cached) {
          return NextResponse.json({
            text: cached.text,
            cached: true,
            cacheAge: cached.cacheAge,
            model: cached.model,
            tier: cached.tier,
          });
        }

        // Check rate limit (prevent abuse even without quota)
        const rateLimitStatus = generateService.isRateLimited();
        if (rateLimitStatus.limited) {
          return NextResponse.json({
            error: 'AI rate limit active. Please wait a moment and try again.',
            rateLimitExceeded: true,
            resetTime: rateLimitStatus.resetTime,
          }, { status: 429 });
        }

        // Generate AI response
        // No quota tracking here - portfolio change quota is handled separately
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

        console.error('AI batch generate error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
      }
    }
  )
);
