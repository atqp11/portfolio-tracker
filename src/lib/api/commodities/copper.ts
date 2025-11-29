// lib/api/commodities/copper.ts
import { Commodity } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

export const fetchCopperCommodity = async (): Promise<Commodity | null> => {
  const cached = await getCached<Commodity>('copper_commodity');
  if (cached) return cached;

  console.log('Fetching copper commodity via API route...');
  
  try {
    const response = await fetch('/api/commodities/copper');
    
    if (!response.ok) {
      throw new Error(`API returned error status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Copper commodity result:', result);
    
    // Only cache if we got a valid price
    if (result.price > 0) {
      await setCached('copper_commodity', result);
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching copper commodity:', error);
    
    // Fall back to demo data if API fails
    const result = {
      price: 4.25 + (Math.random() - 0.5) * 0.5,
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) + ' (Demo Data - API Error)'
    };
    
    await setCached('copper_commodity', result);
    return result;
  }
};