// app/api/fundamentals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCompanyOverview,
  fetchIncomeStatement,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchAlphaVantageQuote,
} from '@/lib/api/alphavantage';
import { calculateFundamentalMetrics } from '@/lib/calculator';
import {
  getCachedFundamentals,
  cacheFundamentals,
  getQuoteTTL,
  CACHE_CONFIG,
} from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FundamentalsResponse {
  ticker: string;
  price: number;
  metrics: any;
  overview: any;
  income: any;
  balance: any;
  cashFlow: any;
  source: 'alpha_vantage' | 'yahoo' | 'fmp' | 'cache';
  cachedAt?: string;
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

  // (debug removed) handler starts here
  try {
    // Check cache first
    const cachedQuote = getCachedFundamentals(ticker, 'quote');
    const cachedFundamentals = getCachedFundamentals(ticker, 'fundamentals');
    const cachedIncome = getCachedFundamentals(ticker, 'income');
    const cachedBalance = getCachedFundamentals(ticker, 'balance');
    const cachedCashFlow = getCachedFundamentals(ticker, 'cashflow');

    // If all data is cached, return immediately
    if (cachedQuote && cachedFundamentals && cachedIncome && cachedBalance && cachedCashFlow) {
      const metrics = calculateFundamentalMetrics(
        cachedFundamentals,
        cachedIncome,
        cachedBalance,
        cachedQuote.price
      );

      const response: FundamentalsResponse = {
        ticker,
        price: cachedQuote.price,
        metrics,
        overview: cachedFundamentals,
        income: cachedIncome,
        balance: cachedBalance,
        cashFlow: cachedCashFlow,
        source: 'cache',
        ...(includeDebug ? { debugRouteHit: true } : {}),
        cachedAt: new Date(Date.now() - (15 * 60 * 1000)).toISOString(), // Approximate
        fetchedAt: new Date().toISOString(),
      };

      // Set cache headers
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': `public, max-age=${Math.floor(getQuoteTTL() / 1000)}`,
        },
      });
    }

    // Fetch missing data from Alpha Vantage

    const [quote, overview, income, balance, cashFlow] = await Promise.all([
      cachedQuote || fetchAlphaVantageQuote(ticker),
      cachedFundamentals || fetchCompanyOverview(ticker),
      cachedIncome || fetchIncomeStatement(ticker),
      cachedBalance || fetchBalanceSheet(ticker),
      cachedCashFlow || fetchCashFlow(ticker),
    ]);

    // Check if Alpha Vantage failed
    if (!quote || !overview || !income || !balance || !cashFlow) {
      console.warn(`⚠️ Alpha Vantage incomplete data for ${ticker}, attempting fallback`);
      
      // TODO: Implement Yahoo Finance fallback
      // const yahooData = await fetchYahooFundamentals(ticker);
      
      // TODO: Implement FMP fallback
      // const fmpData = await fetchFMPFundamentals(ticker);
      
      return NextResponse.json(
        {
          error: 'Unable to fetch fundamental data',
          ticker,
          details: 'Alpha Vantage API failed and fallback providers not yet implemented',
        },
        { status: 503 }
      );
    }

    // Cache the results
    if (quote && !cachedQuote) {
      cacheFundamentals(ticker, 'quote', quote);
    }
    if (overview && !cachedFundamentals) {
      cacheFundamentals(ticker, 'fundamentals', overview);
    }
    if (income && !cachedIncome) {
      cacheFundamentals(ticker, 'income', income);
    }
    if (balance && !cachedBalance) {
      cacheFundamentals(ticker, 'balance', balance);
    }
    if (cashFlow && !cachedCashFlow) {
      cacheFundamentals(ticker, 'cashflow', cashFlow);
    }

    // Calculate metrics
    const metrics = calculateFundamentalMetrics(
      overview,
      income,
      balance,
      quote.price
    );

    const response: FundamentalsResponse = {
      ticker,
      price: quote.price,
      metrics,
      overview,
      income,
      balance,
      cashFlow,
      source: 'alpha_vantage',
      ...(includeDebug ? { debugRouteHit: true } : {}),
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${Math.floor(getQuoteTTL() / 1000)}`,
      },
    });
  } catch (error: any) {
    console.error(`❌ Error fetching fundamentals for ${ticker}:`, error);

    // Check if it's a rate limit error
    if (error?.message?.includes('RATE_LIMIT')) {
      return NextResponse.json(
        {
          error: 'API rate limit exceeded',
          ticker,
          details: 'Please try again in a few minutes or upgrade your API plan',
          type: 'rate_limit',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch fundamentals',
        ticker,
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
