/**
 * Validation Tests
 */

import { validateConfiguration, isProductionReady } from '../validation';
import { getMissingRequiredKeys } from '../api-keys.config';

describe('Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a fresh copy of env for each test
    jest.resetModules();
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('getMissingRequiredKeys', () => {
    test('detects missing required API keys', () => {
      // Remove required keys
      delete process.env.TIINGO_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const missing = getMissingRequiredKeys();
      expect(missing).toContain('TIINGO_API_KEY (tiingo)');
      expect(missing).toContain('GEMINI_API_KEY (gemini)');
    });

    test('passes with all required keys', () => {
      process.env.TIINGO_API_KEY = 'test-key';
      process.env.GEMINI_API_KEY = 'test-key';

      const missing = getMissingRequiredKeys();
      expect(missing).toHaveLength(0);
    });
  });

  describe('validateConfiguration', () => {
    test('detects production without Redis', () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.KV_REST_API_URL;
      delete process.env.UPSTASH_REDIS_URL;
      process.env.TIINGO_API_KEY = 'test';
      process.env.GEMINI_API_KEY = 'test';

      const result = validateConfiguration();
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Production requires Redis'))).toBe(true);
    });

    test('allows development without Redis', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.KV_REST_API_URL;
      delete process.env.UPSTASH_REDIS_URL;
      process.env.TIINGO_API_KEY = 'test';
      process.env.GEMINI_API_KEY = 'test';

      const result = validateConfiguration();
      // Should not have critical errors in development
      expect(result.errors.some(e => e.includes('Production requires Redis'))).toBe(false);
    });

    test('detects missing required API keys', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.TIINGO_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = validateConfiguration();
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Missing required API keys'))).toBe(true);
    });

    test('warns about both Upstash and Vercel KV configured', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.TIINGO_API_KEY = 'test';
      process.env.GEMINI_API_KEY = 'test';
      process.env.UPSTASH_REDIS_URL = 'redis://test';
      process.env.UPSTASH_REDIS_TOKEN = 'token';
      process.env.KV_REST_API_URL = 'https://test.upstash.io';
      process.env.KV_REST_API_TOKEN = 'token';

      const result = validateConfiguration();
      expect(
        result.warnings.some(w => w.includes('Both Upstash and Vercel KV'))
      ).toBe(true);
    });
  });

  describe('isProductionReady', () => {
    test('returns false in production without Redis', () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.KV_REST_API_URL;
      delete process.env.UPSTASH_REDIS_URL;
      process.env.TIINGO_API_KEY = 'test';
      process.env.GEMINI_API_KEY = 'test';

      expect(isProductionReady()).toBe(false);
    });

    test('returns false with missing required keys', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.KV_REST_API_URL = 'https://test.upstash.io';
      process.env.KV_REST_API_TOKEN = 'token';
      delete process.env.TIINGO_API_KEY;
      delete process.env.GEMINI_API_KEY;

      expect(isProductionReady()).toBe(false);
    });

    test('returns true in development with required keys', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.TIINGO_API_KEY = 'test';
      process.env.GEMINI_API_KEY = 'test';

      const result = isProductionReady();

      // In development, isProductionReady should pass even without Redis
      expect(result).toBe(true);
    });
  });
});
