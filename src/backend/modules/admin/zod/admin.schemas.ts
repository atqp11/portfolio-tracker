/**
 * Admin Zod Schemas for Controller Validation
 * 
 * Input/output validation schemas for controller methods.
 * Separate from API route schemas in src/lib/validators/admin-schemas.ts
 */

import { z } from 'zod';
import { adminUserSchema, adminUsersResponseSchema } from '../dto/admin.dto';

// ============================================================================
// INPUT SCHEMAS (for RSC page methods)
// ============================================================================

/**
 * Get users with filters (for RSC pages)
 */
export const getUsersInputSchema = z.object({
  email: z.string().optional(),
  tier: z.enum(['free', 'basic', 'premium']).optional(),
  status: z.string().optional(),
  isActive: z.boolean().optional(),
}).optional();

export type GetUsersInput = z.infer<typeof getUsersInputSchema>;

/**
 * Get user by ID input
 */
export const getUserByIdInputSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

export type GetUserByIdInput = z.infer<typeof getUserByIdInputSchema>;

/**
 * Get webhook logs input
 */
export const getWebhookLogsInputSchema = z.object({
  limit: z.number().int().positive().max(1000).default(100),
});

export type GetWebhookLogsInput = z.infer<typeof getWebhookLogsInputSchema>;

// ============================================================================
// OUTPUT SCHEMAS (for RSC page methods)
// ============================================================================

/**
 * Billing overview response schema
 * Matches the structure returned by getBillingOverview service
 */
export const billingOverviewSchema = z.object({
  userStats: z.object({
    totalUsers: z.number(),
    newUsers: z.number(),
    inactiveUsers: z.number(),
  }),
  subscriptionStats: z.object({
    activeSubscriptions: z.number(),
    tierBreakdown: z.object({
      free: z.number(),
      basic: z.number(),
      premium: z.number(),
    }),
  }),
  mrr: z.number(),
  churn: z.object({
    last30Days: z.number(),
    last90Days: z.number(),
  }),
  upcomingInvoices: z.object({
    count: z.number(),
    totalAmount: z.number(),
  }),
  stripeConfigured: z.boolean(),
});

export type BillingOverviewDto = z.infer<typeof billingOverviewSchema>;

/**
 * User details response schema
 */
export const userDetailsSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  tier: z.string().nullable(),
  is_admin: z.boolean().nullable(),
  is_active: z.boolean().nullable(),
  created_at: z.string().nullable(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  subscription_status: z.string().nullable(),
  trial_end: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type UserDetailsDto = z.infer<typeof userDetailsSchema>;

/**
 * Get users result schema
 */
export const getUsersResultSchema = z.object({
  users: z.array(userDetailsSchema),
  total: z.number(),
});

export type GetUsersResultDto = z.infer<typeof getUsersResultSchema>;

// Re-export from admin.dto for convenience
export { adminUserSchema, adminUsersResponseSchema };
