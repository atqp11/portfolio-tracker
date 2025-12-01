// AI-specific caching utilities with intelligent TTL management
// Different types of AI data have different cache durations based on how static they are
//
// CACHING STRATEGY:
// 1. On component mount, fetch batch data for all portfolio tickers
// 2. Parse batch responses → store individual stock caches
// 3. Batch cache stores METADATA only (tickers + timestamp), real data at stock level
// 4. Individual queries during chat → update individual stock cache
// 5. On remount: if batch cache expired → refresh all (including individual), else use existing
// 6. On portfolio change: detect ticker list changes → invalidate batch → fresh fetch
//
// EDGE CASES HANDLED:
// - Browser crash / storage cleared → Fresh batch on next mount
// - Partial cache (some stocks missing) → Batch refresh for consistency
// - Long chat session expiry → Individual fetch only for queried stock
// - Deduplication → TanStack Query handles in-flight request dedup

export interface AICacheEntry {
  data: any;
  timestamp: number;
  requestHash: string;
  dataType: AIDataType;
}

// Metadata-only batch cache entry (stores which tickers were fetched, not the data)
export interface AIBatchCacheMetadata {
  tickers: string[];
  timestamp: number;
  dataType: AIDataType;
}

export type AIDataType = 
  | 'company_profile'      // Very static - cache for 7 days
  | 'sec_filing'           // Static - cache for 24 hours
  | 'filing_list'          // Semi-static - cache for 1 day
  | 'sentiment'            // Dynamic - cache for 1 hour
  | 'news'                 // Dynamic - cache for 1 hour
  | 'news_detail';         // Dynamic - cache for 1 hour

// Batch metadata types (metadata only - real data at individual level)
export type AIBatchDataType = 'batch_news' | 'batch_filings' | 'batch_sentiment';

// Cache TTL (time-to-live) in milliseconds for different data types
const CACHE_TTL: Record<AIDataType, number> = {
  company_profile: 7 * 24 * 60 * 60 * 1000,  // 7 days - company info rarely changes
  sec_filing: 24 * 60 * 60 * 1000,           // 24 hours - filings are historical
  filing_list: 24 * 60 * 60 * 1000,          // 1 day - list can have new filings
  sentiment: 60 * 60 * 1000,                 // 1 hour - sentiment changes with market
  news: 60 * 60 * 1000,                      // 1 hour - news updated frequently
  news_detail: 60 * 60 * 1000,               // 1 hour - detailed analysis
};

// Batch metadata TTL (same as individual data TTL)
const BATCH_CACHE_TTL: Record<AIBatchDataType, number> = {
  batch_news: 60 * 60 * 1000,                // 1 hour
  batch_filings: 24 * 60 * 60 * 1000,        // 1 day  
  batch_sentiment: 60 * 60 * 1000,           // 1 hour
};

// Map batch type to individual data type
const BATCH_TO_INDIVIDUAL_TYPE: Record<AIBatchDataType, AIDataType> = {
  batch_news: 'news',
  batch_filings: 'filing_list',
  batch_sentiment: 'sentiment',
};

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AICacheError extends Error {
  constructor(
    message: string,
    public readonly code: 'STORAGE_FULL' | 'PARSE_ERROR' | 'STORAGE_UNAVAILABLE' | 'QUOTA_ERROR',
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AICacheError';
  }
}

// ============================================================================
// STORAGE HEALTH CHECK
// ============================================================================

/**
 * Check if localStorage is available and working
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get remaining storage space (approximate)
 */
export function getStorageUsage(): { used: number; available: boolean } {
  if (!isStorageAvailable()) {
    return { used: 0, available: false };
  }
  
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += (localStorage.getItem(key)?.length || 0) * 2; // UTF-16
      }
    }
    return { used: total, available: true };
  } catch {
    return { used: 0, available: false };
  }
}

/**
 * Generate a consistent hash for AI requests to use as cache key
 */
export function generateRequestHash(
  dataType: AIDataType,
  ticker: string,
  additionalParams?: Record<string, any>
): string {
  const params = additionalParams ? JSON.stringify(additionalParams) : '';
  return `ai_${dataType}_${ticker.toUpperCase()}_${params}`;
}

/**
 * Save AI response to cache with metadata
 */
