/**
 * Usage Tracking System
 *
 * Tracks user quota consumption across different actions:
 * - Chat queries (daily limit)
 * - Portfolio analyses (daily limit)
 * - SEC filings (monthly limit)
 *
 * Uses database-backed tracking with automatic daily/monthly resets.
 */

import { createAdminClient } from '@lib/supabase/admin';
import { getTierConfig, TierName } from './config';
import { UsageTracking } from '@lib/supabase/db';

export type UsageAction = 'chatQuery' | 'portfolioAnalysis' | 'secFiling' | 'portfolioChange';

function aggregateUsageRows(rows: UsageTracking[] | null): UsageTracking | null {
  if (!rows || rows.length === 0) {
    return null;
  }

  return rows.slice(1).reduce((acc, row) => {
    acc.chat_queries += row.chat_queries ?? 0;
    acc.portfolio_analysis += row.portfolio_analysis ?? 0;
    acc.sec_filings += row.sec_filings ?? 0;
    acc.portfolio_changes += row.portfolio_changes ?? 0;
    return acc;
  }, {
    ...rows[0],
    chat_queries: rows[0].chat_queries ?? 0,
    portfolio_analysis: rows[0].portfolio_analysis ?? 0,
    sec_filings: rows[0].sec_filings ?? 0,
    portfolio_changes: rows[0].portfolio_changes ?? 0,
  });
}

/**
 * Get current usage period
 * Daily period: 00:00 - 23:59 (UTC)
 * Monthly period: 1st - last day of month (UTC)
 */
function getCurrentPeriod(type: 'daily' | 'monthly'): { start: Date; end: Date } {
  const now = new Date();

  if (type === 'daily') {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 999);

    return { start, end };
  } else {
    // Monthly
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    return { start, end };
  }
}

/**
 * Get current usage for a user
 */
export async function getUserUsage(userId: string, tier: TierName) {
  const supabase = createAdminClient();

  // Get daily usage
  // Query for records where period_start falls on today (UTC)
  // This avoids precision issues between JS milliseconds and DB microseconds
  const dailyPeriod = getCurrentPeriod('daily');
  const dailyStartStr = dailyPeriod.start.toISOString();
  // Use start of next day for the upper bound (exclusive) to catch any precision
  const nextDayStart = new Date(dailyPeriod.start);
  nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
  const nextDayStartStr = nextDayStart.toISOString();

  const { data: dailyUsageRows } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .gte('period_start', dailyStartStr)
    .lt('period_start', nextDayStartStr);

  const dailyUsage = aggregateUsageRows(dailyUsageRows || null);

  // Get monthly usage
  // Monthly records have period_start = first of month AND period_end = last of month
  // We need to distinguish from daily records which also fall in this month
  const monthlyPeriod = getCurrentPeriod('monthly');
  const monthlyStartStr = monthlyPeriod.start.toISOString();
  // Use start of next month to verify period_end (monthly records span entire month)
  const nextMonthStart = new Date(Date.UTC(
    monthlyPeriod.start.getUTCFullYear(),
    monthlyPeriod.start.getUTCMonth() + 1,
    1
  ));
  const nextMonthStartStr = nextMonthStart.toISOString();

  const { data: monthlyUsageRows } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .gte('period_start', monthlyStartStr)
    .lt('period_start', new Date(monthlyPeriod.start.getTime() + 1000).toISOString()) // Within 1 second of month start
    .gte('period_end', nextMonthStartStr); // period_end must be in next month (monthly record)

  const monthlyUsage = aggregateUsageRows(monthlyUsageRows || null);

  const tierConfig = getTierConfig(tier);

  return {
    daily: {
      chatQueries: {
        used: dailyUsage?.chat_queries || 0,
        limit: tierConfig.chatQueriesPerDay,
        remaining:
          tierConfig.chatQueriesPerDay === Infinity
            ? Infinity
            : Math.max(0, tierConfig.chatQueriesPerDay - (dailyUsage?.chat_queries || 0)),
      },
      portfolioAnalysis: {
        used: dailyUsage?.portfolio_analysis || 0,
        limit: tierConfig.portfolioAnalysisPerDay,
        remaining:
          tierConfig.portfolioAnalysisPerDay === Infinity
            ? Infinity
            : Math.max(0, tierConfig.portfolioAnalysisPerDay - (dailyUsage?.portfolio_analysis || 0)),
      },
      portfolioChanges: {
        used: dailyUsage?.portfolio_changes || 0,
        limit: tierConfig.portfolioChangesPerDay,
        remaining:
          tierConfig.portfolioChangesPerDay === Infinity
            ? Infinity
            : Math.max(0, tierConfig.portfolioChangesPerDay - (dailyUsage?.portfolio_changes || 0)),
      },
    },
    monthly: {
      secFilings: {
        used: monthlyUsage?.sec_filings || 0,
        limit: tierConfig.secFilingsPerMonth,
        remaining:
          tierConfig.secFilingsPerMonth === Infinity
            ? Infinity
            : Math.max(0, tierConfig.secFilingsPerMonth - (monthlyUsage?.sec_filings || 0)),
      },
    },
    periodStart: {
      daily: dailyPeriod.start,
      monthly: monthlyPeriod.start,
    },
    periodEnd: {
      daily: dailyPeriod.end,
      monthly: monthlyPeriod.end,
    },
  };
}

