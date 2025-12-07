// app/api/fundamentals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { financialDataService, type CompanyFundamentals } from '@backend/modules/stocks/service/financial-data.service';
import { stockDataService } from '@backend/modules/stocks/service/stock-data.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FallbackFundamentals extends CompanyFundamentals {
  timestamp: number;
  description?: string;
  sector?: string;
  industry?: string;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
}

interface FundamentalsResponse {
  ticker: string;
  price: number;
  fundamentals: FallbackFundamentals;
  source: 'yahoo' | 'alphavantage' | 'merged' | 'cache' | 'none';
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
    // Fetch quote first (always needed)
    const quote = await stockDataService.getQuote(ticker);

    // Handle null quote (all providers failed) - check BEFORE using quote data
    if (!quote) {
      return NextResponse.json(
        {
          error: 'Failed to fetch stock quote from all providers',
          ticker,
          details: 'All quote providers (Tiingo, Yahoo Finance) are currently unavailable. Please try again later.'
        },
        { status: 503 }
      );
    }

    // Try to fetch fundamentals, but don't fail if it's an ETF or not available
    let fundamentals: FallbackFundamentals;
    try {
      const result = await financialDataService.getFundamentals(ticker);

      // Handle null response (all providers failed)
      if (!result) {
        console.warn(`[/api/fundamentals] All providers failed for ${ticker} (might be ETF/Fund or temporary outage)`);
        fundamentals = {
          symbol: ticker,
          source: 'none',
          timestamp: Date.now(),
          description: 'Fundamental data not available for this security (may be an ETF, commodity, or fund)',
          marketCap: null,
          trailingPE: null,
          forwardPE: null,
          pegRatio: null,
          priceToBook: null,
          priceToSales: null,
          profitMargins: null,
          operatingMargins: null,
          returnOnAssets: null,
          returnOnEquity: null,
          earningsGrowth: null,
          revenueGrowth: null,
          earningsQuarterlyGrowth: null,
          epsTrailing: null,
          epsForward: null,
          revenuePerShare: null,
          beta: null,
          dividendYield: null,
          totalRevenue: null,
          grossProfits: null,
          freeCashflow: null,
          operatingCashflow: null,
        };
      } else {
        // Add timestamp to the result
        fundamentals = {
          ...result,
          timestamp: Date.now(),
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[/api/fundamentals] Error fetching fundamentals for ${ticker}: ${errorMessage}`);
      // Return basic response with quote only (for ETFs, commodities, etc.)
      fundamentals = {
        symbol: ticker,
        source: 'none',
        timestamp: Date.now(),
        description: 'Fundamental data not available for this security (may be an ETF, commodity, or fund)',
        marketCap: null,
        trailingPE: null,
        forwardPE: null,
        pegRatio: null,
        priceToBook: null,
        priceToSales: null,
        profitMargins: null,
        operatingMargins: null,
        returnOnAssets: null,
        returnOnEquity: null,
        earningsGrowth: null,
        revenueGrowth: null,
        earningsQuarterlyGrowth: null,
        epsTrailing: null,
        epsForward: null,
        revenuePerShare: null,
        beta: null,
        dividendYield: null,
        totalRevenue: null,
        grossProfits: null,
        freeCashflow: null,
        operatingCashflow: null,
      };
    }

    // Transform fundamentals data to match expected format for stock detail page
    const metrics = {
      pe: fundamentals.trailingPE ?? null,
      pb: fundamentals.priceToBook ?? null,
      evToEbitda: null, // Not available in current data
      grahamNumber: null, // Would need to calculate
      roe: fundamentals.returnOnEquity ? fundamentals.returnOnEquity * 100 : null,
      roic: null, // Not available
      roa: fundamentals.returnOnAssets ? fundamentals.returnOnAssets * 100 : null,
      netMargin: fundamentals.profitMargins ? fundamentals.profitMargins * 100 : null,
      operatingMargin: fundamentals.operatingMargins ? fundamentals.operatingMargins * 100 : null,
      debtToEquity: fundamentals.debtToEquity ?? null,
      currentRatio: fundamentals.currentRatio ?? null,
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
      '52WeekHigh': fundamentals.fiftyTwoWeekHigh ?? null,
      '52WeekLow': fundamentals.fiftyTwoWeekLow ?? null,
    };

    const response: FundamentalsResponse = {
      ticker,
      price: quote.price,
      fundamentals,
      source: (fundamentals.source || 'none') as 'yahoo' | 'alphavantage' | 'merged' | 'cache' | 'none',
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
  } catch (error: unknown) {
    console.error(`[/api/fundamentals] Error fetching fundamentals for ${ticker}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a rate limit error
    if (errorMessage.includes('RATE_LIMIT')) {
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
          details: errorMessage
        },
        { status: 500 }
      );
  }
}
