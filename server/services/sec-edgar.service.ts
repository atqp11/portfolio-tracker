// lib/services/sec-edgar.service.ts
import { secEdgarDAO } from '@/server/dao/sec-edgar.dao';
// Service layer for SEC EDGAR API

export class SecEdgarService {
  async getCik(symbol: string): Promise<string | null> {
    // Error handling is inside DAO
    return await secEdgarDAO.getCikByTicker(symbol);
  }

  async getCompanyFilings(cik: string): Promise<any> {
    // Error handling is inside DAO
    return await secEdgarDAO.getCompanyFilings(cik);
  }
}

export const secEdgarService = new SecEdgarService();