/**
 * Check if user has quota remaining for an action
 */
export async function checkQuota(
  userId: string,
  action: UsageAction,
  tier: TierName
): Promise<{ allowed: boolean; remaining: number; limit: number; reason?: string }> {
  const usage = await getUserUsage(userId, tier);
  const tierConfig = getTierConfig(tier);

  switch (action) {
    case 'chatQuery':
      const chatRemaining = usage.daily.chatQueries.remaining;
      return {
        allowed: chatRemaining > 0 || chatRemaining === Infinity,
        remaining: chatRemaining === Infinity ? Infinity : chatRemaining,
        limit: tierConfig.chatQueriesPerDay,
        reason:
          chatRemaining === 0
            ? `Daily chat query limit reached (${tierConfig.chatQueriesPerDay}/day)`
            : undefined,
      };

    case 'portfolioAnalysis':
      const analysisRemaining = usage.daily.portfolioAnalysis.remaining;
      return {
        allowed: analysisRemaining > 0 || analysisRemaining === Infinity,
        remaining: analysisRemaining === Infinity ? Infinity : analysisRemaining,
        limit: tierConfig.portfolioAnalysisPerDay,
        reason:
          analysisRemaining === 0
            ? `Daily portfolio analysis limit reached (${tierConfig.portfolioAnalysisPerDay}/day)`
            : undefined,
      };

    case 'secFiling':
      const filingRemaining = usage.monthly.secFilings.remaining;
      return {
        allowed: filingRemaining > 0 || filingRemaining === Infinity,
        remaining: filingRemaining === Infinity ? Infinity : filingRemaining,
        limit: tierConfig.secFilingsPerMonth,
        reason:
          filingRemaining === 0
            ? `Monthly SEC filing limit reached (${tierConfig.secFilingsPerMonth}/month)`
            : undefined,
      };

    case 'portfolioChange':
      const changeRemaining = usage.daily.portfolioChanges.remaining;
      return {
        allowed: changeRemaining > 0 || changeRemaining === Infinity,
        remaining: changeRemaining === Infinity ? Infinity : changeRemaining,
        limit: tierConfig.portfolioChangesPerDay,
        reason:
          changeRemaining === 0
            ? `Daily portfolio change limit reached (${tierConfig.portfolioChangesPerDay}/day). Try again tomorrow or upgrade for unlimited changes.`
            : undefined,
      };

    default:
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        reason: 'Unknown action type',
      };
  }
}

/**
 * Track usage for an action (increment counter)
 */
export async function trackUsage(
  userId: string,
  action: UsageAction,
  tier: TierName
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_action: action,
    p_tier: tier,
  });

  if (error) {
    console.error('[Usage Tracker] Failed to track usage via RPC:', error);
    // Don't throw - allow request to proceed even if tracking fails
  }
}

/**
 * Get usage statistics for display in dashboard
 */
export async function getUsageStats(userId: string, tier: TierName) {
  const usage = await getUserUsage(userId, tier);
  const tierConfig = getTierConfig(tier);

  // Calculate percentages
  const chatPercent =
    tierConfig.chatQueriesPerDay === Infinity
      ? 0
      : (usage.daily.chatQueries.used / tierConfig.chatQueriesPerDay) * 100;

  const analysisPercent =
    tierConfig.portfolioAnalysisPerDay === Infinity
      ? 0
      : (usage.daily.portfolioAnalysis.used / tierConfig.portfolioAnalysisPerDay) * 100;

  const changePercent =
    tierConfig.portfolioChangesPerDay === Infinity
      ? 0
      : (usage.daily.portfolioChanges.used / tierConfig.portfolioChangesPerDay) * 100;

  const filingPercent =
    tierConfig.secFilingsPerMonth === Infinity
      ? 0
      : (usage.monthly.secFilings.used / tierConfig.secFilingsPerMonth) * 100;

  return {
    tier,
    usage,
    percentages: {
      chatQueries: Math.min(100, chatPercent),
      portfolioAnalysis: Math.min(100, analysisPercent),
      portfolioChanges: Math.min(100, changePercent),
      secFilings: Math.min(100, filingPercent),
    },
    warnings: {
      chatQueries: chatPercent >= 80,
      portfolioAnalysis: analysisPercent >= 80,
      portfolioChanges: changePercent >= 80,
      secFilings: filingPercent >= 80,
    },
  };
}
