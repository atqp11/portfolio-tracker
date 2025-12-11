/**
 * Server Actions for User Usage Operations
 *
 * Provides server-side data fetching for usage statistics and quota information.
 * All actions require authentication via requireUser().
 *
 * Available actions:
 * - fetchUsageStats(): Get current usage statistics with tier limits, percentages, and warnings
 * - fetchQuotaInfo(): Get quota information for the authenticated user
 * - fetchTierConfigurations(): Get all tier configurations and pricing info
 */

'use server';

import { requireUser } from '@lib/auth/session';
import { usageService } from '@backend/modules/user/service/usage.service';
import { getTierConfig, TIER_CONFIG, EXAMPLE_SCENARIOS, type TierName } from '@lib/tiers';
import { getCurrentUserUsage } from '@lib/supabase/db';
import type { UsageStats } from '@backend/modules/user/dto/usage.dto';

/**
 * Fetch usage statistics for the authenticated user
 *
 * Returns complete usage statistics including:
 * - Current usage for all quotas (daily/monthly)
 * - Tier limits
 * - Remaining capacity
 * - Usage percentages
 * - Warning flags (80%+ usage)
 *
 * @returns {Promise<UsageStats>} Complete usage statistics
 * @throws {Error} If user is not authenticated
 */
export async function fetchUsageStats(): Promise<UsageStats> {
  // Require authentication
  const user = await requireUser();

  // Get user profile to determine tier
  const profile = user as any; // User object from Supabase Auth
  const tier = (profile.user_metadata?.tier || 'free') as TierName;

  // Delegate to service layer
  const stats = await usageService.getUserUsageStats(user.id, tier);

  return stats;
}

/**
 * Fetch quota information for the authenticated user
 *
 * Returns quota details including:
 * - User tier
 * - Tier limits (chat queries, portfolio analysis, SEC filings)
 * - Current usage for each quota
 * - Remaining capacity
 * - Reset timestamps (daily/monthly)
 *
 * @returns {Promise<QuotaInfo>} Quota information
 * @throws {Error} If user is not authenticated
 */
export async function fetchQuotaInfo() {
  // Require authentication
  const user = await requireUser();

  // Get user profile to determine tier
  const profile = user as any;
  const tier = (profile.user_metadata?.tier || 'free') as TierName;

  // Get tier configuration
  const tierConfig = getTierConfig(tier);

  // Fetch current usage
  const usage = await getCurrentUserUsage(user.id);

  // Calculate quotas
  const chatUsed = usage.daily?.chat_queries || 0;
  const analysisUsed = usage.daily?.portfolio_analysis || 0;
  const portfolioChangesUsed = usage.daily?.portfolio_changes || 0;
  const filingsUsed = usage.monthly?.sec_filings || 0;

  const chatRemaining =
    tierConfig.chatQueriesPerDay === Infinity
      ? Infinity
      : Math.max(0, tierConfig.chatQueriesPerDay - chatUsed);

  const analysisRemaining =
    tierConfig.portfolioAnalysisPerDay === Infinity
      ? Infinity
      : Math.max(0, tierConfig.portfolioAnalysisPerDay - analysisUsed);

  const portfolioChangesRemaining =
    tierConfig.portfolioChangesPerDay === Infinity
      ? Infinity
      : Math.max(0, tierConfig.portfolioChangesPerDay - portfolioChangesUsed);

  const filingsRemaining =
    tierConfig.secFilingsPerMonth === Infinity
      ? Infinity
      : Math.max(0, tierConfig.secFilingsPerMonth - filingsUsed);

  return {
    userId: user.id,
    tier,
    limits: {
      chatQueriesPerDay: tierConfig.chatQueriesPerDay,
      portfolioAnalysisPerDay: tierConfig.portfolioAnalysisPerDay,
      portfolioChangesPerDay: tierConfig.portfolioChangesPerDay,
      secFilingsPerMonth: tierConfig.secFilingsPerMonth,
    },
    quotas: {
      chatQueries: {
        used: chatUsed,
        limit: tierConfig.chatQueriesPerDay,
        remaining: chatRemaining,
      },
      portfolioAnalysis: {
        used: analysisUsed,
        limit: tierConfig.portfolioAnalysisPerDay,
        remaining: analysisRemaining,
      },
      portfolioChanges: {
        used: portfolioChangesUsed,
        limit: tierConfig.portfolioChangesPerDay,
        remaining: portfolioChangesRemaining,
      },
      secFilings: {
        used: filingsUsed,
        limit: tierConfig.secFilingsPerMonth,
        remaining: filingsRemaining,
      },
    },
    resetAt: {
      daily: getNextMidnight(),
      monthly: getNextMonthStart(),
    },
  };
}

/**
 * Fetch all tier configurations and pricing information
 *
 * Returns tier configuration data including:
 * - All available tiers with their limits
 * - Break-even analysis scenarios
 * - Pricing information
 *
 * This is a public action (no auth required) for displaying pricing pages.
 *
 * @returns {Promise<TierConfigData>} Tier configurations and pricing
 */
export async function fetchTierConfigurations() {
  return {
    tiers: TIER_CONFIG,
    breakEvenAnalysis: EXAMPLE_SCENARIOS,
  };
}

/**
 * Helper: Get next midnight UTC
 */
function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Helper: Get next month start
 */
function getNextMonthStart(): Date {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth;
}
