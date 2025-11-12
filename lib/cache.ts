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

export function loadFromCache(key: string): CacheData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    return JSON.parse(cached) as CacheData;
  } catch (error) {
    console.error('Failed to load from cache:', error);
    return null;
  }
}

export function getCacheAge(timestamp: number): number {
  return Date.now() - timestamp;
}

export function formatCacheAge(timestamp: number): string {
  const ageMs = getCacheAge(timestamp);
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);
  
  if (ageDays > 0) return `${ageDays}d ago`;
  if (ageHours > 0) return `${ageHours}h ago`;
  if (ageMinutes > 0) return `${ageMinutes}m ago`;
  return 'just now';
}

export type ApiErrorType = 'rate_limit' | 'auth' | 'network' | 'server' | 'unknown';

export function classifyApiError(error: any): ApiErrorType {
  const errorMessage = error?.message || error?.toString() || '';
  
  // Check for rate limit errors
  if (
    errorMessage.includes('RATE_LIMIT') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('Too Many Requests') ||
    errorMessage.includes('429')
  ) {
    return 'rate_limit';
  }
  
  // Check for authentication errors
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('invalid api key') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403')
  ) {
    return 'auth';
  }
  
  // Check for network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('timeout')
  ) {
    return 'network';
  }
  
  // Check for server errors
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('server error')
  ) {
    return 'server';
  }
  
  return 'unknown';
}
