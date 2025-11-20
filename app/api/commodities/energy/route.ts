import { NextResponse } from 'next/server';
import { marketDataService } from '@/lib/services/market-data.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  console.log('[/api/commodities/energy] Fetching energy commodities');

  try {
    const { oil, gas } = await marketDataService.getEnergyCommodities();

    const result = {
      oil: {
        price: oil.price,
        timestamp: oil.timestamp
      },
      gas: {
        price: gas.price,
        timestamp: gas.timestamp
      }
    };

    console.log(`[/api/commodities/energy] Returning oil=$${oil.price} (${oil.source}), gas=$${gas.price} (${gas.source})`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/commodities/energy] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
