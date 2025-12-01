/**
 * Chat Service
 * 
 * Business logic for AI chat operations.
 * Orchestrates caching, AI routing, and telemetry.
 * Note: Quota enforcement is handled at controller level (cross-cutting concern)
 */

import { routeQueryWithConfidence, type RouterContext } from '@lib/ai/confidence-router';
import { logInference } from '@lib/telemetry/ai-logger';
import { getTelemetryStats } from '@lib/telemetry/ai-logger';
import { chatCacheService } from './chat-cache.service';
import type {
  ChatRequestDto,
  ChatResponseDto,
  ChatStatsResponseDto,
  RouterContextInternal,
} from '@backend/modules/ai/dto/chat.dto';
import type { ChatCacheEntry } from '@backend/modules/ai/dto/chat.dto';

export class ChatService {
  /**
   * Check cache and return cached response if available
   * Returns null if cache miss
   */
  async checkCache(
    request: ChatRequestDto
  ): Promise<ChatResponseDto | null> {
    if (request.bypassCache) {
      return null;
    }

    const startTime = Date.now();
    const cacheKey = chatCacheService.generateCacheKey(
      request.message,
      request.portfolioId
    );

    const cached = chatCacheService.get(cacheKey);
    if (!cached) {
      return null;
    }

    console.log(
      `♻️ Returning cached chat response (age: ${Math.floor(cached.age / 1000)}s, model: ${cached.entry.model}) - NO QUOTA USED`
    );

    // Log cache hit
    this.logCacheHit(cached.entry, startTime);

    return {
      text: cached.entry.response,
      confidence: cached.entry.confidence,
      model: cached.entry.model,
      sources: cached.entry.sources,
      cached: true,
      cacheAge: cached.age,
    };
  }

  /**
   * Generate fresh chat response (called after quota check)
   */
  async generateResponse(
    request: ChatRequestDto,
    userId: string,
    userTier: string
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();

    const cacheKey = chatCacheService.generateCacheKey(
      request.message,
      request.portfolioId
    );

    // Build router context
    const routerContext: RouterContext = {
      userMessage: request.message,
      ragContext: request.ragContext,
      portfolio: request.portfolio,
    };

    // Route query with confidence-based escalation
    const response = await routeQueryWithConfidence(routerContext);

    // Cache the response
    chatCacheService.set(cacheKey, {
      response: response.text,
      confidence: response.confidence,
      model: response.model,
      sources: response.sources || [],
      timestamp: Date.now(),
    });

    console.log(
      `✅ Chat response generated: ${response.model}, conf=${response.confidence.toFixed(2)}, cost=$${response.cost.toFixed(6)}, escalated=${response.escalated}`
    );

    // Log telemetry
    this.logInference(response, startTime);

    return {
      text: response.text,
      confidence: response.confidence,
      model: response.model,
      sources: response.sources,
      tokensUsed: response.tokensUsed,
      latencyMs: response.latencyMs,
      escalated: response.escalated,
      cost: response.cost,
      cached: false,
    };
  }

  /**
   * Get chat statistics
   */
  async getChatStats(): Promise<ChatStatsResponseDto> {
    const stats = getTelemetryStats();

    return {
      stats,
      cacheSize: chatCacheService.getSize(),
    };
  }

  /**
   * Log cache hit to telemetry
   */
  private logCacheHit(entry: ChatCacheEntry, startTime: number): void {
    logInference({
      model: entry.model,
      provider: 'gemini',
      taskType: 'chat',
      tokens_in: 0,
      tokens_out: 0,
      latency_ms: Date.now() - startTime,
      confidence: entry.confidence,
      cost_usd: 0, // No cost for cache hit
      escalated: false,
      cache_hit: true,
    });
  }

  /**
   * Log inference to telemetry
   */
  private logInference(response: any, startTime: number): void {
    logInference({
      model: response.model,
      provider: response.model.includes('gemini') ? 'gemini' : 'groq',
      taskType: 'chat',
      tokens_in: response.tokensUsed.input,
      tokens_out: response.tokensUsed.output,
      latency_ms: response.latencyMs,
      confidence: response.confidence,
      cost_usd: response.cost,
      escalated: response.escalated,
      cache_hit: false,
    });
  }

  /**
   * Log error to telemetry
   */
  logError(error: Error, startTime: number): void {
    logInference({
      model: 'unknown',
      provider: 'gemini',
      taskType: 'chat',
      tokens_in: 0,
      tokens_out: 0,
      latency_ms: Date.now() - startTime,
      confidence: 0,
      cost_usd: 0,
      escalated: false,
      cache_hit: false,
      error: error.message,
    });
  }
}

// Export singleton instance
export const chatService = new ChatService();
