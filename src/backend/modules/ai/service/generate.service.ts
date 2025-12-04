/**
 * AI Generate Service
 *
 * Handles AI content generation with caching and smart model routing.
 * Follows MVC pattern: Route → Controller → Service → AI Provider
 *
 * Phase 1: Migrated to distributed cache (Vercel KV / Upstash Redis)
 */

import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { routeQuery } from '@lib/ai/router';
import { getCacheAdapter, type CacheAdapter } from '@lib/cache/adapter';
import { getCacheTTL } from '@lib/config/cache-ttl.config';

const API_KEY = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Cache entry structure for AI responses
interface AICacheEntry {
  text: string;
  timestamp: number;
  requestHash: string;
  model: string;
  tier: string;
}

// Track AI rate limits
let aiRateLimitResetTime: number | null = null;

export interface GenerateRequest {
  model?: string;
  contents: string;
  config?: any;
  bypassCache?: boolean;
}

export interface GenerateResponse {
  text: string;
  cached: boolean;
  cacheAge?: number;
  model?: string;
  tier?: string;
}

class GenerateService {
  private cache: CacheAdapter;
  private aiRateLimitResetTime: number | null = null;
  private readonly DEFAULT_TTL = getCacheTTL('aiChat', 'free'); // Use config TTL

  constructor() {
    this.cache = getCacheAdapter();
  }

  /**
   * Generate a hash for the request to use as cache key
   */
  private generateCacheKey(body: GenerateRequest): string {
    const cacheableContent = {
      model: body.model,
      contents: body.contents,
      config: body.config,
    };
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(cacheableContent))
      .digest('hex');
  }

  /**
   * Check if AI is rate limited
   */
  isRateLimited(): { limited: boolean; resetTime: number | null } {
    if (!this.aiRateLimitResetTime) return { limited: false, resetTime: null };
    
    const now = Date.now();
    if (now < this.aiRateLimitResetTime) {
      return { limited: true, resetTime: this.aiRateLimitResetTime };
    }
    
    this.aiRateLimitResetTime = null;
    return { limited: false, resetTime: null };
  }

  /**
   * Mark AI as rate limited
   */
  markRateLimited(retryAfterSeconds: number = 60): void {
    this.aiRateLimitResetTime = Date.now() + (retryAfterSeconds * 1000);
    console.log(`AI rate limited. Resets in ${retryAfterSeconds} seconds`);
  }

  /**
   * Check cache for existing response
   */
  async checkCache(body: GenerateRequest): Promise<GenerateResponse | null> {
    const cacheKey = `ai:generate:${this.generateCacheKey(body)}`;
    const cached = await this.cache.get<AICacheEntry>(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      console.log(`♻️ Returning cached AI response (age: ${Math.floor(age / 1000)}s, size: ${cached.text.length} chars)`);
      return {
        text: cached.text,
        cached: true,
        cacheAge: age,
        model: cached.model,
        tier: cached.tier,
      };
    }
    
    return null;
  }

  /**
   * Generate AI content
   */
  async generate(body: GenerateRequest): Promise<GenerateResponse> {
    // Check rate limit
    const rateLimitStatus = this.isRateLimited();
    if (rateLimitStatus.limited) {
      throw new RateLimitError('AI rate limit active. Please wait a moment and try again.', rateLimitStatus.resetTime);
    }

    // Check cache first (unless bypassing)
    if (!body.bypassCache) {
      const cachedResponse = await this.checkCache(body);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Smart routing: determine which model to use based on query
    const queryText = body.contents || '';
    const routingResult = routeQuery(queryText);
    const selectedModel = routingResult.model.modelId;
    
    console.log(`🤖 Smart routing: ${routingResult.tier} -> ${routingResult.model.name} (cache ${body.bypassCache ? 'bypassed' : 'miss'})`);

    try {
      // Make AI request
      const requestBody = {
        ...body,
        model: selectedModel,
      };
      delete (requestBody as any).bypassCache;
      
      const response = await ai.models.generateContent(requestBody as any);
      const responseText = response.text || '';
      
      // Cache the response
      const cacheKey = `ai:generate:${this.generateCacheKey(body)}`;
      const cacheEntry: AICacheEntry = {
        text: responseText,
        timestamp: Date.now(),
        requestHash: this.generateCacheKey(body),
        model: selectedModel,
        tier: routingResult.tier,
      };
      
      await this.cache.set(cacheKey, cacheEntry, this.DEFAULT_TTL);
      console.log(`✅ Cached new Gemini AI response from ${routingResult.model.name} (key: ${cacheKey.substring(0, 20)}...)`);
      
      return {
        text: responseText,
        cached: false,
        model: selectedModel,
        tier: routingResult.tier,
      };
    } catch (err: any) {
      // Handle rate limit errors
      if (err.status === 429 || err.code === 429) {
        this.markRateLimited(60);
        throw new RateLimitError('AI rate limit exceeded. Please wait a minute and try again.', this.aiRateLimitResetTime);
      }
      
      // Handle quota errors
      if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        this.markRateLimited(3600);
        throw new RateLimitError('AI quota exhausted. Please try again later.', this.aiRateLimitResetTime);
      }
      
      throw err;
    }
  }
}

/**
 * Custom error for rate limiting
 */
export class RateLimitError extends Error {
  resetTime: number | null;
  
  constructor(message: string, resetTime: number | null) {
    super(message);
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
  }
}

// Singleton instance
export const generateService = new GenerateService();
