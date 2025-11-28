// app/api/fundamentals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { financialDataService } from '@backend/modules/stocks/service/financial-data.service';
import { stockDataService } from '@backend/modules/stocks/service/stock-data.service';

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

    // Transform fundamentals data to match expected format for stock detail page
    const metrics = {
      pe: fundamentals.trailingPE,
      pb: fundamentals.priceToBook,
      evToEbitda: null, // Not available in current data
      grahamNumber: null, // Would need to calculate
      roe: fundamentals.returnOnEquity ? fundamentals.returnOnEquity * 100 : null,
      roic: null, // Not available
      roa: fundamentals.returnOnAssets ? fundamentals.returnOnAssets * 100 : null,
      netMargin: fundamentals.profitMargins ? fundamentals.profitMargins * 100 : null,
      operatingMargin: fundamentals.operatingMargins ? fundamentals.operatingMargins * 100 : null,
      debtToEquity: fundamentals.debtToEquity,
      currentRatio: fundamentals.currentRatio,
      marginOfSafety: null, // Would need to calculate
    };

    const overview = {
      Name: ticker, // We don't have company name in fundamentals
      Symbol: ticker,
      Description: fundamentals.description || 'No description available',
      Exchange: 'N/A',
      Sector: fundamentals.sector || 'N/A',
      Industry: fundamentals.industry || 'N/A',
      MarketCapitalization: fundamentals.marketCap?.toString() || '0',
      Beta: fundamentals.beta?.toString() || 'N/A',
      '52WeekHigh': null, // Not in fundamentals
      '52WeekLow': null, // Not in fundamentals
    };

    const response: FundamentalsResponse = {
      ticker,
      price: quote.price,
      fundamentals,
      source: fundamentals.source,
      timestamp: fundamentals.timestamp,
      ...(includeDebug ? { debugRouteHit: true } : {}),
      fetchedAt: new Date().toISOString()
    };

    // Add transformed data for backwards compatibility with stock detail page
    const fullResponse = {
      ...response,
      metrics,
      overview,
      income: { annualReports: [] }, // Financial statements not implemented yet
      balance: { annualReports: [] },
      cashFlow: { annualReports: [] },
    };

    console.log(`[/api/fundamentals] Returning fundamentals for ${ticker} (source: ${fundamentals.source})`);

    return NextResponse.json(fullResponse, {
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
