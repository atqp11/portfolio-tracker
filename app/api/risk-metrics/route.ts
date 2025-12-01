/**
 * Risk Metrics API Route
 *
 * Thin route handler using middleware chain.
 * Follows MVC pattern: Route → Controller → Service
 *
 * Pipeline:
 * 1. Error handling (withErrorHandler)
 * 2. Validation (withValidation)
 * 3. Cache check + Quota (withCacheAndQuota)
 * 4. Controller → Service → Calculator
 */

import { NextRequest } from 'next/server';
import { riskController } from '@backend/modules/risk/risk.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withCacheAndQuota } from '@backend/common/middleware/cache-quota.middleware';
import { riskRequestSchema } from '@backend/modules/risk/dto/risk.dto';
import { riskService } from '@backend/modules/risk/service/risk.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/risk-metrics
 * Calculate portfolio risk metrics
 */
export const POST = withErrorHandler(
  withValidation(riskRequestSchema)(
    withCacheAndQuota({
      quotaType: 'portfolioAnalysis',
      checkCache: async (body) => riskService.checkCache(body),
      upgradeUrl: '/pricing',
    })(
      (req: NextRequest, context: any) => riskController.calculate(req, context)
    )
  )
);
