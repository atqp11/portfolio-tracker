// lib/api/commodities/energy.ts
import axios from 'axios';
import { Commodity } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

const API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY!;
const SYMBOLS = 'CL=F,NG=F';

export const fetchEnergyCommodities = async (): Promise<{
  oil?: Commodity;
  gas?: Commodity;
} | null> => {
  const cached = await getCached<any>('energy_commodities');
  if (cached) return cached;

  try {
    const { data } = await axios.get(
      `https://api.polygon.io/v2/last/nbbo/${SYMBOLS}?apiKey=${API_KEY}`,
      { timeout: 8000 }
    );

    const result: any = {};
    data.results?.forEach((r: any) => {
      const price = r.p ?? r.a ?? r.b;
      const ts = new Date(r.t).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
      if (r.T === 'CL=F') result.oil = { price, timestamp: ts };
      if (r.T === 'NG=F') result.gas = { price, timestamp: ts };
    });

    await setCached('energy_commodities', result);
    return result;
  } catch (e) {
    console.warn('Energy commodities failed', e);
    return cached || null;
  }
};