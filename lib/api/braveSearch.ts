// Brave Search API client (server-side only)
// Protects API keys via environment variables

// Use global fetch (Node.js 18+ or polyfilled)
// Use global URL constructor (works in Node.js and browser)
// Removed cheerio import; not needed for API-based headlines

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

export async function fetchBraveNews(query: string): Promise<any> {
  if (!BRAVE_API_KEY) throw new Error('Missing Brave Search API key');
  const url = new URL('https://api.search.brave.com/res/v1/news/search');
  url.searchParams.set('q', query);
  let res;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
  try {
    res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': BRAVE_API_KEY,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
      console.error('Brave Search API request timed out');
      throw new Error('Brave Search API request timed out');
    }
    console.error('Network error when calling Brave Search:', err);
    throw new Error('Network error when calling Brave Search API');
  }
  if (!res.ok) {
    let errorMsg = `Brave Search API error: ${res.status} ${res.statusText}`;
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
    console.error('Failed to parse Brave Search response as JSON:', err);
    throw new Error('Invalid JSON response from Brave Search API');
  }
  // Basic validation: check for expected fields
  if (!data || !Array.isArray(data.results)) {
    console.error('Unexpected Brave Search API response structure:', data);
    throw new Error('Unexpected Brave Search API response structure');
  }
  return data;
}

// Extend with more Brave Search endpoints as needed
// ...existing code...
// Finnhub-powered news headline fetcher
import { fetchFinnhubCompanyNews } from './finnhub';
import { fetchFinnhubGeneralNews } from './finnhub';

export async function scrapeNewsHeadlines(tickerOrKeyword: string): Promise<{ headline: string, link: string }[]> {
  // Use Finnhub for ticker-based news, fallback to general news for keywords
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 14); // last 2 weeks
  const from = fromDate.toISOString().slice(0, 10);
  // Simple ticker validation: 1-5 uppercase letters (US stocks)
  const isTicker = /^[A-Z]{1,5}$/.test(tickerOrKeyword.trim());
  try {
    let articles;
    if (isTicker) {
      articles = await fetchFinnhubCompanyNews(tickerOrKeyword, from, to);
    } else {
      articles = await fetchFinnhubGeneralNews(tickerOrKeyword);
    }
    return articles.map(a => ({ headline: a.headline, link: a.url }));
  } catch (err) {
    console.error('Finnhub news fetch error:', err);
    return [];
  }
}
