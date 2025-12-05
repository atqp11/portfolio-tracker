
import { BaseDAO } from '@backend/common/dao/base.dao';

// ============================================================================
// INTERFACES
// ============================================================================

export interface YahooQuoteResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

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
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  currentRatio?: number | null;
  debtToEquity?: number | null;
  roic?: number | null;
  evToEbitda?: number | null;
  [key: string]: any;
}

export class YahooFinanceDAO extends BaseDAO {
  private readonly quoteUrl = 'https://query1.finance.yahoo.com/v7/finance/quote';
  private readonly fundamentalsUrl = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary';

  constructor() {
    super();
  }

  async fetchQuote(ticker: string): Promise<any> {
    if (!ticker) throw new Error('Ticker symbol is required');
    const url = this.buildUrl(this.quoteUrl, { symbols: ticker });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
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

  /**
   * Get real-time quote for a single symbol (standardized format)
   *
   * Parses Yahoo Finance response into standard format compatible with
   * Alpha Vantage and FMP responses.
   */
  async getQuote(symbol: string): Promise<YahooQuoteResponse> {
    console.log(`Fetching Yahoo Finance quote for symbol: ${symbol}`);

    const data = await this.fetchQuote(symbol);

    console.log(`Yahoo Finance raw data for ${symbol}:`, JSON.stringify(data, null, 2));

    // Yahoo Finance returns data in quoteResponse.result array
    const result = data.quoteResponse?.result;

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error(`No quote data for ${symbol}`);
    }

    const quote = result[0];

    // Validate required fields
    if (!quote.symbol) {
      throw new Error(`Invalid quote response for ${symbol}: missing symbol`);
    }

    // regularMarketPrice is the current price
    const price = quote.regularMarketPrice;
    if (typeof price !== 'number' || isNaN(price)) {
      throw new Error(`Invalid price data for ${symbol}: ${price}`);
    }

    // regularMarketChange is the dollar change
    const change = quote.regularMarketChange || 0;

    // regularMarketChangePercent is the percentage change
    const changePercent = quote.regularMarketChangePercent || 0;
    const changePercentStr = changePercent.toFixed(2) + '%';

    const parsed: YahooQuoteResponse = {
      symbol: quote.symbol,
      price: price,
      change: change,
      changePercent: changePercentStr
    };

    console.log(`Parsed Yahoo Finance quote for ${symbol}:`, parsed);

    return parsed;
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
      earningsQuarterlyGrowth: defaultKeyStats.earningsQuarterlyGrowth?.raw || null,
      fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh?.raw || null,
      fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow?.raw || null,
      currentRatio: financialData.currentRatio?.raw || null,
      debtToEquity: financialData.debtToEquity?.raw || null,
      roic: financialData.returnOnInvestedCapital?.raw || null,
      evToEbitda: defaultKeyStats.enterpriseToEbitda?.raw || null
    };

    console.log(`Yahoo Finance fundamentals for ${symbol}:`, fundamentals);

    return fundamentals;
  }
}

export const yahooFinanceDAO = new YahooFinanceDAO();
