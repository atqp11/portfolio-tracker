import { NextRequest, NextResponse } from 'next/server';
import { stockDataService } from '@/lib/services/stock-data.service';

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    console.log(`[/api/quote] Fetching quotes for: ${symbolArray.join(', ')}`);

    // Use new service layer with intelligent fallback
    const result = await stockDataService.getBatchQuotes(symbolArray);

    // Convert service response to API format
    const quotes: Record<string, any> = {};

    Object.entries(result.quotes).forEach(([symbol, quote]) => {
      quotes[symbol] = {
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        source: quote.source,
        timestamp: quote.timestamp
      };
    });

    // Include errors if any
    Object.entries(result.errors).forEach(([symbol, error]) => {
      quotes[symbol] = {
        symbol,
        error: error,
        price: null,
        change: null,
        changePercent: null
      };
    });

    console.log(`[/api/quote] Returning ${Object.keys(result.quotes).length} quotes, ${Object.keys(result.errors).length} errors (${result.cached} cached, ${result.fresh} fresh)`);

    return NextResponse.json(quotes);
  } catch (error: any) {
    console.error('[/api/quote] Error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
