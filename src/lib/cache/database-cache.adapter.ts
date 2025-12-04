/**
 * Database Cache Adapter (L3 Cache)
 *
 * Long-term persistent storage for expensive-to-compute data using PostgreSQL.
 * This is the L3 cache layer in the caching hierarchy:
 *
 * L1 (Client): localStorage/IndexedDB (15 min)
 * L2 (Server): Redis/Vercel KV (5 min - 7 days)
 * L3 (Database): PostgreSQL (30 days - 1 year) <- This file
 *
 * Use cases:
 * - AI-generated SEC filing summaries ($0.10-0.50 per generation)
 * - Company profile aggregations (3-5 API calls)
 * - Historical news sentiment analysis (batch processed)
 *
 * @module lib/cache/database-cache.adapter
 */

import { createAdminClient } from '@lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CACHE_TTL_CONFIG } from '@lib/config/cache-ttl.config';
import type { TierName } from '@lib/config/types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Database row types for L3 cache tables
// These match the table schemas defined in migration 002_l3_cache_tables.sql
interface FilingSummaryRow {
  ticker: string;
  filing_type: string;
  filing_date: string;
  summary_text: string;
  key_points: unknown | null;
  sentiment_score: number | null;
  generated_at: string;
  generated_by: string | null;
  data_version: number;
  expires_at: string | null;
}

interface CompanyProfileRow {
  ticker: string;
  profile_data: unknown;
  updated_at: string;
  data_version: number;
  expires_at: string;
  source_count: number;
  last_verified: string | null;
}

interface NewsSentimentRow {
  id: number;
  ticker: string;
  news_date: string;
  news_url: string | null;
  news_title: string;
  sentiment_score: number;
  sentiment_label: string;
  confidence: number | null;
  ai_summary: string | null;
  key_topics: unknown | null;
  processed_at: string;
  processed_by: string | null;
  data_version: number;
}

/**
 * SEC Filing Summary Cache Entry (API-facing interface)
 */
export interface FilingSummaryCache {
  ticker: string;
  filing_type: string;
  filing_date: string;
  summary_text: string;
  key_points?: string[];
  sentiment_score?: number;
  generated_at: string;
  generated_by?: string;
  data_version: number;
  expires_at?: string;
}

/**
 * Company Profile Cache Entry (API-facing interface)
 */
export interface CompanyProfileCache {
  ticker: string;
  profile_data: Record<string, unknown>;
  updated_at: string;
  data_version: number;
  expires_at: string;
  source_count: number;
  last_verified?: string;
}

/**
 * News Sentiment Cache Entry (API-facing interface)
 */
export interface NewsSentimentCache {
  id?: number;
  ticker: string;
  news_date: string;
  news_url?: string;
  news_title: string;
  sentiment_score: number;
  sentiment_label: 'positive' | 'negative' | 'neutral';
  confidence?: number;
  ai_summary?: string;
  key_topics?: string[];
  processed_at: string;
  processed_by?: string;
  data_version: number;
}

/**
 * Cache statistics for L3 (database cache)
 */