export function saveAICache(
  dataType: AIDataType,
  ticker: string,
  data: any,
  additionalParams?: Record<string, any>
): void {
  if (typeof window === 'undefined') return;
  
  const requestHash = generateRequestHash(dataType, ticker, additionalParams);
  const cacheEntry: AICacheEntry = {
    data,
    timestamp: Date.now(),
    requestHash,
    dataType,
  };
  
  try {
    localStorage.setItem(requestHash, JSON.stringify(cacheEntry));
    console.log(`✅ Cached ${dataType} for ${ticker} (TTL: ${formatTTL(CACHE_TTL[dataType])})`);
  } catch (error) {
    console.error('Failed to save AI cache:', error);
    // If storage is full, try to clear old entries
    clearExpiredCache();
  }
}

/**
 * Load AI response from cache if still valid
 */
export function loadAICache<T = any>(
  dataType: AIDataType,
  ticker: string,
  additionalParams?: Record<string, any>
): T | null {
  if (typeof window === 'undefined') return null;
  
  const requestHash = generateRequestHash(dataType, ticker, additionalParams);
  
  try {
    const cached = localStorage.getItem(requestHash);
    if (!cached) return null;
    
    const cacheEntry = JSON.parse(cached) as AICacheEntry;
    const age = Date.now() - cacheEntry.timestamp;
    const ttl = CACHE_TTL[dataType];
    
    // Check if cache is still valid
    if (age > ttl) {
      console.log(`🕐 Cache expired for ${dataType} ${ticker} (age: ${formatAge(age)})`);
      localStorage.removeItem(requestHash);
      return null;
    }
    
    console.log(`♻️ Using cached ${dataType} for ${ticker} (age: ${formatAge(age)})`);
    return cacheEntry.data as T;
  } catch (error) {
    console.error('Failed to load AI cache:', error);
    return null;
  }
}

/**
 * Get cache age for a specific request
 */
export function getAICacheAge(
  dataType: AIDataType,
  ticker: string,
  additionalParams?: Record<string, any>
): number {
  if (typeof window === 'undefined') return 0;
  
  const requestHash = generateRequestHash(dataType, ticker, additionalParams);
  
  try {
    const cached = localStorage.getItem(requestHash);
    if (!cached) return 0;
    
    const cacheEntry = JSON.parse(cached) as AICacheEntry;
    return Date.now() - cacheEntry.timestamp;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if cache exists and is valid for a request
 */
export function hasValidCache(
  dataType: AIDataType,
  ticker: string,
  additionalParams?: Record<string, any>
): boolean {
  const cached = loadAICache(dataType, ticker, additionalParams);
  return cached !== null;
}

/**
 * Clear cache for a specific ticker and data type
 */
export function clearAICache(
  dataType?: AIDataType,
  ticker?: string
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('ai_')) continue;
      
      if (dataType && ticker) {
        // Clear specific cache entry
        const targetHash = generateRequestHash(dataType, ticker);
        if (key.startsWith(targetHash)) {
          keysToRemove.push(key);
        }
      } else if (dataType) {
        // Clear all entries of this type
        if (key.includes(`_${dataType}_`)) {
          keysToRemove.push(key);
        }
      } else if (ticker) {
        // Clear all entries for this ticker
        if (key.includes(`_${ticker.toUpperCase()}_`)) {
          keysToRemove.push(key);
        }
      } else {
        // Clear all AI cache
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared ${keysToRemove.length} AI cache entries`);
  } catch (error) {
    console.error('Failed to clear AI cache:', error);
  }
}

/**
 * Clear expired cache entries across all data types
 */
export function clearExpiredCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    let cleared = 0;
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('ai_')) continue;
      
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;
        
        const cacheEntry = JSON.parse(cached) as AICacheEntry;
        const age = Date.now() - cacheEntry.timestamp;
        const ttl = CACHE_TTL[cacheEntry.dataType];
        
        if (age > ttl) {
          localStorage.removeItem(key);
          cleared++;
        }
      } catch (e) {
        // Invalid entry, remove it
        localStorage.removeItem(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired AI cache entries`);
    }
  } catch (error) {
    console.error('Failed to clear expired cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getAICacheStats(): {
  totalEntries: number;
  byType: Record<string, number>;
  totalSize: number;
  oldestEntry: number;
} {
  if (typeof window === 'undefined') {
    return { totalEntries: 0, byType: {}, totalSize: 0, oldestEntry: 0 };
  }
  
  const stats = {
    totalEntries: 0,
    byType: {} as Record<string, number>,
    totalSize: 0,
    oldestEntry: Date.now(),
  };
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('ai_')) continue;
      
      const cached = localStorage.getItem(key);
      if (!cached) continue;
      
      stats.totalEntries++;
      stats.totalSize += cached.length;
      
      try {
        const cacheEntry = JSON.parse(cached) as AICacheEntry;
        stats.byType[cacheEntry.dataType] = (stats.byType[cacheEntry.dataType] || 0) + 1;
        
        if (cacheEntry.timestamp < stats.oldestEntry) {
          stats.oldestEntry = cacheEntry.timestamp;
        }
      } catch (e) {
        // Invalid entry
      }
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error);
  }
  
  return stats;
}

