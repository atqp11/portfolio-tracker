/**
 * Telemetry Integration Tests
 * 
 * End-to-end tests for the complete telemetry flow
 */

import { TelemetryController } from '../telemetry.controller';
import { TelemetryService } from '../service/telemetry.service';
import { TelemetryRepository } from '../repository/telemetry.repository';
import { mapLogsToStatsDto } from '../mappers/telemetry.mapper';
import { logInference, clearLogs, getAllLogs } from '@lib/telemetry/ai-logger';
import type { TelemetryLogRaw } from '../repository/telemetry.repository';

// Use real implementations for integration tests
describe('Telemetry Integration Tests', () => {
  let controller: TelemetryController;
  let service: TelemetryService;
  let repository: TelemetryRepository;

  beforeEach(() => {
    controller = new TelemetryController();
    service = new TelemetryService();
    repository = new TelemetryRepository();
    clearLogs(); // Clear logs before each test
  });

  afterEach(() => {
    clearLogs(); // Clean up after each test
  });

  describe('End-to-end flow: Controller → Service → Repository → Mapper', () => {
    it('should return correct stats for real logs', async () => {
      // Seed some test logs
      const now = Date.now();
      logInference({
        model: 'gemini-2.0-flash-exp',
        provider: 'gemini',
        taskType: 'chat',
        tokens_in: 100,
        tokens_out: 50,
        latency_ms: 1000,
        confidence: 0.9,
        cost_usd: 0.001,
        escalated: false,
        cache_hit: true,
      });

      logInference({
        model: 'gpt-4',
        provider: 'openai',
        taskType: 'filing_summary',
        tokens_in: 200,
        tokens_out: 100,
        latency_ms: 2000,
        confidence: 0.8,
        cost_usd: 0.002,
        escalated: true,
        cache_hit: false,
      });

      // Wait a bit to ensure timestamps are different
      await new Promise(resolve => setTimeout(resolve, 10));

      // Call controller (which calls service, which calls repository, which uses mapper)
      const result = await controller.getTelemetryStats({ period: '24h' });

      // Verify the complete flow worked
      expect(result.period).toBe('24h');
      expect(result.stats.totalRequests).toBeGreaterThanOrEqual(2);
      expect(result.stats.totalCostUsd).toBeGreaterThan(0);
      expect(result.stats.costByProvider).toHaveProperty('gemini');
      expect(result.stats.costByProvider).toHaveProperty('openai');
      expect(result.stats.requestsByTaskType).toHaveProperty('chat');
      expect(result.stats.requestsByTaskType).toHaveProperty('filing_summary');
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should handle empty logs gracefully', async () => {
      clearLogs();

      const result = await controller.getTelemetryStats({ period: '24h' });

      expect(result.period).toBe('24h');
      expect(result.stats.totalRequests).toBe(0);
      expect(result.stats.totalCostUsd).toBe(0);
      expect(result.stats.cacheHitRate).toBe(0);
      expect(result.stats.escalationRate).toBe(0);
      // Empty logs generate cache hit rate warning (0% < 80%)
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Cache hit rate');
    });

    it('should filter logs by date range correctly', async () => {
      clearLogs();

      // Log an inference now
      logInference({
        model: 'test-model',
        provider: 'gemini',
        taskType: 'chat',
        tokens_in: 100,
        tokens_out: 50,
        latency_ms: 1000,
        confidence: 0.9,
        cost_usd: 0.001,
        escalated: false,
        cache_hit: true,
      });

      // Test with 1h period (should include recent log)
      const result1h = await controller.getTelemetryStats({ period: '1h' });
      expect(result1h.stats.totalRequests).toBeGreaterThanOrEqual(1);

      // Test with 7d period (should also include recent log)
      const result7d = await controller.getTelemetryStats({ period: '7d' });
      expect(result7d.stats.totalRequests).toBeGreaterThanOrEqual(1);
    });

    it('should calculate all metrics correctly', async () => {
      clearLogs();

      // Create logs with known values
      logInference({
        model: 'test-1',
        provider: 'gemini',
        taskType: 'chat',
        tokens_in: 100,
        tokens_out: 50,
        latency_ms: 1000,
        confidence: 0.9,
        cost_usd: 0.001,
        escalated: false,
        cache_hit: true,
      });

      logInference({
        model: 'test-2',
        provider: 'openai',
        taskType: 'filing_summary',
        tokens_in: 200,
        tokens_out: 100,
        latency_ms: 2000,
        confidence: 0.8,
        cost_usd: 0.002,
        escalated: true,
        cache_hit: false,
      });

      logInference({
        model: 'test-3',
        provider: 'groq',
        taskType: 'news_sentiment',
        tokens_in: 150,
        tokens_out: 75,
        latency_ms: 1500,
        confidence: 0.5, // Low confidence
        cost_usd: 0.0015,
        escalated: false,
        cache_hit: true,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await controller.getTelemetryStats({ period: '24h' });

      // Verify calculations
      expect(result.stats.totalRequests).toBe(3);
      expect(result.stats.cacheHitRate).toBeCloseTo(2 / 3, 2); // 2 out of 3
      expect(result.stats.escalationRate).toBeCloseTo(1 / 3, 2); // 1 out of 3
      expect(result.stats.avgLatencyMs).toBeCloseTo(1500, 0); // (1000 + 2000 + 1500) / 3
      expect(result.stats.totalCostUsd).toBeCloseTo(0.0045, 4); // 0.001 + 0.002 + 0.0015
      expect(result.stats.avgCostPerRequest).toBeCloseTo(0.0015, 4); // 0.0045 / 3
      expect(result.stats.avgConfidence).toBeCloseTo(0.733, 2); // (0.9 + 0.8 + 0.5) / 3
      expect(result.stats.lowConfidenceCount).toBe(1); // 1 log with confidence < 0.6

      // Verify cost by provider
      expect(result.stats.costByProvider.gemini).toBeCloseTo(0.001, 4);
      expect(result.stats.costByProvider.openai).toBeCloseTo(0.002, 4);
      expect(result.stats.costByProvider.groq).toBeCloseTo(0.0015, 4);

      // Verify requests by task type
      expect(result.stats.requestsByTaskType.chat).toBe(1);
      expect(result.stats.requestsByTaskType.filing_summary).toBe(1);
      expect(result.stats.requestsByTaskType.news_sentiment).toBe(1);
    });

    it('should generate warnings when thresholds are exceeded', async () => {
      clearLogs();

      // Create logs that will trigger warnings
      // Low cache hit rate (< 80%)
      for (let i = 0; i < 10; i++) {
        logInference({
          model: 'test',
          provider: 'gemini',
          taskType: 'chat',
          tokens_in: 100,
          tokens_out: 50,
          latency_ms: 1000,
          confidence: 0.9,
          cost_usd: 0.001,
          escalated: false,
          cache_hit: i < 6, // 6 cache hits out of 10 = 60%
        });
      }

      // High escalation rate (> 15%)
      for (let i = 0; i < 5; i++) {
        logInference({
          model: 'test',
          provider: 'gemini',
          taskType: 'chat',
          tokens_in: 100,
          tokens_out: 50,
          latency_ms: 1000,
          confidence: 0.9,
          cost_usd: 0.001,
          escalated: true, // 5 escalations out of 15 total = 33% (above 15% threshold)
          cache_hit: i < 5, // All 5 have cache hits, so total is 11/15 = 73% (below 80%)
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await controller.getTelemetryStats({ period: '24h' });

      // Should have warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Cache hit rate'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Escalation rate'))).toBe(true);
    });

    it('should handle all period types correctly', async () => {
      clearLogs();

      logInference({
        model: 'test',
        provider: 'gemini',
        taskType: 'chat',
        tokens_in: 100,
        tokens_out: 50,
        latency_ms: 1000,
        confidence: 0.9,
        cost_usd: 0.001,
        escalated: false,
        cache_hit: true,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const periods: Array<'1h' | '24h' | '7d' | '30d'> = ['1h', '24h', '7d', '30d'];

      for (const period of periods) {
        const result = await controller.getTelemetryStats({ period });
        expect(result.period).toBe(period);
        expect(result.stats.period.start).toBeInstanceOf(Date);
        expect(result.stats.period.end).toBeInstanceOf(Date);
        expect(result.stats.period.end.getTime()).toBeGreaterThanOrEqual(
          result.stats.period.start.getTime()
        );
      }
    });
  });
});