export interface DatabaseCacheStats {
  filing_summaries_count: number;
  company_profiles_count: number;
  news_sentiment_count: number;
  total_size_estimate_mb: number;
  oldest_entry?: Date;
  newest_entry?: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate expiration date from TTL config
 */
function calculateExpiresAt(dataType: 'filingSummaries' | 'companyProfiles', tier: TierName = 'free'): string {
  const ttlMs = CACHE_TTL_CONFIG[dataType][tier];
  return new Date(Date.now() + ttlMs).toISOString();
}

/**
 * Convert DB row to API-facing FilingSummaryCache
 */
function toFilingSummaryCache(row: FilingSummaryRow): FilingSummaryCache {
  return {
    ticker: row.ticker,
    filing_type: row.filing_type,
    filing_date: row.filing_date,
    summary_text: row.summary_text,
    key_points: Array.isArray(row.key_points) ? row.key_points as string[] : undefined,
    sentiment_score: row.sentiment_score ?? undefined,
    generated_at: row.generated_at,
    generated_by: row.generated_by ?? undefined,
    data_version: row.data_version,
    expires_at: row.expires_at ?? undefined,
  };
}

/**
 * Convert DB row to API-facing CompanyProfileCache
 */
function toCompanyProfileCache(row: CompanyProfileRow): CompanyProfileCache {
  return {
    ticker: row.ticker,
    profile_data: row.profile_data as Record<string, unknown>,
    updated_at: row.updated_at,
    data_version: row.data_version,
    expires_at: row.expires_at,
    source_count: row.source_count,
    last_verified: row.last_verified ?? undefined,
  };
}

/**
 * Convert DB row to API-facing NewsSentimentCache
 */
function toNewsSentimentCache(row: NewsSentimentRow): NewsSentimentCache {
  return {
    id: row.id,
    ticker: row.ticker,
    news_date: row.news_date,
    news_url: row.news_url ?? undefined,
    news_title: row.news_title,
    sentiment_score: row.sentiment_score,
    sentiment_label: row.sentiment_label as 'positive' | 'negative' | 'neutral',
    confidence: row.confidence ?? undefined,
    ai_summary: row.ai_summary ?? undefined,
    key_topics: Array.isArray(row.key_topics) ? row.key_topics as string[] : undefined,
    processed_at: row.processed_at,
    processed_by: row.processed_by ?? undefined,
    data_version: row.data_version,
  };
}

// ============================================================================
// DATABASE CACHE ADAPTER
// ============================================================================

/**
 * Database Cache Adapter for L3 persistent cache
 *
 * Implements long-term caching for expensive operations:
 * - AI-generated content (filing summaries)
 * - Multi-source aggregations (company profiles)
 * - Batch-processed data (news sentiment)
 */
export class DatabaseCacheAdapter {
  private supabase: SupabaseClient;

  constructor() {
    // Use admin client to bypass RLS (cache tables have RLS enabled)
    this.supabase = createAdminClient();
  }

  // ==========================================================================
  // FILING SUMMARIES
  // ==========================================================================

  /**
   * Get cached filing summary
   *
   * @param ticker - Stock ticker symbol
   * @param filingType - SEC filing type (10-K, 10-Q, 8-K, etc.)
   * @param filingDate - Filing date (YYYY-MM-DD)
   * @returns Cached summary or null if not found/expired
   *
   * @example
   * ```ts
   * const summary = await dbCache.getFilingSummary('AAPL', '10-K', '2024-09-30');
   * if (summary) {
   *   console.log('Cache hit:', summary.summary_text);
   * }
   * ```
   */
  async getFilingSummary(
    ticker: string,
    filingType: string,
    filingDate: string
  ): Promise<FilingSummaryCache | null> {
    try {
      const { data, error } = await this.supabase
        .from('cache_filing_summaries')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .eq('filing_type', filingType)
        .eq('filing_date', filingDate)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - this is expected, not an error
          console.log(`[L3 Cache] Filing summary miss: ${ticker} ${filingType} ${filingDate}`);
          return null;
        }
        console.error('[L3 Cache] Filing summary fetch error:', error);
        return null;
      }

      // Null safety check
      if (!data) {
        console.log(`[L3 Cache] Filing summary miss: ${ticker} ${filingType} ${filingDate}`);
        return null;
      }

      // Check if expired (ensure UTC parsing for timestamp without timezone)
      if (data.expires_at) {
        const expiresAtStr = data.expires_at.endsWith('Z') ? data.expires_at : `${data.expires_at}Z`;
        if (new Date(expiresAtStr) < new Date()) {
          console.log(`[L3 Cache] Filing summary expired: ${ticker} ${filingType}`);
          return null;
        }
      }

