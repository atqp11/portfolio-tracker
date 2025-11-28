// lib/services/brave-news.service.ts
import { fetchBraveNewsDAO } from '@/server/dao/brave-news.dao';

export class BraveNewsService {
  async getNews(query: string): Promise<any> {
    try {
      const data = await fetchBraveNewsDAO(query);
      // Return the full NewsSearchApiResponse object
      return data;
    } catch (err) {
      console.error('BraveNewsService.getNews error:', err);
      return {
        type: 'news',
        query,
        results: []
      };
    }
  }
}

export const braveNewsService = new BraveNewsService();
