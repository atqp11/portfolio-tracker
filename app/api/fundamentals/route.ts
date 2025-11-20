// app/api/fundamentals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { financialDataService } from '@/lib/services/financial-data.service';
import { stockDataService } from '@/lib/services/stock-data.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FundamentalsResponse {
  ticker: string;
  price: number;
  fundamentals: any;
  source: 'yahoo' | 'alphavantage' | 'merged' | 'cache';
  timestamp: number;
  debugRouteHit?: boolean;
  fetchedAt: string;
}

/**
 * GET /api/fundamentals?ticker=AAPL
 * Fetches fundamental data with smart caching and fallback chain
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.toUpperCase();
  const includeDebug = searchParams.get('debug') === 'true';

  if (!ticker) {
    return NextResponse.json(
      { error: 'Ticker parameter is required' },
      { status: 400 }
    );
  }

  console.log(`[/api/fundamentals] Fetching fundamentals for: ${ticker}`);

  try {
    // Fetch price and fundamentals in parallel using new service layer
    const [quote, fundamentals] = await Promise.all([
      stockDataService.getQuote(ticker),
      financialDataService.getFundamentals(ticker)
    ]);

    const response: FundamentalsResponse = {
      ticker,
      price: quote.price,
      fundamentals,
      source: fundamentals.source,
      timestamp: fundamentals.timestamp,
      ...(includeDebug ? { debugRouteHit: true } : {}),
      fetchedAt: new Date().toISOString()
    };

    console.log(`[/api/fundamentals] Returning fundamentals for ${ticker} (source: ${fundamentals.source})`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600' // 1 hour
      }
    });
  } catch (error: any) {
    console.error(`[/api/fundamentals] Error fetching fundamentals for ${ticker}:`, error);

    // Check if it's a rate limit error
    if (error?.message?.includes('RATE_LIMIT')) {
      return NextResponse.json(
        {
          error: 'API rate limit exceeded',
          ticker,
          details: 'Please try again in a few minutes',
          type: 'rate_limit'
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch fundamentals',
        ticker,
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
