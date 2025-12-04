/**
 * Data Source Orchestrator Type Definitions
 *
 * Defines interfaces for provider abstraction, fetch options, and result types.
 * All providers must implement DataProvider<T> or BatchDataProvider<T>.
 */

// ============================================================================
// PROVIDER INTERFACES
// ============================================================================

/**
 * Standard data provider interface
 * All DAOs should be wrapped to implement this interface
 *
 * @template T - The data type this provider returns
 */
export interface DataProvider<T> {
  /**
   * Unique provider identifier (matches PROVIDER_CONFIG key)
   */
  readonly name: string;

  /**
   * Fetch data for a single resource
   *
   * @param key - Resource identifier (e.g., stock symbol, company CIK)
   * @param options - Optional fetch parameters
   * @returns Promise resolving to typed data
   * @throws ProviderError on failure
   */
  fetch(key: string, options?: FetchOptions): Promise<T>;

  /**
   * Optional health check (sync or async)
   * Used by circuit breaker to test provider availability
   *
   * @returns Promise or boolean indicating provider health
   */
  healthCheck?(): Promise<boolean> | boolean;
}

/**
 * Batch-capable data provider interface
 * Use when provider supports fetching multiple resources in one request
 *
 * @template T - The data type this provider returns
 */
export interface BatchDataProvider<T> extends DataProvider<T> {
  /**
   * Fetch data for multiple resources in a single request
   *
   * @param keys - Array of resource identifiers
   * @param options - Optional fetch parameters
   * @returns Promise resolving to map of key -> data
   * @throws ProviderError on complete failure
   *
   * @example
   * ```ts
   * const quotes = await provider.batchFetch(['AAPL', 'MSFT', 'GOOGL']);
   * // Returns: { AAPL: {...}, MSFT: {...}, GOOGL: {...} }
   * ```
   */
  batchFetch(keys: string[], options?: FetchOptions): Promise<Record<string, T>>;

  /**
   * Maximum batch size supported by this provider
   * Used by orchestrator to split large requests
   */
  readonly maxBatchSize: number;
}

// ============================================================================
// FETCH OPTIONS
// ============================================================================

/**
 * Options passed to provider fetch methods
 */
export interface FetchOptions {
  /**
   * Request timeout in milliseconds (overrides provider config)
   */
  timeout?: number;

  /**
   * Number of retry attempts (overrides provider config)
   */
  retries?: number;

  /**
   * User tier for TTL selection (free, basic, premium)
   */
  tier?: 'free' | 'basic' | 'premium';

  /**
   * Additional provider-specific parameters
   */
  params?: Record<string, any>;

  /**
   * Skip cache and force fresh fetch
   */
  skipCache?: boolean;

  /**
   * Allow stale cache on provider failure
   */
  allowStale?: boolean;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Standardized result wrapper for all data fetches
 *
 * @template T - The data type
 */
export interface DataResult<T> {
  /**
   * Fetched data (null if all providers failed)
   */
  data: T | null;

  /**
   * Source that provided the data
   */
  source: 'cache' | string; // 'cache' or provider name

  /**
   * Whether data came from cache
   */
  cached: boolean;

  /**
   * Timestamp when data was fetched/cached (milliseconds)
   */
  timestamp: number;

  /**
   * Age of cached data (milliseconds, 0 if fresh)
   */
  age: number;

  /**
   * Errors encountered during fetch (empty if successful)
   */
  errors: ProviderError[];

  /**
   * Metadata about the fetch operation
   */
  metadata: {
    /**
     * Providers attempted (in order)
     */
    providersAttempted: string[];

    /**
     * Total time spent fetching (milliseconds)
     */
    totalDuration: number;

    /**
     * Whether circuit breaker blocked any providers
     */
    circuitBreakerTriggered: boolean;

    /**
     * Whether request deduplication was used
     */
    deduplicated: boolean;
  };
}

/**
 * Batch fetch result
 *
 * @template T - The data type
 */
export interface BatchDataResult<T> {
  /**
   * Successfully fetched data (key -> result)
   */
  results: Record<string, DataResult<T>>;

  /**
   * Failed keys with error details
   */
  errors: Record<string, ProviderError[]>;

  /**
   * Summary statistics
   */
  summary: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
    fresh: number;
    totalDuration: number;
  };
}

// ============================================================================
// MERGE STRATEGY
// ============================================================================

/**
 * Strategy for merging data from multiple providers
 *
 * @template T - The data type to merge
 *
 * @example
 * ```ts
 * const mergeFundamentals: MergeStrategy<CompanyFundamentals> = (results) => {
 *   const merged = { ...results[0].data };
 *   // Priority: Yahoo > AlphaVantage, fill gaps
 *   if (results[1]?.data) {
 *     merged.marketCap = merged.marketCap ?? results[1].data.marketCap;
 *   }
 *   return merged;
 * };
 * ```
 */
export type MergeStrategy<T> = (
  results: Array<DataResult<T>>
) => T | null;

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error codes for provider failures
 */
export enum ProviderErrorCode {
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  AUTHENTICATION = 'AUTHENTICATION',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Base error for all provider failures
 */
export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error when circuit breaker is open
 */
export class CircuitOpenError extends ProviderError {
  constructor(provider: string) {
    super(
      provider,
      ProviderErrorCode.CIRCUIT_OPEN,
      `Circuit breaker is OPEN for provider: ${provider}`
    );
    this.name = 'CircuitOpenError';
  }
}

/**
 * Error when all providers in fallback chain fail
 */
export class AllProvidersFailedError extends Error {
  constructor(
    public readonly errors: ProviderError[]
  ) {
    super(`All providers failed: ${errors.map(e => `${e.provider}:${e.code}`).join(', ')}`);
    this.name = 'AllProvidersFailedError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error when provider times out
 */
export class ProviderTimeoutError extends ProviderError {
  constructor(provider: string, timeoutMs: number) {
    super(
      provider,
      ProviderErrorCode.TIMEOUT,
      `Provider ${provider} timed out after ${timeoutMs}ms`
    );
    this.name = 'ProviderTimeoutError';
  }
}

// ============================================================================
// ORCHESTRATOR OPTIONS
// ============================================================================

/**
 * Options for orchestrator fetch operations
 */
export interface OrchestratorFetchOptions extends FetchOptions {
  /**
   * Provider names to use (in order of priority)
   * If not specified, uses providers from PROVIDER_CONFIG
   */
  providers?: string[];

  /**
   * Cache key prefix (defaults to data type)
   */
  cacheKeyPrefix?: string;

  /**
   * Cache TTL in milliseconds (overrides tier-based TTL)
   */
  cacheTTL?: number;

  /**
   * Enable request deduplication (default: true)
   */
  deduplicate?: boolean;

  /**
   * Context for logging/telemetry
   */
  context?: Record<string, any>;
}

/**
 * Options for merge fetch operations
 */
export interface MergeFetchOptions extends OrchestratorFetchOptions {
  /**
   * Merge strategy function
   */
  mergeStrategy: MergeStrategy<any>;

  /**
   * Minimum number of successful providers required
   * (default: 1)
   */
  minProviders?: number;
}
