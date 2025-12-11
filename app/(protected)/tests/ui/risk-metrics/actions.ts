'use server';

import { z } from 'zod';
import { requireUser } from '@lib/auth/session';
import { riskService } from '@backend/modules/risk/service/risk.service';
import type { RiskRequestDto } from '@backend/modules/risk/dto/risk.dto';

/**
 * Helper to format Zod validation errors into user-friendly messages
 */
function formatValidationError(error: z.ZodError): string {
  if (error.issues && error.issues.length > 0) {
    const firstError = error.issues[0];
    const field = firstError.path.length > 0 ? firstError.path.join('.') : '';
    return field ? `${field}: ${firstError.message}` : firstError.message;
  }
  return 'Validation failed';
}

// Schema for calculating risk metrics
const calculateRiskMetricsSchema = z.object({
  portfolioReturns: z.array(z.number()).min(1, 'Portfolio returns required'),
  marketReturns: z.array(z.number()).min(1, 'Market returns required'),
  riskFreeRate: z.number().optional().default(0.045),
  marketReturn: z.number().optional(),
  portfolioReturn: z.number().optional(),
  beta: z.number().optional(),
  bypassCache: z.boolean().optional().default(false),
});

/**
 * Server Action to calculate risk metrics
 *
 * Calculates portfolio risk metrics including:
 * - Sharpe Ratio: Risk-adjusted return
 * - Sortino Ratio: Downside risk-adjusted return
 * - Alpha: Excess return vs market
 * - Beta: Market correlation
 * - Calmar Ratio: Return vs max drawdown
 * - Standard Deviation: Volatility measure
 * - Max Drawdown: Largest peak-to-trough decline
 * - Current Drawdown: Current decline from peak
 * - R-Squared: Market correlation strength
 *
 * @param data - Risk calculation parameters
 * @returns RiskResponseDto with calculated metrics
 * @throws Error if validation fails or calculation errors occur
 */
export async function calculateRiskMetrics(data: unknown) {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Validate with safeParse
    const result = calculateRiskMetricsSchema.safeParse(data);
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    const requestDto: RiskRequestDto = result.data;

    // 3. Check cache first
    const cachedResult = riskService.checkCache(requestDto);
    if (cachedResult) {
      return cachedResult;
    }

    // 4. Calculate via service (handles business logic and DTO transformation)
    const metrics = await riskService.calculateRiskMetrics(requestDto);

    // 5. Cache the result
    const cacheKey = riskService.generateCacheKey(
      requestDto.portfolioReturns,
      requestDto.marketReturns
    );
    riskService.setCache(cacheKey, metrics);

    return { ...metrics, cached: false };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to calculate risk metrics');
  }
}
