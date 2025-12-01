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

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  tier: z.string().nullable(),
  is_admin: z.boolean().nullable(),
  created_at: z.string().nullable(),
  stripe_customer_id: z.string().nullable(),
  subscription_status: z.string().nullable(),
  usage: adminUserUsageSchema,
});

export const adminUsersResponseSchema = z.object({
  users: z.array(adminUserSchema),
  total: z.number(),
});

export type AdminUserDto = z.infer<typeof adminUserSchema>;
export type AdminUsersResponseDto = z.infer<typeof adminUsersResponseSchema>;
