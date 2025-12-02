/**
 * User Tier Configuration
 *
 * Defines limits, features, and pricing for each subscription tier.
 *
 * Tier Structure:
 * - Free: $0/mo - 1 portfolio, 10 stocks, 10 queries/day
 * - Basic: $9.99/mo - 3 portfolios, 50 stocks, 100 queries/day, advanced AI
 * - Premium: $19.99/mo - Unlimited everything, technical analysis, Monte Carlo
 */

export type TierName = 'free' | 'basic' | 'premium';

export interface TierLimits {
  // Pricing
  price: number;
  priceDisplay: string;

  // Portfolio Limits
  maxPortfolios: number;
  maxStocksPerPortfolio: number;

  // AI Usage Limits (Daily)
  chatQueriesPerDay: number;
  portfolioAnalysisPerDay: number;
  concurrentRequests: number;

  // Data Access Limits (Monthly)
  secFilingsPerMonth: number;
  newsUpdatesFrequency: string;
  chatHistoryRetentionDays: number;

  // AI Model Configuration
  aiModel: 'flash' | 'flash-pro' | 'flash-pro-priority';
  allowAiEscalation: boolean;
  priorityRouting: boolean;

  // Feature Access
  features: {
    // Core Features (all tiers)
    portfolioTracking: boolean;
    dailyChecklist: boolean;
    basicRiskMetrics: boolean;
    stockPrices: boolean;

    // Basic Tier+
    advancedAI: boolean;
    advancedRiskMetrics: boolean;
    interactiveCharts: boolean;
    thesisHealthScoring: boolean;
    emailSupport: boolean;

    // Premium Tier Only
    technicalAnalysis: boolean;
    monteCarloSimulations: boolean;
    smartAlerts: boolean;
    advancedScenarios: boolean;
    stressTesting: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    customReports: boolean;
  };

  // Support Level
  support: 'community' | 'email' | 'priority';
  supportResponseTime: string;

  // Cost Analysis (for internal tracking)
  estimatedMonthlyCost: number; // AI + infrastructure cost
  grossMargin: number; // percentage
}

export const TIER_CONFIG: Record<TierName, TierLimits> = {
  free: {
    // Pricing
    price: 0,
    priceDisplay: 'Free',

    // Portfolio Limits
    maxPortfolios: 1, // Not specified, but reasonable default
    maxStocksPerPortfolio: 20,

    // AI Usage Limits (Daily)
    chatQueriesPerDay: 20,
    portfolioAnalysisPerDay: 1, // Not specified, but reasonable default
    concurrentRequests: 2,

    // Data Access Limits (Monthly)
    secFilingsPerMonth: 3, // Not specified, but reasonable default
    newsUpdatesFrequency: '1×/day',
    chatHistoryRetentionDays: 14,

    // AI Model Configuration
    aiModel: 'flash',
    allowAiEscalation: false,
    priorityRouting: false,

    // Feature Access
    features: {
      // Core Features
      portfolioTracking: true,
      dailyChecklist: true,
      basicRiskMetrics: true,
      stockPrices: true,

      // Basic Tier+
      advancedAI: false,
      advancedRiskMetrics: false,
      interactiveCharts: false,
      thesisHealthScoring: false,
      emailSupport: false,

      // Premium Tier Only
      technicalAnalysis: false,
      monteCarloSimulations: false,
      smartAlerts: false,
      advancedScenarios: false,
      stressTesting: false,
      apiAccess: false,
      prioritySupport: false,
      customReports: false,
    },

    // Support Level
    support: 'community',
    supportResponseTime: 'Best effort',

    // Cost Analysis
    estimatedMonthlyCost: 0.10,
    grossMargin: -100, // Loss leader
  },

  basic: {
    // Pricing
    price: 6,
    priceDisplay: '$6/month',

    // Portfolio Limits
    maxPortfolios: 5, // Not specified, but reasonable default
    maxStocksPerPortfolio: 50,

    // AI Usage Limits (Daily)
    chatQueriesPerDay: 100,
    portfolioAnalysisPerDay: 10, // Not specified, but reasonable default
    concurrentRequests: 5,

    // Data Access Limits (Monthly)
    secFilingsPerMonth: Infinity,
    newsUpdatesFrequency: '3×/day',
    chatHistoryRetentionDays: 365, // 1 year

    // AI Model Configuration
    aiModel: 'flash-pro',
    allowAiEscalation: true,
    priorityRouting: false,

    // Feature Access
    features: {
      // Core Features
      portfolioTracking: true,
      dailyChecklist: true,
      basicRiskMetrics: true,
      stockPrices: true,

      // Basic Tier+
      advancedAI: true,
      advancedRiskMetrics: true,
      interactiveCharts: true,
      thesisHealthScoring: true,
      emailSupport: true,

      // Premium Tier Only
      technicalAnalysis: false,
      monteCarloSimulations: false,
      smartAlerts: false,
      advancedScenarios: false,
      stressTesting: false,
      apiAccess: false,
      prioritySupport: false,
      customReports: false,
    },

    // Support Level
    support: 'email',
    supportResponseTime: '48 hours',

    // Cost Analysis
    estimatedMonthlyCost: 0.75,
    grossMargin: 87.5,
  },

  premium: {
    // Pricing
    price: 15.99,
    priceDisplay: '$15.99/month',

    // Portfolio Limits
    maxPortfolios: Infinity,
    maxStocksPerPortfolio: 150,

    // AI Usage Limits (Daily)
    chatQueriesPerDay: 700,
    portfolioAnalysisPerDay: Infinity,
    concurrentRequests: 10,

    // Data Access Limits (Monthly)
    secFilingsPerMonth: Infinity,
    newsUpdatesFrequency: 'real-time',
    chatHistoryRetentionDays: Infinity,

    // AI Model Configuration
    aiModel: 'flash-pro-priority',
    allowAiEscalation: true,
    priorityRouting: true,

    // Feature Access
    features: {
      // Core Features
      portfolioTracking: true,
      dailyChecklist: true,
      basicRiskMetrics: true,
      stockPrices: true,

      // Basic Tier+
      advancedAI: true,
      advancedRiskMetrics: true,
      interactiveCharts: true,
      thesisHealthScoring: true,
      emailSupport: true,

      // Premium Tier Only
      technicalAnalysis: true,
      monteCarloSimulations: true,
      smartAlerts: true,
      advancedScenarios: true,
      stressTesting: true,
      apiAccess: true,
      prioritySupport: true,
      customReports: true,
    },

    // Support Level
    support: 'priority',
    supportResponseTime: '24 hours',

    // Cost Analysis
    estimatedMonthlyCost: 2.00,
    grossMargin: 87.5,
  },
};

