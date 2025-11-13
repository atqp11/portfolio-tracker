import { NextRequest, NextResponse } from 'next/server';
import { fetchAlphaVantageBatch } from '@/lib/api/alphavantage';
import { fetchFMPQuotes } from '@/lib/api/fmp';

// Force using Alpha Vantage only because FMP endpoints are limited to some symbols.
// We keep the FMP client in the repo for reference/fallback, but the route will
// always use Alpha Vantage to fetch quotes.
const API_PROVIDER: string = 'alphavantage';
console.log('API provider forced to Alpha Vantage (STOCK_API_PROVIDER ignored)');

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
      return NextResponse.json(
        { error: error.message, type: 'rate_limit' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
