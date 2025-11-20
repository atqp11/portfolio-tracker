/**
 * SEC EDGAR Data Access Object
 *
 * Handles all HTTP requests to SEC EDGAR API.
 * Provides company filings and SEC documents.
 */
import { BaseDAO } from './base.dao';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  act: string;
  form: string;
  fileNumber: string;
  filmNumber: string;
  items: string;
  size: number;
  isXBRL: number;
  isInlineXBRL: number;
  primaryDocument: string;
  primaryDocDescription: string;
}

export interface SECFilingsResponse {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
      [key: string]: string[];
    };
  };
}

// ============================================================================
// DAO CLASS
// ============================================================================

export class SecEdgarDAO extends BaseDAO {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://data.sec.gov';
  private readonly userAgent: string;

  constructor() {
    super();
    this.apiKey = process.env.EDGAR_API_KEY || process.env.SEC_EDGAR_API_KEY || '';
    this.userAgent = `YourAppName/1.0 (${this.apiKey})`;

    if (!this.apiKey) {
      console.warn('SEC EDGAR API key not configured');
    }
  }

  /**
   * Get company filings by CIK number
   */
  async getCompanyFilings(cik: string): Promise<SECFiling[]> {
    // Pad CIK to 10 digits
    const paddedCik = cik.padStart(10, '0');

    const url = `${this.baseUrl}/submissions/CIK${paddedCik}.json`;

    console.log(`Fetching SEC filings for CIK: ${cik}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${bodyText ? ` | ${bodyText}` : ''}`);
      }

      const data: SECFilingsResponse = await response.json();

      console.log(`SEC filings for CIK ${cik}:`, {
        name: data.name,
        tickers: data.tickers,
        filingCount: data.filings.recent.accessionNumber.length
      });

      // Transform to array of filing objects
      const filings: SECFiling[] = [];
      const recent = data.filings.recent;

      for (let i = 0; i < recent.accessionNumber.length; i++) {
        filings.push({
          accessionNumber: recent.accessionNumber[i],
          filingDate: recent.filingDate[i],
          reportDate: recent.reportDate[i],
          acceptanceDateTime: recent.acceptanceDateTime?.[i] || '',
          act: recent.act?.[i] || '',
          form: recent.form[i],
          fileNumber: recent.fileNumber?.[i] || '',
          filmNumber: recent.filmNumber?.[i] || '',
          items: recent.items?.[i] || '',
          size: parseInt(recent.size?.[i] || '0'),
          isXBRL: parseInt(recent.isXBRL?.[i] || '0'),
          isInlineXBRL: parseInt(recent.isInlineXBRL?.[i] || '0'),
          primaryDocument: recent.primaryDocument[i],
          primaryDocDescription: recent.primaryDocDescription?.[i] || ''
        });
      }

      return filings;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Search for company CIK by ticker symbol
   */
  async getCikByTicker(ticker: string): Promise<string | null> {
    const url = `${this.baseUrl}/files/company_tickers.json`;

    console.log(`Searching for CIK by ticker: ${ticker}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: Record<string, any> = await response.json();

      // Find ticker in the company_tickers data
      const upperTicker = ticker.toUpperCase();
      for (const key in data) {
        const company = data[key];
        if (company.ticker === upperTicker) {
          console.log(`Found CIK for ${ticker}: ${company.cik_str}`);
          return company.cik_str.toString();
        }
      }

      console.warn(`No CIK found for ticker: ${ticker}`);
      return null;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Export singleton instance
export const secEdgarDAO = new SecEdgarDAO();
