// lib/api/news/energy.ts
import { NewsItem } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

const NEWS_KEY = process.env.NEWS_API_KEY!;

export const fetchEnergyNews = async (): Promise<NewsItem[]> => {
  const cached = await getCached<NewsItem[]>('energy_news');
  if (cached) return cached;

  try {
    console.log('Fetching energy news...');
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=oil+OR+natural+gas+OR+LNG+OR+OPEC&language=en&sortBy=publishedAt&pageSize=10`,
      { 
        headers: { 'X-Api-Key': NEWS_KEY },
        signal: AbortSignal.timeout(10000)
      }
    );

    const data = await response.json();
    console.log('Energy news response:', data);

    const news = data.articles?.slice(0, 5).map((a: any) => ({
      title: a.title.split(' - ')[0],
      description: a.description || 'No summary.',
      source: a.source.name,
      url: a.url,
      date: new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    await setCached('energy_news', news);
    return news;
  } catch (e) {
    console.warn('Energy news failed', e);
    return cached || [];
  }
};