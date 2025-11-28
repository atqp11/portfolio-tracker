/**
 * Stock Quote API Route
 *
 * Fetches real-time stock quotes for given symbols.
 * Uses intelligent fallback between multiple data sources.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stockDataService } from '@/server/services/stock-data.service';
import { SuccessResponse, ErrorResponse } from '@/lib/types/base/response.dto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema for quote request
const quoteRequestSchema = z.object({
  symbols: z
    .string()
    .min(1, 'Symbols parameter is required')
    .transform(val =>
      val
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    )
    .refine(arr => arr.length > 0, 'At least one symbol is required')
    .refine(arr => arr.length <= 50, 'Maximum 50 symbols allowed'),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbols = searchParams.get('symbols');

    // Validate request
    const validation = quoteRequestSchema.safeParse({ symbols });
    if (!validation.success) {
      const errors = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        ErrorResponse.validation('Invalid quote request', undefined, errors),
        { status: 400 }
      );
    }

    const symbolArray = validation.data.symbols;

    console.log(`[/api/quote] Fetching quotes for: ${symbolArray.join(', ')}`);

    // Use service layer with intelligent fallback
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
        timestamp: quote.timestamp,
      };
    });

    // Include errors if any
    Object.entries(result.errors).forEach(([symbol, error]) => {
      quotes[symbol] = {
        symbol,
        error: error,
        price: null,
        change: null,
        changePercent: null,
      };
    });

    console.log(
      `[/api/quote] Returning ${Object.keys(result.quotes).length} quotes, ${
        Object.keys(result.errors).length
      } errors (${result.cached} cached, ${result.fresh} fresh)`
    );

    return NextResponse.json(
      SuccessResponse.create({
        quotes,
        stats: {
          cached: result.cached,
          fresh: result.fresh,
          errors: Object.keys(result.errors).length,
        },
      })
    );
  } catch (error: any) {
    console.error('[/api/quote] Error:', error);

    return NextResponse.json(
      ErrorResponse.internal(error.message || 'Failed to fetch quotes'),
      { status: 500 }
    );
  }
}
