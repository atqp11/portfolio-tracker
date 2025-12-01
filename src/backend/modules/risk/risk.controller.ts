import { NextRequest, NextResponse } from 'next/server';
import { riskRequestSchema, type RiskRequestDto, type RiskMetricsDto } from '@backend/modules/risk/dto/risk.dto';
import { riskService } from './service/risk.service';
import { getUserProfile } from '@lib/auth/session';
import { checkAndTrackUsage, type TierName } from '@lib/tiers';
import { ErrorResponse } from '@lib/types/base/response.dto';
import { RISK_METRICS_CACHE_TTL_MS } from '@backend/common/constants';

interface RiskMetricsCacheEntry {
  metrics: RiskMetricsDto;
  timestamp: number;
}

// Simple in-memory cache local to controller (keeps parity with previous behavior)
const riskMetricsCache = new Map<string, RiskMetricsCacheEntry>();

export class RiskController {
  async calculate(req: NextRequest): Promise<NextResponse> {
    try {
      const startTime = Date.now();

      const body = await req.json();
      const validation = riskRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          ErrorResponse.validation('Invalid request', undefined, validation.error.issues),
          { status: 400 }
        );
      }

      const riskReq: RiskRequestDto = validation.data;

      // Authenticate
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
      }

      // generate cache key
      const cacheKey = riskService.generateCacheKey(riskReq.portfolioReturns, riskReq.marketReturns);

      // check cache first (cached responses don't count against quota)
      const cached = riskMetricsCache.get(cacheKey);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < RISK_METRICS_CACHE_TTL_MS && !riskReq.bypassCache) {
          console.log(`♻️ Returning cached risk metrics (age: ${Math.floor(age / 1000)}s) - NO QUOTA USED`);
          return NextResponse.json({ ...cached.metrics, cached: true, cacheAge: age });
        } else {
          riskMetricsCache.delete(cacheKey);
        }
      }

      // quota check
      const quotaCheck = await checkAndTrackUsage(profile.id, 'portfolioAnalysis', profile.tier as TierName);
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          ErrorResponse.quotaExceeded('Daily portfolio analysis quota exceeded', {
            reason: quotaCheck.reason,
            upgradeUrl: '/pricing',
          }),
          { status: 429 }
        );
      }

      // perform calculation via service
      const metrics = await riskService.calculateRiskMetrics(riskReq);

      // cache result
      riskMetricsCache.set(cacheKey, { metrics, timestamp: Date.now() });

      console.log(`📊 Risk metrics calculated (user: ${profile.id}, tier: ${profile.tier}, latency: ${Date.now() - startTime}ms)`);

      return NextResponse.json(metrics);
    } catch (error) {
      console.error('❌ Error calculating risk metrics:', error);
      return NextResponse.json(
        ErrorResponse.internal(error instanceof Error ? error.message : 'Failed to calculate risk metrics'),
        { status: 500 }
      );
    }
  }
}

export const riskController = new RiskController();
