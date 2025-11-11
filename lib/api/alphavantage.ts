// lib/api/alphavantage.ts
export interface AlphaVantageQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

const API_KEY = process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

export const fetchAlphaVantageQuote = async (symbol: string): Promise<AlphaVantageQuote | null> => {
  if (!API_KEY) {
    console.warn('Alpha Vantage API key not configured');
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (data['Error Message'] || data['Note']) {
      console.warn(`Alpha Vantage error for ${symbol}:`, data['Error Message'] || data['Note']);
      return null;
    }
    
    const quote = data['Global Quote'];
    if (!quote) {
      console.warn(`No quote data for ${symbol}`);
      return null;
    }
    
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
  
  // Alpha Vantage free tier has 5 calls per minute limit
  // So we'll process symbols sequentially with delays
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const quote = await fetchAlphaVantageQuote(symbol);
    
    if (quote) {
      priceMap[symbol] = quote.price;
    }
    
    // Add delay between calls to respect rate limits (5 calls/minute = 12 seconds apart)
    if (i < symbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 12500));
    }
  }
  
  return priceMap;
};

// Batch function that tries to get as many quotes as possible within rate limits
export const fetchAlphaVantageBatch = async (symbols: string[]): Promise<Record<string, number>> => {
  if (!API_KEY) {
    console.warn('Alpha Vantage API key not configured');
    return {};
  }

  // For free tier, we can only do 5 calls per minute
  // Take first 5 symbols and process them
  const limitedSymbols = symbols.slice(0, 5);
  
  console.log(`Fetching Alpha Vantage quotes for: ${limitedSymbols.join(', ')}`);
  
  return fetchAlphaVantageQuotes(limitedSymbols);
};