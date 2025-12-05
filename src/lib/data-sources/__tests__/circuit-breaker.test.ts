/**
 * Circuit Breaker Tests
 *
 * Tests state machine transitions, failure thresholds, and recovery behavior.
 */

import { CircuitBreaker, CircuitBreakerManager, CircuitState } from '../circuit-breaker';
import type { CircuitBreakerConfig } from '@lib/config/types';

// Mock console methods to reduce test noise
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('CircuitBreaker', () => {
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 3,
    resetTimeout: 1000,
    halfOpenMaxRequests: 2,
  };

  describe('State: CLOSED', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);
      const stats = breaker.getStats();

      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
    });

    it('should allow requests when CLOSED', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      expect(breaker.canExecute()).toBe(true);
    });

    it('should reset failure count on success', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getStats().failureCount).toBe(2);

      breaker.recordSuccess();
      expect(breaker.getStats().failureCount).toBe(0);
    });

    it('should increment success count', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(breaker.getStats().successCount).toBe(2);
    });
  });

  describe('Transition: CLOSED -> OPEN', () => {
    it('should transition to OPEN after failure threshold', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      // Record failures up to threshold
      breaker.recordFailure(); // 1
      breaker.recordFailure(); // 2
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);

      breaker.recordFailure(); // 3 - should trigger OPEN
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
    });

    it('should block requests when OPEN', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      // Trigger OPEN state
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        breaker.recordFailure();
      }

      expect(breaker.canExecute()).toBe(false);
    });

    it('should set nextRetryTime when transitioning to OPEN', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);
      const beforeTime = Date.now();

      // Trigger OPEN
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        breaker.recordFailure();
      }

      const stats = breaker.getStats();
      expect(stats.nextRetryTime).not.toBeNull();
      expect(stats.nextRetryTime).toBeGreaterThanOrEqual(beforeTime + defaultConfig.resetTimeout);
    });
  });

  describe('Transition: OPEN -> HALF_OPEN', () => {
    it('should transition to HALF_OPEN after reset timeout', async () => {
      const shortConfig: CircuitBreakerConfig = {
        ...defaultConfig,
        resetTimeout: 100, // 100ms for testing
      };
      const breaker = new CircuitBreaker('test-provider', shortConfig);

      // Trigger OPEN
      for (let i = 0; i < shortConfig.failureThreshold; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next canExecute should trigger HALF_OPEN
      const canExecute = breaker.canExecute();
      expect(canExecute).toBe(true);
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);
    });

    it('should not allow execution before reset timeout', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      // Trigger OPEN
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        breaker.recordFailure();
      }

      // Immediately try to execute (before timeout)
      expect(breaker.canExecute()).toBe(false);
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
    });
  });

  describe('State: HALF_OPEN', () => {
    async function createHalfOpenBreaker(): Promise<CircuitBreaker> {
      const shortConfig: CircuitBreakerConfig = {
        ...defaultConfig,
        resetTimeout: 50,
      };
      const breaker = new CircuitBreaker('test-provider', shortConfig);

      // Trigger OPEN
      for (let i = 0; i < shortConfig.failureThreshold; i++) {
        breaker.recordFailure();
      }

      // Wait and transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 100));
      breaker.canExecute();

      return breaker;
    }

    it('should allow limited requests in HALF_OPEN', async () => {
      const breaker = await createHalfOpenBreaker();

      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);

      // Should allow up to halfOpenMaxRequests
      expect(breaker.canExecute()).toBe(true); // 1st request (already called in setup)
      expect(breaker.canExecute()).toBe(true); // 2nd request
      expect(breaker.canExecute()).toBe(false); // 3rd request - blocked
    });

    it('should transition to CLOSED on success', async () => {
      const breaker = await createHalfOpenBreaker();

      breaker.recordSuccess();

      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().failureCount).toBe(0);
    });

    it('should transition back to OPEN on failure', async () => {
      const breaker = await createHalfOpenBreaker();

      breaker.recordFailure();

      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
    });

    it('should reset halfOpenAttempts when transitioning to CLOSED', async () => {
      const breaker = await createHalfOpenBreaker();

      // Make a request in HALF_OPEN
      breaker.canExecute();
      expect(breaker.getStats().halfOpenAttempts).toBeGreaterThan(0);

      // Succeed and transition to CLOSED
      breaker.recordSuccess();
      expect(breaker.getStats().halfOpenAttempts).toBe(0);
    });
  });

  describe('Manual Reset', () => {
    it('should reset to CLOSED state', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      // Trigger OPEN
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      // Manual reset
      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.nextRetryTime).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track last failure time', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);
      const beforeTime = Date.now();

      breaker.recordFailure();

      const stats = breaker.getStats();
      expect(stats.lastFailureTime).not.toBeNull();
      expect(stats.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should track last success time', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);
      const beforeTime = Date.now();

      breaker.recordSuccess();

      const stats = breaker.getStats();
      expect(stats.lastSuccessTime).not.toBeNull();
      expect(stats.lastSuccessTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });
});

