/**
 * Telemetry Mappers
 * 
 * MUST convert:
 * - DB → DTO
 * - DTO → DB (mutations)
 * 
 * MUST be pure functions with no side effects.
 * MUST be used by services only.
 */

import type { TelemetryLogRaw } from '../repository/telemetry.repository';
import type { TelemetryStatsDto } from '../dto/telemetry.dto';

/**
 * Transform raw repository logs to domain stats DTO
 * Pure function - no side effects
 */
export function mapLogsToStatsDto(
  logs: TelemetryLogRaw[],
  startDate: Date,
  endDate: Date
): TelemetryStatsDto {
  if (logs.length === 0) {
    return {
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
    };
  }

  const totalRequests = logs.length;
  const cacheHits = logs.filter((log) => log.cache_hit).length;
  const escalations = logs.filter((log) => log.escalated).length;
  const latencies = logs.map((log) => log.latency_ms).sort((a, b) => a - b);
  const totalCost = logs.reduce((sum, log) => sum + log.cost_usd, 0);
  const lowConfidenceCount = logs.filter((log) => log.confidence < 0.6).length;
  const avgConfidence = logs.reduce((sum, log) => sum + log.confidence, 0) / totalRequests;

  // Cost by provider
  const costByProvider: Record<string, number> = {};
  logs.forEach((log) => {
    costByProvider[log.provider] = (costByProvider[log.provider] || 0) + log.cost_usd;
  });

  // Requests by task type
  const requestsByTaskType: Record<string, number> = {};
  logs.forEach((log) => {
    requestsByTaskType[log.taskType] = (requestsByTaskType[log.taskType] || 0) + 1;
  });

  // Latency percentiles
  const p50Index = Math.floor(latencies.length * 0.5);
  const p95Index = Math.floor(latencies.length * 0.95);

  return {
    period: { start: startDate, end: endDate },
    totalRequests,
    cacheHitRate: cacheHits / totalRequests,
    escalationRate: escalations / totalRequests,
    avgLatencyMs: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
    p50LatencyMs: latencies[p50Index] || 0,
    p95LatencyMs: latencies[p95Index] || 0,
    totalCostUsd: totalCost,
    avgCostPerRequest: totalCost / totalRequests,
    costByProvider,
    requestsByTaskType,
    avgConfidence,
    lowConfidenceCount,
  };
}

