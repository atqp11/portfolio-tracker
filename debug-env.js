// Simple test to check environment variables
console.log('Environment Variables Test:');
console.log('NEXT_PUBLIC_POLYGON_API_KEY:', process.env.NEXT_PUBLIC_POLYGON_API_KEY || 'undefined');
console.log('NEXT_PUBLIC_ALPHAVANTAGE_API_KEY:', process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY || 'undefined');
console.log('NEXT_PUBLIC_NEWS_API_KEY:', process.env.NEXT_PUBLIC_NEWS_API_KEY || 'undefined');

// Test with a simple Canadian stock symbol
async function testApi() {
  const symbol = 'CNQ.TO';
  const polygonKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY;
  const alphaKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY;
  
  console.log('\n--- Testing Polygon.io ---');
  try {
    const res = await fetch(`https://api.polygon.io/v2/last/nbbo/${symbol}?apiKey=${polygonKey}`);
    const data = await res.json();
    console.log('Polygon response for', symbol, ':', data);
  } catch (error) {
    console.error('Polygon error:', error);
  }

  console.log('\n--- Testing Alpha Vantage (without .TO) ---');
  try {
    const cleanSymbol = symbol.replace('.TO', '');
    const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${cleanSymbol}&apikey=${alphaKey}`);
    const data = await res.json();
    console.log('Alpha Vantage response for', cleanSymbol, ':', data);
  } catch (error) {
    console.error('Alpha Vantage error:', error);
  }
}

testApi();