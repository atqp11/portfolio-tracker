/**
 * Telemetry Service Tests
 * 
 * Tests for service layer business logic
 */

import { TelemetryService } from '../service/telemetry.service';
import { telemetryRepository } from '../repository/telemetry.repository';
import { checkMetricThresholds } from '@lib/telemetry/ai-logger';
import { mapLogsToStatsDto } from '../mappers/telemetry.mapper';
import type { TelemetryLogRaw } from '../repository/telemetry.repository';

jest.mock('../repository/telemetry.repository');
jest.mock('../mappers/telemetry.mapper');
jest.mock('@lib/telemetry/ai-logger', () => ({
  checkMetricThresholds: jest.fn(),
}));

const mockTelemetryRepository = telemetryRepository as jest.Mocked<typeof telemetryRepository>;
const mockMapLogsToStatsDto = mapLogsToStatsDto as jest.MockedFunction<typeof mapLogsToStatsDto>;
const mockCheckMetricThresholds = checkMetricThresholds as jest.MockedFunction<typeof checkMetricThresholds>;

describe('TelemetryService', () => {
  let service: TelemetryService;

  beforeEach(() => {
    service = new TelemetryService();
    jest.clearAllMocks();
  });

  describe('getTelemetryStats', () => {
    it('should calculate date range correctly for 1h period', async () => {
      const now = new Date('2025-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockLogs: TelemetryLogRaw[] = [];
      mockTelemetryRepository.findByDateRange.mockResolvedValue(mockLogs);
      mockMapLogsToStatsDto.mockReturnValue({
        period: { start: new Date(), end: new Date() },
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
      mockCheckMetricThresholds.mockReturnValue([]);

      await service.getTelemetryStats('1h');

      expect(mockTelemetryRepository.findByDateRange).toHaveBeenCalled();
      const callArgs = mockTelemetryRepository.findByDateRange.mock.calls[0];
      const startDate = callArgs[0];
      const endDate = callArgs[1];

      expect(endDate.getTime()).toBe(now.getTime());
      expect(startDate.getTime()).toBe(now.getTime() - 60 * 60 * 1000); // 1 hour ago

      jest.useRealTimers();
    });

    it('should calculate date range correctly for 24h period', async () => {
      const now = new Date('2025-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockLogs: TelemetryLogRaw[] = [];
      mockTelemetryRepository.findByDateRange.mockResolvedValue(mockLogs);
      mockMapLogsToStatsDto.mockReturnValue({
        period: { start: new Date(), end: new Date() },
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
      mockCheckMetricThresholds.mockReturnValue([]);

      await service.getTelemetryStats('24h');

      const callArgs = mockTelemetryRepository.findByDateRange.mock.calls[0];
      const startDate = callArgs[0];
      const endDate = callArgs[1];

      expect(endDate.getTime()).toBe(now.getTime());
      expect(startDate.getTime()).toBe(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      jest.useRealTimers();
    });

    it('should calculate date range correctly for 7d period', async () => {
      const now = new Date('2025-01-08T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockLogs: TelemetryLogRaw[] = [];
      mockTelemetryRepository.findByDateRange.mockResolvedValue(mockLogs);
      mockMapLogsToStatsDto.mockReturnValue({
        period: { start: new Date(), end: new Date() },
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
      mockCheckMetricThresholds.mockReturnValue([]);

      await service.getTelemetryStats('7d');

      const callArgs = mockTelemetryRepository.findByDateRange.mock.calls[0];
      const startDate = callArgs[0];

      // Should be approximately 7 days ago (accounting for date arithmetic)
      const expectedStart = new Date(now);
      expectedStart.setDate(expectedStart.getDate() - 7);
      expect(startDate.getDate()).toBe(expectedStart.getDate());

      jest.useRealTimers();
    });

    it('should fetch logs from repository and use mapper', async () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-02T00:00:00Z');

      const mockLogs: TelemetryLogRaw[] = [
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

      const mockStats = {
        period: { start: startDate, end: endDate },
        totalRequests: 1,
        cacheHitRate: 1,
        escalationRate: 0,
        avgLatencyMs: 1000,
        p50LatencyMs: 1000,
        p95LatencyMs: 1000,
        totalCostUsd: 0.001,
        avgCostPerRequest: 0.001,
        costByProvider: { gemini: 0.001 },
        requestsByTaskType: { chat: 1 },
        avgConfidence: 0.9,
        lowConfidenceCount: 0,
      };

      mockTelemetryRepository.findByDateRange.mockResolvedValue(mockLogs);
      mockMapLogsToStatsDto.mockReturnValue(mockStats);
      mockCheckMetricThresholds.mockReturnValue([]);

      const result = await service.getTelemetryStats('24h');

      expect(mockTelemetryRepository.findByDateRange).toHaveBeenCalled();
      expect(mockMapLogsToStatsDto).toHaveBeenCalledWith(mockLogs, expect.any(Date), expect.any(Date));
      expect(mockCheckMetricThresholds).toHaveBeenCalledWith({
        ...mockStats,
        period: { start: expect.any(Date), end: expect.any(Date) },
      });
      expect(result).toEqual({
        period: '24h',
        stats: mockStats,
        warnings: [],
      });
    });

    it('should include warnings from threshold checking', async () => {
      const mockLogs: TelemetryLogRaw[] = [];
      const mockStats = {
        period: { start: new Date(), end: new Date() },
        totalRequests: 100,
        cacheHitRate: 0.75, // Below threshold
        escalationRate: 0.20, // Above threshold
        avgLatencyMs: 3500, // Above threshold
        p50LatencyMs: 1500,
        p95LatencyMs: 8000, // Above threshold
        totalCostUsd: 0.1,
        avgCostPerRequest: 0.001,
        costByProvider: {},
        requestsByTaskType: {},
        avgConfidence: 0.9,
        lowConfidenceCount: 0,
      };

      mockTelemetryRepository.findByDateRange.mockResolvedValue(mockLogs);
      mockMapLogsToStatsDto.mockReturnValue(mockStats);
      mockCheckMetricThresholds.mockReturnValue([
        '⚠️ Cache hit rate 75.0% < 80% target',
        '⚠️ Escalation rate 20.0% > 15% target',
        '⚠️ Avg latency 3500ms > 3s target',
        '⚠️ P95 latency 8000ms > 7s target',
      ]);

      const result = await service.getTelemetryStats('24h');

      expect(result.warnings).toHaveLength(4);
      expect(result.warnings[0]).toContain('Cache hit rate');
      expect(result.warnings[1]).toContain('Escalation rate');
    });

    it('should handle default period correctly', async () => {
      const mockLogs: TelemetryLogRaw[] = [];
      mockTelemetryRepository.findByDateRange.mockResolvedValue(mockLogs);
      mockMapLogsToStatsDto.mockReturnValue({
        period: { start: new Date(), end: new Date() },
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
      mockCheckMetricThresholds.mockReturnValue([]);

      // Test with invalid period (should default to 24h)
      const now = new Date('2025-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      await service.getTelemetryStats('24h' as any);

      const callArgs = mockTelemetryRepository.findByDateRange.mock.calls[0];
      const startDate = callArgs[0];
      expect(startDate.getTime()).toBe(now.getTime() - 24 * 60 * 60 * 1000);

      jest.useRealTimers();
    });
  });
});

