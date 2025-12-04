/**
 * Telemetry Logger
 *
 * Centralized logging and metrics for data source operations.
 * Tracks cache hits/misses, provider successes/failures, and performance.
 *
 * Future: Can be extended to emit to observability platforms (Datadog, New Relic, etc.)
 */

import type { ProviderErrorCode } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface TelemetryEvent {
  timestamp: number;
  type: string;
  provider?: string;
  key?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TelemetryStats {
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  staleCacheUsed: number;
  providerAttempts: Record<string, number>;
  providerSuccesses: Record<string, number>;
  providerFailures: Record<string, { [key in ProviderErrorCode]?: number }>;
  circuitOpenEvents: number;
  mergeOperations: number;
  batchOperations: number;
  totalEvents: number;
}

// ============================================================================
// TELEMETRY LOGGER
// ============================================================================

export class TelemetryLogger {
  private static instance: TelemetryLogger | null = null;
  private events: TelemetryEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep last 1000 events in memory
  private stats: TelemetryStats = {
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    staleCacheUsed: 0,
    providerAttempts: {},
    providerSuccesses: {},
    providerFailures: {},
    circuitOpenEvents: 0,
    mergeOperations: 0,
    batchOperations: 0,
    totalEvents: 0,
  };

  private constructor() {}

  public static getInstance(): TelemetryLogger {
    if (!TelemetryLogger.instance) {
      TelemetryLogger.instance = new TelemetryLogger();
    }
    return TelemetryLogger.instance;
  }

  // ============================================================================
  // EVENT LOGGING
  // ============================================================================

  public logCacheHit(prefix: string, key: string, age: number): void {
    this.log({
      type: 'cache_hit',
      key: `${prefix}:${key}`,
      metadata: { age },
    });
    this.stats.cacheHits++;
    this.updateCacheHitRate();
  }

  public logCacheMiss(prefix: string, key: string): void {
    this.log({
      type: 'cache_miss',
      key: `${prefix}:${key}`,
    });
    this.stats.cacheMisses++;
    this.updateCacheHitRate();
  }

  public logStaleCacheUsed(prefix: string, key: string, age: number): void {
    this.log({
      type: 'stale_cache_used',
      key: `${prefix}:${key}`,
      metadata: { age },
    });
    this.stats.staleCacheUsed++;
  }

  public logProviderAttempt(provider: string, key: string): void {
    this.log({
      type: 'provider_attempt',
      provider,
      key,
    });
    this.stats.providerAttempts[provider] = (this.stats.providerAttempts[provider] || 0) + 1;
  }

  public logProviderSuccess(provider: string, key: string, duration: number): void {
    this.log({
      type: 'provider_success',
      provider,
      key,
      duration,
    });
    this.stats.providerSuccesses[provider] = (this.stats.providerSuccesses[provider] || 0) + 1;
  }

  public logProviderFailure(provider: string, key: string, errorCode: ProviderErrorCode): void {
    this.log({
      type: 'provider_failure',
      provider,
      key,
      error: errorCode,
    });

    if (!this.stats.providerFailures[provider]) {
      this.stats.providerFailures[provider] = {};
    }
    const failures = this.stats.providerFailures[provider];
    failures[errorCode] = (failures[errorCode] || 0) + 1;
  }

  public logCircuitOpen(provider: string, key: string): void {
    this.log({
      type: 'circuit_open',
      provider,
      key,
    });
    this.stats.circuitOpenEvents++;
  }

  public logMergeSuccess(key: string, providerCount: number): void {
    this.log({
      type: 'merge_success',
      key,
      metadata: { providerCount },
    });
    this.stats.mergeOperations++;
  }

  public logMergeFailed(key: string): void {
    this.log({
      type: 'merge_failed',
      key,
    });
  }

  public logMergeInsufficientProviders(key: string, actual: number, required: number): void {
    this.log({
      type: 'merge_insufficient_providers',
      key,
      metadata: { actual, required },
    });
  }

  public logBatchFetch(provider: string, keyCount: number, batchCount: number): void {
    this.log({
      type: 'batch_fetch',
      provider,
      metadata: { keyCount, batchCount },
    });
    this.stats.batchOperations++;
  }

  public logAllProvidersFailed(key: string, errors: any[]): void {
    this.log({
      type: 'all_providers_failed',
      key,
      metadata: { errorCount: errors.length },
    });
  }

  // ============================================================================
  // STATS & RETRIEVAL
  // ============================================================================

  public getStats(): TelemetryStats {
    return { ...this.stats };
  }

  public getRecentEvents(count: number = 100): TelemetryEvent[] {
    return this.events.slice(-count);
  }

  public getEventsByType(type: string): TelemetryEvent[] {
    return this.events.filter(e => e.type === type);
  }

  public reset(): void {
    this.events = [];
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      staleCacheUsed: 0,
      providerAttempts: {},
      providerSuccesses: {},
      providerFailures: {},
      circuitOpenEvents: 0,
      mergeOperations: 0,
      batchOperations: 0,
      totalEvents: 0,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private log(event: Omit<TelemetryEvent, 'timestamp'>): void {
    const fullEvent: TelemetryEvent = {
      timestamp: Date.now(),
      ...event,
    };

    this.events.push(fullEvent);
    this.stats.totalEvents++;

    // Keep only last MAX_EVENTS
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Console log (can be replaced with structured logging service)
    console.log(`[Telemetry:${event.type}]`, this.formatEventForConsole(fullEvent));
  }

  private formatEventForConsole(event: TelemetryEvent): string {
    const parts: string[] = [];

    if (event.provider) parts.push(`provider=${event.provider}`);
    if (event.key) parts.push(`key=${event.key}`);
    if (event.duration !== undefined) parts.push(`duration=${event.duration}ms`);
    if (event.error) parts.push(`error=${event.error}`);
    if (event.metadata) parts.push(`metadata=${JSON.stringify(event.metadata)}`);

    return parts.join(' ');
  }

  private updateCacheHitRate(): void {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    this.stats.cacheHitRate = total > 0 ? (this.stats.cacheHits / total) * 100 : 0;
  }
}
