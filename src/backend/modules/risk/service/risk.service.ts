import crypto from 'crypto';
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateAlpha,
  calculateBeta,
  calculateStdDev,
  calculateMaxDrawdown,
  calculateCurrentDrawdown,
  calculateRSquared,
  RiskMetrics,
} from '@lib/calculator';
import type { RiskRequestDto, RiskResponseDto } from '@backend/modules/risk/dto/risk.dto';
import { RISK_METRICS_CACHE_TTL_MS } from '@backend/common/constants';

interface RiskMetricsCacheEntry {
  metrics: RiskMetrics;
  timestamp: number;
}

export class RiskService {
  private cache = new Map<string, RiskMetricsCacheEntry>();

  generateCacheKey(portfolioReturns: number[], marketReturns: number[]) {
    const cacheableContent = {
      portfolioReturns: portfolioReturns.slice(0, 100),
      marketReturns: marketReturns.slice(0, 100),
    };
    return crypto.createHash('sha256').update(JSON.stringify(cacheableContent)).digest('hex');
  }

  getFromCache(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    if (age >= RISK_METRICS_CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return { entry, age };
  }

  setCache(key: string, metrics: RiskMetrics) {
    this.cache.set(key, { metrics, timestamp: Date.now() });
  }

  async calculateRiskMetrics(req: RiskRequestDto): Promise<RiskResponseDto> {
    const { portfolioReturns, marketReturns, riskFreeRate = 0.045, marketReturn, portfolioReturn, beta } = req;

    const sharpe = calculateSharpeRatio(portfolioReturns, riskFreeRate);
    const sortino = calculateSortinoRatio(portfolioReturns, riskFreeRate);
    const stdDev = calculateStdDev(portfolioReturns);
    const maxDrawdown = calculateMaxDrawdown(portfolioReturns);
    const currentDrawdown = calculateCurrentDrawdown(portfolioReturns);
    const betaVal = calculateBeta(portfolioReturns, marketReturns);
    const alphaVal = calculateAlpha(
      typeof portfolioReturn === 'number' ? portfolioReturn : (portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length),
      typeof marketReturn === 'number' ? marketReturn : (marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length),
      typeof beta === 'number' ? beta : (betaVal || 1),
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

    return result;
  }
}

export const riskService = new RiskService();
