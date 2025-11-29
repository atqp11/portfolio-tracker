/**
 * AI Telemetry Logger
 *
 * Tracks all AI model usage for cost monitoring and performance analysis.
 * Logs are stored in-memory and can be persisted to database/file.
 *
 * Metrics tracked (from AI_MODEL_STRATEGY.md):
 * - Cache hit rate (target >85%)
 * - Average inference cost per summary
 * - Fallback/escalation rate (target <10%)
 * - Hallucination flags / numeric mismatch rate
 * - Latency P50/P95
 * - User satisfaction / upvote rate
 */

export interface InferenceLog {
  timestamp: Date;
  model: string;
  provider: 'groq' | 'gemini' | 'openai';
  taskType: 'filing_summary' | 'news_sentiment' | 'chat' | 'kpi_extraction' | 'other';
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  confidence: number;
  cost_usd: number;
  escalated: boolean;
  cache_hit: boolean;
  user_feedback?: 'thumbs_up' | 'thumbs_down' | 'report';
  error?: string;
}

// In-memory log storage (max 10,000 entries)
const logs: InferenceLog[] = [];
const MAX_LOGS = 10_000;

/**
 * Log an AI inference request
 */
export function logInference(log: Omit<InferenceLog, 'timestamp'>): void {
  const entry: InferenceLog = {
    ...log,
    timestamp: new Date(),
  };

  logs.push(entry);

  // Trim old logs if exceeding max
  if (logs.length > MAX_LOGS) {
    logs.shift(); // Remove oldest
  }

  // Console log for monitoring
  console.log(
    `🤖 AI Log: ${log.provider}/${log.model} | ${log.taskType} | ${log.latency_ms}ms | ${(log.cost_usd * 1000).toFixed(4)}¢ | conf:${log.confidence.toFixed(2)} | ${log.cache_hit ? 'CACHE' : 'FRESH'}${log.escalated ? ' [ESCALATED]' : ''}`
  );
}

/**
 * Get telemetry stats for a time period
 */
export interface TelemetryStats {
  period: { start: Date; end: Date };
  totalRequests: number;
  cacheHitRate: number;
  escalationRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalCostUsd: number;
  avgCostPerRequest: number;
  costByProvider: Record<string, number>;
  requestsByTaskType: Record<string, number>;
  avgConfidence: number;
  lowConfidenceCount: number;
}

export function getTelemetryStats(
  startDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  endDate: Date = new Date()
): TelemetryStats {
  const periodLogs = logs.filter(
    (log) => log.timestamp >= startDate && log.timestamp <= endDate
  );

  if (periodLogs.length === 0) {
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

  const totalRequests = periodLogs.length;
  const cacheHits = periodLogs.filter((log) => log.cache_hit).length;
  const escalations = periodLogs.filter((log) => log.escalated).length;
  const latencies = periodLogs.map((log) => log.latency_ms).sort((a, b) => a - b);
  const totalCost = periodLogs.reduce((sum, log) => sum + log.cost_usd, 0);
  const lowConfidenceCount = periodLogs.filter((log) => log.confidence < 0.6).length;
  const avgConfidence =
    periodLogs.reduce((sum, log) => sum + log.confidence, 0) / totalRequests;

  // Cost by provider
  const costByProvider: Record<string, number> = {};
  periodLogs.forEach((log) => {
    costByProvider[log.provider] = (costByProvider[log.provider] || 0) + log.cost_usd;
  });

  // Requests by task type
  const requestsByTaskType: Record<string, number> = {};
  periodLogs.forEach((log) => {
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

/**
 * Get all logs (for export or analysis)
 */
export function getAllLogs(): InferenceLog[] {
  return [...logs];
}

/**
 * Clear logs (use with caution)
 */
export function clearLogs(): void {
  logs.length = 0;
  console.log('🗑️ AI telemetry logs cleared');
}

/**
 * Export logs as JSON
 */
export function exportLogsAsJson(): string {
  return JSON.stringify(logs, null, 2);
}

/**
 * Check if metrics are within target thresholds
 * Returns warnings for metrics outside targets
 */
export function checkMetricThresholds(stats: TelemetryStats): string[] {
  const warnings: string[] = [];

  // From AI_MODEL_STRATEGY.md target metrics
  if (stats.cacheHitRate < 0.8) {
    warnings.push(
      `⚠️ Cache hit rate ${(stats.cacheHitRate * 100).toFixed(1)}% < 80% target`
    );
  }

  if (stats.escalationRate > 0.15) {
    warnings.push(
      `⚠️ Escalation rate ${(stats.escalationRate * 100).toFixed(1)}% > 15% target`
    );
  }

  if (stats.avgLatencyMs > 3000) {
    warnings.push(`⚠️ Avg latency ${stats.avgLatencyMs.toFixed(0)}ms > 3s target`);
  }

  if (stats.p95LatencyMs > 7000) {
    warnings.push(`⚠️ P95 latency ${stats.p95LatencyMs.toFixed(0)}ms > 7s target`);
  }

  if (stats.avgCostPerRequest > 0.10) {
    warnings.push(
      `⚠️ Avg cost per request $${stats.avgCostPerRequest.toFixed(4)} > $0.10 target`
    );
  }

  if (stats.lowConfidenceCount / stats.totalRequests > 0.05) {
    warnings.push(
      `⚠️ Low confidence rate ${((stats.lowConfidenceCount / stats.totalRequests) * 100).toFixed(1)}% > 5% target`
    );
  }

  return warnings;
}

export default {
  logInference,
  getTelemetryStats,
  getAllLogs,
  clearLogs,
  exportLogsAsJson,
  checkMetricThresholds,
};
