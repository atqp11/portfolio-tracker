/**
 * User Usage DTOs
 * 
 * Data Transfer Objects for user usage statistics API.
 * Defines the public API contract validated at the controller boundary.
 */

import { z } from 'zod';

/**
 * Response schema for usage statistics
 */
export const usageStatsResponseSchema = z.object({
  success: z.boolean(),
  stats: z.object({
    tier: z.string(),
    usage: z.object({
      daily: z.object({
        chatQueries: z.object({
          used: z.number(),
          limit: z.union([z.number(), z.literal(Infinity)]),
          remaining: z.union([z.number(), z.literal(Infinity)]),
        }),
        portfolioAnalysis: z.object({
          used: z.number(),
          limit: z.union([z.number(), z.literal(Infinity)]),
          remaining: z.union([z.number(), z.literal(Infinity)]),
        }),
      }),
      monthly: z.object({
        secFilings: z.object({
          used: z.number(),
          limit: z.union([z.number(), z.literal(Infinity)]),
          remaining: z.union([z.number(), z.literal(Infinity)]),
        }),
      }),
      periodStart: z.object({
        daily: z.date(),
        monthly: z.date(),
      }),
      periodEnd: z.object({
        daily: z.date(),
        monthly: z.date(),
      }),
    }),
    percentages: z.object({
      chatQueries: z.number().min(0).max(100),
      portfolioAnalysis: z.number().min(0).max(100),
      secFilings: z.number().min(0).max(100),
    }),
    warnings: z.object({
      chatQueries: z.boolean(),
      portfolioAnalysis: z.boolean(),
      secFilings: z.boolean(),
    }),
  }),
});

export type UsageStatsResponseDto = z.infer<typeof usageStatsResponseSchema>;

/**
 * Internal usage data structure from repository
 */
export interface RawUsageData {
  daily?: {
    chat_queries?: number;
    portfolio_analysis?: number;
  };
  monthly?: {
    sec_filings?: number;
  };
}

/**
 * Processed usage statistics for a single metric
 */
export interface UsageMetric {
  used: number;
  limit: number | typeof Infinity;
  remaining: number | typeof Infinity;
}

/**
 * Complete usage statistics structure
 */
export interface UsageStats {
  tier: string;
  usage: {
    daily: {
      chatQueries: UsageMetric;
      portfolioAnalysis: UsageMetric;
    };
    monthly: {
      secFilings: UsageMetric;
    };
    periodStart: {
      daily: Date;
      monthly: Date;
    };
    periodEnd: {
      daily: Date;
      monthly: Date;
    };
  };
  percentages: {
    chatQueries: number;
    portfolioAnalysis: number;
    secFilings: number;
  };
  warnings: {
    chatQueries: boolean;
    portfolioAnalysis: boolean;
    secFilings: boolean;
  };
}
