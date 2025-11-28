import { finnhubDAO } from '@/server/dao/finnhub.dao';
import { FinnhubNews } from '@/lib/types/finnhub-news.dto';

export class FinnhubService {
  async getCompanyNews(symbol: string, from: string, to: string): Promise<FinnhubNews[]> {
    try {
      return await finnhubDAO.getCompanyNews(symbol, from, to);
    } catch (err) {
      console.error('FinnhubService.getCompanyNews error:', err);
      return [];
    }
  }

  async getGeneralNews(category: string = 'general'): Promise<FinnhubNews[]> {
    try {
      return await finnhubDAO.getGeneralNews(category);
    } catch (err) {
      console.error('FinnhubService.getGeneralNews error:', err);
      return [];
    }
  }

  /**
   * Unified news headlines fetcher (ticker or keyword)
   */
  async scrapeNewsHeadlines(tickerOrKeyword: string): Promise<{ headline: string, link: string }[]> {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 14); // last 2 weeks
    const from = fromDate.toISOString().slice(0, 10);
    const isTicker = /^[A-Z]{1,5}$/.test(tickerOrKeyword.trim());
    try {
      let articles;
      if (isTicker) {
        console.log(`Fetching Finnhub news for: ${tickerOrKeyword}`);
        articles = await this.getCompanyNews(tickerOrKeyword, from, to);
      } else {
        console.log(`Fetching Finnhub general news for: ${tickerOrKeyword}`);
        articles = await this.getGeneralNews(tickerOrKeyword);
      }
      return articles.map(a => ({ headline: a.headline, link: a.link }));
    } catch (err) {
      console.error('Finnhub news fetch error:', err);
      return [];
    }
  }
// lib/services/finnhub.se
}

export const finnhubService = new FinnhubService();
