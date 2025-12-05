/**
 * Provider Configuration Tests
 */

import {
  PROVIDER_CONFIG,
  getProvidersByPriority,
  getEnabledProviders,
  getProviderConfig,
  isProviderAvailable,
  PROVIDER_GROUPS,
  getProvidersForDataType,
} from '../providers.config';

describe('Provider Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('PROVIDER_CONFIG', () => {
    test('all providers have required fields', () => {
      for (const [name, config] of Object.entries(PROVIDER_CONFIG)) {
        expect(config.name).toBe(name);
        expect(config).toHaveProperty('enabled');
        expect(config).toHaveProperty('priority');
        expect(config).toHaveProperty('timeout');
        expect(config).toHaveProperty('retryAttempts');
        expect(config).toHaveProperty('retryDelay');
        expect(config).toHaveProperty('circuitBreaker');
        expect(config).toHaveProperty('rateLimit');
      }
    });

    test('circuit breaker thresholds are reasonable', () => {
      for (const [name, config] of Object.entries(PROVIDER_CONFIG)) {
        expect(config.circuitBreaker.failureThreshold).toBeGreaterThan(0);
        expect(config.circuitBreaker.failureThreshold).toBeLessThan(20);
        expect(config.circuitBreaker.resetTimeout).toBeGreaterThan(0);
        expect(config.circuitBreaker.halfOpenMaxRequests).toBeGreaterThan(0);
      }
    });

    test('rate limits are configured', () => {
      for (const [name, config] of Object.entries(PROVIDER_CONFIG)) {
        expect(config.rateLimit.requestsPerMinute).toBeGreaterThan(0);
        expect(config.rateLimit.requestsPerDay).toBeGreaterThan(0);
      }
    });

    test('timeouts are reasonable', () => {
      for (const [name, config] of Object.entries(PROVIDER_CONFIG)) {
        expect(config.timeout).toBeGreaterThan(0);
        expect(config.timeout).toBeLessThanOrEqual(60000); // Max 60 seconds
      }
    });
  });

  describe('getProvidersByPriority', () => {
    test('sorts providers by priority', () => {
      process.env.FEATURE_TIINGO_ENABLED = 'true';

      const providers = getProvidersByPriority(['tiingo', 'yahooFinance']);

      expect(providers.length).toBeGreaterThan(0);
      for (let i = 0; i < providers.length - 1; i++) {
        expect(providers[i].priority).toBeLessThanOrEqual(providers[i + 1].priority);
      }
    });

    test('filters out disabled providers', () => {
      // Save original value
      const originalValue = process.env.FEATURE_TIINGO_ENABLED;

      // Temporarily disable Tiingo
      process.env.FEATURE_TIINGO_ENABLED = 'false';

      // Need to reload the module to pick up the new env var
      jest.resetModules();
      const { getProvidersByPriority } = require('../providers.config');

      const providers = getProvidersByPriority(['tiingo', 'yahooFinance']);
      const names = providers.map(p => p.name);

      expect(names).not.toContain('tiingo');

      // Restore original value
      process.env.FEATURE_TIINGO_ENABLED = originalValue;
      jest.resetModules();
    });
  });

  describe('getEnabledProviders', () => {
    test('returns only enabled providers', () => {
      const providers = getEnabledProviders();

      for (const provider of providers) {
        expect(provider.enabled).toBe(true);
      }
    });
  });

  describe('getProviderConfig', () => {
    test('returns config for enabled provider (yahooFinance is always enabled)', () => {
      const config = getProviderConfig('yahooFinance');

      expect(config).toBeDefined();
      expect(config?.name).toBe('yahooFinance');
    });

    test('returns undefined for disabled provider', () => {
      // Save original value
      const originalValue = process.env.FEATURE_TIINGO_ENABLED;

      // Temporarily disable Tiingo
      process.env.FEATURE_TIINGO_ENABLED = 'false';

      // Need to reload the module to pick up the new env var
      jest.resetModules();
      const { getProviderConfig } = require('../providers.config');

      const config = getProviderConfig('tiingo');

      expect(config).toBeUndefined();

      // Restore original value
      process.env.FEATURE_TIINGO_ENABLED = originalValue;
      jest.resetModules();
    });
  });

  describe('isProviderAvailable', () => {
    test('returns false if provider is disabled', () => {
      // Save original value
      const originalValue = process.env.FEATURE_TIINGO_ENABLED;

      // Temporarily disable Tiingo
      process.env.FEATURE_TIINGO_ENABLED = 'false';

      // Need to reload the module to pick up the new env var
      jest.resetModules();
      const { isProviderAvailable } = require('../providers.config');

      const available = isProviderAvailable('tiingo');

      expect(available).toBe(false);

      // Restore original value
      process.env.FEATURE_TIINGO_ENABLED = originalValue;
      jest.resetModules();
    });

    test('returns true for providers without API key requirement', () => {
      const available = isProviderAvailable('yahooFinance');

      expect(available).toBe(true);
    });

    test('returns true for secEdgar (always enabled, no API key)', () => {
      const available = isProviderAvailable('secEdgar');

      expect(available).toBe(true);
    });
  });

  describe('getProvidersForDataType', () => {
    test('returns quote providers in priority order (yahooFinance always enabled)', () => {
      const providers = getProvidersForDataType('quotes');

      // At least yahooFinance should be available
      expect(providers.length).toBeGreaterThanOrEqual(1);
      // Check sorted by priority
      for (let i = 0; i < providers.length - 1; i++) {
        expect(providers[i].priority).toBeLessThanOrEqual(providers[i + 1].priority);
      }
    });

    test('returns filing providers (secEdgar always enabled)', () => {
      const providers = getProvidersForDataType('filings');

      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0].name).toBe('secEdgar');
    });

    test('commodity providers may be empty if not configured', () => {
      const providers = getProvidersForDataType('commodities');

      // This is OK - we don't require commodity providers to be configured
      expect(Array.isArray(providers)).toBe(true);
    });

    test('news providers may be empty if not configured', () => {
      const providers = getProvidersForDataType('news');

      // This is OK - we don't require news providers to be configured
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('PROVIDER_GROUPS', () => {
    test('has all expected groups', () => {
      expect(PROVIDER_GROUPS).toHaveProperty('quotes');
      expect(PROVIDER_GROUPS).toHaveProperty('commodities');
      expect(PROVIDER_GROUPS).toHaveProperty('news');
      expect(PROVIDER_GROUPS).toHaveProperty('filings');
    });

    test('all group providers exist in PROVIDER_CONFIG', () => {
      for (const [groupName, providers] of Object.entries(PROVIDER_GROUPS)) {
        for (const provider of providers) {
          expect(PROVIDER_CONFIG).toHaveProperty(provider);
        }
      }
    });
  });
});
