// lib/utils/localStorageCache.ts
// General client-side caching utilities using localStorage

export interface CacheData<T = unknown> {
  data: T;
  timestamp: number;
}

export function hasLocalStorage(): boolean {
  try {
    if (typeof localStorage !== 'undefined') return true;
  } catch (e) {
    // ignore
  }
  return typeof (global as { localStorage?: Storage }).localStorage !== 'undefined';
}

export function saveToCache<T>(key: string, data: T): void {
  if (!hasLocalStorage()) return;

  const cacheData: CacheData = {
    data,
    timestamp: Date.now(),
  };

  try {
    const storage = (typeof localStorage !== 'undefined') ? localStorage : (global as { localStorage?: Storage }).localStorage;
    if (!storage) return;
    storage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save to cache:', error);
  }
}

export function loadFromCache<T = unknown>(key: string): T | null {
  if (!hasLocalStorage()) return null;

  try {
    const storage = (typeof localStorage !== 'undefined') ? localStorage : (global as { localStorage?: Storage }).localStorage;
    if (!storage) return null;
    const cached = storage.getItem(key);
    if (!cached) return null;

    const cacheData = JSON.parse(cached) as CacheData<T>;
    return cacheData.data;
  } catch (error) {
    console.error('Failed to load from cache:', error);
    return null;
  }
}

export function getCacheAge(key: string): number {
  if (!hasLocalStorage()) return 0;

  try {
    const storage = (typeof localStorage !== 'undefined') ? localStorage : (global as { localStorage?: Storage }).localStorage;
    if (!storage) return 0;
    const cached = storage.getItem(key);
    if (!cached) return 0;

    const cacheData = JSON.parse(cached) as CacheData<unknown>;
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