/**
 * Telemetry Mapper Tests
 * 
 * Tests for pure mapper functions (DB → DTO conversion)
 */

import { mapLogsToStatsDto } from '../mappers/telemetry.mapper';
import type { TelemetryLogRaw } from '../repository/telemetry.repository';

describe('Telemetry Mapper', () => {
  const startDate = new Date('2025-01-01T00:00:00Z');
  const endDate = new Date('2025-01-02T00:00:00Z');

  describe('mapLogsToStatsDto', () => {
    it('should return empty stats for empty logs array', () => {
      const result = mapLogsToStatsDto([], startDate, endDate);

      expect(result).toEqual({
        period: { start: startDate, end: endDate },
        totalRequests: 0,
        cacheHitRate: 0,
        escalationRate: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        totalCostUsd: 0,
        avgCostPerRequest: 0,
        costByProvider: {},
        requestsByTaskType: {},
        avgConfidence: 0,
        lowConfidenceCount: 0,
      });
    });

    it('should correctly calculate stats from logs', () => {
      const logs: TelemetryLogRaw[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z'),
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
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z'),
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
        },
        {
          timestamp: new Date('2025-01-01T12:00:00Z'),
          model: 'llama-3.1-70b',
          provider: 'groq',
          taskType: 'news_sentiment',
          tokens_in: 150,
          tokens_out: 75,
          latency_ms: 1500,
          confidence: 0.5, // Low confidence
          cost_usd: 0.0015,
          escalated: false,
          cache_hit: true,
        },
      ];

      const result = mapLogsToStatsDto(logs, startDate, endDate);

      expect(result.totalRequests).toBe(3);
      expect(result.cacheHitRate).toBeCloseTo(2 / 3, 5); // 2 out of 3 cache hits
      expect(result.escalationRate).toBeCloseTo(1 / 3, 5); // 1 out of 3 escalations
      expect(result.avgLatencyMs).toBeCloseTo(1500, 1); // (1000 + 2000 + 1500) / 3
      expect(result.totalCostUsd).toBeCloseTo(0.0045, 5); // 0.001 + 0.002 + 0.0015
      expect(result.avgCostPerRequest).toBeCloseTo(0.0015, 5); // 0.0045 / 3
      expect(result.avgConfidence).toBeCloseTo(0.7333, 3); // (0.9 + 0.8 + 0.5) / 3
      expect(result.lowConfidenceCount).toBe(1); // 1 log with confidence < 0.6

      // Cost by provider
      expect(result.costByProvider.gemini).toBeCloseTo(0.001, 5);
      expect(result.costByProvider.openai).toBeCloseTo(0.002, 5);
      expect(result.costByProvider.groq).toBeCloseTo(0.0015, 5);

      // Requests by task type
      expect(result.requestsByTaskType.chat).toBe(1);
      expect(result.requestsByTaskType.filing_summary).toBe(1);
      expect(result.requestsByTaskType.news_sentiment).toBe(1);
    });

    it('should correctly calculate latency percentiles', () => {
      const logs: TelemetryLogRaw[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(`2025-01-01T${String(i).padStart(2, '0')}:00:00Z`),
        model: 'test-model',
        provider: 'gemini',
        taskType: 'chat',
        tokens_in: 100,
        tokens_out: 50,
        latency_ms: i * 10, // 0, 10, 20, ..., 990
        confidence: 0.9,
        cost_usd: 0.001,
        escalated: false,
        cache_hit: true,
      }));

      const result = mapLogsToStatsDto(logs, startDate, endDate);

      // P50 should be around index 50 (500ms)
      expect(result.p50LatencyMs).toBe(500);
      // P95 should be around index 95 (950ms)
      expect(result.p95LatencyMs).toBe(950);
    });

    it('should handle single log correctly', () => {
      const logs: TelemetryLogRaw[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z'),
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
        },
      ];

      const result = mapLogsToStatsDto(logs, startDate, endDate);

      expect(result.totalRequests).toBe(1);
      expect(result.cacheHitRate).toBe(1);
      expect(result.escalationRate).toBe(0);
      expect(result.avgLatencyMs).toBe(1000);
      expect(result.p50LatencyMs).toBe(1000);
      expect(result.p95LatencyMs).toBe(1000);
      expect(result.totalCostUsd).toBe(0.001);
      expect(result.avgCostPerRequest).toBe(0.001);
    });

    it('should be a pure function (no side effects)', () => {
      const logs: TelemetryLogRaw[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z'),
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
        },
      ];

      const originalLogs = structuredClone(logs);
      mapLogsToStatsDto(logs, startDate, endDate);

      // Logs should not be modified
      expect(logs).toEqual(originalLogs);
    });

    it('should handle logs with optional fields', () => {
      const logs: TelemetryLogRaw[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z'),
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
          user_feedback: 'thumbs_up',
          error: undefined,
        },
      ];

      const result = mapLogsToStatsDto(logs, startDate, endDate);

      expect(result.totalRequests).toBe(1);
      // Optional fields should not affect stats calculation
      expect(result).toHaveProperty('totalRequests');
    });
  });
});

