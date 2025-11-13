import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

const API_KEY = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;

// Create the client once per module on the server
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

    console.log(`🤖 Making new Gemini API call (cache ${bypassCache ? 'bypassed' : 'miss'})`);
    
    // Forward the request to the Google GenAI SDK
    const response = await ai.models.generateContent(body as any);

    const responseText = response.text || '';
    
    // Cache the response
    serverCache.set(cacheKey, {
      text: responseText,
      timestamp: Date.now(),
      requestHash: cacheKey,
    });
    
    console.log(`✅ Cached new AI response (key: ${cacheKey.substring(0, 8)}..., entries: ${serverCache.size})`);

    // Return only the serializable parts the client expects
    return NextResponse.json({ 
      text: responseText,
      cached: false 
    });
  } catch (err: any) {
    console.error('AI proxy error:', err);
    
    // Check if it's a rate limit error
    if (err.status === 429) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        rateLimitExceeded: true 
      }, { status: 429 });
    }
    
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
