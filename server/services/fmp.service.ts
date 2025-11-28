// lib/services/fmp.service.ts
import { fmpDAO, FMPQuoteResponse } from '@/server/dao/fmp.dao';

export class FMPService {
  async getQuote(symbol: string): Promise<FMPQuoteResponse | null> {
    try {
      return await fmpDAO.getQuote(symbol);
    } catch (err) {
      console.error('FMPService.getQuote error:', err);
      return null;
    }
  }

  async getQuotes(symbols: string[]): Promise<Record<string, FMPQuoteResponse>> {
    try {
      return await fmpDAO.getQuotes(symbols);
    } catch (err) {
      console.error('FMPService.getQuotes error:', err);
      return {};
    }
  }
}

export const fmpService = new FMPService();