/**
 * Format cache age for display
 */
function formatAge(ageMs: number): string {
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);
  
  if (ageDays > 0) return `${ageDays}d ${ageHours % 24}h`;
  if (ageHours > 0) return `${ageHours}h ${ageMinutes % 60}m`;
  if (ageMinutes > 0) return `${ageMinutes}m`;
  return 'just now';
}

/**
 * Format TTL for display
 */
function formatTTL(ttlMs: number): string {
  const minutes = Math.floor(ttlMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} days`;
  if (hours > 0) return `${hours} hours`;
  return `${minutes} minutes`;
}

// ============================================================================
// BATCH CACHE UTILITIES
// Batch cache stores metadata only; real data is at individual stock level
// ============================================================================

/**
 * Generate cache key for batch metadata
 */
function generateBatchCacheKey(batchType: AIBatchDataType, tickers: string[]): string {
  const sortedTickers = [...tickers].sort().join(',');
  return `ai_batch_${batchType}_${sortedTickers}`;
}

/**
 * Save batch metadata (tickers + timestamp, NOT the actual data)
 */
export function saveBatchMetadata(
  batchType: AIBatchDataType,
  tickers: string[]
): void {
  if (typeof window === 'undefined') return;
  
  const key = generateBatchCacheKey(batchType, tickers);
  const metadata: AIBatchCacheMetadata = {
    tickers: [...tickers].sort(),
    timestamp: Date.now(),
    dataType: BATCH_TO_INDIVIDUAL_TYPE[batchType],
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(metadata));
    console.log(`✅ Saved batch metadata for ${batchType} (${tickers.length} tickers)`);
  } catch (error) {
    console.error('Failed to save batch metadata:', error);
  }
}

/**
 * Check if batch cache is still valid
 */
export function isBatchCacheValid(
  batchType: AIBatchDataType,
  tickers: string[]
): boolean {
  if (typeof window === 'undefined') return false;
  
  const key = generateBatchCacheKey(batchType, tickers);
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return false;
    
    const metadata = JSON.parse(cached) as AIBatchCacheMetadata;
    const age = Date.now() - metadata.timestamp;
    const ttl = BATCH_CACHE_TTL[batchType];
    
    if (age > ttl) {
      console.log(`🕐 Batch cache expired for ${batchType}`);
      return false;
    }
    
    // Check if all tickers match
    const cachedTickers = metadata.tickers.sort().join(',');
    const requestedTickers = [...tickers].sort().join(',');
    
    if (cachedTickers !== requestedTickers) {
      console.log(`📝 Ticker mismatch - batch needs refresh`);
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse batch response and store individual stock caches
 * This is the key function that bridges batch→individual caching
 */
export function parseBatchAndCacheIndividual<T extends { ticker?: string }>(
  batchType: AIBatchDataType,
  items: T[],
  tickers: string[]
): Map<string, T | T[]> {
  if (typeof window === 'undefined') return new Map();
  
  const individualType = BATCH_TO_INDIVIDUAL_TYPE[batchType];
  const stockDataMap = new Map<string, T | T[]>();
  
  // Group items by ticker
  const itemsByTicker = new Map<string, T[]>();
  for (const item of items) {
    const ticker = item.ticker?.toUpperCase();
    if (!ticker) continue;
    
    if (!itemsByTicker.has(ticker)) {
      itemsByTicker.set(ticker, []);
    }
    itemsByTicker.get(ticker)!.push(item);
  }
  
  // Save each ticker's data to individual cache
  for (const ticker of tickers) {
    const tickerUpper = ticker.toUpperCase();
    const tickerItems = itemsByTicker.get(tickerUpper) || [];
    
    // For sentiment, we expect one item per ticker
    // For news/filings, we expect multiple items per ticker
    if (batchType === 'batch_sentiment') {
      const data = tickerItems[0] || null;
      if (data) {
        saveAICache(individualType, tickerUpper, data);
        stockDataMap.set(tickerUpper, data);
      }
    } else {
      // News/filings: store array of items
      saveAICache(individualType, tickerUpper, tickerItems);
      stockDataMap.set(tickerUpper, tickerItems);
    }
  }
  
  // Save batch metadata
  saveBatchMetadata(batchType, tickers);
  
  console.log(`✅ Parsed batch and cached ${stockDataMap.size} individual stocks for ${batchType}`);
  
  return stockDataMap;
}

/**
 * Load individual stock data from cache (set during batch or individual query)
 */
export function loadIndividualCache<T = any>(
  batchType: AIBatchDataType,
  ticker: string
): T | null {
  const individualType = BATCH_TO_INDIVIDUAL_TYPE[batchType];
  return loadAICache<T>(individualType, ticker.toUpperCase());
}

/**
 * Load all cached data for a list of tickers
 * Returns: { cached: Map<ticker, data>, missing: string[] }
 */
export function loadCachedStocks<T = any>(
  batchType: AIBatchDataType,
  tickers: string[]
): { cached: Map<string, T>; missing: string[] } {
  const individualType = BATCH_TO_INDIVIDUAL_TYPE[batchType];
  const cached = new Map<string, T>();
  const missing: string[] = [];
  
  for (const ticker of tickers) {
    const data = loadAICache<T>(individualType, ticker.toUpperCase());
    if (data) {
      cached.set(ticker.toUpperCase(), data);
    } else {
      missing.push(ticker);
    }
  }
  
  return { cached, missing };
}

/**
 * Check which stocks need refresh based on batch expiry
 * On remount: if batch expired, all stocks need refresh (even if individually cached)
 */
export function getStocksNeedingRefresh(
  batchType: AIBatchDataType,
  tickers: string[]
): { needsBatchRefresh: boolean; tickersToRefresh: string[] } {
  // If batch cache expired, refresh all
  if (!isBatchCacheValid(batchType, tickers)) {
    return { needsBatchRefresh: true, tickersToRefresh: tickers };
  }
  
  // Batch is valid, check individual caches for any gaps
  const { missing } = loadCachedStocks(batchType, tickers);
  
  return { needsBatchRefresh: false, tickersToRefresh: missing };
}

/**
 * Get TTL for cache types (exposed for TanStack Query staleTime)
 */
export function getCacheTTL(dataType: AIDataType): number {
  return CACHE_TTL[dataType];
}

/**
 * Get TTL for batch cache types
 */
export function getBatchCacheTTL(batchType: AIBatchDataType): number {
  return BATCH_CACHE_TTL[batchType];
}

// ============================================================================
// PORTFOLIO CHANGE DETECTION
// Detect when portfolio composition changes and invalidate batch caches
// ============================================================================

const LAST_PORTFOLIO_KEY = 'ai_last_portfolio_tickers';

/**
 * Check if portfolio has changed since last batch fetch
 * Returns: { changed: boolean, added: string[], removed: string[] }
 */
export function detectPortfolioChange(
  currentTickers: string[]
): { changed: boolean; added: string[]; removed: string[]; previousTickers: string[] } {
  if (typeof window === 'undefined') {
    return { changed: false, added: [], removed: [], previousTickers: [] };
  }
  
  try {
    const stored = localStorage.getItem(LAST_PORTFOLIO_KEY);
    const previousTickers = stored ? JSON.parse(stored) as string[] : [];
    
    const currentSet = new Set(currentTickers.map(t => t.toUpperCase()));
    const previousSet = new Set(previousTickers.map(t => t.toUpperCase()));
    
    const added = currentTickers.filter(t => !previousSet.has(t.toUpperCase()));
    const removed = previousTickers.filter(t => !currentSet.has(t.toUpperCase()));
    
    const changed = added.length > 0 || removed.length > 0;
    
    if (changed) {
      console.log(`📊 Portfolio changed: +${added.length} added, -${removed.length} removed`);
    }
    
    return { changed, added, removed, previousTickers };
  } catch {
    return { changed: true, added: currentTickers, removed: [], previousTickers: [] };
  }
}

/**
 * Save current portfolio tickers for future change detection
 */
export function savePortfolioTickers(tickers: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LAST_PORTFOLIO_KEY, JSON.stringify(tickers.map(t => t.toUpperCase())));
  } catch (error) {
    console.error('Failed to save portfolio tickers:', error);
  }
}

/**
 * Invalidate all batch caches (for portfolio changes)
 * Clears batch metadata so next mount triggers fresh fetch
 */
export function invalidateAllBatchCaches(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ai_batch_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Invalidated ${keysToRemove.length} batch caches for portfolio change`);
  } catch (error) {
    console.error('Failed to invalidate batch caches:', error);
  }
}

