/**
 * This module provides utility functions to track and manage API rate limits.
 * It uses the browser's `localStorage` to persist rate limit information.
 *
 * The functions are designed to work only in a browser environment.
 * Usage Notes:
 * - This module provides utility functions for managing API rate limits using `localStorage`.
 * - Functions include:
 *   - `isRateLimited`: Checks if a provider is currently rate limited.
 *   - `markRateLimited`: Marks a provider as rate limited for a specified duration.
 *   - `clearRateLimit`: Clears the rate limit for a provider.
 *   - `getRateLimitResetTime`: Retrieves the reset time for a provider's rate limit.
 *   - `getAllRateLimits`: Retrieves all currently rate-limited providers and their reset times.
 * - Designed for browser environments; relies on `localStorage`.
 * - No direct imports or dynamic usage found in the workspace, except for a reference in `docs/CLAUDE.md`.
 */

/**
 * Interface representing rate limit information for a provider.
 */
interface RateLimitInfo {
  /** The timestamp when the rate limit was reached. */
  limitReachedAt: number;
  /** The timestamp when the rate limit will reset. */
  resetTime: number;
  /** The name of the provider associated with the rate limit. */
  provider: string;
}

/**
 * Prefix used for rate limit cache keys in `localStorage`.
 */
const RATE_LIMIT_CACHE_KEY_PREFIX = 'rate_limit_';

/**
 * Checks if a provider is currently rate limited.
 *
 * @param {string} provider - The name of the provider to check.
 * @returns {boolean} `true` if the provider is rate limited, otherwise `false`.
 */
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

/**
 * Marks a provider as rate limited for a specified duration.
 *
 * @param {string} provider - The name of the provider to mark as rate limited.
 * @param {number} [resetHours=24] - The duration (in hours) until the rate limit resets.
 */
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

/**
 * Clears the rate limit for a provider.
 *
 * @param {string} provider - The name of the provider to clear the rate limit for.
 */
export function clearRateLimit(provider: string): void {
  if (typeof window === 'undefined') return;

  const cacheKey = `${RATE_LIMIT_CACHE_KEY_PREFIX}${provider}`;
  localStorage.removeItem(cacheKey);
  console.log(`Cleared rate limit for ${provider}`);
}

/**
 * Gets the time remaining until the rate limit resets for a provider.
 *
 * @param {string} provider - The name of the provider to check.
 * @returns {Date | null} The reset time as a `Date` object, or `null` if no rate limit is set.
 */
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

/**
 * Retrieves all currently rate-limited providers and their reset times.
 *
 * @returns {Record<string, Date>} An object mapping provider names to their rate limit reset times.
 */
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