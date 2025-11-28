/**
 * SEC EDGAR Data Access Object
 *
 * Handles all HTTP requests to SEC EDGAR API.
 * Provides company filings and SEC documents.
 */
import { BaseDAO } from '@backend/common/dao/base.dao';

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
  async getCompanyFilings(cik: string): Promise<any> {
    if (!cik) throw new Error('CIK (Central Index Key) is required');
    const paddedCik = cik.padStart(10, '0');
    const url = `${this.baseUrl}/submissions/CIK${paddedCik}.json`;
    let res;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
        throw new Error('SEC EDGAR request timed out');
      }
      throw new Error('Network error when calling SEC EDGAR');
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) {
      let errorMsg = `SEC EDGAR API error: ${res.status} ${res.statusText}`;
      let errorBody = '';
      try {
        errorBody = await res.text();
        errorMsg += ` | Body: ${errorBody}`;
      } catch {}
      if (res.status === 404 && errorBody.includes('NoSuchKey')) {
        throw new Error('No filings found for this CIK or symbol.');
      }
      throw new Error(errorMsg);
    }
    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw new Error('Invalid JSON response from SEC EDGAR');
    }
    if (!data || typeof data !== 'object' || !('cik' in data)) {
      throw new Error('Unexpected SEC EDGAR API response structure');
    }
    return data;
  }

  /**
   * Search for company CIK by ticker symbol
   */
  async getCikByTicker(ticker: string): Promise<string | null> {
    const url = `${this.baseUrl}/files/company_tickers.json`;
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
      if (!response.ok) return null;
      const data = await response.json();
      const entries = Array.isArray(data) ? data : Object.values(data);
      const entry = entries.find((v: any) => v.ticker?.toUpperCase() === ticker.toUpperCase());
      if (entry && entry.cik_str) {
        return entry.cik_str.toString().padStart(10, '0');
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Export singleton instance
export const secEdgarDAO = new SecEdgarDAO();
