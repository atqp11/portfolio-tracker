/**
 * User Tier Rate Limits
 *
 * Defines quota limits for different subscription tiers.
 * Integrates with AI router to enforce usage caps.
 */

export type UserTier = 'free' | 'pro' | 'premium';

export interface TierLimits {
  tier: UserTier;
  displayName: string;
  price: number; // USD per month
  limits: {
    chatQueriesPerDay: number;
    portfolioAnalysisPerDay: number;
    secFilingsPerMonth: number;
    newsUpdateFrequency: '1x' | '3x' | 'realtime';
    allowProEscalation: boolean;
    maxConcurrentRequests: number;
  };
  costs: {
    estimatedMonthlyAICost: number; // Expected AI inference cost per active user
    breakEvenActiveUsers: number; // Users needed to break even at this price
  };
}

export const TIER_CONFIGS: Record<UserTier, TierLimits> = {
  free: {
    tier: 'free',
    displayName: 'Free',
    price: 0,
    limits: {
      chatQueriesPerDay: 10,
      portfolioAnalysisPerDay: 1,
      secFilingsPerMonth: 3,
      newsUpdateFrequency: '1x',
      allowProEscalation: false,
      maxConcurrentRequests: 2,
    },
    costs: {
      estimatedMonthlyAICost: 0.10, // ~$0.10/month per active user
      breakEvenActiveUsers: 0, // Free tier, no revenue
    },
  },
  pro: {
    tier: 'pro',
    displayName: 'Pro',
    price: 9.99,
    limits: {
      chatQueriesPerDay: 100,
      portfolioAnalysisPerDay: 10,
      secFilingsPerMonth: 999999, // "Unlimited"
      newsUpdateFrequency: '3x',
      allowProEscalation: true,
      maxConcurrentRequests: 5,
    },
    costs: {
      estimatedMonthlyAICost: 0.75, // ~$0.75/month per active user
      breakEvenActiveUsers: 1, // Need 1 paying user to cover AI costs
    },
  },
  premium: {
    tier: 'premium',
    displayName: 'Premium',
    price: 29.99,
    limits: {
      chatQueriesPerDay: 999999, // "Unlimited"
      portfolioAnalysisPerDay: 999999,
      secFilingsPerMonth: 999999,
      newsUpdateFrequency: 'realtime',
      allowProEscalation: true,
      maxConcurrentRequests: 10,
    },
    costs: {
      estimatedMonthlyAICost: 3.50, // ~$3.50/month per active user
      breakEvenActiveUsers: 1,
    },
  },
};

/**
 * Usage tracker for rate limiting
 * In production, this would be backed by Redis or database
 */
interface UsageRecord {
  userId: string;
  tier: UserTier;
  today: {
    chatQueries: number;
    portfolioAnalysis: number;
  };
  thisMonth: {
    secFilings: number;
  };
  lastReset: Date;
}

// In-memory usage tracking (replace with Redis in production)
const usageStore = new Map<string, UsageRecord>();

/**
 * Check if user has quota available for a given action
 */
export function checkQuota(
  userId: string,
  action: 'chat' | 'portfolio' | 'filing',
  userTier: UserTier = 'free'
): { allowed: boolean; remaining: number; resetAt: Date } {
  const limits = TIER_CONFIGS[userTier].limits;
  const usage = getOrCreateUsageRecord(userId, userTier);

  // Reset daily/monthly counters if needed
  resetCountersIfNeeded(usage);

  let allowed = false;
  let remaining = 0;
  let resetAt = new Date();

  switch (action) {
    case 'chat':
      const chatLimit = limits.chatQueriesPerDay;
      remaining = Math.max(0, chatLimit - usage.today.chatQueries);
      allowed = usage.today.chatQueries < chatLimit;
      resetAt = getNextMidnight();
      break;

    case 'portfolio':
      const portfolioLimit = limits.portfolioAnalysisPerDay;
      remaining = Math.max(0, portfolioLimit - usage.today.portfolioAnalysis);
      allowed = usage.today.portfolioAnalysis < portfolioLimit;
      resetAt = getNextMidnight();
      break;

    case 'filing':
      const filingLimit = limits.secFilingsPerMonth;
      remaining = Math.max(0, filingLimit - usage.thisMonth.secFilings);
      allowed = usage.thisMonth.secFilings < filingLimit;
      resetAt = getNextMonthStart();
      break;
  }

  return { allowed, remaining, resetAt };
}

/**
 * Increment usage counter for an action
 */
export function incrementUsage(
  userId: string,
  action: 'chat' | 'portfolio' | 'filing',
  userTier: UserTier = 'free'
): void {
  const usage = getOrCreateUsageRecord(userId, userTier);

  switch (action) {
    case 'chat':
      usage.today.chatQueries++;
      break;
    case 'portfolio':
      usage.today.portfolioAnalysis++;
      break;
    case 'filing':
      usage.thisMonth.secFilings++;
      break;
  }

  usageStore.set(userId, usage);
}

