// lib/services/yahoo-finance.service.ts
import { yahooFinanceDAO } from '@/server/dao/yahoo-finance.dao';

export class YahooFinanceService {
  async fetchYahooQuote(ticker: string): Promise<any> {
    return await yahooFinanceDAO.fetchQuote(ticker);
  }
}

export const yahooFinanceService = new YahooFinanceService();
