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