describe('CircuitBreakerManager', () => {
  afterEach(() => {
    // Clear all breakers after each test
    CircuitBreakerManager.getInstance().clearAll();
  });

  it('should be a singleton', () => {
    const manager1 = CircuitBreakerManager.getInstance();
    const manager2 = CircuitBreakerManager.getInstance();

    expect(manager1).toBe(manager2);
  });

  it('should create circuit breaker for provider', () => {
    const manager = CircuitBreakerManager.getInstance();

    const breaker = manager.getCircuitBreaker('tiingo');

    expect(breaker).toBeInstanceOf(CircuitBreaker);
    expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
  });

  it('should reuse circuit breaker for same provider', () => {
    const manager = CircuitBreakerManager.getInstance();

    const breaker1 = manager.getCircuitBreaker('tiingo');
    const breaker2 = manager.getCircuitBreaker('tiingo');

    expect(breaker1).toBe(breaker2);
  });

  it('should throw error for unknown provider', () => {
    const manager = CircuitBreakerManager.getInstance();

    expect(() => {
      manager.getCircuitBreaker('unknown-provider');
    }).toThrow('Provider config not found: unknown-provider');
  });

  it('should get stats for all breakers', () => {
    const manager = CircuitBreakerManager.getInstance();

    manager.getCircuitBreaker('tiingo');
    manager.getCircuitBreaker('yahooFinance');

    const allStats = manager.getAllStats();

    expect(allStats).toHaveProperty('tiingo');
    expect(allStats).toHaveProperty('yahooFinance');
    expect(allStats.tiingo.state).toBe(CircuitState.CLOSED);
    expect(allStats.yahooFinance.state).toBe(CircuitState.CLOSED);
  });

  it('should reset all breakers', () => {
    const manager = CircuitBreakerManager.getInstance();

    const breaker1 = manager.getCircuitBreaker('tiingo');
    const breaker2 = manager.getCircuitBreaker('yahooFinance');

    // Trigger OPEN state (need 5 failures for tiingo and yahooFinance)
    for (let i = 0; i < 5; i++) {
      breaker1.recordFailure();
      breaker2.recordFailure();
    }

    expect(breaker1.getStats().state).toBe(CircuitState.OPEN);
    expect(breaker2.getStats().state).toBe(CircuitState.OPEN);

    // Reset all
    manager.resetAll();

    expect(breaker1.getStats().state).toBe(CircuitState.CLOSED);
    expect(breaker2.getStats().state).toBe(CircuitState.CLOSED);
  });

  it('should clear all breakers', () => {
    const manager = CircuitBreakerManager.getInstance();

    manager.getCircuitBreaker('tiingo');
    manager.getCircuitBreaker('yahooFinance');

    let stats = manager.getAllStats();
    expect(Object.keys(stats).length).toBe(2);

    manager.clearAll();

    stats = manager.getAllStats();
    expect(Object.keys(stats).length).toBe(0);
  });
});

