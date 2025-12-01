/**
 * Cache Constants
 * 
 * Centralized cache configuration for all modules.
 * Prevents duplication and ensures consistent TTL values.
 */

/**
 * Risk metrics cache TTL (6 hours)
 * Used by risk.controller.ts and risk.service.ts
 */
export const RISK_METRICS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * AI Chat cache TTL (1 hour)
 * Used by chat-cache.service.ts
 */
export const CHAT_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Default cache TTL (30 minutes)
 * Used as fallback for general caching
 */
export const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;
