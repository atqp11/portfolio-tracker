
import { BaseDAO } from './base.dao';

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

export class YahooFinanceDAO extends BaseDAO {
  private readonly apiKey: string;
  private readonly quoteUrl = 'https://yfapi.net/v6/finance/quote';
  private readonly fundamentalsUrl = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary';

  constructor() {
    super();
    this.apiKey = process.env.YAHOO_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Yahoo Finance API key not configured');
    }
  }

  async fetchQuote(ticker: string): Promise<any> {
    if (!this.apiKey) throw new Error('Missing Yahoo Finance API key');
    if (!ticker) throw new Error('Ticker symbol is required');
    const url = this.buildUrl(this.quoteUrl, { symbols: ticker });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
      res = await fetch(url, {
        headers: {
          'x-api-key': this.apiKey,
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
        throw new Error('Yahoo Finance API request timed out');
      }
      throw new Error('Network error when calling Yahoo Finance API');
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) {
      let errorMsg = `Yahoo Finance API error: ${res.status} ${res.statusText}`;
      try {
        const errorBody = await res.text();
        errorMsg += ` | Body: ${errorBody}`;
      } catch {}
      throw new Error(errorMsg);
    }
    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw new Error('Invalid JSON response from Yahoo Finance API');
    }
    if (!data || typeof data !== 'object' || !('quoteResponse' in data) || !Array.isArray(data.quoteResponse.result)) {
      throw new Error('Unexpected Yahoo Finance API response structure');
    }
    return data;
  }

  async getFundamentals(symbol: string): Promise<YahooFundamentals> {
    const modules = [
      'defaultKeyStatistics',
      'financialData',
      'summaryDetail',
      'earnings',
      'earningsTrend'
    ].join(',');

    const url = this.buildUrl(this.fundamentalsUrl + `/${symbol}`, {
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

export const yahooFinanceDAO = new YahooFinanceDAO();
