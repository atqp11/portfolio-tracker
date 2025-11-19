// SEC EDGAR API client (server-side only)
// Protects API keys via environment variables

// Use global fetch (Node.js 18+ and Next.js)
// Use global URL constructor

const EDGAR_API_KEY = process.env.EDGAR_API_KEY;

export async function fetchCompanyFilings(cik: string): Promise<any> {
  if (!cik) throw new Error('CIK (Central Index Key) is required');
  const url = new URL(`https://data.sec.gov/submissions/CIK${cik}.json`);
  let res;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
  try {
    res = await fetch(url.toString(), {
      headers: {
        'User-Agent': `YourAppName/1.0 (${EDGAR_API_KEY})`,
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId); // Clear timeout on error
    if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
      console.error('SEC EDGAR API request timed out');
      throw new Error('SEC EDGAR API request timed out');
    }
    console.error('Network error when calling SEC EDGAR:', err);
    throw new Error('Network error when calling SEC EDGAR API');
  } finally {
    clearTimeout(timeoutId); // Always clear timeout
  }
  if (!res.ok) {
    let errorMsg = `SEC EDGAR API error: ${res.status} ${res.statusText}`;
    let errorBody = '';
    try {
      errorBody = await res.text();
      errorMsg += ` | Body: ${errorBody}`;
    } catch {}
    // Special handling for NoSuchKey (CIK not found)
    if (res.status === 404 && errorBody.includes('NoSuchKey')) {
      throw new Error('No filings found for this CIK or symbol.');
    }
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    console.error('Failed to parse SEC EDGAR response as JSON:', err);
    throw new Error('Invalid JSON response from SEC EDGAR API');
  }
  // Basic validation: check for expected fields
  if (!data || typeof data !== 'object' || !('cik' in data)) {
    console.error('Unexpected SEC EDGAR API response structure:', data);
    throw new Error('Unexpected SEC EDGAR API response structure');
  }
  return data;
}

// Extend with more SEC EDGAR endpoints as needed
