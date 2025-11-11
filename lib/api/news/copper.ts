// lib/api/news/copper.ts
import { NewsItem } from '../shared/types';
import { getCached, setCached } from '../shared/cache';

const NEWS_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY!;

export const fetchCopperNews = async (): Promise<NewsItem[]> => {
  const cached = await getCached<NewsItem[]>('copper_news');
  if (cached) return cached;

  try {
    console.log('Fetching copper news...');
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=copper+market+OR+copper+tariff+OR+copper+china&language=en&sortBy=publishedAt&pageSize=10`,
      { 
        headers: { 'X-Api-Key': NEWS_KEY },
        signal: AbortSignal.timeout(10000)
      }
    );

    const data = await response.json();
    console.log('Copper news response:', data);

    const news = data.articles?.slice(0, 5).map((a: any) => ({
      title: a.title.split(' - ')[0],
      description: a.description || 'No summary.',
      source: a.source.name,
      url: a.url,
      date: new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    await setCached('copper_news', news);
    return news;
  } catch (e) {
    console.warn('Copper news failed', e);
    return cached || [];
  }
};