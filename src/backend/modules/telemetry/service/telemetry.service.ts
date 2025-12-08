/**
 * Telemetry Service Layer
 * 
 * MUST implement domain/business logic.
 * MUST call repositories.
 * MUST use mappers for DB→DTO conversion.
 * MUST NOT contain Zod validation.
 * MUST NOT return raw DB rows to controllers.
 */

import { telemetryRepository } from '../repository/telemetry.repository';
import { checkMetricThresholds } from '@lib/telemetry/ai-logger';
import { mapLogsToStatsDto } from '../mappers/telemetry.mapper';
import type { TelemetryResponseDto, TelemetryPeriod } from '../dto/telemetry.dto';

export class TelemetryService {
  /**
   * Calculate date range from period (business logic)
   */
  private calculateDateRange(period: TelemetryPeriod): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setHours(startDate.getHours() - 24);
    }

    return { startDate, endDate };
  }

  /**
   * Get telemetry stats for a given period
   * Implements business logic and uses mapper for DB→DTO conversion
   */
  async getTelemetryStats(period: TelemetryPeriod): Promise<TelemetryResponseDto> {
    // Calculate date range (business logic)
    const { startDate, endDate } = this.calculateDateRange(period);

    // Fetch raw logs from repository (raw DB model)
    const rawLogs = await telemetryRepository.findByDateRange(startDate, endDate);

    // Use mapper for DB→DTO conversion
    const stats = mapLogsToStatsDto(rawLogs, startDate, endDate);

    // Check metric thresholds (business logic)
    const warnings = checkMetricThresholds({
      period: { start: startDate, end: endDate },
      totalRequests: stats.totalRequests,
      cacheHitRate: stats.cacheHitRate,
      escalationRate: stats.escalationRate,
      avgLatencyMs: stats.avgLatencyMs,
      p50LatencyMs: stats.p50LatencyMs,
      p95LatencyMs: stats.p95LatencyMs,
      totalCostUsd: stats.totalCostUsd,
      avgCostPerRequest: stats.avgCostPerRequest,
      costByProvider: stats.costByProvider,
      requestsByTaskType: stats.requestsByTaskType,
      avgConfidence: stats.avgConfidence,
      lowConfidenceCount: stats.lowConfidenceCount,
    });

    return {
      period,
      stats,
      warnings,
    };
  }
}

export const telemetryService = new TelemetryService();

