import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { routeQuery } from '@/lib/ai/router';

const API_KEY = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;
// Only Gemini model is used for AI responses with smart routing
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Server-side in-memory cache for AI responses
// This reduces LLM calls for identical requests within the same server instance
interface ServerCacheEntry {
  text: string;
  timestamp: number;
  requestHash: string;
}

const serverCache = new Map<string, ServerCacheEntry>();

// TTL for server-side cache (shorter than client-side)
const SERVER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Track AI rate limits
let aiRateLimitResetTime: number | null = null;

function isAiRateLimited(): boolean {
  if (!aiRateLimitResetTime) return false;
  
  const now = Date.now();
  if (now < aiRateLimitResetTime) {
    const minutesRemaining = ((aiRateLimitResetTime - now) / (1000 * 60)).toFixed(1);
    console.log(`AI rate limit active. Resets in ${minutesRemaining} minutes`);
    return true;
  }
  
  aiRateLimitResetTime = null;
  return false;
}

function markAiRateLimited(retryAfterSeconds: number = 60): void {
  aiRateLimitResetTime = Date.now() + (retryAfterSeconds * 1000);
  console.log(`AI rate limited. Resets in ${retryAfterSeconds} seconds`);
}

/**
 * Generate a hash for the request to use as cache key
 */
function generateCacheKey(body: any): string {
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
 * Clean up expired cache entries
 */
function cleanExpiredCache(): void {
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

// Clean expired cache every 10 minutes
setInterval(cleanExpiredCache, 10 * 60 * 1000);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Check if we're rate limited
    if (isAiRateLimited()) {
      return NextResponse.json({ 
        error: 'AI rate limit active. Please wait a moment and try again.',
        rateLimitExceeded: true,
        resetTime: aiRateLimitResetTime
      }, { status: 429 });
    }
    
    // Check if client wants to bypass cache
    const bypassCache = body.bypassCache === true;
    delete body.bypassCache; // Remove this flag before processing
    
    // Generate cache key from request
    const cacheKey = generateCacheKey(body);
    
    // Check server-side cache first (unless bypassing)
    if (!bypassCache) {
      const cached = serverCache.get(cacheKey);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < SERVER_CACHE_TTL) {
          console.log(`♻️ Returning cached AI response (age: ${Math.floor(age / 1000)}s, size: ${cached.text.length} chars)`);
          return NextResponse.json({ 
            text: cached.text,
            cached: true,
            cacheAge: age
          });
        } else {
          // Expired, remove it
          serverCache.delete(cacheKey);
        }
      }
    }

    // Smart routing: determine which model to use based on query
    const queryText = body.contents || '';
    const routingResult = routeQuery(queryText);
    const selectedModel = routingResult.model.modelId;
    
    console.log(`🤖 Smart routing: ${routingResult.tier} -> ${routingResult.model.name} (cache ${bypassCache ? 'bypassed' : 'miss'})`);
    
    // Use the selected model (override body.model if needed)
    const requestBody = {
      ...body,
      model: selectedModel,
    };
    
    // Always use Gemini for AI responses with smart tier selection
    const response = await ai.models.generateContent(requestBody as any);
    const responseText = response.text || '';
    serverCache.set(cacheKey, {
      text: responseText,
      timestamp: Date.now(),
      requestHash: cacheKey,
    });
    console.log(`✅ Cached new Gemini AI response from ${routingResult.model.name} (key: ${cacheKey.substring(0, 8)}..., entries: ${serverCache.size})`);
    return NextResponse.json({ 
      text: responseText,
      cached: false,
      model: selectedModel,
      tier: routingResult.tier
    });
  } catch (err: any) {
    console.error('AI proxy error:', err);
    
    // Check if it's a rate limit error
    if (err.status === 429 || err.code === 429) {
      // Mark as rate limited for 60 seconds
      markAiRateLimited(60);
      
      return NextResponse.json({ 
        error: 'AI rate limit exceeded. Please wait a minute and try again.',
        rateLimitExceeded: true,
        resetTime: aiRateLimitResetTime
      }, { status: 429 });
    }
    
    // Check for quota errors
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      markAiRateLimited(3600); // 1 hour for quota errors
      
      return NextResponse.json({ 
        error: 'AI quota exhausted. Please try again later.',
        rateLimitExceeded: true,
        resetTime: aiRateLimitResetTime
      }, { status: 429 });
    }
    
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
