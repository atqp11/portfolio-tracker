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

/**
 * Normalize timestamp to consistent string format for DB storage/queries
 * Ensures exact matches between writes and reads
 */
function normalizeTimestamp(date: Date): string {
  return date.toISOString().replace('Z', '+00:00');
}

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
 * Get or create usage record for current period
 */
async function getOrCreateUsageRecord(
  userId: string,
  tier: TierName,
  periodType: 'daily' | 'monthly'
): Promise<UsageTracking> {
  const supabase = createAdminClient();
  const { start, end } = getCurrentPeriod(periodType);

  // Normalize timestamps for consistent matching
  const startStr = normalizeTimestamp(start);
  const endStr = normalizeTimestamp(end);

  // Try to find existing record for current period using exact timestamp match
  const { data: existing, error: findError } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', startStr)
    .eq('period_end', endStr)
    .limit(1)
    .maybeSingle();

  if (existing && !findError) {
    return existing;
  }

  // Create new record for current period with normalized timestamps
  const { data: newRecord, error: createError } = await supabase
    .from('usage_tracking')
    .insert({
      user_id: userId,
      tier,
      chat_queries: 0,
      portfolio_analysis: 0,
      sec_filings: 0,
      portfolio_changes: 0,
      period_start: startStr,
      period_end: endStr,
    })
    .select()
    .single();

  if (createError) {
    console.error('[getOrCreateUsageRecord] Failed to create usage record:', createError);
    throw new Error(`Failed to initialize usage tracking: ${createError.message}`);
  }

  if (!newRecord) {
    throw new Error('Failed to initialize usage tracking: No record returned');
  }

  return newRecord;
}

/**
 * Get current usage for a user
 */
export async function getUserUsage(userId: string, tier: TierName) {
  const supabase = createAdminClient();

  // Get daily usage - use normalized timestamps for exact matching
  const dailyPeriod = getCurrentPeriod('daily');
  const dailyStartStr = normalizeTimestamp(dailyPeriod.start);
  const dailyEndStr = normalizeTimestamp(dailyPeriod.end);

  const { data: dailyUsageRows } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', dailyStartStr)
    .eq('period_end', dailyEndStr);

  const dailyUsage = aggregateUsageRows(dailyUsageRows || null);

  // Get monthly usage - use normalized timestamps for exact matching
  const monthlyPeriod = getCurrentPeriod('monthly');
  const monthlyStartStr = normalizeTimestamp(monthlyPeriod.start);
  const monthlyEndStr = normalizeTimestamp(monthlyPeriod.end);

  const { data: monthlyUsageRows } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', monthlyStartStr)
    .eq('period_end', monthlyEndStr);

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

  // Determine period type
  const periodType = action === 'secFiling' ? 'monthly' : 'daily';

  // Get or create usage record
  const record = await getOrCreateUsageRecord(userId, tier, periodType);

  // Increment appropriate counter
  const updates: { chat_queries?: number; portfolio_analysis?: number; sec_filings?: number; portfolio_changes?: number } = {};

  switch (action) {
    case 'chatQuery':
      updates.chat_queries = (record.chat_queries || 0) + 1;
      break;
    case 'portfolioAnalysis':
      updates.portfolio_analysis = (record.portfolio_analysis || 0) + 1;
      break;
    case 'secFiling':
      updates.sec_filings = (record.sec_filings || 0) + 1;
      break;
    case 'portfolioChange':
      updates.portfolio_changes = (record.portfolio_changes || 0) + 1;
      break;
  }

  // Update database
  const { error } = await supabase
    .from('usage_tracking')
    .update(updates)
    .eq('id', record.id);

  if (error) {
    console.error('[Usage Tracker] Failed to track usage:', error);
    // Don't throw - allow request to proceed even if tracking fails
  }
}

/**
 * Check quota and track usage in one operation
 * Returns true if action is allowed, false otherwise
 */
export async function checkAndTrackUsage(
  userId: string,
  action: UsageAction,
  tier: TierName
): Promise<{ allowed: boolean; reason?: string }> {
  // Check quota first
  const quota = await checkQuota(userId, action, tier);

  if (!quota.allowed) {
    return { allowed: false, reason: quota.reason };
  }

  // Track usage (increment counter)
  await trackUsage(userId, action, tier);

  return { allowed: true };
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
