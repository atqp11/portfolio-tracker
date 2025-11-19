// Use global fetch (Next.js API routes and server components)

export interface FinnhubNewsArticle {
  category?: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export async function fetchFinnhubCompanyNews(symbol: string, from: string, to: string): Promise<FinnhubNewsArticle[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error('FINNHUB_API_KEY not set');
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId); // Clear timeout on error
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Finnhub API request timed out');
    }
    throw new Error('Network error when calling Finnhub API');
  } finally {
    clearTimeout(timeoutId); // Always clear timeout
  }
  if (res.status === 401) throw new Error('Finnhub API unauthorized (401): Check API key');
  if (res.status === 429) throw new Error('Finnhub API rate limit exceeded (429)');
  if (!res.ok) {
    let errorMsg = `Finnhub API error: ${res.status} ${res.statusText}`;
    try {
      const errorBody = await res.text();
      errorMsg += ` | Body: ${errorBody}`;
    } catch {}
    throw new Error(errorMsg);
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error('Invalid JSON response from Finnhub API');
  }
  if (!Array.isArray(data)) throw new Error('Unexpected Finnhub API response');
  return data;
}

export async function fetchFinnhubGeneralNews(category: string = 'general'): Promise<FinnhubNewsArticle[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error('FINNHUB_API_KEY not set');
  const url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}&token=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Finnhub API request timed out');
    }
    throw new Error('Network error when calling Finnhub API');
  }
  if (res.status === 401) throw new Error('Finnhub API unauthorized (401): Check API key');
  if (res.status === 429) throw new Error('Finnhub API rate limit exceeded (429)');
  if (!res.ok) {
    let errorMsg = `Finnhub API error: ${res.status} ${res.statusText}`;
    try {
      const errorBody = await res.text();
      errorMsg += ` | Body: ${errorBody}`;
    } catch {}
    throw new Error(errorMsg);
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error('Invalid JSON response from Finnhub API');
  }
  if (!Array.isArray(data)) throw new Error('Unexpected Finnhub API response');
  return data;
}
