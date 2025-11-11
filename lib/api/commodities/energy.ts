// lib/api/commodities/energy.ts
import { Commodity } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

export const fetchEnergyCommodities = async (): Promise<{
  oil?: Commodity;
  gas?: Commodity;
} | null> => {
  const cached = await getCached<any>('energy_commodities');
  if (cached) return cached;

  console.log('Fetching energy commodities (using demo data)...');
  
  // Use realistic demo data since commodity futures aren't available on free APIs
  const result = {
    oil: { 
      price: 72.50 + (Math.random() - 0.5) * 5, // $67.50 - $77.50 range
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) + ' (Demo Data)'
    },
    gas: { 
      price: 2.85 + (Math.random() - 0.5) * 0.5, // $2.60 - $3.10 range
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) + ' (Demo Data)'
    }
  };
  
  console.log('Energy commodities result:', result);
  
  await setCached('energy_commodities', result);
  return result;
};