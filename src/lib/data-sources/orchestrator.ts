/**
 * Data Source Orchestrator
 *
 * Central hub for all data fetching operations.
 * Handles fallback logic, circuit breaking, caching, and telemetry.
 *
 * Usage:
 * ```ts
 * const orchestrator = DataSourceOrchestrator.getInstance();
 *
 * // Sequential fallback
 * const quote = await orchestrator.fetchWithFallback({
 *   key: 'AAPL',
 *   providers: [tiingoProvider, yahooProvider],
 *   cacheKeyPrefix: 'quote',
 *   tier: 'free',
 * });
 *
 * // Multi-source merge
 * const fundamentals = await orchestrator.fetchWithMerge({
 *   key: 'AAPL',
 *   providers: [yahooProvider, alphaVantageProvider],
 *   mergeStrategy: mergeFundamentals,
 *   cacheKeyPrefix: 'fundamentals',
 * });
 *
 * // Batch optimization
 * const quotes = await orchestrator.batchFetch({
 *   keys: ['AAPL', 'MSFT', 'GOOGL'],
 *   provider: tiingoProvider, // Supports batching
 *   cacheKeyPrefix: 'quote',
 * });
 * ```
 */

import { getCacheAdapter, type CacheAdapter } from '@lib/cache/adapter';
import { getCacheTTL } from '@lib/config/cache-ttl.config';
import { CircuitBreakerManager, CircuitState } from './circuit-breaker';
import { RequestDeduplicationManager } from './deduplication';
import { TelemetryLogger } from './telemetry';
import {
  DataProvider,
  BatchDataProvider,
  DataResult,
  BatchDataResult,
  OrchestratorFetchOptions,
  MergeFetchOptions,
  ProviderError,
  ProviderErrorCode,
  CircuitOpenError,
  AllProvidersFailedError,
  ProviderTimeoutError,
} from './types';

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

export class DataSourceOrchestrator {
  private static instance: DataSourceOrchestrator | null = null;
  private readonly cache: CacheAdapter;
  private readonly circuitBreakerManager: CircuitBreakerManager;
  private readonly deduplicationManager: RequestDeduplicationManager;
  private readonly telemetry: TelemetryLogger;

  private constructor() {
    this.cache = getCacheAdapter();
    this.circuitBreakerManager = CircuitBreakerManager.getInstance();
    this.deduplicationManager = RequestDeduplicationManager.getInstance();
    this.telemetry = TelemetryLogger.getInstance();

    console.log('[DataSourceOrchestrator] Initialized');
  }

  public static getInstance(): DataSourceOrchestrator {
    if (!DataSourceOrchestrator.instance) {
      DataSourceOrchestrator.instance = new DataSourceOrchestrator();
    }
    return DataSourceOrchestrator.instance;
  }

  // ============================================================================
  // SEQUENTIAL FALLBACK
  // ============================================================================

