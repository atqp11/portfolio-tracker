import { NextResponse } from 'next/server';
import { marketDataService } from '@/lib/services/market-data.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  console.log('[/api/commodities/copper] Fetching copper commodity');

  try {
    const copper = await marketDataService.getCopperPrice();

    const result = {
      price: copper.price,
      timestamp: copper.timestamp
    };

    console.log(`[/api/commodities/copper] Returning copper=$${copper.price} (${copper.source})`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/commodities/copper] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
