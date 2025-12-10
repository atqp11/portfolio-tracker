/**
 * Subscription Plans Configuration
 * 
 * Centralized configuration for subscription plans, pricing, and Stripe Price ID mapping.
 * Validates Price IDs at startup to catch configuration errors early.
 * 
 * Per guidelines:
 * - Price IDs are resolved server-side only (NEVER exposed to client)
 * - Uses server-only env vars (STRIPE_PRICE_*), NOT NEXT_PUBLIC_* vars
 * - Free tier has no Stripe prices (handled in application logic)
 */

import { z } from 'zod';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Subscription plan tiers
 */
export const PlanTier = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
} as const;

export type PlanTier = typeof PlanTier[keyof typeof PlanTier];

/**
 * Billing intervals
 */
export const BillingInterval = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
} as const;

export type BillingInterval = typeof BillingInterval[keyof typeof BillingInterval];

/**
 * Subscription status (matches Stripe subscription statuses)
 */
export const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
} as const;

export type SubscriptionStatus = typeof SubscriptionStatus[keyof typeof SubscriptionStatus];

// ============================================================================
// STRIPE PRICE ID MAPPING
// ============================================================================

/**
 * Resolve environment variables at runtime
 * This function is called to get the actual values from process.env
 */
function getStripePriceIds(): Record<
  PlanTier,
  Record<BillingInterval, string | null>
> {
  return {
    [PlanTier.FREE]: {
      [BillingInterval.MONTHLY]: null, // Free plan - no Stripe price
      [BillingInterval.ANNUAL]: null,  // Free plan - no Stripe price
    },
    [PlanTier.BASIC]: {
      [BillingInterval.MONTHLY]: process.env.STRIPE_PRICE_BASIC_MONTHLY ?? null,
      [BillingInterval.ANNUAL]: process.env.STRIPE_PRICE_BASIC_ANNUAL ?? null,
    },
    [PlanTier.PREMIUM]: {
      [BillingInterval.MONTHLY]: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? null,
      [BillingInterval.ANNUAL]: process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? null,
    },
  };
}

/**
 * Map plan tiers to Stripe Price IDs from environment variables
 * 
 * Security: Uses server-only env vars (STRIPE_PRICE_*), NOT NEXT_PUBLIC_* vars
 * Free tier has null values - no Stripe interaction needed
 * Resolved lazily to ensure environment variables are loaded
 */
export const STRIPE_PRICE_IDS = getStripePriceIds();

// ============================================================================
// PLAN METADATA
// ============================================================================

/**
 * Plan metadata for UI display and business logic
 */
export interface PlanMetadata {
  id: PlanTier;
  name: string;
  description: string;
  features: string[];
  limitations: string[];
  monthlyPrice: number | null;
  annualPrice: number | null;
  trialDays: number;
  popular?: boolean;
  cta: {
    text: string;
    variant: 'outline' | 'default' | 'premium';
  };
}

