// lib/api/shared/cache.ts
import { get, set } from '../../storage';

const TTL = 24 * 60 * 60 * 1000;

export const getCached = async <T>(key: string): Promise<T | null> => {
  const cached = await get<{ data: T; ts: number }>(key);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;
  return null;
};

export const setCached = async <T>(key: string, data: T): Promise<void> => {
  await set(key, { data, ts: Date.now() });
};