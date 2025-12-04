/**
 * SEC EDGAR Service
 *
 * Service layer for direct SEC EDGAR API queries.
 * Handles company filings and SEC documents.
 */

import { secEdgarDAO } from '@backend/modules/stocks/dao/sec-edgar.dao';

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SecEdgarService {
  /**
   * Get CIK by ticker symbol
   */
  async getCik(symbol: string): Promise<string | null> {
    return await secEdgarDAO.getCikByTicker(symbol);
  }

  /**
   * Get company filings from SEC EDGAR
   */
  async getCompanyFilings(cik: string): Promise<unknown> {
    return await secEdgarDAO.getCompanyFilings(cik);
  }

  /**
   * Get company filings by ticker symbol
   * Convenience method that looks up CIK first
   */
  async getCompanyFilingsByTicker(ticker: string): Promise<unknown> {
    const cik = await this.getCik(ticker);
    if (!cik) {
      throw new Error(`Could not find CIK for ticker: ${ticker}`);
    }
    return await this.getCompanyFilings(cik);
  }
}

export const secEdgarService = new SecEdgarService();
