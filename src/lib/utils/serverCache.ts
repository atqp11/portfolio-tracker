// Simple in-memory cache for server-side development
// Not suitable for production (use Redis or similar for persistence)

const cache: Record<string, { value: any; timestamp: number }> = {};

export function loadFromCache<T>(key: string): T | null {
  return cache[key]?.value ?? null;
}

export function saveToCache<T>(key: string, value: T): void {
  cache[key] = { value, timestamp: Date.now() };
}

export function getCacheAge(key: string): number {
  return cache[key] ? Date.now() - cache[key].timestamp : Infinity;
}
