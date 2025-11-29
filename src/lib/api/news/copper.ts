// lib/api/news/copper.ts
import { NewsItem } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

export const fetchCopperNews = async (): Promise<NewsItem[]> => {
  const cached = await getCached<NewsItem[]>('copper_news');
  if (cached) return cached;

  try {
    console.log('Fetching copper news...');
    const response = await fetch('/api/news/copper');

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const news = await response.json();
    console.log('Copper news response:', news);

    await setCached('copper_news', news);
    return news;
  } catch (e) {
    console.warn('Copper news failed', e);
    return cached || [];
  }
};