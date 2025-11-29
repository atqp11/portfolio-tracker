// lib/api/commodities/energy.ts
import { Commodity } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

export const fetchEnergyCommodities = async (): Promise<{
  oil?: Commodity;
  gas?: Commodity;
} | null> => {
  const cached = await getCached<any>('energy_commodities');
  if (cached) return cached;

  console.log('Fetching energy commodities via API route...');
  
  try {
    const response = await fetch('/api/commodities/energy');
    
    if (!response.ok) {
      throw new Error(`API returned error status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Energy commodities result:', result);
    
    // Only cache if we got valid prices
    if (result.oil?.price > 0 || result.gas?.price > 0) {
      await setCached('energy_commodities', result);
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching energy commodities:', error);
    
    // Fall back to demo data if API fails
    const result = {
      oil: { 
        price: 72.50 + (Math.random() - 0.5) * 5,
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }) + ' (Demo Data - API Error)'
      },
      gas: { 
        price: 2.85 + (Math.random() - 0.5) * 0.5,
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }) + ' (Demo Data - API Error)'
      }
    };
    
    await setCached('energy_commodities', result);
    return result;
  }
};