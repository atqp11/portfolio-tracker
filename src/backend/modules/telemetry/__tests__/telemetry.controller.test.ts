/**
 * Telemetry Controller Tests
 * 
 * Tests for controller layer (validation, HTTP handling)
 */

import { TelemetryController } from '../telemetry.controller';
import { telemetryService } from '../service/telemetry.service';
import { getTelemetryStatsRequestSchema, telemetryResponseSchema } from '../zod/telemetry.schemas';
import { NextRequest } from 'next/server';
import { z } from 'zod';

jest.mock('../service/telemetry.service');

const mockTelemetryService = telemetryService as jest.Mocked<typeof telemetryService>;

describe('TelemetryController', () => {
  let controller: TelemetryController;

  beforeEach(() => {
    controller = new TelemetryController();
    jest.clearAllMocks();
  });

  describe('getTelemetryStats', () => {
    it('should validate input, call service, and validate output', async () => {
      const mockRequest = {
        period: '24h' as const,
      };

      const mockValidatedInput = {
        period: '24h' as const,
      };

      const mockServiceResult = {
        period: '24h' as const,
        stats: {
          period: { start: new Date(), end: new Date() },
          totalRequests: 100,
          cacheHitRate: 0.85,
          escalationRate: 0.05,
          avgLatencyMs: 1500,
          p50LatencyMs: 1200,
          p95LatencyMs: 3000,
          totalCostUsd: 0.1,
          avgCostPerRequest: 0.001,
          costByProvider: { gemini: 0.1 },
          requestsByTaskType: { chat: 100 },
          avgConfidence: 0.9,
          lowConfidenceCount: 0,
        },
        warnings: [],
      };

      mockTelemetryService.getTelemetryStats.mockResolvedValue(mockServiceResult);

      const result = await controller.getTelemetryStats(mockRequest);

      expect(mockTelemetryService.getTelemetryStats).toHaveBeenCalledWith('24h');
      expect(result).toEqual(mockServiceResult);
    });

    it('should throw ZodError for invalid input', async () => {
      const mockRequest: any = {
        period: 'invalid-period',
      };

      await expect(controller.getTelemetryStats(mockRequest)).rejects.toThrow(z.ZodError);
      expect(mockTelemetryService.getTelemetryStats).not.toHaveBeenCalled();
    });

    it('should use default period when not provided', async () => {
      const mockRequest = {};

      const mockValidatedInput = {
        period: '24h' as const, // Default
      };

      const mockServiceResult = {
        period: '24h' as const,
        stats: {
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
        },
        warnings: [],
      };

      mockTelemetryService.getTelemetryStats.mockResolvedValue(mockServiceResult);

      await controller.getTelemetryStats(mockRequest);

      expect(mockTelemetryService.getTelemetryStats).toHaveBeenCalledWith('24h');
      expect(mockTelemetryService.getTelemetryStats).toHaveBeenCalledWith('24h');
    });

    it('should throw error if output validation fails', async () => {
      const mockRequest = {
        period: '24h' as const,
      };

      const mockValidatedInput = {
        period: '24h' as const,
      };

      const mockServiceResult = {
        period: '24h' as const,
        stats: {
          period: { start: new Date(), end: new Date() },
          totalRequests: -1, // Invalid (negative)
          cacheHitRate: 0.85,
          escalationRate: 0.05,
          avgLatencyMs: 1500,
          p50LatencyMs: 1200,
          p95LatencyMs: 3000,
          totalCostUsd: 0.1,
          avgCostPerRequest: 0.001,
          costByProvider: { gemini: 0.1 },
          requestsByTaskType: { chat: 100 },
          avgConfidence: 0.9,
          lowConfidenceCount: 0,
        },
        warnings: [],
      };

      const zodError = new z.ZodError([
        {
          code: 'too_small',
          message: 'Number must be >= 0',
          path: ['stats', 'totalRequests'],
          minimum: 0,
          inclusive: true,
          origin: 'number' as const,
        },
      ]);

      mockTelemetryService.getTelemetryStats.mockResolvedValue(mockServiceResult as any);

      await expect(controller.getTelemetryStats(mockRequest)).rejects.toThrow(z.ZodError);
    });
  });

  describe('getStats (HTTP handler)', () => {
    it('should handle HTTP request and return NextResponse', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/telemetry?period=24h');

      const mockServiceResult = {
        period: '24h' as const,
        stats: {
          period: { start: new Date(), end: new Date() },
          totalRequests: 100,
          cacheHitRate: 0.85,
          escalationRate: 0.05,
          avgLatencyMs: 1500,
          p50LatencyMs: 1200,
          p95LatencyMs: 3000,
          totalCostUsd: 0.1,
          avgCostPerRequest: 0.001,
          costByProvider: { gemini: 0.1 },
          requestsByTaskType: { chat: 100 },
          avgConfidence: 0.9,
          lowConfidenceCount: 0,
        },
        warnings: [],
      };

      // Mock the internal getTelemetryStats method
      jest.spyOn(controller, 'getTelemetryStats').mockResolvedValue(mockServiceResult);

      const response = await controller.getStats(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      // NextResponse.json() serializes Date objects to strings
      expect(data.period).toBe(mockServiceResult.period);
      expect(data.stats.period.start).toBe(mockServiceResult.stats.period.start.toISOString());
      expect(data.stats.period.end).toBe(mockServiceResult.stats.period.end.toISOString());
      expect(data.stats.totalRequests).toBe(mockServiceResult.stats.totalRequests);
    });

    it('should return 400 for invalid query parameters', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/telemetry?period=invalid');

      const zodError = new z.ZodError([
        {
          code: 'invalid_value',
          message: 'Invalid period',
          path: ['period'],
          values: ['1h', '24h', '7d', '30d'],
        } as any,
      ]);

      jest.spyOn(controller, 'getTelemetryStats').mockRejectedValue(zodError);

      const response = await controller.getStats(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request parameters');
      expect(data.details).toBeDefined();
    });

    it('should return 500 for unexpected errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/telemetry?period=24h');

      jest.spyOn(controller, 'getTelemetryStats').mockRejectedValue(new Error('Database error'));

      const response = await controller.getStats(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Database error');
    });

    it('should use default period when query param is missing', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/telemetry');

      const mockServiceResult = {
        period: '24h' as const,
        stats: {
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
        },
        warnings: [],
      };

      jest.spyOn(controller, 'getTelemetryStats').mockResolvedValue(mockServiceResult);

      const response = await controller.getStats(mockRequest);

      expect(response.status).toBe(200);
      expect(controller.getTelemetryStats).toHaveBeenCalledWith({ period: '24h' });
    });
  });
});

