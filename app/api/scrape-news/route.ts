import { NextResponse } from 'next/server';

// NOTE: This endpoint was deprecated in Phase 3 when Finnhub was removed.
// It was used for scraping news headlines using Finnhub's service.
// Consider removing this endpoint entirely or implementing with a different service.

export async function GET(request: Request) {
  return NextResponse.json(
    {
      error: 'This endpoint has been deprecated. Finnhub service was removed in Phase 3.',
      message: 'Please use /api/news/portfolio/[id] or /api/news/copper or /api/news/energy instead.'
    },
    { status: 410 } // 410 Gone - indicates the resource is no longer available
  );
}
