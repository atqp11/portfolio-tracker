/**
 * AI Chat API Route
 *
 * Handles investor chat queries using confidence-based routing.
 * Integrates with RAG pipeline for context-aware answers.
 *
 * Pipeline:
 * 1. User asks question
 * 2. Retrieve RAG context (if available)
 * 3. Route to appropriate model (Gemini Flash → Pro if low confidence)
 * 4. Log telemetry
 * 5. Cache response
 * 6. Return answer with sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { routeQueryWithConfidence, type RouterContext } from '@/lib/ai/confidence-router';
import { logInference } from '@/lib/telemetry/ai-logger';
import { checkAndTrackUsage, type TierName } from '@/lib/tiers';
import { getUserProfile } from '@/lib/auth/session';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side cache for chat responses
interface ChatCacheEntry {
  response: string;
  confidence: number;
  model: string;
  sources: string[];
  timestamp: number;
}

const chatCache = new Map<string, ChatCacheEntry>();
const CHAT_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Generate cache key from user message and portfolio context
 */
function generateCacheKey(message: string, portfolioId?: string): string {
  const cacheableContent = {
    message: message.toLowerCase().trim(),
    portfolioId: portfolioId || 'default',
  };
  return crypto.createHash('sha256').update(JSON.stringify(cacheableContent)).digest('hex');
}

/**
 * POST /api/ai/chat
 *
 * Body:
 * {
 *   message: string,
 *   portfolio?: { symbols: string[], totalValue: number },
 *   portfolioId?: string,
 *   bypassCache?: boolean,
 *   ragContext?: string
 * }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { message, portfolio, portfolioId, bypassCache = false, ragContext = '' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Get user profile
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Generate cache key
    const cacheKey = generateCacheKey(message, portfolioId);

    // Check cache FIRST (unless bypassed) - cached responses don't count against quota
    if (!bypassCache) {
      const cached = chatCache.get(cacheKey);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < CHAT_CACHE_TTL) {
          console.log(
            `♻️ Returning cached chat response (age: ${Math.floor(age / 1000)}s, model: ${cached.model}) - NO QUOTA USED`
          );

          // Log cache hit
          logInference({
            model: cached.model,
            provider: 'gemini',
            taskType: 'chat',
            tokens_in: 0,
            tokens_out: 0,
            latency_ms: Date.now() - startTime,
            confidence: cached.confidence,
            cost_usd: 0, // No cost for cache hit
            escalated: false,
            cache_hit: true,
          });

          return NextResponse.json({
            text: cached.response,
            confidence: cached.confidence,
            model: cached.model,
            sources: cached.sources,
            cached: true,
            cacheAge: age,
          });
        } else {
          // Expired, remove from cache
          chatCache.delete(cacheKey);
        }
      }
    }

    // Check and track usage (only for non-cached requests)
    const quotaCheck = await checkAndTrackUsage(
      profile.id,
      'chatQuery',
      profile.tier as TierName
    );

    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          reason: quotaCheck.reason,
          upgradeUrl: '/pricing',
        },
        { status: 429 }
      );
    }

    // Route query with confidence-based escalation
    const routerContext: RouterContext = {
      userMessage: message,
      ragContext,
      portfolio,
    };

    const response = await routeQueryWithConfidence(routerContext);

    // Cache the response
    chatCache.set(cacheKey, {
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

    return NextResponse.json({
      text: response.text,
      confidence: response.confidence,
      model: response.model,
      sources: response.sources,
      tokensUsed: response.tokensUsed,
      latencyMs: response.latencyMs,
      escalated: response.escalated,
      cost: response.cost,
      cached: false,
    });
  } catch (error) {
    console.error('AI chat error:', error);

    // Log error
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
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'AI chat failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/chat/stats
 *
 * Returns chat telemetry stats
 */
export async function GET(req: NextRequest) {
  const { getTelemetryStats } = await import('@/lib/telemetry/ai-logger');

  // Get stats for last 24 hours
  const stats = getTelemetryStats();

  return NextResponse.json({
    stats,
    cacheSize: chatCache.size,
  });
}
