// lib/dao/brave-news.dao.ts
// Handles direct Brave News API calls

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

export async function fetchBraveNewsDAO(query: string): Promise<any> {
  if (!BRAVE_API_KEY) throw new Error('Missing Brave Search API key');
  const url = new URL('https://api.search.brave.com/res/v1/news/search');
  url.searchParams.set('q', query);
  let res;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': BRAVE_API_KEY,
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
      console.error('Brave Search API request timed out');
      throw new Error('Brave Search API request timed out');
    }
    console.error('Network error when calling Brave Search:', err);
    throw new Error('Network error when calling Brave Search API');
  } finally {
    clearTimeout(timeoutId);
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
  if (!data || !Array.isArray(data.results)) {
    console.error('Unexpected Brave Search API response structure:', data);
    throw new Error('Unexpected Brave Search API response structure');
  }
  return data;
}
