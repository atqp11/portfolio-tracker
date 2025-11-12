import { NextRequest, NextResponse } from 'next/server';
import { fetchAlphaVantageBatch } from '@/lib/api/alphavantage';

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

    // Fetch quotes from Alpha Vantage
    const quotes = await fetchAlphaVantageBatch(symbolArray);
    
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
