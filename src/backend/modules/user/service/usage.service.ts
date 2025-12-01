/**
 * Usage Service
 * 
 * Business logic for calculating user usage statistics, quota limits,
 * and progress tracking across different subscription tiers.
 * 
 * Responsibilities:
 * - Calculate period boundaries (daily/monthly)
 * - Compute usage metrics (used, remaining, percentage)
 * - Apply tier limits
 * - Generate warning flags (80%+ usage)
 */

import { getTierConfig, type TierName } from '@lib/tiers';
import { getCurrentUserUsage } from '@lib/supabase/db';
import type { RawUsageData, UsageStats, UsageMetric } from '@backend/modules/user/dto/usage.dto';

export class UsageService {
  /**
   * Get complete usage statistics for a user
   * 
   * @param userId - User's unique identifier
   * @param tier - User's subscription tier
   * @returns Complete usage statistics with metrics, percentages, and warnings
   */
  async getUserUsageStats(userId: string, tier: TierName): Promise<UsageStats> {
    // Fetch raw usage data from repository
    const rawUsage = await getCurrentUserUsage(userId);
    
    // Get tier configuration
    const tierConfig = getTierConfig(tier);
    
    // Calculate period boundaries
    const periods = this.calculatePeriods();
    
    // Build usage metrics
    const dailyChatMetric = this.buildUsageMetric(
      rawUsage.daily?.chat_queries || 0,
      tierConfig.chatQueriesPerDay
    );
    
    const dailyAnalysisMetric = this.buildUsageMetric(
      rawUsage.daily?.portfolio_analysis || 0,
      tierConfig.portfolioAnalysisPerDay
    );
    
    const monthlyFilingsMetric = this.buildUsageMetric(
      rawUsage.monthly?.sec_filings || 0,
      tierConfig.secFilingsPerMonth
    );
    
    // Calculate percentages
    const chatPercent = this.calculatePercentage(
      dailyChatMetric.used,
      dailyChatMetric.limit
    );
    
    const analysisPercent = this.calculatePercentage(
      dailyAnalysisMetric.used,
      dailyAnalysisMetric.limit
    );
    
    const filingsPercent = this.calculatePercentage(
      monthlyFilingsMetric.used,
      monthlyFilingsMetric.limit
    );
    
    return {
      tier,
      usage: {
        daily: {
          chatQueries: dailyChatMetric,
          portfolioAnalysis: dailyAnalysisMetric,
        },
        monthly: {
          secFilings: monthlyFilingsMetric,
        },
        periodStart: periods.start,
        periodEnd: periods.end,
      },
      percentages: {
        chatQueries: chatPercent,
        portfolioAnalysis: analysisPercent,
        secFilings: filingsPercent,
      },
      warnings: {
        chatQueries: chatPercent >= 80,
        portfolioAnalysis: analysisPercent >= 80,
        secFilings: filingsPercent >= 80,
      },
    };
  }
  
  /**
   * Build a usage metric object
   * 
   * @param used - Amount used
   * @param limit - Maximum allowed (number or Infinity)
   * @returns Usage metric with used, limit, and remaining
   */
  private buildUsageMetric(used: number, limit: number): UsageMetric {
    const remaining = limit === Infinity
      ? Infinity
      : Math.max(0, limit - used);
    
    return {
      used,
      limit,
      remaining,
    };
  }
  
  /**
   * Calculate usage percentage
   * 
   * @param used - Amount used
   * @param limit - Maximum allowed
   * @returns Percentage (0-100), capped at 100, or 0 for infinite limits
   */
  private calculatePercentage(used: number, limit: number | typeof Infinity): number {
    if (limit === Infinity) {
      return 0;
    }
    
    const percent = (used / limit) * 100;
    return Math.min(100, percent);
  }
  
  /**
   * Calculate period start and end dates
   * 
   * @returns Daily and monthly period boundaries
   */
  private calculatePeriods() {
    const now = new Date();
    
    // Daily period: 00:00:00 to 23:59:59 UTC today
    const dailyStart = new Date(now);
    dailyStart.setUTCHours(0, 0, 0, 0);
    
    const dailyEnd = new Date(dailyStart);
    dailyEnd.setUTCHours(23, 59, 59, 999);
    
    // Monthly period: First to last day of current month
    const monthlyStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );
    
    const monthlyEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)
    );
    
    return {
      start: {
        daily: dailyStart,
        monthly: monthlyStart,
      },
      end: {
        daily: dailyEnd,
        monthly: monthlyEnd,
      },
    };
  }
}

// Singleton instance
export const usageService = new UsageService();