  /**
   * Fetch data with sequential provider fallback
   *
   * Strategy:
   * 1. Check cache
   * 2. Try each provider in order until success
   * 3. Return stale cache if all providers fail (if allowStale)
   *
   * @template T - Data type
   * @param options - Fetch options
   * @returns Data result with metadata
   */
  public async fetchWithFallback<T>(
    options: Omit<OrchestratorFetchOptions, 'providers'> & {
      key: string;
      providers: DataProvider<T>[];
    }
  ): Promise<DataResult<T>> {
    const {
      key,
      providers,
      cacheKeyPrefix = 'data',
      cacheTTL,
      tier = 'free',
      deduplicate = true,
      allowStale = true,
      context = {},
    } = options;

    const startTime = Date.now();
    const cacheKey = `${cacheKeyPrefix}:${key}:v1`;
    const errors: ProviderError[] = [];
    const providersAttempted: string[] = [];
    let circuitBreakerTriggered = false;

    // Wrap in deduplication if enabled
    const fetchFn = async (): Promise<DataResult<T>> => {
      // 1. Check cache
      const cached = await this.cache.get<T>(cacheKey);
      if (cached && !options.skipCache) {
        const age = await this.cache.getAge(cacheKey);
        this.telemetry.logCacheHit(cacheKeyPrefix, key, age);

        return {
          data: cached,
          source: 'cache',
          cached: true,
          timestamp: Date.now() - age,
          age,
          errors: [],
          metadata: {
            providersAttempted: [],
            totalDuration: Date.now() - startTime,
            circuitBreakerTriggered: false,
            deduplicated: false,
          },
        };
      }

      this.telemetry.logCacheMiss(cacheKeyPrefix, key);

      // 2. Try providers in fallback order
      for (const provider of providers) {
        const circuitBreaker = this.circuitBreakerManager.getCircuitBreaker(provider.name);

        // Check circuit breaker
        if (!circuitBreaker.canExecute()) {
          const error = new CircuitOpenError(provider.name);
          errors.push(error);
          providersAttempted.push(provider.name);
          circuitBreakerTriggered = true;
          this.telemetry.logCircuitOpen(provider.name, key);
          continue;
        }

        // Attempt fetch
        try {
          this.telemetry.logProviderAttempt(provider.name, key);
          const data = await this.executeProvider(provider, key, options);

          // Success - record and cache
          circuitBreaker.recordSuccess();
          this.telemetry.logProviderSuccess(provider.name, key, Date.now() - startTime);

          const ttl = cacheTTL ?? getCacheTTL(cacheKeyPrefix as any, tier);
          await this.cache.set(cacheKey, data, ttl);

          providersAttempted.push(provider.name);

          return {
            data,
            source: provider.name,
            cached: false,
            timestamp: Date.now(),
            age: 0,
            errors,
            metadata: {
              providersAttempted,
              totalDuration: Date.now() - startTime,
              circuitBreakerTriggered,
              deduplicated: false,
            },
          };
        } catch (error) {
          // Record failure
          circuitBreaker.recordFailure();
          const providerError = this.classifyError(provider.name, error);
          errors.push(providerError);
          providersAttempted.push(provider.name);
          this.telemetry.logProviderFailure(provider.name, key, providerError.code);
        }
      }

      // 3. All providers failed - try stale cache
      if (allowStale) {
        const staleCache = await this.cache.get<T>(cacheKey, true); // allowExpired = true
        if (staleCache) {
          const age = await this.cache.getAge(cacheKey);
          this.telemetry.logStaleCacheUsed(cacheKeyPrefix, key, age);

          return {
            data: staleCache,
            source: 'cache',
            cached: true,
            timestamp: Date.now() - age,
            age,
            errors,
            metadata: {
              providersAttempted,
              totalDuration: Date.now() - startTime,
              circuitBreakerTriggered,
              deduplicated: false,
            },
          };
        }
      }

      // 4. Complete failure
      this.telemetry.logAllProvidersFailed(key, errors);

      return {
        data: null,
        source: 'cache',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors,
        metadata: {
          providersAttempted,
          totalDuration: Date.now() - startTime,
          circuitBreakerTriggered,
          deduplicated: false,
        },
      };
    };

    // Execute with or without deduplication
    if (deduplicate) {
      const dedupeKey = `${cacheKeyPrefix}:${key}`;
      const { data: result, deduplicated: wasDeduplicated } =
        await this.deduplicationManager.deduplicate(dedupeKey, fetchFn);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          deduplicated: wasDeduplicated,
        },
      };
    } else {
      return fetchFn();
    }
  }

  // ============================================================================
  // MULTI-SOURCE MERGE
  // ============================================================================

  /**
   * Fetch data from multiple providers and merge results
   *
   * Strategy:
   * 1. Check cache
   * 2. Fetch from all providers in parallel
   * 3. Merge successful results using merge strategy
   * 4. Cache merged result
   *
   * @template T - Data type
   * @param options - Merge fetch options
   * @returns Merged data result
   */
  public async fetchWithMerge<T>(
    options: Omit<MergeFetchOptions, 'providers'> & {
      key: string;
      providers: DataProvider<T>[];
    }
  ): Promise<DataResult<T>> {
    const {
      key,
      providers,
      mergeStrategy,
      minProviders = 1,
      cacheKeyPrefix = 'data',
      cacheTTL,
      tier = 'free',
      context = {},
    } = options;

    const startTime = Date.now();
    const cacheKey = `${cacheKeyPrefix}:${key}:v1`;

    // 1. Check cache
    const cached = await this.cache.get<T>(cacheKey);
    if (cached && !options.skipCache) {
      const age = await this.cache.getAge(cacheKey);
      this.telemetry.logCacheHit(cacheKeyPrefix, key, age);

      return {
        data: cached,
        source: 'cache',
        cached: true,
        timestamp: Date.now() - age,
        age,
        errors: [],
        metadata: {
          providersAttempted: [],
          totalDuration: Date.now() - startTime,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };
    }

    // 2. Fetch from all providers in parallel
    const results = await Promise.allSettled(
      providers.map((provider: DataProvider<T>) =>
        this.fetchWithFallback<T>({
          key,
          providers: [provider],
          cacheKeyPrefix,
          skipCache: true, // Already checked cache
          deduplicate: false, // Handled at merge level
          allowStale: false,
          tier,
        })
      )
    );

    // 3. Collect successful results
    const successfulResults: Array<DataResult<T>> = [];
    const errors: ProviderError[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.data !== null) {
        successfulResults.push(result.value);
      } else if (result.status === 'fulfilled') {
        errors.push(...result.value.errors);
      }
    });

    // 4. Check if we have enough successful providers
    if (successfulResults.length < minProviders) {
      this.telemetry.logMergeInsufficientProviders(key, successfulResults.length, minProviders);

      return {
        data: null,
        source: 'cache',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors,
        metadata: {
          providersAttempted: providers.map(p => p.name),
          totalDuration: Date.now() - startTime,
          circuitBreakerTriggered: errors.some(e => e.code === ProviderErrorCode.CIRCUIT_OPEN),
          deduplicated: false,
        },
      };
    }

    // 5. Merge results
    const merged = mergeStrategy(successfulResults);

    if (merged === null) {
      this.telemetry.logMergeFailed(key);

      return {
        data: null,
        source: 'cache',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors,
        metadata: {
          providersAttempted: providers.map(p => p.name),
          totalDuration: Date.now() - startTime,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };
    }

    // 6. Cache merged result
    const ttl = cacheTTL ?? getCacheTTL(cacheKeyPrefix as any, tier);
    await this.cache.set(cacheKey, merged, ttl);

    this.telemetry.logMergeSuccess(key, successfulResults.length);

    return {
      data: merged,
      source: 'merged',
      cached: false,
      timestamp: Date.now(),
      age: 0,
      errors,
      metadata: {
        providersAttempted: providers.map(p => p.name),
        totalDuration: Date.now() - startTime,
        circuitBreakerTriggered: false,
        deduplicated: false,
      },
    };
  }

  // ============================================================================
  // BATCH FETCH
  // ============================================================================

  /**
   * Fetch multiple resources with batch optimization
   *
   * Strategy:
   * 1. Check cache for each key
   * 2. Group uncached keys into batches (respecting maxBatchSize)
   * 3. Fetch batches in parallel
   * 4. Cache results
   *
   * @template T - Data type
   * @param options - Batch fetch options
   * @returns Batch data result
   */
  public async batchFetch<T>(
    options: OrchestratorFetchOptions & {
      keys: string[];
      provider: BatchDataProvider<T>;
    }
  ): Promise<BatchDataResult<T>> {
    const {
      keys,
      provider,
      cacheKeyPrefix = 'data',
      cacheTTL,
      tier = 'free',
    } = options;

    const startTime = Date.now();
    const results: Record<string, DataResult<T>> = {};
    const errors: Record<string, ProviderError[]> = {};
    let cachedCount = 0;
    let freshCount = 0;

    // 1. Check cache for all keys
    const cachePromises = keys.map(async (key) => {
      const cacheKey = `${cacheKeyPrefix}:${key}:v1`;
      const cached = await this.cache.get<T>(cacheKey);

      if (cached && !options.skipCache) {
        const age = await this.cache.getAge(cacheKey);
        this.telemetry.logCacheHit(cacheKeyPrefix, key, age);
        cachedCount++;

        results[key] = {
          data: cached,
          source: 'cache',
          cached: true,
          timestamp: Date.now() - age,
          age,
          errors: [],
          metadata: {
            providersAttempted: [],
            totalDuration: 0,
            circuitBreakerTriggered: false,
            deduplicated: false,
          },
        };

        return { key, cached: true };
      }

      return { key, cached: false };
    });

    const cacheResults = await Promise.all(cachePromises);
    const uncachedKeys = cacheResults
      .filter(r => !r.cached)
      .map(r => r.key);

    if (uncachedKeys.length === 0) {
      // All cached
      return {
        results,
        errors,
        summary: {
          total: keys.length,
          successful: keys.length,
          failed: 0,
          cached: cachedCount,
          fresh: 0,
          totalDuration: Date.now() - startTime,
        },
      };
    }

    // 2. Split into batches
    const batches: string[][] = [];
    for (let i = 0; i < uncachedKeys.length; i += provider.maxBatchSize) {
      batches.push(uncachedKeys.slice(i, i + provider.maxBatchSize));
    }

    this.telemetry.logBatchFetch(provider.name, uncachedKeys.length, batches.length);

    // 3. Fetch all batches in parallel
    const batchPromises = batches.map(async (batchKeys) => {
      try {
        const batchData = await provider.batchFetch(batchKeys, options);

        // Cache each result
        const ttl = cacheTTL ?? getCacheTTL(cacheKeyPrefix as any, tier);
        await Promise.all(
          Object.entries(batchData).map(([key, data]) => {
            const cacheKey = `${cacheKeyPrefix}:${key}:v1`;
            return this.cache.set(cacheKey, data, ttl);
          })
        );

        return { success: true, data: batchData };
      } catch (error) {
        const providerError = this.classifyError(provider.name, error);
        return { success: false, error: providerError, keys: batchKeys };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // 4. Process batch results
    batchResults.forEach((result) => {
      if (result.success && result.data) {
        Object.entries(result.data).forEach(([key, data]) => {
          results[key] = {
            data: data as T,
            source: provider.name,
            cached: false,
            timestamp: Date.now(),
            age: 0,
            errors: [],
            metadata: {
              providersAttempted: [provider.name],
              totalDuration: Date.now() - startTime,
              circuitBreakerTriggered: false,
              deduplicated: false,
            },
          };
          freshCount++;
        });
      } else if (!result.success && result.error && result.keys) {
        result.keys.forEach((key) => {
          errors[key] = [result.error!];
        });
      }
    });

    return {
      results,
      errors,
      summary: {
        total: keys.length,
        successful: Object.keys(results).length,
        failed: Object.keys(errors).length,
        cached: cachedCount,
        fresh: freshCount,
        totalDuration: Date.now() - startTime,
      },
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Execute provider with timeout and error handling
   */
  private async executeProvider<T>(
    provider: DataProvider<T>,
    key: string,
    options: Omit<OrchestratorFetchOptions, 'providers'>
  ): Promise<T> {
    const timeout = options.timeout ?? 10000;

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ProviderTimeoutError(provider.name, timeout));
      }, timeout);

      provider
        .fetch(key, options)
        .then((data) => {
          clearTimeout(timeoutId);
          resolve(data);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Classify error into ProviderErrorCode
   */
  private classifyError(providerName: string, error: unknown): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('timeout')) {
        return new ProviderError(
          providerName,
          ProviderErrorCode.TIMEOUT,
          error.message,
          error
        );
      }

      if (message.includes('rate limit') || message.includes('429')) {
        return new ProviderError(
          providerName,
          ProviderErrorCode.RATE_LIMIT,
          error.message,
          error
        );
      }

      if (message.includes('auth') || message.includes('401') || message.includes('403')) {
        return new ProviderError(
          providerName,
          ProviderErrorCode.AUTHENTICATION,
          error.message,
          error
        );
      }

      if (message.includes('not found') || message.includes('404')) {
        return new ProviderError(
          providerName,
          ProviderErrorCode.NOT_FOUND,
          error.message,
          error
        );
      }

      if (message.includes('network') || message.includes('fetch')) {
        return new ProviderError(
          providerName,
          ProviderErrorCode.NETWORK_ERROR,
          error.message,
          error
        );
      }

      return new ProviderError(
        providerName,
        ProviderErrorCode.UNKNOWN,
        error.message,
        error
      );
    }

    return new ProviderError(
      providerName,
      ProviderErrorCode.UNKNOWN,
      'Unknown error',
      error as Error
    );
  }

  /**
   * Get orchestrator statistics
   */
  public getStats(): {
    circuitBreakers: ReturnType<CircuitBreakerManager['getAllStats']>;
    deduplication: ReturnType<RequestDeduplicationManager['getStats']>;
    telemetry: ReturnType<TelemetryLogger['getStats']>;
  } {
    return {
      circuitBreakers: this.circuitBreakerManager.getAllStats(),
      deduplication: this.deduplicationManager.getStats(),
      telemetry: this.telemetry.getStats(),
    };
  }
}
