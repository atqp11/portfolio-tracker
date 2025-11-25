import { NextRequest, NextResponse } from 'next/server';
import { calculateSharpeRatio, calculateSortinoRatio, calculateAlpha, calculateBeta, calculateStdDev, calculateMaxDrawdown, calculateCurrentDrawdown, calculateRSquared, RiskMetrics } from '@/lib/calculator';
import { checkAndTrackUsage, type TierName } from '@/lib/tiers';
import { getUserProfile } from '@/lib/auth/session';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Server-side cache for risk metrics
interface RiskMetricsCacheEntry {
  metrics: RiskMetrics;
  timestamp: number;
}

const riskMetricsCache = new Map<string, RiskMetricsCacheEntry>();
const RISK_METRICS_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Generate cache key from portfolio data
 */
function generateCacheKey(portfolioReturns: number[], marketReturns: number[]): string {
  const cacheableContent = {
    portfolioReturns: portfolioReturns.slice(0, 100), // Limit size
    marketReturns: marketReturns.slice(0, 100),
  };
  return crypto.createHash('sha256').update(JSON.stringify(cacheableContent)).digest('hex');
}

// Example: expects JSON body with { portfolioReturns, marketReturns, riskFreeRate, marketReturn, portfolioReturn, beta }
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const body = await req.json();
  const { portfolioReturns, marketReturns, riskFreeRate = 0.045, marketReturn, portfolioReturn, beta } = body;

  // Defensive: ensure arrays
  if (!Array.isArray(portfolioReturns) || !Array.isArray(marketReturns)) {
    return NextResponse.json(
      { error: 'portfolioReturns and marketReturns must be arrays' },
      { status: 400 }
    );
  }

  // Authenticate user
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Generate cache key
  const cacheKey = generateCacheKey(portfolioReturns, marketReturns);

  // Check cache FIRST - cached responses don't count against quota
  const cached = riskMetricsCache.get(cacheKey);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < RISK_METRICS_CACHE_TTL) {
      console.log(`♻️ Returning cached risk metrics (age: ${Math.floor(age / 1000)}s) - NO QUOTA USED`);
      return NextResponse.json({
        ...cached.metrics,
        cached: true,
        cacheAge: age,
      });
    } else {
      // Expired, remove from cache
      riskMetricsCache.delete(cacheKey);
    }
  }

  // Check and track usage (daily quota for portfolio analysis)
  const quotaCheck = await checkAndTrackUsage(
    profile.id,
    'portfolioAnalysis',
    profile.tier as TierName
  );

  if (!quotaCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Daily portfolio analysis quota exceeded',
        reason: quotaCheck.reason,
        upgradeUrl: '/pricing',
      },
      { status: 429 }
    );
  }

  // Compute metrics
  const sharpe = calculateSharpeRatio(portfolioReturns, riskFreeRate);
  const sortino = calculateSortinoRatio(portfolioReturns, riskFreeRate);
  const stdDev = calculateStdDev(portfolioReturns);
  const maxDrawdown = calculateMaxDrawdown(portfolioReturns);
  const currentDrawdown = calculateCurrentDrawdown(portfolioReturns);
  const betaVal = calculateBeta(portfolioReturns, marketReturns);
  const alphaVal = calculateAlpha(
    typeof portfolioReturn === 'number' ? portfolioReturn : (portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length),
    typeof marketReturn === 'number' ? marketReturn : (marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length),
    typeof beta === 'number' ? beta : betaVal || 1,
    riskFreeRate
  );
  const rSquared = calculateRSquared(portfolioReturns, marketReturns);
  const calmar = maxDrawdown && maxDrawdown > 0 && typeof portfolioReturn === 'number'
    ? portfolioReturn / maxDrawdown
    : null;

  const result: RiskMetrics = {
    sharpe,
    sortino,
    alpha: alphaVal,
    beta: betaVal,
    calmar,
    stdDev,
    maxDrawdown,
    currentDrawdown,
    rSquared,
  };

  // Cache the result
  riskMetricsCache.set(cacheKey, {
    metrics: result,
    timestamp: Date.now(),
  });

  console.log(`📊 Risk metrics calculated (user: ${profile.id}, tier: ${profile.tier}, latency: ${Date.now() - startTime}ms)`);

  return NextResponse.json(result);
}