/**
 * Get tier configuration by name
 */
export function getTierConfig(tier: TierName): TierLimits {
  return TIER_CONFIG[tier];
}

/**
 * Check if user's tier allows a specific feature
 */
export function hasFeature(tier: TierName, feature: keyof TierLimits['features']): boolean {
  const tierConfig = TIER_CONFIG[tier];
  if (!tierConfig) return false;
  return tierConfig.features[feature];
}

/**
 * Get tier hierarchy (for upgrade checks)
 */
export const TIER_HIERARCHY: Record<TierName, number> = {
  free: 0,
  basic: 1,
  premium: 2,
};

/**
 * Check if user tier is at least the required tier
 */
export function hasTierLevel(userTier: TierName, requiredTier: TierName): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

/**
 * Get next tier for upgrade prompts
 */
export function getNextTier(currentTier: TierName): TierName | null {
  if (currentTier === 'free') return 'basic';
  if (currentTier === 'basic') return 'premium';
  return null; // Already at highest tier
}

/**
 * Calculate break-even users for profitability
 */
export interface BreakEvenAnalysis {
  tierDistribution: Record<TierName, { count: number; percentage: number }>;
  totalUsers: number;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
}

export function calculateBreakEven(
  userDistribution: Record<TierName, number>
): BreakEvenAnalysis {
  const totalUsers = Object.values(userDistribution).reduce((sum, count) => sum + count, 0);

  let totalRevenue = 0;
  let totalCost = 0;

  const tierDistribution: Record<TierName, { count: number; percentage: number }> = {
    free: { count: 0, percentage: 0 },
    basic: { count: 0, percentage: 0 },
    premium: { count: 0, percentage: 0 },
  };

  for (const [tier, count] of Object.entries(userDistribution) as [TierName, number][]) {
    const config = TIER_CONFIG[tier];
    totalRevenue += config.price * count;
    totalCost += config.estimatedMonthlyCost * count;

    tierDistribution[tier] = {
      count,
      percentage: (count / totalUsers) * 100,
    };
  }

  return {
    tierDistribution,
    totalUsers,
    totalRevenue,
    totalCost,
    netProfit: totalRevenue - totalCost,
    profitMargin: totalUsers > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
  };
}

/**
 * Example usage scenarios
 */
export const EXAMPLE_SCENARIOS = {
  conservative: calculateBreakEven({ free: 700, basic: 250, premium: 50 }),
  moderate: calculateBreakEven({ free: 600, basic: 300, premium: 100 }),
  optimistic: calculateBreakEven({ free: 400, basic: 400, premium: 200 }),
};