/**
 * Clear caches for removed tickers only (optimization for portfolio changes)
 */
export function clearRemovedTickerCaches(removedTickers: string[]): void {
  if (typeof window === 'undefined' || removedTickers.length === 0) return;
  
  try {
    let cleared = 0;
    
    for (const ticker of removedTickers) {
      const tickerUpper = ticker.toUpperCase();
      
      // Clear all cache types for this ticker
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.includes(`_${tickerUpper}_`)) {
          localStorage.removeItem(key);
          cleared++;
        }
      }
    }
    
    if (cleared > 0) {
      console.log(`🗑️ Cleared ${cleared} cache entries for ${removedTickers.length} removed tickers`);
    }
  } catch (error) {
    console.error('Failed to clear removed ticker caches:', error);
  }
}

// ============================================================================
// CACHE HEALTH & RECOVERY
// ============================================================================

/**
 * Validate cache integrity - check for corrupted entries
 */
export function validateCacheIntegrity(): { valid: boolean; corrupted: number } {
  if (typeof window === 'undefined') {
    return { valid: true, corrupted: 0 };
  }
  
  let corrupted = 0;
  
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith('ai_')) continue;
      
      try {
        const value = localStorage.getItem(key);
        if (value) {
          JSON.parse(value); // Validate JSON
        }
      } catch {
        // Corrupted entry
        localStorage.removeItem(key);
        corrupted++;
      }
    }
  } catch {
    return { valid: false, corrupted: -1 };
  }
  
  if (corrupted > 0) {
    console.log(`🔧 Removed ${corrupted} corrupted cache entries`);
  }
  
  return { valid: corrupted === 0, corrupted };
}

