// Yahoo Finance API client (server-side only)
// Protects API keys via environment variables

import fetch from 'node-fetch';
import { URL } from 'url';

const YAHOO_API_KEY = process.env.YAHOO_API_KEY;

export async function fetchYahooQuote(ticker: string): Promise<any> {
  if (!YAHOO_API_KEY) throw new Error('Missing Yahoo Finance API key');
  if (!ticker) throw new Error('Ticker symbol is required');
  const url = new URL('https://yfapi.net/v6/finance/quote');
  url.searchParams.set('symbols', ticker);
  let res;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
  try {
    res = await fetch(url.toString(), {
      headers: {
        'x-api-key': YAHOO_API_KEY,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
      console.error('Yahoo Finance API request timed out');
      throw new Error('Yahoo Finance API request timed out');
    }
    console.error('Network error when calling Yahoo Finance:', err);
    throw new Error('Network error when calling Yahoo Finance API');
  }
  if (!res.ok) {
    let errorMsg = `Yahoo Finance API error: ${res.status} ${res.statusText}`;
    try {
      const errorBody = await res.text();
      errorMsg += ` | Body: ${errorBody}`;
    } catch {}
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    console.error('Failed to parse Yahoo Finance response as JSON:', err);
    throw new Error('Invalid JSON response from Yahoo Finance API');
  }
  // Basic validation: check for expected fields
  if (!data || typeof data !== 'object' || !('quoteResponse' in data) || !Array.isArray((data as any).quoteResponse.result)) {
    console.error('Unexpected Yahoo Finance API response structure:', data);
    throw new Error('Unexpected Yahoo Finance API response structure');
  }
  return data;
}

// Extend with more Yahoo Finance endpoints as needed