/**
 * Get or create usage record for user
 */
function getOrCreateUsageRecord(userId: string, tier: UserTier): UsageRecord {
  let usage = usageStore.get(userId);

  if (!usage) {
    usage = {
      userId,
      tier,
      today: { chatQueries: 0, portfolioAnalysis: 0 },
      thisMonth: { secFilings: 0 },
      lastReset: new Date(),
    };
    usageStore.set(userId, usage);
  }

  return usage;
}

/**
 * Reset daily/monthly counters if needed
 */
function resetCountersIfNeeded(usage: UsageRecord): void {
  const now = new Date();
  const lastReset = usage.lastReset;

  // Reset daily counters if it's a new day
  if (now.getDate() !== lastReset.getDate()) {
    usage.today.chatQueries = 0;
    usage.today.portfolioAnalysis = 0;
  }

  // Reset monthly counters if it's a new month
  if (now.getMonth() !== lastReset.getMonth()) {
    usage.thisMonth.secFilings = 0;
  }

  usage.lastReset = now;
}

/**
 * Get next midnight (for daily reset)
 */
function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Get start of next month (for monthly reset)
 */
function getNextMonthStart(): Date {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth;
}

/**
 * Get usage stats for a user
 */
export function getUserUsageStats(userId: string, tier: UserTier = 'free'): {
  tier: UserTier;
  limits: TierLimits['limits'];
  usage: UsageRecord;
  quotas: {
    chatQueries: { used: number; limit: number; remaining: number };
    portfolioAnalysis: { used: number; limit: number; remaining: number };
    secFilings: { used: number; limit: number; remaining: number };
  };
} {
  const limits = TIER_CONFIGS[tier].limits;
  const usage = getOrCreateUsageRecord(userId, tier);
  resetCountersIfNeeded(usage);

  return {
    tier,
    limits,
    usage,
    quotas: {
      chatQueries: {
        used: usage.today.chatQueries,
        limit: limits.chatQueriesPerDay,
        remaining: Math.max(0, limits.chatQueriesPerDay - usage.today.chatQueries),
      },
      portfolioAnalysis: {
        used: usage.today.portfolioAnalysis,
        limit: limits.portfolioAnalysisPerDay,
        remaining: Math.max(
          0,
          limits.portfolioAnalysisPerDay - usage.today.portfolioAnalysis
        ),
      },
      secFilings: {
        used: usage.thisMonth.secFilings,
        limit: limits.secFilingsPerMonth,
        remaining: Math.max(0, limits.secFilingsPerMonth - usage.thisMonth.secFilings),
      },
    },
  };
}

/**
 * Calculate total revenue needed to break even on AI costs
 */
export function calculateBreakEvenMetrics(): {
  tierBreakdown: Array<{
    tier: UserTier;
    price: number;
    aiCost: number;
    margin: number;
    marginPercent: number;
  }>;
  totalMonthlyAICost: number; // For 1000 users across all tiers
  requiredRevenue: number; // To cover AI costs
  recommendedMix: string;
} {
  // Assume user distribution: 70% free, 25% pro, 5% premium
  const userDistribution = {
    free: 700,
    pro: 250,
    premium: 50,
  };

  const tierBreakdown = Object.entries(TIER_CONFIGS).map(([tier, config]) => {
    const aiCost = config.costs.estimatedMonthlyAICost;
    const margin = config.price - aiCost;
    const marginPercent = config.price > 0 ? (margin / config.price) * 100 : 0;

    return {
      tier: tier as UserTier,
      price: config.price,
      aiCost,
      margin,
      marginPercent,
    };
  });

  const totalMonthlyAICost =
    userDistribution.free * TIER_CONFIGS.free.costs.estimatedMonthlyAICost +
    userDistribution.pro * TIER_CONFIGS.pro.costs.estimatedMonthlyAICost +
    userDistribution.premium * TIER_CONFIGS.premium.costs.estimatedMonthlyAICost;

  const requiredRevenue =
    userDistribution.pro * TIER_CONFIGS.pro.price +
    userDistribution.premium * TIER_CONFIGS.premium.price;

  return {
    tierBreakdown,
    totalMonthlyAICost,
    requiredRevenue,
    recommendedMix: `70% Free (${userDistribution.free} users), 25% Pro (${userDistribution.pro} users), 5% Premium (${userDistribution.premium} users)`,
  };
}

export default {
  TIER_CONFIGS,
  checkQuota,
  incrementUsage,
  getUserUsageStats,
  calculateBreakEvenMetrics,
};