/**
 * Full cache recovery - clear everything and start fresh
 */
export function recoverCache(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🔄 Performing full cache recovery...');
  clearAICache(); // Clear all AI cache
  validateCacheIntegrity(); // Clean up any corrupted entries
}

/**
 * Check if cache is in a healthy state
 */
export function isCacheHealthy(): boolean {
  if (!isStorageAvailable()) return false;
  
  const { corrupted } = validateCacheIntegrity();
  return corrupted === 0;
}

// ============================================================================
// CACHE TIMING UTILITIES
// ============================================================================

/**
 * Get time until cache expires for a specific entry
 */
export function getTimeUntilExpiry(
  dataType: AIDataType,
  ticker: string
): number {
  if (typeof window === 'undefined') return 0;
  
  const age = getAICacheAge(dataType, ticker);
  if (age === 0) return 0; // No cache
  
  const ttl = CACHE_TTL[dataType];
  const remaining = ttl - age;
  
  return Math.max(0, remaining);
}

/**
 * Check if cache will expire within a given time window
 */
export function willExpireSoon(
  dataType: AIDataType,
  ticker: string,
  withinMs: number = 5 * 60 * 1000 // Default: 5 minutes
): boolean {
  const remaining = getTimeUntilExpiry(dataType, ticker);
  return remaining > 0 && remaining < withinMs;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize: clear expired cache and validate on module load
if (typeof window !== 'undefined') {
  clearExpiredCache();
  validateCacheIntegrity();
}
