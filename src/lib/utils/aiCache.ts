// AI-specific caching utilities with intelligent TTL management
// Different types of AI data have different cache durations based on how static they are

export interface AICacheEntry {
  data: any;
  timestamp: number;
  requestHash: string;
  dataType: AIDataType;
}

export type AIDataType = 
  | 'company_profile'      // Very static - cache for 7 days
  | 'sec_filing'           // Static - cache for 24 hours
  | 'filing_list'          // Semi-static - cache for 6 hours
  | 'sentiment'            // Dynamic - cache for 1 hour
  | 'sentiment_batch'      // Dynamic - cache for 1 hour (portfolio-level)
  | 'news'                 // Dynamic - cache for 30 minutes
  | 'news_detail';         // Dynamic - cache for 1 hour

// Cache TTL (time-to-live) in milliseconds for different data types
const CACHE_TTL: Record<AIDataType, number> = {
  company_profile: 7 * 24 * 60 * 60 * 1000,  // 7 days - company info rarely changes
  sec_filing: 24 * 60 * 60 * 1000,           // 24 hours - filings are historical
  filing_list: 6 * 60 * 60 * 1000,           // 6 hours - list can have new filings
  sentiment: 60 * 60 * 1000,                 // 1 hour - sentiment changes with market
  sentiment_batch: 60 * 60 * 1000,           // 1 hour - portfolio sentiment
  news: 30 * 60 * 1000,                      // 30 minutes - news is frequently updated
  news_detail: 60 * 60 * 1000,               // 1 hour - detailed analysis
};

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

// Initialize: clear expired cache on module load
if (typeof window !== 'undefined') {
  clearExpiredCache();
}
