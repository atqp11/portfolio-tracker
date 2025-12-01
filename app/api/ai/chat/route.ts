/**
 * AI Chat API Route
 *
 * Thin route handler using middleware chain.
 * Follows MVC pattern: Route → Controller → Service → AI Provider
 *
 * Pipeline:
 * 1. Error handling (withErrorHandler)
 * 2. Validation (withValidation)
 * 3. Cache check + Quota (withCacheAndQuota)
 * 4. Controller → Service → AI
 */

import { NextRequest } from 'next/server';
import { aiController } from '@backend/modules/ai/ai.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withCacheAndQuota } from '@backend/common/middleware/cache-quota.middleware';
import { chatRequestSchema } from '@backend/modules/ai/dto/chat.dto';
import { chatService } from '@backend/modules/ai/service/chat.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/ai/chat
 * Process chat message with AI
 */
export const POST = withErrorHandler(
  withValidation(chatRequestSchema)(
    withCacheAndQuota({
      quotaType: 'chatQuery',
      checkCache: async (body) => chatService.checkCache(body),
      upgradeUrl: '/pricing',
    })(
      (req: NextRequest, context: any) => aiController.chat(req, context)
    )
  )
);

/**
 * GET /api/ai/chat/stats
 * Get chat statistics and telemetry
 */
export const GET = withErrorHandler(
  (req: NextRequest) => aiController.getStats(req)
);