      console.log(`[L3 Cache] Filing summary hit: ${ticker} ${filingType}`);
      return toFilingSummaryCache(data);
    } catch (error) {
      console.error('[L3 Cache] Filing summary fetch exception:', error);
      return null;
    }
  }

  /**
   * Cache a filing summary with automatic TTL application
   *
   * @param summary - Filing summary to cache
   * @param tier - User tier for TTL calculation (defaults to 'free')
   *
   * @example
   * ```ts
   * await dbCache.setFilingSummary({
   *   ticker: 'AAPL',
   *   filing_type: '10-K',
   *   filing_date: '2024-09-30',
   *   summary_text: 'Apple reported strong quarterly earnings...',
   *   key_points: ['Revenue up 20%', 'New product launches'],
   *   sentiment_score: 0.75,
   *   generated_by: 'gemini-1.5-flash',
   *   data_version: 1,
   *   generated_at: new Date().toISOString()
   * });
   * ```
   */
  async setFilingSummary(summary: FilingSummaryCache, tier: TierName = 'free'): Promise<void> {
    try {
      // Apply default TTL if not provided
      const expiresAt = summary.expires_at ?? calculateExpiresAt('filingSummaries', tier);

      const insertData = {
        ticker: summary.ticker.toUpperCase(),
        filing_type: summary.filing_type,
        filing_date: summary.filing_date,
        summary_text: summary.summary_text,
        key_points: summary.key_points ?? null,
        sentiment_score: summary.sentiment_score ?? null,
        generated_at: summary.generated_at,
        generated_by: summary.generated_by ?? null,
        data_version: summary.data_version,
        expires_at: expiresAt,
      };

      const { error } = await this.supabase
        .from('cache_filing_summaries')
        .upsert(insertData);

      if (error) {
        console.error('[L3 Cache] Filing summary set error:', error);
      } else {
        console.log(
          `[L3 Cache] Cached filing summary: ${summary.ticker} ${summary.filing_type} ${summary.filing_date} (expires: ${expiresAt})`
        );
      }
    } catch (error) {
      console.error('[L3 Cache] Filing summary set exception:', error);
    }
  }

  /**
   * Get all cached filing summaries for a ticker
   *
   * @param ticker - Stock ticker symbol
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of cached summaries
   */
  async getFilingSummariesByTicker(
    ticker: string,
    limit: number = 10
  ): Promise<FilingSummaryCache[]> {
    try {
      const { data, error } = await this.supabase
        .from('cache_filing_summaries')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('filing_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[L3 Cache] Filing summaries by ticker fetch error:', error);
        return [];
      }

      console.log(`[L3 Cache] Found ${data?.length ?? 0} filing summaries for ${ticker}`);
      return (data ?? []).map(toFilingSummaryCache);
    } catch (error) {
      console.error('[L3 Cache] Filing summaries by ticker fetch exception:', error);
      return [];
    }
  }

  // ==========================================================================
  // COMPANY PROFILES
  // ==========================================================================

  /**
   * Get cached company profile
   *
   * @param ticker - Stock ticker symbol
   * @returns Cached profile or null if not found/expired
   *
   * @example
   * ```ts
   * const profile = await dbCache.getCompanyProfile('AAPL');
   * if (profile) {
   *   console.log('Company:', profile.profile_data.name);
   * }
   * ```
   */
  async getCompanyProfile(ticker: string): Promise<CompanyProfileCache | null> {
    try {
      const { data, error } = await this.supabase
        .from('cache_company_profiles')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`[L3 Cache] Company profile miss: ${ticker}`);
          return null;
        }
        console.error('[L3 Cache] Company profile fetch error:', error);
        return null;
      }

      if (!data) {
        console.log(`[L3 Cache] Company profile miss: ${ticker}`);
        return null;
      }

      console.log(`[L3 Cache] Company profile hit: ${ticker}`);
      return toCompanyProfileCache(data);
    } catch (error) {
      console.error('[L3 Cache] Company profile fetch exception:', error);
      return null;
    }
  }

  /**
   * Cache a company profile with automatic TTL application
   *
   * @param profile - Company profile to cache
   * @param tier - User tier for TTL calculation (defaults to 'free')
   *
   * @example
   * ```ts
   * await dbCache.setCompanyProfile({
   *   ticker: 'AAPL',
   *   profile_data: {
   *     name: 'Apple Inc.',
   *     sector: 'Technology',
   *     employees: 164000
   *   },
   *   source_count: 3,
   *   data_version: 1,
   *   updated_at: new Date().toISOString()
   * });
   * ```
   */
  async setCompanyProfile(profile: Omit<CompanyProfileCache, 'expires_at'> & { expires_at?: string }, tier: TierName = 'free'): Promise<void> {
    try {
      // Apply default TTL if not provided
      const expiresAt = profile.expires_at ?? calculateExpiresAt('companyProfiles', tier);

      const insertData = {
        ticker: profile.ticker.toUpperCase(),
        profile_data: profile.profile_data,
        updated_at: profile.updated_at,
        data_version: profile.data_version,
        expires_at: expiresAt,
        source_count: profile.source_count,
        last_verified: profile.last_verified ?? null,
      };

      const { error } = await this.supabase
        .from('cache_company_profiles')
        .upsert(insertData);

      if (error) {
        console.error('[L3 Cache] Company profile set error:', error);
      } else {
        console.log(`[L3 Cache] Cached company profile: ${profile.ticker} (expires: ${expiresAt})`);
      }
    } catch (error) {
      console.error('[L3 Cache] Company profile set exception:', error);
    }
  }

  // ==========================================================================
  // NEWS SENTIMENT
  // ==========================================================================

  /**
   * Get cached news sentiment for a ticker
   *
   * @param ticker - Stock ticker symbol
   * @param startDate - Optional start date filter (YYYY-MM-DD)
   * @param endDate - Optional end date filter (YYYY-MM-DD)
   * @param limit - Maximum number of results (default: 100)
   * @returns Array of cached sentiment entries
   *
   * @example
   * ```ts
   * const sentiment = await dbCache.getNewsSentiment('AAPL', '2024-01-01', '2024-12-31');
   * console.log(`Found ${sentiment.length} sentiment entries`);
   * ```
   */
  async getNewsSentiment(
    ticker: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<NewsSentimentCache[]> {
    try {
      let query = this.supabase
        .from('cache_news_sentiment')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('news_date', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('news_date', startDate);
      }

      if (endDate) {
        query = query.lte('news_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[L3 Cache] News sentiment fetch error:', error);
        return [];
      }

      console.log(`[L3 Cache] News sentiment hit: ${ticker} (${data?.length ?? 0} records)`);
      return (data ?? []).map(toNewsSentimentCache);
    } catch (error) {
      console.error('[L3 Cache] News sentiment fetch exception:', error);
      return [];
    }
  }

  /**
   * Cache a single news sentiment entry
   * News sentiment has infinite TTL (historical data never expires)
   *
   * @param sentiment - News sentiment to cache
   *
   * @example
   * ```ts
   * await dbCache.setNewsSentiment({
   *   ticker: 'AAPL',
   *   news_date: '2024-12-03',
   *   news_title: 'Apple announces new product',
   *   news_url: 'https://example.com/news',
   *   sentiment_score: 0.8,
   *   sentiment_label: 'positive',
   *   confidence: 0.95,
   *   processed_by: 'gemini-1.5-flash',
   *   data_version: 1,
   *   processed_at: new Date().toISOString()
   * });
   * ```
   */
  async setNewsSentiment(sentiment: NewsSentimentCache): Promise<void> {
    try {
      const insertData = {
        ticker: sentiment.ticker.toUpperCase(),
        news_date: sentiment.news_date,
        news_url: sentiment.news_url ?? null,
        news_title: sentiment.news_title,
        sentiment_score: sentiment.sentiment_score,
        sentiment_label: sentiment.sentiment_label,
        confidence: sentiment.confidence ?? null,
        ai_summary: sentiment.ai_summary ?? null,
        key_topics: sentiment.key_topics ?? null,
        processed_at: sentiment.processed_at,
        processed_by: sentiment.processed_by ?? null,
        data_version: sentiment.data_version,
      };

      const { error } = await this.supabase
        .from('cache_news_sentiment')
        .insert(insertData);

      if (error) {
        // Check if it's a duplicate (unique constraint violation)
        if (error.code === '23505') {
          console.log(
            `[L3 Cache] News sentiment already cached: ${sentiment.ticker} ${sentiment.news_date}`
          );
        } else {
          console.error('[L3 Cache] News sentiment set error:', error);
        }
      } else {
        console.log(
          `[L3 Cache] Cached news sentiment: ${sentiment.ticker} ${sentiment.news_date}`
        );
      }
    } catch (error) {
      console.error('[L3 Cache] News sentiment set exception:', error);
    }
  }

  /**
   * Bulk insert news sentiment entries
   *
   * @param sentiments - Array of news sentiment entries
   *
   * @example
   * ```ts
   * await dbCache.bulkSetNewsSentiment([
   *   { ticker: 'AAPL', news_date: '2024-12-01', ... },
   *   { ticker: 'AAPL', news_date: '2024-12-02', ... }
   * ]);
   * ```
   */
  async bulkSetNewsSentiment(sentiments: NewsSentimentCache[]): Promise<void> {
    try {
      const insertData = sentiments.map((s) => ({
        ticker: s.ticker.toUpperCase(),
        news_date: s.news_date,
        news_url: s.news_url ?? null,
        news_title: s.news_title,
        sentiment_score: s.sentiment_score,
        sentiment_label: s.sentiment_label,
        confidence: s.confidence ?? null,
        ai_summary: s.ai_summary ?? null,
        key_topics: s.key_topics ?? null,
        processed_at: s.processed_at,
        processed_by: s.processed_by ?? null,
        data_version: s.data_version,
      }));

      const { error } = await this.supabase
        .from('cache_news_sentiment')
        .insert(insertData);

      if (error) {
        console.error('[L3 Cache] Bulk news sentiment set error:', error);
      } else {
        console.log(`[L3 Cache] Cached ${sentiments.length} news sentiment entries`);
      }
    } catch (error) {
      console.error('[L3 Cache] Bulk news sentiment set exception:', error);
    }
  }

  /**
   * Calculate average sentiment for a ticker over a date range
   *
   * @param ticker - Stock ticker symbol
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Average sentiment score or null
   */
  async getAverageSentiment(
    ticker: string,
    startDate: string,
    endDate: string
  ): Promise<number | null> {
    try {
      const sentiments = await this.getNewsSentiment(ticker, startDate, endDate, 1000);

      if (sentiments.length === 0) {
        return null;
      }

      const total = sentiments.reduce((sum, s) => sum + s.sentiment_score, 0);
      const average = total / sentiments.length;

      console.log(
        `[L3 Cache] Average sentiment for ${ticker} (${startDate} to ${endDate}): ${average.toFixed(2)}`
      );

      return average;
    } catch (error) {
      console.error('[L3 Cache] Average sentiment calculation error:', error);
      return null;
    }
  }

  // ==========================================================================
  // CLEANUP & MAINTENANCE
  // ==========================================================================

  /**
   * Clean up expired cache entries
   *
   * Deletes expired filing summaries and company profiles.
   * News sentiment is never deleted (historical data).
   *
   * @returns Number of entries deleted
   */
  async cleanupExpiredData(): Promise<number> {
    const now = new Date().toISOString();
    let totalDeleted = 0;

    try {
      // Cleanup expired filing summaries
      const { data: filingsData, error: filingsError } = await this.supabase
        .from('cache_filing_summaries')
        .delete()
        .lt('expires_at', now)
        .select('ticker');

      if (filingsError) {
        console.error('[L3 Cache] Filing summaries cleanup error:', filingsError);
      } else {
        const filingsDeleted = filingsData?.length ?? 0;
        totalDeleted += filingsDeleted;
        console.log(`[L3 Cache] Cleaned up ${filingsDeleted} expired filing summaries`);
      }

      // Cleanup expired company profiles
      const { data: profilesData, error: profilesError } = await this.supabase
        .from('cache_company_profiles')
        .delete()
        .lt('expires_at', now)
        .select('ticker');

      if (profilesError) {
        console.error('[L3 Cache] Company profiles cleanup error:', profilesError);
      } else {
        const profilesDeleted = profilesData?.length ?? 0;
        totalDeleted += profilesDeleted;
        console.log(`[L3 Cache] Cleaned up ${profilesDeleted} expired company profiles`);
      }

      console.log(`[L3 Cache] Total expired entries cleaned: ${totalDeleted}`);
      return totalDeleted;
    } catch (error) {
      console.error('[L3 Cache] Cleanup exception:', error);
      return totalDeleted;
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Statistics about cached data
   */
  async getStats(): Promise<DatabaseCacheStats> {
    try {
      // Count filing summaries
      const { count: filingsCount } = await this.supabase
        .from('cache_filing_summaries')
        .select('*', { count: 'exact', head: true });

      // Count company profiles
      const { count: profilesCount } = await this.supabase
        .from('cache_company_profiles')
        .select('*', { count: 'exact', head: true });

      // Count news sentiment
      const { count: sentimentCount } = await this.supabase
        .from('cache_news_sentiment')
        .select('*', { count: 'exact', head: true });

      // Estimate total size (rough calculation)
      const totalSizeEstimateMB =
        ((filingsCount ?? 0) * 5 +
          (profilesCount ?? 0) * 10 +
          (sentimentCount ?? 0) * 2) /
        1024;

      return {
        filing_summaries_count: filingsCount ?? 0,
        company_profiles_count: profilesCount ?? 0,
        news_sentiment_count: sentimentCount ?? 0,
        total_size_estimate_mb: parseFloat(totalSizeEstimateMB.toFixed(2)),
      };
    } catch (error) {
      console.error('[L3 Cache] Stats fetch error:', error);
      return {
        filing_summaries_count: 0,
        company_profiles_count: 0,
        news_sentiment_count: 0,
        total_size_estimate_mb: 0,
      };
    }
  }

  /**
   * Clear all cache entries for a specific ticker
   *
   * @param ticker - Stock ticker symbol
   */
  async clearTickerCache(ticker: string): Promise<void> {
    const upperTicker = ticker.toUpperCase();

    try {
      // Clear filing summaries
      await this.supabase
        .from('cache_filing_summaries')
        .delete()
        .eq('ticker', upperTicker);

      // Clear company profile
      await this.supabase
        .from('cache_company_profiles')
        .delete()
        .eq('ticker', upperTicker);

      // Clear news sentiment
      await this.supabase
        .from('cache_news_sentiment')
        .delete()
        .eq('ticker', upperTicker);

      console.log(`[L3 Cache] Cleared all cache entries for ${upperTicker}`);
    } catch (error) {
      console.error(`[L3 Cache] Clear ticker cache error for ${upperTicker}:`, error);
    }
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let dbCacheInstance: DatabaseCacheAdapter | null = null;

/**
 * Get the singleton database cache adapter instance
 *
 * @returns DatabaseCacheAdapter singleton
 *
 * @example
 * ```ts
 * import { getDatabaseCache } from '@lib/cache/database-cache.adapter';
 *
 * const dbCache = getDatabaseCache();
 * const summary = await dbCache.getFilingSummary('AAPL', '10-K', '2024-09-30');
 * ```
 */
export function getDatabaseCache(): DatabaseCacheAdapter {
  if (!dbCacheInstance) {
    dbCacheInstance = new DatabaseCacheAdapter();
  }
  return dbCacheInstance;
}

/**
 * Reset the database cache adapter singleton (useful for testing)
 */
export function resetDatabaseCache(): void {
  dbCacheInstance = null;
}
