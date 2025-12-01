/**
 * AI Generate Service
 *
 * Handles AI content generation with caching and smart model routing.
 * Follows MVC pattern: Route → Controller → Service → AI Provider
 */

import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { routeQuery } from '@lib/ai/router';

const API_KEY = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Server-side in-memory cache for AI responses
interface ServerCacheEntry {
  text: string;
  timestamp: number;
  requestHash: string;
  model: string;
  tier: string;
}

const serverCache = new Map<string, ServerCacheEntry>();
const SERVER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    if (!aiRateLimitResetTime) return { limited: false, resetTime: null };
    
    const now = Date.now();
    if (now < aiRateLimitResetTime) {
      return { limited: true, resetTime: aiRateLimitResetTime };
    }
    
    aiRateLimitResetTime = null;
    return { limited: false, resetTime: null };
  }

  /**
   * Mark AI as rate limited
   */
  markRateLimited(retryAfterSeconds: number = 60): void {
    aiRateLimitResetTime = Date.now() + (retryAfterSeconds * 1000);
    console.log(`AI rate limited. Resets in ${retryAfterSeconds} seconds`);
  }

  /**
   * Check cache for existing response
   */
  checkCache(body: GenerateRequest): GenerateResponse | null {
    const cacheKey = this.generateCacheKey(body);
    const cached = serverCache.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < SERVER_CACHE_TTL) {
        console.log(`♻️ Returning cached AI response (age: ${Math.floor(age / 1000)}s, size: ${cached.text.length} chars)`);
        return {
          text: cached.text,
          cached: true,
          cacheAge: age,
          model: cached.model,
          tier: cached.tier,
        };
      } else {
        serverCache.delete(cacheKey);
      }
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
      const cachedResponse = this.checkCache(body);
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
      const cacheKey = this.generateCacheKey(body);
      serverCache.set(cacheKey, {
        text: responseText,
        timestamp: Date.now(),
        requestHash: cacheKey,
        model: selectedModel,
        tier: routingResult.tier,
      });
      console.log(`✅ Cached new Gemini AI response from ${routingResult.model.name} (key: ${cacheKey.substring(0, 8)}..., entries: ${serverCache.size})`);
      
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
        throw new RateLimitError('AI rate limit exceeded. Please wait a minute and try again.', aiRateLimitResetTime);
      }
      
      // Handle quota errors
      if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        this.markRateLimited(3600);
        throw new RateLimitError('AI quota exhausted. Please try again later.', aiRateLimitResetTime);
      }
      
      throw err;
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of serverCache.entries()) {
      if (now - entry.timestamp > SERVER_CACHE_TTL) {
        serverCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired server cache entries`);
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

// Clean expired cache every 10 minutes
setInterval(() => generateService.cleanExpiredCache(), 10 * 60 * 1000);