export const PLAN_METADATA: Record<PlanTier, PlanMetadata> = {
  [PlanTier.FREE]: {
    id: PlanTier.FREE,
    name: 'Free',
    description: 'Get started with basic portfolio tracking',
    features: [
      '1 portfolio',
      '10 stocks maximum',
      '50 AI queries per day',
      'Basic market data',
      'Daily checklist',
    ],
    limitations: [
      'No investment thesis',
      'No SEC filings',
      'Limited AI features',
    ],
    monthlyPrice: null,
    annualPrice: null,
    trialDays: 0,
    cta: {
      text: 'Get Started Free',
      variant: 'outline',
    },
  },
  [PlanTier.BASIC]: {
    id: PlanTier.BASIC,
    name: 'Basic',
    description: 'For active investors who want more insights',
    features: [
      '5 portfolios',
      '50 stocks per portfolio',
      '200 AI queries per day',
      'Investment thesis tracking',
      'Basic SEC filing summaries',
      'Email support',
    ],
    limitations: [
      'Limited AI analysis depth',
    ],
    monthlyPrice: 5.99,
    annualPrice: 59.99, // ~2 months free
    trialDays: 14,
    popular: true,
    cta: {
      text: 'Start 14-Day Free Trial',
      variant: 'default',
    },
  },
  [PlanTier.PREMIUM]: {
    id: PlanTier.PREMIUM,
    name: 'Premium',
    description: 'For serious investors who need every edge',
    features: [
      'Unlimited portfolios',
      'Unlimited stocks',
      '1000 AI queries per day',
      'Full investment thesis with AI validation',
      'Complete SEC filing analysis',
      'Priority email support',
      'Advanced risk metrics',
      'Custom alerts',
    ],
    limitations: [],
    monthlyPrice: 15.99,
    annualPrice: 159.99, // ~2 months free
    trialDays: 14,
    cta: {
      text: 'Start 14-Day Free Trial',
      variant: 'premium',
    },
  },
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Stripe Price ID validation schema
 */
const stripePriceIdSchema = z
  .string()
  .regex(/^price_[A-Za-z0-9_]+$/, 'Invalid Stripe Price ID format');

/**
 * Validate all configured Stripe Price IDs at startup
 * Throws error if any Price ID is missing or has invalid format
 * 
 * Only validates PAID tiers (FREE tier has no Stripe prices)
 */
export function validateStripePriceIds(): void {
  // Skip validation in client-side code
  if (typeof window !== 'undefined') {
    return;
  }

  // Skip validation in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const errors: string[] = [];
  
  // Only validate paid tiers
  const paidTiers = [PlanTier.BASIC, PlanTier.PREMIUM];
  const priceIds = getStripePriceIds();

  for (const tier of paidTiers) {
    for (const interval of Object.values(BillingInterval)) {
      const priceId = priceIds[tier][interval];
      
      if (!priceId) {
        errors.push(
          `Missing STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`
        );
        continue;
      }

      const result = stripePriceIdSchema.safeParse(priceId);
      if (!result.success) {
        errors.push(
          `Invalid Price ID for ${tier} ${interval}: "${priceId}"\n` +
          `  Expected format: price_XXXXXXXXXX\n` +
          `  Get from: Stripe Dashboard → Products → [Product] → Pricing`
        );
      }
    }
  }

  if (errors.length > 0) {
    const errorMessage =
      `\n❌ Stripe Price ID Configuration Errors:\n${errors.map((e) => `  - ${e}`).join('\n')}\n\n` +
      `To fix:\n` +
      `1. Go to https://dashboard.stripe.com/test/products\n` +
      `2. Create/select "Basic Plan" and "Premium Plan" products\n` +
      `3. Create monthly and annual prices for each\n` +
      `4. Copy the Price IDs (format: price_XXXXXXXXXX)\n` +
      `5. Update .env.local with real Price IDs`;

    console.error(errorMessage);

    // In development, show warning instead of throwing
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ Running with invalid Stripe configuration. Payment flows will fail.'
      );
      return;
    }

    // In production, throw error
    throw new Error(
      'Invalid Stripe configuration. Check server logs for details.'
    );
  }

  console.log('✓ Stripe Price IDs validated');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get Stripe Price ID for a plan tier and billing interval
 * 
 * @throws Error if tier is FREE (free tier has no Stripe prices)
 * @throws Error if Price ID is not configured
 */
export function getStripePriceId(
  tier: PlanTier,
  interval: BillingInterval
): string {
  if (tier === PlanTier.FREE) {
    throw new Error('Free tier does not have a Stripe Price ID');
  }

  const priceId = STRIPE_PRICE_IDS[tier]?.[interval];

  if (!priceId) {
    throw new Error(
      `No Stripe Price ID configured for plan: ${tier} (${interval})`
    );
  }

  return priceId;
}

/**
 * Get tier from Stripe Price ID (reverse lookup)
 * Used by webhook handlers to determine tier from Stripe events
 * 
 * @returns PlanTier or null if Price ID not found
 */
export function getTierFromPriceId(priceId: string): PlanTier | null {
  if (!priceId) return null;

  for (const tier of Object.values(PlanTier)) {
    for (const interval of Object.values(BillingInterval)) {
      if (STRIPE_PRICE_IDS[tier][interval] === priceId) {
        return tier;
      }
    }
  }

  return null;
}

/**
 * Check if a plan tier requires Stripe checkout
 * 
 * @returns true if tier requires Stripe, false if free tier
 */
export function requiresStripeCheckout(tier: PlanTier): boolean {
  return tier !== PlanTier.FREE;
}

/**
 * Get plan metadata by tier
 */
export function getPlanMetadata(tier: PlanTier): PlanMetadata {
  return PLAN_METADATA[tier];
}

/**
 * Get all available plan tiers
 */
export function getAllPlanTiers(): PlanTier[] {
  return Object.values(PlanTier);
}

/**
 * Get all plan metadata as an array (for UI components)
 * Compatible with legacy PRICING_TIERS format
 */
export function getAllPlanMetadata(): PlanMetadata[] {
  return [
    PLAN_METADATA[PlanTier.FREE],
    PLAN_METADATA[PlanTier.BASIC],
    PLAN_METADATA[PlanTier.PREMIUM],
  ];
}

/**
 * Check if tier A is higher than tier B (for upgrade/downgrade logic)
 */
export function isHigherTier(tierA: PlanTier, tierB: PlanTier): boolean {
  const tierHierarchy = {
    [PlanTier.FREE]: 0,
    [PlanTier.BASIC]: 1,
    [PlanTier.PREMIUM]: 2,
  };

  return tierHierarchy[tierA] > tierHierarchy[tierB];
}

// ============================================================================
// STARTUP VALIDATION
// ============================================================================

// Validate Price IDs on module load (server-side only)
if (typeof window === 'undefined') {
  validateStripePriceIds();
}
