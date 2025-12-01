import { z } from 'zod';

/**
 * Request DTO for risk metrics calculation
 */
export const riskRequestSchema = z.object({
  portfolioReturns: z.array(z.number()).min(1),
  marketReturns: z.array(z.number()).min(1),
  riskFreeRate: z.number().optional(),
  marketReturn: z.number().optional(),
  portfolioReturn: z.number().optional(),
  beta: z.number().optional(),
  bypassCache: z.boolean().optional(),
});

export type RiskRequestDto = z.infer<typeof riskRequestSchema>;

/**
 * Risk metrics response schema
 */
export const riskMetricsSchema = z.object({
  sharpe: z.number().nullable(),
  sortino: z.number().nullable(),
  alpha: z.number().nullable(),
  beta: z.number().nullable(),
  calmar: z.number().nullable(),
  stdDev: z.number().nullable(),
  maxDrawdown: z.number().nullable(),
  currentDrawdown: z.number().nullable(),
  rSquared: z.number().nullable(),
});

export type RiskMetricsDto = z.infer<typeof riskMetricsSchema>;

export const riskResponseSchema = riskMetricsSchema.extend({
  cached: z.boolean().optional(),
  cacheAge: z.number().optional(),
});

export type RiskResponseDto = z.infer<typeof riskResponseSchema>;