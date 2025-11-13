import { NextResponse } from 'next/server';

const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Track copper rate limits separately
let copperRateLimitResetTime: number | null = null;

function isCopperRateLimited(): boolean {
  if (!copperRateLimitResetTime) return false;
  
  const now = Date.now();
  if (now < copperRateLimitResetTime) {
    console.log(`Copper rate limit active. Resets at ${new Date(copperRateLimitResetTime).toISOString()}`);
    return true;
  }
  
  copperRateLimitResetTime = null;
  return false;
}

function markCopperRateLimited(): void {
  const now = new Date();
  const resetTime = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  copperRateLimitResetTime = resetTime.getTime();
  console.log(`Copper rate limit marked. Resets at ${resetTime.toISOString()}`);
}

export async function GET() {
  console.log('Fetching copper commodity from Alpha Vantage...');
  
  if (!ALPHAVANTAGE_API_KEY) {
    console.warn('ALPHAVANTAGE_API_KEY not configured');
    return NextResponse.json({
      error: 'API key not configured',
      price: 4.25 + (Math.random() - 0.5) * 0.5,
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) + ' (Demo Data - No API Key)'
    });
  }

  // Check if we're rate limited
  if (isCopperRateLimited()) {
    return NextResponse.json({
      error: 'Rate limited',
      price: 4.25 + (Math.random() - 0.5) * 0.5,
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) + ' (Demo Data - Rate Limited)'
    });
  }
  
  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=COPPER&interval=monthly&apikey=${ALPHAVANTAGE_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`API returned error status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Alpha Vantage Copper Response:', JSON.stringify(data).substring(0, 500));

    // Check for rate limit
    if (data.Note || data.Information) {
      if (data.Information?.includes('rate limit') || data.Note?.includes('rate limit')) {
        markCopperRateLimited();
        throw new Error('Rate limit reached');
      }
    }

    // Extract the most recent price from the data array
    const copperDataArray = data.data || [];
    const latestCopper = copperDataArray[0];
    
    const copperPrice = parseFloat(latestCopper?.value || '0');
    const copperDate = latestCopper?.date || new Date().toISOString().split('T')[0];

    const result = {
      price: copperPrice,
      timestamp: `${copperDate} (Alpha Vantage)`
    };

    console.log('Copper commodity result:', result);
    
    if (result.price > 0) {
      return NextResponse.json(result);
    } else {
      throw new Error('No valid price received from Alpha Vantage');
    }
  } catch (error) {
    console.error('Error fetching copper commodity from Polygon:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      price: 4.25 + (Math.random() - 0.5) * 0.5,
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) + ' (Demo Data - API Error)'
    });
  }
}
