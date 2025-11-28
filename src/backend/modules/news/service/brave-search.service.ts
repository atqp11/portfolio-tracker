// lib/services/brave-search.service.ts
import { braveSearchDAO } from '../dao/brave-search.dao';

export class BraveSearchService {
  async getNews(query: string): Promise<{ headline: string, link: string }[]> {
    try {
      const results = await braveSearchDAO.search(query);
      return results.map((item: any) => ({
        headline: item.title,
        link: item.url,
      }));
    } catch (err) {
      console.error('BraveSearchService.getNews error:', err);
      return [];
    }
  }
}

export const braveSearchService = new BraveSearchService();
