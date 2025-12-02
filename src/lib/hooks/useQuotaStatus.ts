/**
 * useQuotaStatus Hook
 * 
 * Provides real-time quota status for displaying user-friendly
 * banners and warnings in the AI chat interface.
 * 
 * Features:
 * - Fetches usage data from /api/user/usage
 * - Calculates warning thresholds
 * - Provides upgrade URLs and tier info
 * - Caches data to minimize API calls
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNextTier, getTierConfig, type TierName } from '@lib/tiers';

// ============================================================================
// TYPES
// ============================================================================

export interface UsageMetric {
  used: number;
  limit: number;
  remaining: number;
}

export interface UsageStats {
  tier: TierName;
  usage: {
    daily: {
      chatQueries: UsageMetric;
      portfolioAnalysis: UsageMetric;
      portfolioChanges?: UsageMetric;
    };
    monthly: {
      secFilings: UsageMetric;
    };
  };
  percentages: {
    chatQueries: number;
    portfolioAnalysis: number;
    portfolioChanges?: number;
    secFilings: number;
  };
  warnings: {
    chatQueries: boolean;
    portfolioAnalysis: boolean;
    portfolioChanges?: boolean;
    secFilings: boolean;
  };
}

export type QuotaLevel = 
  | 'unlimited'      // Paid tiers or plenty remaining
  | 'comfortable'    // >3 remaining, no warning
  | 'low'            // ≤3 remaining, show soft warning
  | 'critical'       // 1 remaining, show prominent warning
  | 'exhausted';     // 0 remaining, show blocking banner

export interface QuotaStatus {
  // Chat messages quota
  chatMessages: {
    level: QuotaLevel;
    remaining: number;
    limit: number;
    used: number;
  };
  // Portfolio changes quota
  portfolioChanges: {
    level: QuotaLevel;
    remaining: number;
    limit: number;
    used: number;
  };
  // User tier info
  tier: TierName;
  isUnlimited: boolean;
  // Upgrade info
  nextTier: TierName | null;
  nextTierPrice: string | null;
  nextTierChatLimit: number | null;
  upgradeUrl: string;
  // Loading state
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function getQuotaLevel(remaining: number, limit: number): QuotaLevel {
  if (limit === Infinity) return 'unlimited';
  if (remaining === 0) return 'exhausted';
  if (remaining === 1) return 'critical';
  if (remaining <= 3) return 'low';
  return 'comfortable';
}

// ============================================================================
// HOOK
// ============================================================================

export function useQuotaStatus(): QuotaStatus {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', 'usage'],
    queryFn: async (): Promise<UsageStats> => {
      const response = await fetch('/api/user/usage');
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      
      const result = await response.json();
      return result.stats;
    },
    staleTime: 30 * 1000, // 30 seconds - refresh frequently for accurate counts
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Default values when loading or error
  const defaultStatus: QuotaStatus = {
    chatMessages: {
      level: 'comfortable',
      remaining: Infinity,
      limit: Infinity,
      used: 0,
    },
    portfolioChanges: {
      level: 'comfortable',
      remaining: Infinity,
      limit: Infinity,
      used: 0,
    },
    tier: 'free',
    isUnlimited: false,
    nextTier: 'basic',
    nextTierPrice: '$6/month',
    nextTierChatLimit: 100,
    upgradeUrl: '/settings?tab=subscription',
    isLoading,
    error: error as Error | null,
  };

  if (!data) {
    return defaultStatus;
  }

  const tier = data.tier;
  const tierConfig = getTierConfig(tier);
  const nextTier = getNextTier(tier);
  const nextTierConfig = nextTier ? getTierConfig(nextTier) : null;

  // Calculate chat messages status
  const chatRemaining = data.usage.daily.chatQueries.remaining;
  const chatLimit = data.usage.daily.chatQueries.limit;
  const chatUsed = data.usage.daily.chatQueries.used;

  // Calculate portfolio changes status (may not exist for older data)
  const portfolioRemaining = data.usage.daily.portfolioChanges?.remaining ?? Infinity;
  const portfolioLimit = data.usage.daily.portfolioChanges?.limit ?? Infinity;
  const portfolioUsed = data.usage.daily.portfolioChanges?.used ?? 0;

  return {
    chatMessages: {
      level: getQuotaLevel(chatRemaining, chatLimit),
      remaining: chatRemaining,
      limit: chatLimit,
      used: chatUsed,
    },
    portfolioChanges: {
      level: getQuotaLevel(portfolioRemaining, portfolioLimit),
      remaining: portfolioRemaining,
      limit: portfolioLimit,
      used: portfolioUsed,
    },
    tier,
    isUnlimited: tierConfig.chatQueriesPerDay === Infinity,
    nextTier,
    nextTierPrice: nextTierConfig?.priceDisplay || null,
    nextTierChatLimit: nextTierConfig?.chatQueriesPerDay || null,
    upgradeUrl: '/settings?tab=subscription',
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Hook to invalidate usage cache after an action
 * Call this after sending a message or making a portfolio change
 */
export function useInvalidateUsage() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['user', 'usage'] });
  };
}
