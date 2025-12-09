import { z } from 'zod';

/**
 * Admin usage metric schema (strict typing)
 * Matches the structure returned by getCurrentUserUsage
 */
export const adminUsageMetricSchema = z.object({
  chatQueries: z.number().optional(),
  portfolioAnalysis: z.number().optional(),
  secFilings: z.number().optional(),
}).nullable();

export type AdminUsageMetric = z.infer<typeof adminUsageMetricSchema>;

/**
 * Admin user usage schema with strict daily/monthly metrics
 */
export const adminUserUsageSchema = z.object({
  daily: adminUsageMetricSchema,
  monthly: adminUsageMetricSchema,
}).nullable();

export type AdminUserUsage = z.infer<typeof adminUserUsageSchema>;

/**
 * Admin user schema for API responses (camelCase)
 * Database fields (snake_case) are transformed to camelCase in the service layer
 */
export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  tier: z.string().nullable(),
  isAdmin: z.boolean().nullable(),
  isActive: z.boolean().nullable(),
  createdAt: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  subscriptionStatus: z.string().nullable(),
  usage: adminUserUsageSchema,
});

export const adminUsersResponseSchema = z.object({
  users: z.array(adminUserSchema),
  total: z.number(),
});

export type AdminUserDto = z.infer<typeof adminUserSchema>;
export type AdminUsersResponseDto = z.infer<typeof adminUsersResponseSchema>;

/**
 * Clear cache response schema
 */
export const clearCacheResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string(),
  message: z.string(),
  stats: z.object({
    before: z.record(z.string(), z.unknown()),
    after: z.record(z.string(), z.unknown()),
  }).optional(),
});

export type ClearCacheResponseDto = z.infer<typeof clearCacheResponseSchema>;

/**
 * Retry webhook response schema
 */
export const retryWebhookResponseSchema = z.object({
  success: z.boolean(),
  retryCount: z.number(),
  error: z.string().optional(),
});

export type RetryWebhookResponseDto = z.infer<typeof retryWebhookResponseSchema>;