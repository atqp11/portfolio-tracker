// lib/utils/localStorageCache.ts
// General client-side caching utilities using localStorage

export interface CacheData {
  data: any;
  timestamp: number;
}

export function hasLocalStorage(): boolean {
  try {
    if (typeof localStorage !== 'undefined') return true;
  } catch (e) {
    // ignore
  }
  return typeof (global as any).localStorage !== 'undefined';
}

export function saveToCache(key: string, data: any): void {
  if (!hasLocalStorage()) return;

  const cacheData: CacheData = {
    data,
    timestamp: Date.now(),
  };

  try {
    const storage = (typeof localStorage !== 'undefined') ? localStorage : (global as any).localStorage;
    storage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save to cache:', error);
  }
}

export function loadFromCache<T = any>(key: string): T | null {
  if (!hasLocalStorage()) return null;

  try {
    const storage = (typeof localStorage !== 'undefined') ? localStorage : (global as any).localStorage;
    const cached = storage.getItem(key);
    if (!cached) return null;

    const cacheData = JSON.parse(cached) as CacheData;
    return cacheData.data as T;
  } catch (error) {
    console.error('Failed to load from cache:', error);
    return null;
  }
}

export function getCacheAge(key: string): number {
  if (!hasLocalStorage()) return 0;

  try {
    const storage = (typeof localStorage !== 'undefined') ? localStorage : (global as any).localStorage;
    const cached = storage.getItem(key);
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