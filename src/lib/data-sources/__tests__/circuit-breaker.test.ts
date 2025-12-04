/**
 * Circuit Breaker Tests
 *
 * Tests state machine transitions, failure thresholds, and recovery behavior.
 */

import { CircuitBreaker, CircuitBreakerManager, CircuitState } from '../circuit-breaker';
import type { CircuitBreakerConfig } from '@/lib/config/types';

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
