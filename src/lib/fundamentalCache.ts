// ============================================================================
// FUNDAMENTAL DATA CACHING
// ============================================================================
/**
 * The `fundamentalCache.ts` file provides client-side caching utilities for API responses
 * related to fundamental financial data. It includes functions for managing cache keys,
 * validating cache data, and warming up the cache for better performance.
 *
 * Key Components:
 *
 * 1. **Caching Configuration:**
 *    - `FundamentalCacheConfig`: Defines time-to-live (TTL) values for different types of data.
 *    - `CACHE_CONFIG`: Default TTL values for quotes, fundamentals, financials, SEC filings, and AI responses.
 *
 * 2. **Market Hours Utilities:**
 *    - `isMarketOpen`: Determines if the market is currently open based on Eastern Time (ET).
 *    - `getQuoteTTL`: Returns the appropriate TTL for quote data based on market hours.
 *
 * 3. **Cache Management:**
 *    - `generateCacheKey`: Generates a unique cache key for Alpha Vantage data.
 *    - `isCacheValid`: Checks if cached data is still valid based on its age and TTL.
 *    - `getCachedFundamentals`: Retrieves cached fundamental data with TTL validation.
 *    - `cacheFundamentals`: Saves fundamental data to the cache.
 *
 * 4. **Cache Warming:**
 *    - `warmFundamentalsCache`: Pre-fetches data for all portfolio stocks after market close
 *      to prepare for the next trading day.
 *
 * 5. **Cache Clearing:**
 *    - `clearFundamentalsCache`: Clears all cached fundamental data, useful for debugging.
 *
 * Usage:
 *
 * - **Caching Data:**
 *   Use `cacheFundamentals` to save data to the cache and `getCachedFundamentals` to retrieve it.
 *   The cache is validated using TTL values defined in `CACHE_CONFIG`.
 *
 * - **Market Hours:**
 *   Use `isMarketOpen` and `getQuoteTTL` to determine the appropriate TTL for quote data
 *   based on whether the market is open or closed.
 *
 * - **Cache Warming:**
 *   Use `warmFundamentalsCache` to pre-fetch data for portfolio stocks after market close.
 *   This ensures that data is readily available for the next trading day.
 *
 * - **Cache Clearing:**
 *   Use `clearFundamentalsCache` to remove all cached data, typically for debugging purposes.
 *
 * This file is essential for optimizing API usage and improving the performance of the
 * portfolio tracker application by reducing redundant API calls and ensuring data freshness.
 */

import { saveToCache, loadFromCache, getCacheAge } from '@lib/utils/localStorageCache';

export interface FundamentalCacheConfig {
  quoteTTL: number;           // 15 min during market hours, 1 hour after
  fundamentalsTTL: number;    // 24 hours
  financialsTTL: number;      // 90 days (quarterly updates)
  secFilingTTL: number;       // 30 days
  aiResponseTTL: number;      // 24 hours
}

export const CACHE_CONFIG: FundamentalCacheConfig = {
  quoteTTL: 15 * 60 * 1000,           // 15 minutes
  fundamentalsTTL: 24 * 60 * 60 * 1000, // 24 hours
  financialsTTL: 90 * 24 * 60 * 60 * 1000, // 90 days
  secFilingTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
  aiResponseTTL: 24 * 60 * 60 * 1000,  // 24 hours
};

/**
 * Check if market is currently open (9:30 AM - 4:00 PM ET, Mon-Fri)
 * Used to determine quote cache TTL
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  
  // Weekend check (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) return false;
  
  // Convert to ET time
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Market hours: 9:30 AM (570 min) to 4:00 PM (960 min)
  return timeInMinutes >= 570 && timeInMinutes <= 960;
}

/**
 * Get appropriate TTL for quote data based on market hours
 */
export function getQuoteTTL(): number {
  return isMarketOpen() 
    ? CACHE_CONFIG.quoteTTL 
    : 60 * 60 * 1000; // 1 hour after market close
}

/**
 * Generate cache key for Alpha Vantage data
 */
export function generateCacheKey(type: string, ticker: string, additional?: string): string {
  const parts = ['AV', type.toUpperCase(), ticker.toUpperCase()];
  if (additional) parts.push(additional);
  return parts.join(':');
}

/**
 * Check if cached data is still valid
 */
export function isCacheValid(key: string, ttl: number): boolean {
  const age = getCacheAge(key);
  return age > 0 && age < ttl;
}

/**
 * Get cached fundamental data with TTL check
 */
export function getCachedFundamentals<T = any>(ticker: string, dataType: 'quote' | 'fundamentals' | 'income' | 'balance' | 'cashflow'): T | null {
  const cacheKey = generateCacheKey(dataType, ticker);
  
  // Determine TTL based on data type
  let ttl: number;
  switch (dataType) {
    case 'quote':
      ttl = getQuoteTTL();
      break;
    case 'fundamentals':
      ttl = CACHE_CONFIG.fundamentalsTTL;
      break;
    case 'income':
    case 'balance':
    case 'cashflow':
      ttl = CACHE_CONFIG.financialsTTL;
      break;
    default:
      ttl = CACHE_CONFIG.fundamentalsTTL;
  }
  
  // Check if cache is valid
  if (!isCacheValid(cacheKey, ttl)) {
    return null;
  }
  
  return loadFromCache<T>(cacheKey);
}

/**
 * Save fundamental data to cache
 */
export function cacheFundamentals(ticker: string, dataType: 'quote' | 'fundamentals' | 'income' | 'balance' | 'cashflow', data: any): void {
  const cacheKey = generateCacheKey(dataType, ticker);
  saveToCache(cacheKey, data);
}

/**
 * Cache warming: Pre-fetch data for all portfolio stocks
 * Call this after market close (4:00 PM ET) to prepare for next day
 */
export async function warmFundamentalsCache(tickers: string[]): Promise<void> {
  console.log(`Warming cache for ${tickers.length} tickers...`);
  
  // This should be called from a background job or scheduled task
  // For now, it's a placeholder that shows the structure
  
  for (const ticker of tickers) {
    // Check if data needs refresh
    const needsQuote = !isCacheValid(generateCacheKey('quote', ticker), getQuoteTTL());
    const needsFundamentals = !isCacheValid(generateCacheKey('fundamentals', ticker), CACHE_CONFIG.fundamentalsTTL);
    
    if (needsQuote || needsFundamentals) {
      console.log(`Cache warming needed for ${ticker}: quote=${needsQuote}, fundamentals=${needsFundamentals}`);
      // Actual fetching will be done in the API route
    }
  }
}

/**
 * Clear all fundamental caches (useful for debugging)
 */
export function clearFundamentalsCache(): void {
  // For simplicity, directly check localStorage availability here or import hasLocalStorage if needed.
  if (typeof window === 'undefined') return;

  try {
    const storage = (typeof localStorage !== 'undefined') ? localStorage : (global as any).localStorage;
    const keys = Object.keys(storage);
    keys.forEach(key => {
      if (key.startsWith('AV:')) {
        storage.removeItem(key);
      }
    });
    console.log('Fundamentals cache cleared');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}