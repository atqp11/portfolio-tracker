/**
 * Risk Controller
 *
 * Thin HTTP controller for risk metrics operations.
 * Auth, validation, cache, and quota are handled by middleware.
 * Delegates business logic to RiskService.
 */

import { NextRequest, NextResponse } from 'next/server';
import { riskService } from './service/risk.service';
import type { RiskRequestDto } from '@backend/modules/risk/dto/risk.dto';

/**
 * Auth context from middleware
 */
interface AuthContext {
  userId: string;
  userTier: string;
}

export class RiskController {
  /**
   * POST - Calculate risk metrics
   *
   * Auth, validation, cache check, and quota are handled by middleware.
   * Controller just calculates and caches the metrics.
   */
  async calculate(
    req: NextRequest,
    context: { body: RiskRequestDto; auth: AuthContext }
  ): Promise<NextResponse> {
    const { body: riskReq, auth } = context;
    const startTime = Date.now();

    // Calculate metrics via service
    const metrics = await riskService.calculateRiskMetrics(riskReq);

    // Cache the result
    const cacheKey = riskService.generateCacheKey(riskReq.portfolioReturns, riskReq.marketReturns);
    riskService.setCache(cacheKey, metrics);

    console.log(`📊 Risk metrics calculated (user: ${auth.userId}, tier: ${auth.userTier}, latency: ${Date.now() - startTime}ms)`);

    return NextResponse.json(metrics);
  }
}

export const riskController = new RiskController();
