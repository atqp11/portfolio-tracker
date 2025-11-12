// lib/api/alphavantage.ts
export interface AlphaVantageQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

const API_KEY = process.env.ALPHAVANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

// Adding detailed logging to debug fetching quotes
export const fetchAlphaVantageQuote = async (symbol: string): Promise<AlphaVantageQuote | null> => {
  if (!API_KEY) {
    console.warn('Alpha Vantage API key not configured');
    return null;
  }

  try {
    console.log(`Fetching quote for symbol: ${symbol}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced to 5 seconds for faster failure

    const response = await fetch(
      `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    console.log(`Response received for symbol: ${symbol}`);
    const data = await response.json();
    console.log(`Data for symbol ${symbol}:`, data);

    // Check for rate limit or error messages
    if (data['Error Message'] || data['Note'] || data['Information']) {
      const errorMsg = data['Error Message'] || data['Note'] || data['Information'];
      console.warn(`Alpha Vantage error for ${symbol}:`, errorMsg);
      
      // Throw specific error for rate limits so it can be caught and classified
      if (errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('api rate limit')) {
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }
      
      return null;
    }

    const quote = data['Global Quote'];
    if (!quote) {
      console.warn(`No quote data for ${symbol}`);
      return null;
    }

    console.log(`Parsed quote for ${symbol}:`, quote);
    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent']
    };
  } catch (error) {
    console.warn(`Alpha Vantage fetch failed for ${symbol}:`, error);
    return null;
  }
};

export const fetchAlphaVantageQuotes = async (symbols: string[]): Promise<Record<string, number>> => {
  const priceMap: Record<string, number> = {};
  let rateLimitDetected = false;
  
  // Make all API calls in parallel - let Alpha Vantage handle rate limiting
  // This is much faster as we get results immediately until we hit the limit
  const promises = symbols.map(symbol => 
    fetchAlphaVantageQuote(symbol)
      .then(quote => ({ symbol, quote, error: null }))
      .catch(error => {
        console.warn(`Failed to fetch ${symbol}:`, error);
        // Check if it's a rate limit error
        if (error?.message?.includes('RATE_LIMIT')) {
          rateLimitDetected = true;
        }
        return { symbol, quote: null, error };
      })
  );
  
  // Wait for all requests to complete (or fail)
  const results = await Promise.all(promises);
  
  // Build price map from results
  results.forEach(({ symbol, quote }) => {
    if (quote) {
      priceMap[symbol] = quote.price;
    }
  });
  
  // If rate limit detected, throw error so it can be properly handled
  if (rateLimitDetected && Object.keys(priceMap).length === 0) {
    throw new Error('RATE_LIMIT: API rate limit exceeded. Please try again later or upgrade your API plan.');
  }
  
  return priceMap;
};

// Batch function that tries to get as many quotes as possible within rate limits
export const fetchAlphaVantageBatch = async (symbols: string[]): Promise<Record<string, number> | { error: string; type: string; status: number }> => {
  if (!API_KEY) {
    console.error('Alpha Vantage API key is missing. Please set the API_KEY environment variable in your .env.local file.');
    return {
      error: 'API key not configured',
      type: 'auth',
      status: 401
    };
  }

  // For free tier, we can only do 5 calls per minute
  // Take first 5 symbols and process them
  const limitedSymbols = symbols.slice(0, 5);
  
  console.log(`Fetching Alpha Vantage quotes for: ${limitedSymbols.join(', ')}`);
  
  try {
    const result = await fetchAlphaVantageQuotes(limitedSymbols);
    
    // If no quotes were fetched, it might be a rate limit issue
    if (Object.keys(result).length === 0 && limitedSymbols.length > 0) {
      return {
        error: 'No quotes could be fetched. This may be due to API rate limits.',
        type: 'rate_limit',
        status: 429
      };
    }
    
    return result;
  } catch (error: any) {
    console.error('Batch fetch error:', error);
    return {
      error: error?.message || 'Failed to fetch quotes',
      type: 'unknown',
      status: 503
    };
  }
};