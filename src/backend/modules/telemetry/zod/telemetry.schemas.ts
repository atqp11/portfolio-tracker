/**
 * Telemetry Zod Schemas
 * 
 * Input params validation (search, route params, body).
 * Output DTO validation.
 * MUST NOT include DB types directly.
 */

import { z } from 'zod';

/**
 * Period enum for telemetry queries
 */
export const telemetryPeriodSchema = z.enum(['1h', '24h', '7d', '30d'], {
  message: 'Period must be one of: 1h, 24h, 7d, 30d',
});

/**
 * Request schema for getting telemetry stats
 * Used for validating searchParams in pages and query params in API routes
 */
export const getTelemetryStatsRequestSchema = z.object({
  period: telemetryPeriodSchema.default('24h'),
});

/**
 * Response schema for telemetry stats (output validation)
 */
export const telemetryStatsResponseSchema = z.object({
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  totalRequests: z.number().nonnegative(),
  cacheHitRate: z.number().min(0).max(1),
  escalationRate: z.number().min(0).max(1),
  avgLatencyMs: z.number().nonnegative(),
  p50LatencyMs: z.number().nonnegative(),
  p95LatencyMs: z.number().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
  avgCostPerRequest: z.number().nonnegative(),
  costByProvider: z.record(z.string(), z.number().nonnegative()),
  requestsByTaskType: z.record(z.string(), z.number().nonnegative()),
  avgConfidence: z.number().min(0).max(1),
  lowConfidenceCount: z.number().nonnegative(),
});

/**
 * Full telemetry response schema (output validation)
 */
export const telemetryResponseSchema = z.object({
  period: telemetryPeriodSchema,
  stats: telemetryStatsResponseSchema,
  warnings: z.array(z.string()),
});

