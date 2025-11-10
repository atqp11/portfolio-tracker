// lib/api/commodities/copper.ts
import axios from 'axios';
import { Commodity } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

const API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY!;
const SYMBOL = 'HG=F';

export const fetchCopperCommodity = async (): Promise<Commodity | null> => {
  const cached = await getCached<Commodity>('copper_commodity');
  if (cached) return cached;

  try {
    const { data } = await axios.get(
      `https://api.polygon.io/v2/last/nbbo/${SYMBOL}?apiKey=${API_KEY}`,
      { timeout: 8000 }
    );

    const r = data.results?.[0];
    if (!r) return null;

    const price = r.p ?? r.a ?? r.b;
    const ts = new Date(r.t).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const result = { price, timestamp: ts };
    await setCached('copper_commodity', result);
    return result;
  } catch (e) {
    console.warn('Copper commodity failed', e);
    return cached;
  }
};