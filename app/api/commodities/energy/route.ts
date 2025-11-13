import { NextResponse } from 'next/server';

const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Track commodity rate limits separately
let commodityRateLimitResetTime: number | null = null;

function isCommodityRateLimited(): boolean {
  if (!commodityRateLimitResetTime) return false;
  
  const now = Date.now();
  if (now < commodityRateLimitResetTime) {
    console.log(`Commodity rate limit active. Resets at ${new Date(commodityRateLimitResetTime).toISOString()}`);
    return true;
  }
  
  commodityRateLimitResetTime = null;
  return false;
}

function markCommodityRateLimited(): void {
  const now = new Date();
  const resetTime = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  commodityRateLimitResetTime = resetTime.getTime();
  console.log(`Commodity rate limit marked. Resets at ${resetTime.toISOString()}`);
}

export async function GET() {
  console.log('Fetching energy commodities from Alpha Vantage...');
  
  if (!ALPHAVANTAGE_API_KEY) {
    console.warn('ALPHAVANTAGE_API_KEY not configured');
    return NextResponse.json({
      error: 'API key not configured',
      oil: { 
        price: 72.50 + (Math.random() - 0.5) * 5,
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }) + ' (Demo Data - No API Key)'
      },
      gas: { 
        price: 2.85 + (Math.random() - 0.5) * 0.5,
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }) + ' (Demo Data - No API Key)'
      }
    });
  }

  // Check if we're rate limited
  if (isCommodityRateLimited()) {
    return NextResponse.json({
      error: 'Rate limited',
      oil: { 
        price: 72.50 + (Math.random() - 0.5) * 5,
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }) + ' (Demo Data - Rate Limited)'
      },
      gas: { 
        price: 2.85 + (Math.random() - 0.5) * 0.5,
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }) + ' (Demo Data - Rate Limited)'
      }
    });
  }
  
  try {
    // Fetch both WTI and Natural Gas from Alpha Vantage commodity API
    const [oilResponse, gasResponse] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=WTI&interval=daily&apikey=${ALPHAVANTAGE_API_KEY}`),
      fetch(`https://www.alphavantage.co/query?function=NATURAL_GAS&interval=daily&apikey=${ALPHAVANTAGE_API_KEY}`)
    ]);

    const oilData = await oilResponse.json();
    const gasData = await gasResponse.json();

    console.log('Alpha Vantage Oil Response:', JSON.stringify(oilData).substring(0, 500));
    console.log('Alpha Vantage Gas Response:', JSON.stringify(gasData).substring(0, 500));

    // Check for rate limit
    if (oilData.Note || oilData.Information) {
      if (oilData.Information?.includes('rate limit') || oilData.Note?.includes('rate limit')) {
        markCommodityRateLimited();
        throw new Error('Rate limit reached');
      }
    }

    // Extract the most recent price from the data array
    const oilDataArray = oilData.data || [];
    const gasDataArray = gasData.data || [];
    
    const latestOil = oilDataArray[0];
    const latestGas = gasDataArray[0];
    
    const oilPrice = parseFloat(latestOil?.value || '0');
    const gasPrice = parseFloat(latestGas?.value || '0');
    
    const oilDate = latestOil?.date || new Date().toISOString().split('T')[0];
    const gasDate = latestGas?.date || new Date().toISOString().split('T')[0];
    
    const result = {
      oil: {
        price: oilPrice,
        timestamp: `${oilDate} (Alpha Vantage)`
      },
      gas: {
        price: gasPrice,
        timestamp: `${gasDate} (Alpha Vantage)`
      }
    };

    console.log('Energy commodities result:', result);
    
    if (result.oil.price > 0 || result.gas.price > 0) {
      return NextResponse.json(result);
    } else {
      throw new Error('No valid prices received from Alpha Vantage');
    }
  } catch (error) {
    console.error('Error fetching energy commodities from Polygon:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      oil: { 
        price: 72.50 + (Math.random() - 0.5) * 5,
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }) + ' (Demo Data - API Error)'
      },
      gas: { 
        price: 2.85 + (Math.random() - 0.5) * 0.5,
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }) + ' (Demo Data - API Error)'
      }
    });
  }
}