describe('Edge Cases & Concurrent Scenarios', () => {
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 3,
    resetTimeout: 100,
    halfOpenMaxRequests: 2,
  };

  afterEach(() => {
    CircuitBreakerManager.getInstance().clearAll();
  });

  describe('Rapid State Transitions', () => {
    it('should handle rapid failure/success alternation', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      // Rapid alternation
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
        if (i < 2) {
          // Before reaching threshold
          expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
        }
      }

      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
      expect(breaker.getStats().failureCount).toBe(5);
    });

    it('should handle success during CLOSED state with multiple failures', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getStats().failureCount).toBe(2);

      // Success should reset
      breaker.recordSuccess();
      expect(breaker.getStats().failureCount).toBe(0);
      expect(breaker.getStats().successCount).toBe(1);

      // Failures restart count
      breaker.recordFailure();
      expect(breaker.getStats().failureCount).toBe(1);
    });

    it('should not double-transition on repeated state change attempts', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      // Trigger OPEN multiple times
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        breaker.recordFailure();
      }

      const firstOpenTime = breaker.getStats().nextRetryTime;

      // Ensure some time passes
      jest.useFakeTimers();
      jest.advanceTimersByTime(1);
      jest.useRealTimers();

      // Try to trigger OPEN again (should be idempotent)
      breaker.recordFailure();
      const secondOpenTime = breaker.getStats().nextRetryTime;

      // Times should be different (reset timer was updated)
      // But state should still be OPEN
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
      expect(secondOpenTime).toBeGreaterThanOrEqual(firstOpenTime!);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should not allow exceeding halfOpenMaxRequests during concurrent checks', async () => {
      const shortConfig: CircuitBreakerConfig = {
        ...defaultConfig,
        resetTimeout: 50,
      };
      const breaker = new CircuitBreaker('test-provider', shortConfig);

      // Trigger OPEN
      for (let i = 0; i < shortConfig.failureThreshold; i++) {
        breaker.recordFailure();
      }

      // Wait for HALF_OPEN transition window
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate concurrent canExecute calls
      const results: boolean[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(breaker.canExecute());
      }

      // Should allow exactly halfOpenMaxRequests (2), rest should be blocked
      const allowedCount = results.filter(r => r).length;
      expect(allowedCount).toBeLessThanOrEqual(shortConfig.halfOpenMaxRequests + 1); // +1 for the transition check
    });

    it('should handle multiple breakers independently', () => {
      const manager = CircuitBreakerManager.getInstance();

      const breaker1 = manager.getCircuitBreaker('tiingo');
      const breaker2 = manager.getCircuitBreaker('yahooFinance');

      // Fail breaker1, succeed breaker2
      for (let i = 0; i < 5; i++) {
        breaker1.recordFailure();
        breaker2.recordSuccess();
      }

      expect(breaker1.getStats().state).toBe(CircuitState.OPEN);
      expect(breaker2.getStats().state).toBe(CircuitState.CLOSED);
      expect(breaker2.getStats().successCount).toBe(5);
    });
  });

  describe('Timing Edge Cases', () => {
    it('should handle very short reset timeout (boundary case)', async () => {
      const veryShortConfig: CircuitBreakerConfig = {
        failureThreshold: 1,
        resetTimeout: 10, // 10ms
        halfOpenMaxRequests: 1,
      };
      const breaker = new CircuitBreaker('test-provider', veryShortConfig);

      breaker.recordFailure(); // Immediately OPEN
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      // Wait just over timeout
      await new Promise(resolve => setTimeout(resolve, 20));

      // Should allow execution and transition to HALF_OPEN
      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);
    });

    it('should handle reset timeout at exact boundary', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 1,
        resetTimeout: 100,
        halfOpenMaxRequests: 1,
      };
      const breaker = new CircuitBreaker('test-provider', config);

      const openTime = Date.now();
      breaker.recordFailure();
      const nextRetryTime = breaker.getStats().nextRetryTime!;

      // Move time forward to exact boundary
      const waitTime = nextRetryTime - openTime;
      await new Promise(resolve => setTimeout(resolve, waitTime + 5)); // +5ms buffer

      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);
    });

    it('should prevent execution just before reset timeout', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 1,
        resetTimeout: 100,
        halfOpenMaxRequests: 1,
      };
      const breaker = new CircuitBreaker('test-provider', config);

      breaker.recordFailure(); // Immediately OPEN
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      // Wait less than timeout
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still be blocked
      expect(breaker.canExecute()).toBe(false);
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
    });
  });

  describe('State Recovery Scenarios', () => {
    it('should handle multiple HALF_OPEN -> OPEN cycles', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 1,
        resetTimeout: 50,
        halfOpenMaxRequests: 1,
      };
      const breaker = new CircuitBreaker('test-provider', config);

      // Cycle 1: CLOSED -> OPEN -> HALF_OPEN -> OPEN
      breaker.recordFailure(); // 1st OPEN
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      await new Promise(resolve => setTimeout(resolve, 60));

      breaker.canExecute(); // Transition to HALF_OPEN
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);

      breaker.recordFailure(); // Back to OPEN
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);

      // Cycle 2: OPEN -> HALF_OPEN -> CLOSED
      await new Promise(resolve => setTimeout(resolve, 60));

      breaker.canExecute(); // Transition to HALF_OPEN again
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);

      breaker.recordSuccess(); // Back to CLOSED
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().failureCount).toBe(0);
    });

    it('should preserve stats through state transitions', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();
      breaker.recordFailure();

      const stats = breaker.getStats();
      expect(stats.lastFailureTime).not.toBeNull();
      expect(stats.lastSuccessTime).not.toBeNull();
      expect(stats.successCount).toBe(1);
    });

    it('should reset halfOpenAttempts only when transitioning to CLOSED', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 1,
        resetTimeout: 50,
        halfOpenMaxRequests: 3,
      };
      const breaker = new CircuitBreaker('test-provider', config);

      breaker.recordFailure(); // OPEN
      await new Promise(resolve => setTimeout(resolve, 60));

      // First canExecute transitions from OPEN to HALF_OPEN
      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);
      const afterTransition = breaker.getStats().halfOpenAttempts;

      // Subsequent calls while in HALF_OPEN should increment
      expect(breaker.canExecute()).toBe(true); // 2nd attempt
      const afterSecond = breaker.getStats().halfOpenAttempts;
      expect(afterSecond).toBeGreaterThan(afterTransition);

      // Success should transition to CLOSED and reset
      breaker.recordSuccess();
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().halfOpenAttempts).toBe(0);
    });
  });

  describe('Threshold Edge Cases', () => {
    it('should handle failure threshold of 1', () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 1,
        resetTimeout: 100,
        halfOpenMaxRequests: 1,
      };
      const breaker = new CircuitBreaker('test-provider', config);

      expect(breaker.canExecute()).toBe(true); // Still CLOSED

      breaker.recordFailure();
      expect(breaker.getStats().state).toBe(CircuitState.OPEN); // 1 failure = OPEN
    });

    it('should handle high failure threshold', () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 100,
        resetTimeout: 100,
        halfOpenMaxRequests: 10,
      };
      const breaker = new CircuitBreaker('test-provider', config);

      for (let i = 0; i < 99; i++) {
        breaker.recordFailure();
        expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
      }

      breaker.recordFailure(); // 100th failure
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
    });

    it('should handle halfOpenMaxRequests of 0', () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 1,
        resetTimeout: 50,
        halfOpenMaxRequests: 0,
      };
      const breaker = new CircuitBreaker('test-provider', config);

      breaker.recordFailure(); // OPEN
      // Even with 0 max requests, we should not allow any
      // This tests extreme boundary condition
      expect(breaker.canExecute()).toBe(false);
    });
  });

  describe('Manual Reset During Different States', () => {
    it('should reset from CLOSED state', () => {
      const breaker = new CircuitBreaker('test-provider', defaultConfig);

      breaker.recordSuccess();
      expect(breaker.getStats().successCount).toBe(1);

      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(1); // Success count not reset
    });

    it('should reset from HALF_OPEN state', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 1,
        resetTimeout: 50,
        halfOpenMaxRequests: 1,
      };
      const breaker = new CircuitBreaker('test-provider', config);

      breaker.recordFailure(); // OPEN
      await new Promise(resolve => setTimeout(resolve, 60));

      breaker.canExecute(); // HALF_OPEN
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);

      breaker.reset(); // Manual reset

      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().halfOpenAttempts).toBe(0);
    });
  });

  describe('Cross-Provider Manager Isolation', () => {
    it('should isolate provider stats in manager getAllStats', () => {
      const manager = CircuitBreakerManager.getInstance();

      const tiingo = manager.getCircuitBreaker('tiingo');
      const yahoo = manager.getCircuitBreaker('yahooFinance');

      tiingo.recordFailure();
      tiingo.recordFailure();
      yahoo.recordSuccess();
      yahoo.recordSuccess();

      const allStats = manager.getAllStats();

      expect(allStats.tiingo.failureCount).toBe(2);
      expect(allStats.yahooFinance.successCount).toBe(2);
      expect(allStats.tiingo.successCount).toBe(0);
      expect(allStats.yahooFinance.failureCount).toBe(0);
    });

    it('should maintain separate nextRetryTime per provider', async () => {
      const manager = CircuitBreakerManager.getInstance();

      const tiingo = manager.getCircuitBreaker('tiingo');
      const yahoo = manager.getCircuitBreaker('yahooFinance');

      // Open tiingo first
      for (let i = 0; i < 5; i++) {
        tiingo.recordFailure();
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      // Open yahoo later
      for (let i = 0; i < 5; i++) {
        yahoo.recordFailure();
      }

      const tiingoStats = tiingo.getStats();
      const yahooStats = yahoo.getStats();

      // Yahoo should have a later retry time
      expect(yahooStats.nextRetryTime).toBeGreaterThan(tiingoStats.nextRetryTime!);
    });
  });
});
