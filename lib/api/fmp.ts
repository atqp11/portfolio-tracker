// lib/api/fmp.ts - Financial Modeling Prep API
export interface FMPQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

const API_KEY = process.env.FMP_API_KEY;
// Use the current supported "stable" endpoints (new signups). The legacy
// `/api/v3` endpoints are being deprecated for many accounts; docs use
// `https://financialmodelingprep.com/stable` and query-style parameters.
const BASE_URL = 'https://financialmodelingprep.com/stable';

// Fetch real-time quote from Financial Modeling Prep
export const fetchFMPQuote = async (symbol: string): Promise<FMPQuote | null> => {
  if (!API_KEY) {
    console.warn('FMP API key not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    console.log(`Fetching FMP quote for symbol: ${symbol}`);

    const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    console.log(`FMP request URL: ${url}`);
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      // Try to capture a useful message from the body (some accounts hit a
      // "Legacy Endpoint" message even when the key is valid).
      let bodyText = '';
      try { bodyText = await response.text(); } catch { /* ignore */ }
      console.warn(`FMP API error for ${symbol}: ${response.status} ${bodyText}`);

      // If this looks like the legacy-endpoint refusal, surface a clearer
      // message for debugging/ops.
      if (response.status === 403 && /legacy/i.test(bodyText)) {
        console.error('FMP returned a legacy-endpoint 403: your account may need to be upgraded or switched to the /stable endpoints. See https://site.financialmodelingprep.com/developer/docs/pricing');
      }

      return null;
    }

    const data = await response.json();
    console.log(`FMP data for ${symbol}:`, data);

    // FMP returns array of quotes
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`No FMP quote data for ${symbol}`);
      return null;
    }

    const quote = data[0];

    console.log(`Parsed FMP quote for ${symbol}:`, quote);

    return {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changesPercentage?.toFixed(2) + '%' || '0.00%',
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn(`FMP request timeout for ${symbol}`);
      } else {
        console.error(`Error fetching FMP quote for ${symbol}:`, error.message);
      }
    }
    return null;
  } finally {
    clearTimeout(timeoutId); // Always clear timeout
  }
};

// Batch fetch multiple quotes (FMP supports up to 1000 symbols per request)
export const fetchFMPQuotes = async (symbols: string[]): Promise<Record<string, FMPQuote>> => {
  if (!API_KEY) {
    console.warn('FMP API key not configured');
    return {};
  }

  const results: Record<string, FMPQuote> = {};

  try {
    console.log(`Fetching FMP quotes (per-symbol) for: ${symbols.join(', ')}`);

    // The free/basic FMP plan does not allow the `batch-quote` endpoint.
    // Use per-symbol `/quote?symbol=` requests so the feature works for
    // free-tier accounts. Each per-symbol request logs its exact URL.
    const settled = await Promise.allSettled(symbols.map((s) => fetchFMPQuote(s)));
    settled.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value) {
        results[symbols[idx]] = res.value;
      }
    });

    console.log(`Fetched ${Object.keys(results).length} quotes via per-symbol requests`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching FMP quotes:', error.message);
    }
  }

  return results;
};
