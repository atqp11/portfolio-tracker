import { NextResponse } from 'next/server';
import { scrapeNewsHeadlines } from '@/lib/api/braveSearch';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }
  try {
    const headlines = await scrapeNewsHeadlines(url);
    return NextResponse.json({ headlines });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
