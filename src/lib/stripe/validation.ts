/**
 * Stripe Request Validation Schemas
 * 
 * Zod schemas for validating Stripe API requests
 */

import { z } from 'zod';

/**
 * Schema for checkout session creation request
 */
export const checkoutRequestSchema = z.object({
  tier: z.enum(['free', 'basic', 'premium'], {
    message: 'Tier must be one of: free, basic, premium',
  }),
  billingPeriod: z.enum(['monthly', 'annual'], {
    message: 'Billing period must be one of: monthly, annual',
  }),
  successUrl: z.string().url('Invalid success URL format'),
  cancelUrl: z.string().url('Invalid cancel URL format'),
  trialDays: z.number().int().positive().optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

/**
 * Schema for customer portal session request
 */
export const portalRequestSchema = z.object({
  returnUrl: z.string().url('Invalid return URL format'),
});

export type PortalRequest = z.infer<typeof portalRequestSchema>;

/**
 * Schema for webhook signature headers
 */
export const webhookHeadersSchema = z.object({
  'stripe-signature': z.string().min(1, 'Stripe signature is required'),
});

export type WebhookHeaders = z.infer<typeof webhookHeadersSchema>;
