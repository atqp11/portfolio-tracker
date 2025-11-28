// lib/services/yahoo-finance.service.ts
import { yahooFinanceDAO } from '@backend/modules/stocks/dao/yahoo-finance.dao';

export class YahooFinanceService {
  async fetchYahooQuote(ticker: string): Promise<any> {
    return await yahooFinanceDAO.fetchQuote(ticker);
  }
}

export const yahooFinanceService = new YahooFinanceService();
