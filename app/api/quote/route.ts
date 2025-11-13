import { NextRequest, NextResponse } from 'next/server';
import { fetchAlphaVantageBatch } from '@/lib/api/alphavantage';
import { fetchFMPQuotes } from '@/lib/api/fmp';

// Use Alpha Vantage since FMP free tier doesn't support OTC stocks (TRMLF, AETUF)
// and we need USD prices, not CAD from .TO symbols
const API_PROVIDER: string = 'alphavantage';
console.log(`API provider: ${API_PROVIDER}`);

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory rate limit tracking (resets on server restart)
let rateLimitResetTime: number | null = null;

function isRateLimited(): boolean {
  if (!rateLimitResetTime) return false;
  
  const now = Date.now();
  if (now < rateLimitResetTime) {
    const hoursRemaining = ((rateLimitResetTime - now) / (1000 * 60 * 60)).toFixed(1);
    console.log(`Rate limit active. Resets in ${hoursRemaining} hours`);
    return true;
  }
  
  // Rate limit expired
  rateLimitResetTime = null;
  return false;
}

function markRateLimited(): void {
  // Alpha Vantage resets at midnight UTC
  const now = new Date();
  const resetTime = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1, // Next day
    0, 0, 0, 0 // Midnight UTC
  ));
  
  rateLimitResetTime = resetTime.getTime();
  console.log(`Rate limit marked. Resets at ${resetTime.toISOString()}`);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbols = searchParams.get('symbols');
    
    if (!symbols) {
      return NextResponse.json(
        { error: 'Missing symbols parameter' },
        { status: 400 }
      );
    }

    const symbolArray = symbols.split(',').map(s => s.trim());
    
    if (symbolArray.length === 0) {
      return NextResponse.json(
        { error: 'No symbols provided' },
        { status: 400 }
      );
    }

    // Check if we're rate limited - if so, return error immediately
    if (isRateLimited()) {
      const resetDate = rateLimitResetTime ? new Date(rateLimitResetTime) : null;
      return NextResponse.json(
        { 
          error: `Rate limit reached. Resets at ${resetDate?.toLocaleString('en-US', { timeZone: 'UTC' })} UTC`,
          type: 'rate_limit',
          rateLimited: true,
          resetTime: rateLimitResetTime
        },
        { status: 429 }
      );
    }

    // Fetch quotes based on configured provider
    let quotes;
    if (API_PROVIDER === 'fmp') {
      console.log('Using Financial Modeling Prep API');
      quotes = await fetchFMPQuotes(symbolArray);
    } else {
      console.log('Using Alpha Vantage API');
      quotes = await fetchAlphaVantageBatch(symbolArray);
    }
    
    return NextResponse.json(quotes);
  } catch (error: any) {
    console.error('Error in quote API route:', error);
    
    // Return error with appropriate status code
    if (error.message?.includes('RATE_LIMIT')) {
      markRateLimited();
      
      const resetDate = rateLimitResetTime ? new Date(rateLimitResetTime) : null;
      return NextResponse.json(
        { 
          error: `Rate limit reached. Resets at ${resetDate?.toLocaleString('en-US', { timeZone: 'UTC' })} UTC`,
          type: 'rate_limit',
          rateLimited: true,
          resetTime: rateLimitResetTime
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
