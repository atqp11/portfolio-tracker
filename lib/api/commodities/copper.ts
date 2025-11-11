// lib/api/commodities/copper.ts
import { Commodity } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

export const fetchCopperCommodity = async (): Promise<Commodity | null> => {
  const cached = await getCached<Commodity>('copper_commodity');
  if (cached) return cached;

  console.log('Fetching copper commodities (using demo data)...');
  
  // Use realistic demo data since commodity futures aren't available on free APIs
  const result = {
    price: 4.25 + (Math.random() - 0.5) * 0.5, // $4.00 - $4.50 range
    timestamp: new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }) + ' (Demo Data)'
  };
  
  console.log('Copper commodities result:', result);
  
  await setCached('copper_commodity', result);
  return result;
};