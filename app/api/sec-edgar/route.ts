import { NextResponse } from 'next/server';
import { secEdgarService } from '@/lib/services/sec-edgar.service';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let cik = searchParams.get('cik');
  const symbol = searchParams.get('symbol');

  // If cik is not valid and symbol is provided, resolve CIK from symbol
  if ((!cik || !/^\d{8,10}$/.test(cik.trim())) && symbol) {
    cik = await secEdgarService.getCik(symbol.trim().toUpperCase());
    if (!cik) {
      return NextResponse.json({ error: 'Could not resolve CIK for symbol using SEC lookup.' }, { status: 404 });
    }
  }

  // If cik is still not valid, error
  if (!cik || !/^\d{8,10}$/.test(cik.trim())) {
    return NextResponse.json({ error: 'Missing or invalid CIK. Provide a valid CIK (8-10 digits) or a symbol.' }, { status: 400 });
  }
  try {
    const data = await secEdgarService.getCompanyFilings(cik.trim());
    return NextResponse.json(data);
  } catch (err: any) {
    // Graceful error handling for known cases
    if (err.message?.includes('timed out')) {
      return NextResponse.json({ error: 'SEC EDGAR request timed out. Please try again.' }, { status: 504 });
    }
    if (err.message?.includes('Network error')) {
      return NextResponse.json({ error: 'Network error when calling SEC EDGAR. Please check connectivity.' }, { status: 502 });
    }
    if (err.message?.includes('Invalid JSON')) {
      return NextResponse.json({ error: 'SEC EDGAR returned invalid data. Try a different CIK.' }, { status: 502 });
    }
    if (err.message?.includes('Unexpected SEC EDGAR API response structure')) {
      return NextResponse.json({ error: 'SEC EDGAR returned unexpected data. Try a different CIK.' }, { status: 502 });
    }
    if (err.message?.includes('No filings found for this CIK or symbol.')) {
      return NextResponse.json({ error: 'No filings found for this CIK or symbol.' }, { status: 404 });
    }
    if (err.message?.includes('SEC EDGAR API error')) {
      if (err.message?.includes('404')) {
        return NextResponse.json({ error: 'No filings found for this CIK.' }, { status: 404 });
      }
      return NextResponse.json({ error: 'SEC EDGAR API error.' }, { status: 502 });
    }
    // Fallback: generic error
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
