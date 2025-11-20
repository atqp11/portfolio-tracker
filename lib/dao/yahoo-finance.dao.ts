/**
 * Yahoo Finance Data Access Object
 *
 * Handles all HTTP requests to Yahoo Finance API (via yh-finance package).
 * Provides fundamentals and financial data.
 */
import { BaseDAO } from './base.dao';

// ============================================================================
// INTERFACES
// ============================================================================

export interface YahooFundamentals {
  symbol: string;
  marketCap?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  pegRatio?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;
  beta?: number | null;
  dividendYield?: number | null;
  epsTrailing?: number | null;
  epsForward?: number | null;
  revenuePerShare?: number | null;
  profitMargins?: number | null;
  operatingMargins?: number | null;
  returnOnAssets?: number | null;
  returnOnEquity?: number | null;
  totalRevenue?: number | null;
  grossProfits?: number | null;
  freeCashflow?: number | null;
  operatingCashflow?: number | null;
  earningsGrowth?: number | null;
  revenueGrowth?: number | null;
  earningsQuarterlyGrowth?: number | null;
  [key: string]: any;
}

// ============================================================================
// DAO CLASS
// ============================================================================

export class YahooFinanceDAO extends BaseDAO {
  private readonly baseUrl = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary';

  /**
   * Get stock fundamentals from Yahoo Finance
   */
  async getFundamentals(symbol: string): Promise<YahooFundamentals> {
    const modules = [
      'defaultKeyStatistics',
      'financialData',
      'summaryDetail',
      'earnings',
      'earningsTrend'
    ].join(',');

    const url = this.buildUrl(this.baseUrl + `/${symbol}`, {
      modules: modules
    });

    console.log(`Fetching Yahoo Finance fundamentals for: ${symbol}`);

    const data = await this.fetchWithTimeout(url, 10000);

    if (!data?.quoteSummary?.result?.[0]) {
      throw new Error(`No Yahoo Finance data for ${symbol}`);
    }

    const result = data.quoteSummary.result[0];
    const defaultKeyStats = result.defaultKeyStatistics || {};
    const financialData = result.financialData || {};
    const summaryDetail = result.summaryDetail || {};

    // Extract and flatten the nested data
    const fundamentals: YahooFundamentals = {
      symbol,
      marketCap: summaryDetail.marketCap?.raw || null,
      trailingPE: summaryDetail.trailingPE?.raw || null,
      forwardPE: summaryDetail.forwardPE?.raw || null,
      pegRatio: defaultKeyStats.pegRatio?.raw || null,
      priceToBook: defaultKeyStats.priceToBook?.raw || null,
      priceToSales: defaultKeyStats.priceToSalesTrailing12Months?.raw || null,
      beta: defaultKeyStats.beta?.raw || null,
      dividendYield: summaryDetail.dividendYield?.raw || null,
      epsTrailing: defaultKeyStats.trailingEps?.raw || null,
      epsForward: defaultKeyStats.forwardEps?.raw || null,
      revenuePerShare: financialData.revenuePerShare?.raw || null,
      profitMargins: financialData.profitMargins?.raw || null,
      operatingMargins: financialData.operatingMargins?.raw || null,
      returnOnAssets: financialData.returnOnAssets?.raw || null,
      returnOnEquity: financialData.returnOnEquity?.raw || null,
      totalRevenue: financialData.totalRevenue?.raw || null,
      grossProfits: financialData.grossProfits?.raw || null,
      freeCashflow: financialData.freeCashflow?.raw || null,
      operatingCashflow: financialData.operatingCashflow?.raw || null,
      earningsGrowth: financialData.earningsGrowth?.raw || null,
      revenueGrowth: financialData.revenueGrowth?.raw || null,
      earningsQuarterlyGrowth: defaultKeyStats.earningsQuarterlyGrowth?.raw || null
    };

    console.log(`Yahoo Finance fundamentals for ${symbol}:`, fundamentals);

    return fundamentals;
  }
}

// Export singleton instance
export const yahooFinanceDAO = new YahooFinanceDAO();
