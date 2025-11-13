// lib/rateLimitTracker.ts
// Track API rate limits to prevent excessive failed requests

interface RateLimitInfo {
  limitReachedAt: number;
  resetTime: number;
  provider: string;
}

const RATE_LIMIT_CACHE_KEY_PREFIX = 'rate_limit_';

// Check if a provider is currently rate limited
export function isRateLimited(provider: string): boolean {
  if (typeof window === 'undefined') return false; // Server-side, check fresh each time
  
  const cacheKey = `${RATE_LIMIT_CACHE_KEY_PREFIX}${provider}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (!cached) return false;
  
  try {
    const info: RateLimitInfo = JSON.parse(cached);
    const now = Date.now();
    
    // Check if we're still within the rate limit period
    if (now < info.resetTime) {
      console.log(`${provider} rate limit active until ${new Date(info.resetTime).toLocaleString()}`);
      return true;
    }
    
    // Rate limit has expired, clear it
    localStorage.removeItem(cacheKey);
    return false;
  } catch (error) {
    console.error('Error parsing rate limit info:', error);
    localStorage.removeItem(cacheKey);
    return false;
  }
}

// Mark a provider as rate limited
export function markRateLimited(provider: string, resetHours: number = 24): void {
  if (typeof window === 'undefined') return;
  
  const now = Date.now();
  const resetTime = now + (resetHours * 60 * 60 * 1000); // Convert hours to ms
  
  const info: RateLimitInfo = {
    limitReachedAt: now,
    resetTime: resetTime,
    provider: provider
  };
  
  const cacheKey = `${RATE_LIMIT_CACHE_KEY_PREFIX}${provider}`;
  localStorage.setItem(cacheKey, JSON.stringify(info));
  
  console.log(`Marked ${provider} as rate limited until ${new Date(resetTime).toLocaleString()}`);
}

// Clear rate limit for a provider (useful for testing or manual reset)
export function clearRateLimit(provider: string): void {
  if (typeof window === 'undefined') return;
  
  const cacheKey = `${RATE_LIMIT_CACHE_KEY_PREFIX}${provider}`;
  localStorage.removeItem(cacheKey);
  console.log(`Cleared rate limit for ${provider}`);
}

// Get time remaining until rate limit reset
export function getRateLimitResetTime(provider: string): Date | null {
  if (typeof window === 'undefined') return null;
  
  const cacheKey = `${RATE_LIMIT_CACHE_KEY_PREFIX}${provider}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (!cached) return null;
  
  try {
    const info: RateLimitInfo = JSON.parse(cached);
    return new Date(info.resetTime);
  } catch (error) {
    return null;
  }
}

// Get all rate limited providers
export function getAllRateLimits(): Record<string, Date> {
  if (typeof window === 'undefined') return {};
  
  const limits: Record<string, Date> = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(RATE_LIMIT_CACHE_KEY_PREFIX)) {
      const provider = key.replace(RATE_LIMIT_CACHE_KEY_PREFIX, '');
      const resetTime = getRateLimitResetTime(provider);
      if (resetTime) {
        limits[provider] = resetTime;
      }
    }
  }
  
  return limits;
}
