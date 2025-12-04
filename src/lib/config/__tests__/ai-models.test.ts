/**
 * AI Models Configuration Tests
 */

import {
  AI_MODEL_CONFIG,
  getAIModelConfig,
  estimateCost,
  getAIProviders,
} from '../ai-models.config';

describe('AI Models Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GROQ_API_KEY = 'test-groq-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('AI_MODEL_CONFIG', () => {
    test('has tier models for all tiers', () => {
      expect(AI_MODEL_CONFIG.tierModels).toHaveProperty('free');
      expect(AI_MODEL_CONFIG.tierModels).toHaveProperty('basic');
      expect(AI_MODEL_CONFIG.tierModels).toHaveProperty('premium');
    });

    test('all tier models have required fields', () => {
      for (const [tier, config] of Object.entries(AI_MODEL_CONFIG.tierModels)) {
        expect(config).toHaveProperty('provider');
        expect(config).toHaveProperty('model');
        expect(config).toHaveProperty('endpoint');
        expect(config).toHaveProperty('maxTokens');
        expect(config).toHaveProperty('temperature');
        expect(config).toHaveProperty('timeout');
        expect(config).toHaveProperty('costPerToken');
        expect(config.costPerToken).toHaveProperty('input');
        expect(config.costPerToken).toHaveProperty('output');
      }
    });

    test('all tier models have fallback configured', () => {
      for (const [tier, config] of Object.entries(AI_MODEL_CONFIG.tierModels)) {
        expect(config).toHaveProperty('fallback');
        expect(config.fallback).toBeDefined();
      }
    });

    test('has task-specific models', () => {
      expect(AI_MODEL_CONFIG.taskModels).toHaveProperty('sentiment');
      expect(AI_MODEL_CONFIG.taskModels).toHaveProperty('summarization');
      expect(AI_MODEL_CONFIG.taskModels).toHaveProperty('complexAnalysis');
    });

    test('task models have reasonable token limits', () => {
      for (const [task, config] of Object.entries(AI_MODEL_CONFIG.taskModels)) {
        expect(config.maxTokens).toBeGreaterThan(0);
        expect(config.maxTokens).toBeLessThanOrEqual(8192);
      }
    });

    test('temperatures are in valid range', () => {
      for (const [tier, config] of Object.entries(AI_MODEL_CONFIG.tierModels)) {
        expect(config.temperature).toBeGreaterThanOrEqual(0);
        expect(config.temperature).toBeLessThanOrEqual(1);
      }

      for (const [task, config] of Object.entries(AI_MODEL_CONFIG.taskModels)) {
        expect(config.temperature).toBeGreaterThanOrEqual(0);
        expect(config.temperature).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getAIModelConfig', () => {
    test('returns tier model for free tier', () => {
      const config = getAIModelConfig('free');

      expect(config.model).toBe('gemini-1.5-flash-8b');
      expect(config.provider).toBe('gemini');
    });

    test('returns tier model for basic tier', () => {
      const config = getAIModelConfig('basic');

      expect(config.model).toBe('gemini-1.5-flash');
      expect(config.provider).toBe('gemini');
    });

    test('returns tier model for premium tier', () => {
      const config = getAIModelConfig('premium');

      expect(config.model).toBe('gemini-1.5-pro');
      expect(config.provider).toBe('gemini');
    });

    test('returns task-specific model when task is specified', () => {
      const config = getAIModelConfig('free', 'sentiment');

      expect(config.model).toBe('llama-3.3-70b-versatile');
      expect(config.provider).toBe('groq');
    });

    test('task override merges with tier config', () => {
      const config = getAIModelConfig('free', 'sentiment');

      // Should have task-specific settings
      expect(config.maxTokens).toBe(512);
      expect(config.temperature).toBe(0.3);
    });
  });

  describe('estimateCost', () => {
    test('calculates cost for free tier', () => {
      const cost = estimateCost(1000, 500, 'free');

      // Free tier: input 0.0001, output 0.0003 per 1K tokens
      // (1000/1000 * 0.0001) + (500/1000 * 0.0003) = 0.00025
      expect(cost).toBeCloseTo(0.00025, 6);
    });

    test('calculates cost for basic tier', () => {
      const cost = estimateCost(2000, 1000, 'basic');

      // Basic tier: input 0.00015, output 0.0006 per 1K tokens
      // (2000/1000 * 0.00015) + (1000/1000 * 0.0006) = 0.0009
      expect(cost).toBeCloseTo(0.0009, 6);
    });

    test('calculates cost for premium tier', () => {
      const cost = estimateCost(4000, 2000, 'premium');

      // Premium tier: input 0.00125, output 0.005 per 1K tokens
      // (4000/1000 * 0.00125) + (2000/1000 * 0.005) = 0.015
      expect(cost).toBeCloseTo(0.015, 6);
    });

    test('calculates cost with task override', () => {
      const cost = estimateCost(1000, 500, 'free', 'sentiment');

      // Sentiment uses Groq: input 0.0004, output 0.0008 per 1K tokens
      // (1000/1000 * 0.0004) + (500/1000 * 0.0008) = 0.0008
      expect(cost).toBeCloseTo(0.0008, 6);
    });

    test('returns zero for zero tokens', () => {
      const cost = estimateCost(0, 0, 'free');

      expect(cost).toBe(0);
    });
  });

  describe('getAIProviders', () => {
    test('returns list of unique providers', () => {
      const providers = getAIProviders();

      expect(providers).toContain('gemini');
      expect(providers).toContain('groq');
    });

    test('returns no duplicates', () => {
      const providers = getAIProviders();
      const uniqueProviders = [...new Set(providers)];

      expect(providers.length).toBe(uniqueProviders.length);
    });
  });
});
