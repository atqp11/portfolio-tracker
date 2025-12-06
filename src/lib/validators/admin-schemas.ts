/**
 * Admin API Schemas
 *
 * Zod validation schemas for admin API endpoints.
 * Used with withValidation middleware for request validation.
 */

import { z } from 'zod';
import { commonSchemas } from './schemas';

// ============================================================================
// COMMON PARAMS
// ============================================================================

/**
 * User ID path parameter schema
 */
export const userIdParamsSchema = z.object({
  userId: commonSchemas.uuid,
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

// ============================================================================
// USER LIST & DETAILS
// ============================================================================

/**
 * GET /api/admin/users - Query parameters
 */
export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  search: z.string().optional(),
  tier: z.enum(['free', 'basic', 'premium']).optional(),
  status: z.enum(['active', 'inactive', 'deactivated']).optional(),
  sortBy: z.enum(['created_at', 'email', 'tier', 'last_login']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;

// ============================================================================
// USER ACTIONS
// ============================================================================

/**
 * POST /api/admin/users/[userId]/deactivate
 */
export const deactivateUserSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
  cancelSubscription: z.boolean().optional().default(false),
});

export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;

/**
 * POST /api/admin/users/[userId]/reactivate
 */
export const reactivateUserSchema = z.object({
  notes: z.string().optional(),
});

export type ReactivateUserInput = z.infer<typeof reactivateUserSchema>;

/**
 * POST /api/admin/users/[userId]/change-tier
 */
export const changeTierSchema = z.object({
  tier: z.enum(['free', 'basic', 'premium'], {
    message: 'Tier must be one of: free, basic, premium',
  }),
  updateStripe: z.boolean().optional().default(false),
  reason: z.string().min(1, 'Reason is required'),
});

export type ChangeTierInput = z.infer<typeof changeTierSchema>;

/**
 * POST /api/admin/users/[userId]/refund
 */
export const refundUserSchema = z.object({
  amountCents: z.number().int().positive().optional(), // Partial refund amount
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  note: z.string().max(500).optional(),
});

export type RefundUserInput = z.infer<typeof refundUserSchema>;

/**
 * POST /api/admin/users/[userId]/extend-trial
 */
export const extendTrialSchema = z.object({
  days: z.number().int().positive({
    message: 'Days must be a positive integer',
  }),
  reason: z.string().optional(),
});

export type ExtendTrialInput = z.infer<typeof extendTrialSchema>;

/**
 * POST /api/admin/users/[userId]/cancel-subscription
 */
export const cancelSubscriptionSchema = z.object({
  immediately: z.boolean().optional().default(false), // Cancel at period end by default
  reason: z.string().max(500).optional(),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

/**
 * PUT /api/admin/users/[id] - Legacy update
 */
export const updateUserSchema = z.object({
  tier: z.enum(['free', 'basic', 'premium']).optional(),
  is_admin: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * PUT /api/admin/users/[id]/quota
 */
export const updateQuotaSchema = z.object({
  ai_query_count: z.number().int().nonnegative().optional(),
  portfolio_change_quota: z.number().int().nonnegative().optional(),
  portfolio_count: z.number().int().nonnegative().optional(),
  stock_count: z.number().int().nonnegative().optional(),
});

export type UpdateQuotaInput = z.infer<typeof updateQuotaSchema>;
