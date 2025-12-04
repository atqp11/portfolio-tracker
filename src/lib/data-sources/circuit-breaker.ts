/**
 * Circuit Breaker Implementation
 *
 * Implements the circuit breaker pattern to prevent cascading failures.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Provider is failing, requests are blocked
 * - HALF_OPEN: Testing if provider has recovered
 *
 * State Transitions:
 * CLOSED --[failure threshold reached]--> OPEN
 * OPEN --[reset timeout elapsed]--> HALF_OPEN
 * HALF_OPEN --[success]--> CLOSED
 * HALF_OPEN --[failure]--> OPEN
 */

import { PROVIDER_CONFIG } from '@lib/config/providers.config';
import type { CircuitBreakerConfig } from '@lib/config/types';

// ============================================================================
// TYPES
// ============================================================================

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextRetryTime: number | null;
  halfOpenAttempts: number;
}

// ============================================================================
// CIRCUIT BREAKER CLASS
// ============================================================================

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextRetryTime: number | null = null;
  private halfOpenAttempts: number = 0;

  constructor(
    private readonly providerName: string,
    private readonly config: CircuitBreakerConfig
  ) {
    console.log(`[CircuitBreaker:${providerName}] Initialized with config:`, config);
  }

  /**
   * Check if request is allowed
   *
   * @returns true if request should proceed, false if blocked
   */
  public canExecute(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if enough time has passed to attempt recovery
        if (this.shouldAttemptReset()) {
          this.transitionToHalfOpen();
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow limited requests in half-open state
        if (this.halfOpenAttempts < this.config.halfOpenMaxRequests) {
          this.halfOpenAttempts++;
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Record successful request
   */
  public recordSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.successCount++;

    switch (this.state) {
      case CircuitState.HALF_OPEN:
        // Reset to closed after successful half-open test
        this.transitionToClosed();
        console.log(`[CircuitBreaker:${this.providerName}] Provider recovered, circuit CLOSED`);
        break;

      case CircuitState.CLOSED:
        // Reset failure count on success
        this.failureCount = 0;
        break;
    }
  }

  /**
   * Record failed request
   */
  public recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    switch (this.state) {
      case CircuitState.CLOSED:
        if (this.failureCount >= this.config.failureThreshold) {
          this.transitionToOpen();
          console.warn(
            `[CircuitBreaker:${this.providerName}] Failure threshold reached (${this.failureCount}/${this.config.failureThreshold}), circuit OPEN`
          );
        }
        break;

      case CircuitState.HALF_OPEN:
        // Failed during recovery, go back to open
        this.transitionToOpen();
        console.warn(
          `[CircuitBreaker:${this.providerName}] Recovery test failed, circuit OPEN again`
        );
        break;
    }
  }

  /**
   * Get current circuit state and statistics
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextRetryTime: this.nextRetryTime,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /**
   * Manually reset circuit (for testing or admin intervention)
   */
  public reset(): void {
    this.transitionToClosed();
    console.log(`[CircuitBreaker:${this.providerName}] Manually reset to CLOSED`);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private shouldAttemptReset(): boolean {
    if (this.nextRetryTime === null) {
      return false;
    }
    return Date.now() >= this.nextRetryTime;
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.nextRetryTime = null;
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextRetryTime = Date.now() + this.config.resetTimeout;
    this.halfOpenAttempts = 0;
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenAttempts = 0;
  }
}

// ============================================================================
// CIRCUIT BREAKER MANAGER
// ============================================================================

/**
 * Manages circuit breakers for all providers
 * Singleton pattern
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager | null = null;
  private breakers = new Map<string, CircuitBreaker>();

  private constructor() {}

  public static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Get or create circuit breaker for a provider
   */
  public getCircuitBreaker(providerName: string): CircuitBreaker {
    if (!this.breakers.has(providerName)) {
      const config = PROVIDER_CONFIG[providerName as keyof typeof PROVIDER_CONFIG];
      if (!config) {
        throw new Error(`Provider config not found: ${providerName}`);
      }
      this.breakers.set(
        providerName,
        new CircuitBreaker(providerName, config.circuitBreaker)
      );
    }
    return this.breakers.get(providerName)!;
  }

  /**
   * Get stats for all circuit breakers
   */
  public getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset all circuit breakers (for testing)
   */
  public resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  /**
   * Clear all circuit breakers (for testing)
   */
  public clearAll(): void {
    this.breakers.clear();
  }
}
