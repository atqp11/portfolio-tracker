/**
 * Cache TTL Configuration
 *
 * TTL Strategy:
 * - Free tier: Longer TTLs (reduce costs)
 * - Premium tier: Shorter TTLs (fresher data)
 * - Data type: Balance update frequency vs. cost
 */

import type { CacheTTLConfig, TierName } from './types';

export const CACHE_TTL_CONFIG: CacheTTLConfig = {
  // Stock market data
  quotes: {
    free: 15 * 60 * 1000,    // 15 minutes
    basic: 10 * 60 * 1000,   // 10 minutes
    premium: 5 * 60 * 1000,  // 5 minutes
  },

  commodities: {
    free: 4 * 60 * 60 * 1000,  // 4 hours
    basic: 2 * 60 * 60 * 1000, // 2 hours
    premium: 1 * 60 * 60 * 1000, // 1 hour
  },

  // Company data
  fundamentals: {
    free: 7 * 24 * 60 * 60 * 1000,   // 7 days (quarterly updates)
    basic: 7 * 24 * 60 * 60 * 1000,  // 7 days
    premium: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  companyInfo: {
    free: 30 * 24 * 60 * 60 * 1000,   // 30 days (rarely changes)
    basic: 30 * 24 * 60 * 60 * 1000,  // 30 days
    premium: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  // News & content
  news: {
    free: 60 * 60 * 1000,  // 1 hour
    basic: 60 * 60 * 1000, // 1 hour
    premium: 60 * 60 * 1000, // 1 hour
  },

  // SEC filings (immutable once published)
  filings: {
    free: 30 * 24 * 60 * 60 * 1000,  // 30 days
    basic: 30 * 24 * 60 * 60 * 1000, // 30 days
    premium: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  // AI responses
  aiChat: {
    free: 12 * 60 * 60 * 1000,  // 12 hours
    basic: 12 * 60 * 60 * 1000, // 12 hours
    premium: 12 * 60 * 60 * 1000, // 12 hours
  },

  portfolioAnalysis: {
    free: 12 * 60 * 60 * 1000,  // 12 hours
    basic: 12 * 60 * 60 * 1000, // 12 hours
    premium: 12 * 60 * 60 * 1000, // 12 hours
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get cache TTL for specific data type and user tier
 *
 * @param dataType - Type of data (quotes, commodities, news, etc.)
 * @param tier - User tier (free, basic, premium)
 * @returns TTL in milliseconds
 *
 * @example
 * ```ts
 * const ttl = getCacheTTL('quotes', 'free');
 * console.log(ttl); // 900000 (15 minutes)
 * ```
 */
export function getCacheTTL(
  dataType: keyof CacheTTLConfig,
  tier: TierName
): number {
  return CACHE_TTL_CONFIG[dataType][tier];
}

/**
 * Get all TTLs for a specific tier
 *
 * @param tier - User tier
 * @returns Object with all TTLs for the tier
 */
export function getTierTTLs(tier: TierName): Record<keyof CacheTTLConfig, number> {
  return {
    quotes: CACHE_TTL_CONFIG.quotes[tier],
    commodities: CACHE_TTL_CONFIG.commodities[tier],
    fundamentals: CACHE_TTL_CONFIG.fundamentals[tier],
    companyInfo: CACHE_TTL_CONFIG.companyInfo[tier],
    news: CACHE_TTL_CONFIG.news[tier],
    filings: CACHE_TTL_CONFIG.filings[tier],
    aiChat: CACHE_TTL_CONFIG.aiChat[tier],
    portfolioAnalysis: CACHE_TTL_CONFIG.portfolioAnalysis[tier],
  };
}

/**
 * Format TTL to human-readable string
 *
 * @param ttl - TTL in milliseconds
 * @returns Formatted string (e.g., "15 minutes", "2 hours", "7 days")
 */
export function formatTTL(ttl: number): string {
  const seconds = ttl / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (days >= 1) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours >= 1) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (minutes >= 1) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}

/**
 * Get TTL as seconds (useful for Redis EX command)
 *
 * @param dataType - Type of data
 * @param tier - User tier
 * @returns TTL in seconds
 */
export function getCacheTTLSeconds(
  dataType: keyof CacheTTLConfig,
  tier: TierName
): number {
  return Math.floor(getCacheTTL(dataType, tier) / 1000);
}
