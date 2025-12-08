/**
 * Telemetry Repository Tests
 * 
 * Tests for repository layer (data access)
 */

import { TelemetryRepository } from '../repository/telemetry.repository';
import { getAllLogs, logInference, clearLogs } from '@lib/telemetry/ai-logger';
import type { TelemetryLogRaw } from '../repository/telemetry.repository';

jest.mock('@lib/telemetry/ai-logger', () => ({
  getAllLogs: jest.fn(),
  logInference: jest.fn(),
  clearLogs: jest.fn(),
}));

const mockGetAllLogs = getAllLogs as jest.MockedFunction<typeof getAllLogs>;

describe('TelemetryRepository', () => {
  let repository: TelemetryRepository;

  beforeEach(() => {
    repository = new TelemetryRepository();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all logs as raw DB models', async () => {
      const mockLogs = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z'),
          model: 'gemini-2.0-flash-exp',
          provider: 'gemini' as const,
          taskType: 'chat' as const,
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
          provider: 'openai' as const,
          taskType: 'filing_summary' as const,
          tokens_in: 200,
          tokens_out: 100,
          latency_ms: 2000,
          confidence: 0.8,
          cost_usd: 0.002,
          escalated: true,
          cache_hit: false,
        },
      ];

      mockGetAllLogs.mockReturnValue(mockLogs as any);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: mockLogs[0].timestamp,
        model: mockLogs[0].model,
        provider: mockLogs[0].provider,
        taskType: mockLogs[0].taskType,
        tokens_in: mockLogs[0].tokens_in,
        tokens_out: mockLogs[0].tokens_out,
        latency_ms: mockLogs[0].latency_ms,
        confidence: mockLogs[0].confidence,
        cost_usd: mockLogs[0].cost_usd,
        escalated: mockLogs[0].escalated,
        cache_hit: mockLogs[0].cache_hit,
        user_feedback: undefined,
        error: undefined,
      });
      expect(mockGetAllLogs).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no logs exist', async () => {
      mockGetAllLogs.mockReturnValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
      expect(mockGetAllLogs).toHaveBeenCalledTimes(1);
    });

    it('should preserve all log fields including optional ones', async () => {
      const mockLogs = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z'),
          model: 'test-model',
          provider: 'gemini' as const,
          taskType: 'chat' as const,
          tokens_in: 100,
          tokens_out: 50,
          latency_ms: 1000,
          confidence: 0.9,
          cost_usd: 0.001,
          escalated: false,
          cache_hit: true,
          user_feedback: 'thumbs_up' as const,
          error: 'Some error',
        },
      ];

      mockGetAllLogs.mockReturnValue(mockLogs as any);

      const result = await repository.findAll();

      expect(result[0].user_feedback).toBe('thumbs_up');
      expect(result[0].error).toBe('Some error');
    });
  });

  describe('findByDateRange', () => {
    it('should filter logs by date range', async () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-01T23:59:59Z');

      const mockLogs = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z'),
          model: 'test-model',
          provider: 'gemini' as const,
          taskType: 'chat' as const,
          tokens_in: 100,
          tokens_out: 50,
          latency_ms: 1000,
          confidence: 0.9,
          cost_usd: 0.001,
          escalated: false,
          cache_hit: true,
        },
        {
          timestamp: new Date('2025-01-02T10:00:00Z'), // Outside range
          model: 'test-model',
          provider: 'gemini' as const,
          taskType: 'chat' as const,
          tokens_in: 100,
          tokens_out: 50,
          latency_ms: 1000,
          confidence: 0.9,
          cost_usd: 0.001,
          escalated: false,
          cache_hit: true,
        },
        {
          timestamp: new Date('2025-01-01T12:00:00Z'),
          model: 'test-model',
          provider: 'gemini' as const,
          taskType: 'chat' as const,
          tokens_in: 100,
          tokens_out: 50,
          latency_ms: 1000,
          confidence: 0.9,
          cost_usd: 0.001,
          escalated: false,
          cache_hit: true,
        },
      ];

      mockGetAllLogs.mockReturnValue(mockLogs as any);

      const result = await repository.findByDateRange(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toEqual(new Date('2025-01-01T10:00:00Z'));
      expect(result[1].timestamp).toEqual(new Date('2025-01-01T12:00:00Z'));
    });

    it('should include logs at boundary dates', async () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-01T23:59:59Z');

      const mockLogs = [
        {
          timestamp: startDate, // Exactly at start
          model: 'test-model',
          provider: 'gemini' as const,
          taskType: 'chat' as const,
          tokens_in: 100,
          tokens_out: 50,
          latency_ms: 1000,
          confidence: 0.9,
          cost_usd: 0.001,
          escalated: false,
          cache_hit: true,
        },
        {
          timestamp: endDate, // Exactly at end
          model: 'test-model',
          provider: 'gemini' as const,
          taskType: 'chat' as const,
          tokens_in: 100,
          tokens_out: 50,
          latency_ms: 1000,
          confidence: 0.9,
          cost_usd: 0.001,
          escalated: false,
          cache_hit: true,
        },
      ];

      mockGetAllLogs.mockReturnValue(mockLogs as any);

      const result = await repository.findByDateRange(startDate, endDate);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no logs in date range', async () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-01T23:59:59Z');

      const mockLogs = [
        {
          timestamp: new Date('2025-01-02T10:00:00Z'), // Outside range
          model: 'test-model',
          provider: 'gemini' as const,
          taskType: 'chat' as const,
          tokens_in: 100,
          tokens_out: 50,
          latency_ms: 1000,
          confidence: 0.9,
          cost_usd: 0.001,
          escalated: false,
          cache_hit: true,
        },
      ];

      mockGetAllLogs.mockReturnValue(mockLogs as any);

      const result = await repository.findByDateRange(startDate, endDate);

      expect(result).toEqual([]);
    });
  });
});

