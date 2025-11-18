// Client-side caching utilities for API responses

export interface CacheData {
  data: any;
  timestamp: number;
}

export function saveToCache(key: string, data: any): void {
  if (typeof window === 'undefined') return;
  
  const cacheData: CacheData = {
    data,
    timestamp: Date.now(),
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save to cache:', error);
  }
}

export function loadFromCache<T = any>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached) as CacheData;
    return cacheData.data as T;
  } catch (error) {
    console.error('Failed to load from cache:', error);
    return null;
  }
}

export function getCacheAge(key: string): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return 0;
    
    const cacheData = JSON.parse(cached) as CacheData;
    return Date.now() - cacheData.timestamp;
  } catch (error) {
    return 0;
  }
}

export function formatCacheAge(ageMs: number): string {
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);
  
  if (ageDays > 0) return `${ageDays}d ago`;
  if (ageHours > 0) return `${ageHours}h ago`;
  if (ageMinutes > 0) return `${ageMinutes}m ago`;
  return 'just now';
}

export type ApiErrorType = 'rate_limit' | 'auth' | 'network' | 'server' | 'unknown';

export interface ApiError {
  type: ApiErrorType;
  message: string;
}

export function classifyApiError(error: any): ApiError {
  const errorMessage = error?.message || error?.toString() || '';
  
  // Check for rate limit errors
  if (
    errorMessage.includes('RATE_LIMIT') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('Too Many Requests') ||
    errorMessage.includes('429')
  ) {
    return {
      type: 'rate_limit',
      message: errorMessage,
    };
  }
  
  // Check for authentication errors
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('invalid api key') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403')
  ) {
    return {
      type: 'auth',
      message: errorMessage,
    };
  }
  
  // Check for network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('timeout')
  ) {
    return {
      type: 'network',
      message: errorMessage,
    };
  }
  
  // Check for server errors
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('server error')
  ) {
    return {
      type: 'server',
      message: errorMessage,
    };
  }
  
  return {
    type: 'unknown',
    message: errorMessage,
  };
}

// ============================================================================
// FUNDAMENTAL DATA CACHING
// ============================================================================

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
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('AV:')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Fundamentals cache cleared');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
