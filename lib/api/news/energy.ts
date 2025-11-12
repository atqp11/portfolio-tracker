// lib/api/news/energy.ts
import { NewsItem } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

export const fetchEnergyNews = async (): Promise<NewsItem[]> => {
  const cached = await getCached<NewsItem[]>('energy_news');
  if (cached) return cached;

  try {
    console.log('Fetching energy news...');
    const response = await fetch('/api/news/energy');

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const news = await response.json();
    console.log('Energy news response:', news);

    await setCached('energy_news', news);
    return news;
  } catch (e) {
    console.warn('Energy news failed', e);
    return cached || [];
  }
};