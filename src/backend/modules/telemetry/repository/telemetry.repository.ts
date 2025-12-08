/**
 * Telemetry Repository
 * 
 * Repository layer for telemetry data access.
 * Returns raw data models as stored in memory (close to DB schema).
 * This is the ultimate source of truth for telemetry data.
 */

import { getAllLogs as getRawLogs } from '@lib/telemetry/ai-logger';
import type { InferenceLog } from '@lib/telemetry/ai-logger';

/**
 * Raw telemetry log model (matches in-memory storage structure)
 */
export interface TelemetryLogRaw {
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

export class TelemetryRepository {
  /**
   * Get all telemetry logs (raw DB model)
   * Returns logs as stored in memory - ultimate source of truth
   */
  async findAll(): Promise<TelemetryLogRaw[]> {
    const logs = getRawLogs();
    return logs.map(log => ({
      timestamp: log.timestamp,
      model: log.model,
      provider: log.provider,
      taskType: log.taskType,
      tokens_in: log.tokens_in,
      tokens_out: log.tokens_out,
      latency_ms: log.latency_ms,
      confidence: log.confidence,
      cost_usd: log.cost_usd,
      escalated: log.escalated,
      cache_hit: log.cache_hit,
      user_feedback: log.user_feedback,
      error: log.error,
    }));
  }

  /**
   * Get telemetry logs filtered by date range (raw DB model)
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<TelemetryLogRaw[]> {
    const allLogs = await this.findAll();
    return allLogs.filter(
      (log) => log.timestamp >= startDate && log.timestamp <= endDate
    );
  }
}

export const telemetryRepository = new TelemetryRepository();

