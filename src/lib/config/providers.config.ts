/**
 * Provider Configuration
 *
 * Centralized configuration for all external data providers.
 * Defines priority levels, circuit breaker settings, rate limits, and retry behavior.
 *
 * Priority Levels:
 * - 1 = Primary (use first)
 * - 2 = Fallback (use if primary fails)
 * - 3 = Tertiary (use only for specific cases)
 */

import type { ProviderConfig } from './types';

// ============================================================================
// Provider Configurations
// ============================================================================

export const PROVIDER_CONFIG = {
  // --------------------------------------------------------------------------
  // Stock Quote Providers
  // --------------------------------------------------------------------------

  tiingo: {
    name: 'tiingo',
    enabled: process.env.FEATURE_TIINGO_ENABLED === 'true',
    priority: 1, // PRIMARY for stock quotes
    baseUrl: 'https://api.tiingo.com/tiingo',
    apiKey: process.env.TIINGO_API_KEY,
    timeout: 10000, // 10 seconds
    retryAttempts: 2,
    retryDelay: 1000, // 1 second
    circuitBreaker: {
      failureThreshold: 5, // Open circuit after 5 failures
      resetTimeout: 60000, // Test provider again after 1 minute
      halfOpenMaxRequests: 3, // Allow 3 test requests in half-open state
    },
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 10000, // Adjust based on your Tiingo plan
    },
    batchSize: 500, // Tiingo supports up to 500 symbols per batch request
  } satisfies ProviderConfig,

  yahooFinance: {
    name: 'yahooFinance',
    enabled: true,
    priority: 2, // FALLBACK (use only if Tiingo fails)
    baseUrl: 'https://query1.finance.yahoo.com/v7/finance',
    apiKey: undefined, // Yahoo Finance doesn't require API key
    timeout: 8000, // 8 seconds
    retryAttempts: 2,
    retryDelay: 1000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxRequests: 3,
    },
    rateLimit: {
      requestsPerMinute: 60, // Yahoo is rate-limited more aggressively
      requestsPerDay: 5000,
    },
    batchSize: 100, // Yahoo supports smaller batches
  } satisfies ProviderConfig,

  // --------------------------------------------------------------------------
  // Commodity Price Providers
  // --------------------------------------------------------------------------

  alphaVantage: {
    name: 'alphaVantage',
    enabled: process.env.ALPHAVANTAGE_API_KEY !== undefined,
    priority: 3, // TERTIARY (use only for commodities when Tiingo unavailable)
    baseUrl: 'https://www.alphavantage.co/query',
    apiKey: process.env.ALPHAVANTAGE_API_KEY,
    timeout: 10000,
    retryAttempts: 1,
    retryDelay: 2000,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 120000, // 2 minutes (AlphaVantage has strict rate limits)
      halfOpenMaxRequests: 1,
    },
    rateLimit: {
      requestsPerMinute: 5, // AlphaVantage free tier: 5 req/min
      requestsPerDay: 500,
    },
  } satisfies ProviderConfig,

  // --------------------------------------------------------------------------
  // News Providers
  // --------------------------------------------------------------------------

  rss: {
    name: 'rss',
    enabled: process.env.FEATURE_RSS_NEWS_ENABLED === 'true',
    priority: 1, // PRIMARY for news
    baseUrl: undefined, // RSS feeds are configured separately
    apiKey: undefined,
    timeout: 15000, // 15 seconds (RSS feeds can be slow)
    retryAttempts: 2,
    retryDelay: 2000,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 300000, // 5 minutes
      halfOpenMaxRequests: 2,
    },
    rateLimit: {
      requestsPerMinute: 10, // Be nice to RSS feeds
      requestsPerDay: 1000,
    },
  } satisfies ProviderConfig,

  // --------------------------------------------------------------------------
  // SEC Filing Providers
  // --------------------------------------------------------------------------

  secEdgar: {
    name: 'secEdgar',
    enabled: true,
    priority: 1, // PRIMARY for SEC filings
    baseUrl: 'https://www.sec.gov',
    apiKey: undefined, // SEC EDGAR doesn't require API key
    timeout: 20000, // 20 seconds (SEC can be slow)
    retryAttempts: 2,
    retryDelay: 3000,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 180000, // 3 minutes
      halfOpenMaxRequests: 2,
    },
    rateLimit: {
      requestsPerMinute: 10, // SEC requires respectful rate limiting
      requestsPerDay: 1000,
    },
  } satisfies ProviderConfig,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get providers sorted by priority (lowest number = highest priority)
 *
 * @param providerNames - Array of provider names to filter and sort
 * @returns Array of provider configs sorted by priority
 *
 * @example
 * ```ts
 * // Get stock quote providers in priority order
 * const providers = getProvidersByPriority(['tiingo', 'yahooFinance']);
 * // Returns: [tiingo (priority 1), yahooFinance (priority 2)]
 * ```
 */
export function getProvidersByPriority(
  providerNames: (keyof typeof PROVIDER_CONFIG)[]
): ProviderConfig[] {
  return providerNames
    .map(name => PROVIDER_CONFIG[name])
    .filter(provider => provider.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get all enabled providers
 *
 * @returns Array of all enabled provider configs
 */
export function getEnabledProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIG).filter(provider => provider.enabled);
}

/**
 * Get provider by name
 *
 * @param name - Provider name
 * @returns Provider config or undefined if not found
 */
export function getProviderConfig(
  name: keyof typeof PROVIDER_CONFIG
): ProviderConfig | undefined {
  const config = PROVIDER_CONFIG[name];
  return config.enabled ? config : undefined;
}

/**
 * Check if a provider is available (enabled and has required API key)
 *
 * @param name - Provider name
 * @returns True if provider is available
 */
export function isProviderAvailable(name: keyof typeof PROVIDER_CONFIG): boolean {
  const config = PROVIDER_CONFIG[name];
  if (!config.enabled) return false;

  // If provider requires API key, check if it's set
  if (config.apiKey !== undefined) {
    return config.apiKey !== undefined && config.apiKey.length > 0;
  }

  return true;
}

// ============================================================================
// Configuration Metadata
// ============================================================================

/**
 * Provider groups for easy filtering
 */
export const PROVIDER_GROUPS = {
  quotes: ['tiingo', 'yahooFinance'] as const,
  commodities: ['tiingo', 'alphaVantage'] as const,
  news: ['rss'] as const,
  filings: ['secEdgar'] as const,
} as const;

/**
 * Get providers for a specific data type
 *
 * @param dataType - Type of data (quotes, commodities, news, filings)
 * @returns Array of provider configs sorted by priority
 */
export function getProvidersForDataType(
  dataType: keyof typeof PROVIDER_GROUPS
): ProviderConfig[] {
  return getProvidersByPriority([...PROVIDER_GROUPS[dataType]]);
}
