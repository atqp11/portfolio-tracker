import { TIER_CONFIG } from '@lib/tiers/config';
import type { TierName as ConfigTierName } from '@lib/tiers/config';

export type PricingTierId = 'free' | 'basic' | 'premium';

// Build PRICING_TIERS from authoritative TIER_CONFIG where possible.
// This keeps marketing copy (pricing & CTAs) consistent with enforcement/config.
const tierIds: PricingTierId[] = ['free', 'basic', 'premium'];

export interface PricingTier {
  id: PricingTierId;
  name: string;
  description: string;
  price: {
    monthly: number; // in dollars
    annual: number; // in dollars
  };
  priceId: {
    monthly: string; // Stripe price ID (env var)
    annual: string; // Stripe price ID (env var)
  };
  features: string[];
  limitations: string[];
  cta: {
    text: string;
    variant: 'outline' | 'default' | 'premium';
  };
  popular?: boolean;
  trialDays?: number;
}

/**
 * Resolve a Stripe price ID for a given tier and billing period.
 * Reads from server-side env var: `STRIPE_PRICE_{TIER}_{BILLING}`
 * (e.g., STRIPE_PRICE_BASIC_MONTHLY, STRIPE_PRICE_PREMIUM_ANNUAL)
 * 
 * Required env vars are validated at build time by prebuild check.
 * Returns empty string and logs error if missing at runtime.
 */
export function resolvePriceId(tierId: PricingTierId, billing: 'monthly' | 'annual') {
  const T = tierId.toUpperCase();
  // Normalize billing input (accept mixed case) then compute upper-case token for env names
  const billingLower = String(billing).toLowerCase();
  const B = billingLower === 'monthly' ? 'MONTHLY' : 'ANNUAL';

  // 1) Server canonical env (required by prebuild check)
  const serverName = `STRIPE_PRICE_${T}_${B}`;
  const serverVal = process.env[serverName];
  if (serverVal && serverVal.length) return serverVal;

  // No fallbacks — prebuild check ensures envs are set.
  // Log error for debugging if somehow missing at runtime.
  // eslint-disable-next-line no-console
  console.error(`[pricing] Missing price ID: tier=${tierId} billing=${billingLower} env=${serverName}. This should have been caught at build time.`);
  return '';
}

export const PRICING_TIERS: PricingTier[] = tierIds.map((id) => {
  const cfg = TIER_CONFIG[id as ConfigTierName];

  // Human readable features derived from config values
  const features: string[] = [];
  // portfolios
  features.push(cfg.maxPortfolios === Infinity ? 'Unlimited portfolios' : `${cfg.maxPortfolios} portfolio${cfg.maxPortfolios > 1 ? 's' : ''}`);
  // stocks per portfolio
  features.push(cfg.maxStocksPerPortfolio === Infinity ? 'Unlimited stocks' : `${cfg.maxStocksPerPortfolio} stocks per portfolio`);
  // AI queries
  features.push(cfg.chatQueriesPerDay === Infinity ? 'Unlimited AI queries per day' : `${cfg.chatQueriesPerDay} AI queries per day`);
  // data access
  features.push(cfg.secFilingsPerMonth === Infinity ? 'Full SEC filings access' : `${cfg.secFilingsPerMonth} SEC filings/month`);
  // support
  if (cfg.support === 'priority') features.push('Priority support');
  else if (cfg.support === 'email') features.push('Email support');
  else features.push('Community support');

  // Add feature flags
  if (cfg.features.thesisHealthScoring) features.push('Investment thesis tracking');
  if (cfg.features.advancedAI) features.push('Advanced AI');
  if (cfg.features.technicalAnalysis) features.push('Technical analysis tools');
  if (cfg.features.monteCarloSimulations) features.push('Monte Carlo simulations');
  if (cfg.features.apiAccess) features.push('API access');

  // Limitations (marketing-friendly)
  const limitations: string[] = [];
  if (!cfg.features.technicalAnalysis) limitations.push('No technical analysis');
  if (!cfg.features.monteCarloSimulations) limitations.push('No Monte Carlo simulations');

  // Price amounts
  const monthlyAmount = cfg.price;
  const annualAmount = cfg.annualPrice ?? Math.round(cfg.price * 12 * 100) / 100;

  // Price IDs (resolved from server env vars)
  const monthlyPriceId = resolvePriceId(id, 'monthly');
  const annualPriceId = resolvePriceId(id, 'annual');

  return {
    id,
    name: id === 'free' ? 'Free' : id === 'basic' ? 'Basic' : 'Premium',
    description: id === 'free' ? 'Get started with basic portfolio tracking' : id === 'basic' ? 'For active investors who want more insights' : 'For serious investors who need every edge',
    price: {
      monthly: monthlyAmount,
      annual: annualAmount,
    },
    priceId: { monthly: monthlyPriceId, annual: annualPriceId },
    features,
    limitations,
    cta: { text: id === 'free' ? 'Get Started Free' : 'Start 14-Day Free Trial', variant: id === 'free' ? 'outline' : id === 'basic' ? 'default' : 'premium' },
    popular: id === 'basic',
    trialDays: (cfg as any).trialDays ?? Number(process.env.STRIPE_TRIAL_DAYS || '14'),
  } as PricingTier;
});

export function getTierById(id: PricingTierId) {
  return PRICING_TIERS.find((t) => t.id === id) || null;
}
