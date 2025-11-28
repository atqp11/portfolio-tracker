/**
 * Alpha Vantage Data Access Object
 *
 * Handles all HTTP requests to Alpha Vantage API.
 * Provides stock quotes, company overview, and financial statements.
 */
import { BaseDAO } from '@backend/common/dao/base.dao';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AlphaVantageQuoteResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

export interface CompanyOverview {
  Symbol: string;
  AssetType: string;
  Name: string;
  Description: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  EBITDA: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  '52WeekHigh': string;
  '52WeekLow': string;
  '50DayMovingAverage': string;
  '200DayMovingAverage': string;
  SharesOutstanding: string;
  DividendDate: string;
  ExDividendDate: string;
}

export interface FinancialStatement {
  fiscalDateEnding: string;
  reportedCurrency: string;
  [key: string]: string;
}

export interface FinancialData {
  symbol: string;
  annualReports: FinancialStatement[];
  quarterlyReports: FinancialStatement[];
}

export interface CommodityPrice {
  name: string;
  value: number;
  date: string;
  unit: string;
}

// ============================================================================
// DAO CLASS
// ============================================================================

export class AlphaVantageDAO extends BaseDAO {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.alphavantage.co/query';

  constructor() {
    super();
    this.apiKey = process.env.ALPHAVANTAGE_API_KEY || '';

    if (!this.apiKey) {
      console.warn('Alpha Vantage API key not configured');
    }
  }

  /**
   * Get real-time quote for a single symbol
   */
  async getQuote(symbol: string): Promise<AlphaVantageQuoteResponse> {
    const url = this.buildUrl(this.baseUrl, {
      function: 'GLOBAL_QUOTE',
      symbol: symbol,
      apikey: this.apiKey
    });

    console.log(`Fetching quote for symbol: ${symbol}`);

    const data = await this.fetchWithTimeout(url, 5000);

    console.log(`Response received for symbol: ${symbol}`);
    console.log(`Data for symbol ${symbol}:`, data);

    // Check for API errors
    if (this.hasApiError(data)) {
      const errorMsg = this.getApiErrorMessage(data);
      console.warn(`Alpha Vantage error for ${symbol}:`, errorMsg);

      // Throw specific error for rate limits
      if (this.isRateLimitError(data)) {
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }

      throw new Error(`API_ERROR: ${errorMsg}`);
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['01. symbol']) {
      throw new Error(`No quote data for ${symbol}`);
    }

    const parsed = {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent']
    };

    console.log(`Parsed quote for ${symbol}:`, parsed);

    return parsed;
  }

  /**
   * Get quotes for multiple symbols (parallel requests)
   */
  async getQuotes(symbols: string[]): Promise<Record<string, AlphaVantageQuoteResponse>> {
    const results: Record<string, AlphaVantageQuoteResponse> = {};

    const promises = symbols.map(async (symbol) => {
      try {
        const quote = await this.getQuote(symbol);
        return { symbol, quote, error: null };
      } catch (error) {
        console.warn(`Failed to fetch ${symbol}:`, error);
        return { symbol, quote: null, error };
      }
    });

    const settled = await Promise.all(promises);

    settled.forEach((result) => {
      if (result.quote) {
        results[result.symbol] = result.quote;
      }
    });

    return results;
  }

  /**
   * Get company overview (fundamentals)
   */
  async getCompanyOverview(symbol: string): Promise<CompanyOverview> {
    const url = this.buildUrl(this.baseUrl, {
      function: 'OVERVIEW',
      symbol: symbol,
      apikey: this.apiKey
    });

    console.log(`Fetching company overview for: ${symbol}`);

    const data = await this.fetchWithTimeout<CompanyOverview>(url, 10000);

    // Check for API errors
    if (this.hasApiError(data)) {
      const errorMsg = this.getApiErrorMessage(data);
      console.warn(`Alpha Vantage overview error for ${symbol}:`, errorMsg);

      if (this.isRateLimitError(data)) {
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }

      throw new Error(`API_ERROR: ${errorMsg}`);
    }

    if (!data.Symbol) {
      throw new Error(`No overview data for ${symbol}`);
    }

    return data;
  }

  /**
   * Get income statement (annual and quarterly)
   */
  async getIncomeStatement(symbol: string): Promise<FinancialData> {
    const url = this.buildUrl(this.baseUrl, {
      function: 'INCOME_STATEMENT',
      symbol: symbol,
      apikey: this.apiKey
    });

    console.log(`Fetching income statement for: ${symbol}`);

    const data = await this.fetchWithTimeout(url, 10000);

    // Check for API errors
    if (this.hasApiError(data)) {
      const errorMsg = this.getApiErrorMessage(data);
      console.warn(`Alpha Vantage income statement error for ${symbol}:`, errorMsg);

      if (this.isRateLimitError(data)) {
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }

      throw new Error(`API_ERROR: ${errorMsg}`);
    }

    if (!data.symbol && !data.annualReports) {
      throw new Error(`No income statement data for ${symbol}`);
    }

    return {
      symbol: data.symbol || symbol,
      annualReports: data.annualReports || [],
      quarterlyReports: data.quarterlyReports || []
    };
  }

  /**
   * Get balance sheet (annual and quarterly)
   */
  async getBalanceSheet(symbol: string): Promise<FinancialData> {
    const url = this.buildUrl(this.baseUrl, {
      function: 'BALANCE_SHEET',
      symbol: symbol,
      apikey: this.apiKey
    });

    console.log(`Fetching balance sheet for: ${symbol}`);

    const data = await this.fetchWithTimeout(url, 10000);

    // Check for API errors
    if (this.hasApiError(data)) {
      const errorMsg = this.getApiErrorMessage(data);
      console.warn(`Alpha Vantage balance sheet error for ${symbol}:`, errorMsg);

      if (this.isRateLimitError(data)) {
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }

      throw new Error(`API_ERROR: ${errorMsg}`);
    }

    if (!data.symbol && !data.annualReports) {
      throw new Error(`No balance sheet data for ${symbol}`);
    }

    return {
      symbol: data.symbol || symbol,
      annualReports: data.annualReports || [],
      quarterlyReports: data.quarterlyReports || []
    };
  }

  /**
   * Get cash flow statement (annual and quarterly)
   */
  async getCashFlow(symbol: string): Promise<FinancialData> {
    const url = this.buildUrl(this.baseUrl, {
      function: 'CASH_FLOW',
      symbol: symbol,
      apikey: this.apiKey
    });

    console.log(`Fetching cash flow for: ${symbol}`);

    const data = await this.fetchWithTimeout(url, 10000);

    // Check for API errors
    if (this.hasApiError(data)) {
      const errorMsg = this.getApiErrorMessage(data);
      console.warn(`Alpha Vantage cash flow error for ${symbol}:`, errorMsg);

      if (this.isRateLimitError(data)) {
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }

      throw new Error(`API_ERROR: ${errorMsg}`);
    }

    if (!data.symbol && !data.annualReports) {
      throw new Error(`No cash flow data for ${symbol}`);
    }

    return {
      symbol: data.symbol || symbol,
      annualReports: data.annualReports || [],
      quarterlyReports: data.quarterlyReports || []
    };
  }

  /**
   * Get all fundamentals (overview + financial statements)
   */
  async getAllFundamentals(symbol: string) {
    const [overview, incomeStatement, balanceSheet, cashFlow] = await Promise.allSettled([
      this.getCompanyOverview(symbol),
      this.getIncomeStatement(symbol),
      this.getBalanceSheet(symbol),
      this.getCashFlow(symbol)
    ]);

    return {
      overview: overview.status === 'fulfilled' ? overview.value : null,
      incomeStatement: incomeStatement.status === 'fulfilled' ? incomeStatement.value : null,
      balanceSheet: balanceSheet.status === 'fulfilled' ? balanceSheet.value : null,
      cashFlow: cashFlow.status === 'fulfilled' ? cashFlow.value : null
    };
  }

  /**
   * Get WTI crude oil prices
   */
  async getWTIOil(): Promise<CommodityPrice> {
    const url = this.buildUrl(this.baseUrl, {
      function: 'WTI',
      interval: 'daily',
      apikey: this.apiKey
    });

    console.log('Fetching WTI crude oil prices');

    const data = await this.fetchWithTimeout(url, 10000);

    // Check for API errors
    if (this.hasApiError(data)) {
      const errorMsg = this.getApiErrorMessage(data);
      console.warn('Alpha Vantage WTI error:', errorMsg);

      if (this.isRateLimitError(data)) {
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }

      throw new Error(`API_ERROR: ${errorMsg}`);
    }

    const dataArray = data.data || [];
    if (dataArray.length === 0) {
      throw new Error('No WTI oil data available');
    }

    const latest = dataArray[0];

    return {
      name: 'WTI Crude Oil',
      value: parseFloat(latest.value || '0'),
      date: latest.date,
      unit: 'USD per barrel'
    };
  }

  /**
   * Get natural gas prices
   */
  async getNaturalGas(): Promise<CommodityPrice> {
    const url = this.buildUrl(this.baseUrl, {
      function: 'NATURAL_GAS',
      interval: 'daily',
      apikey: this.apiKey
    });

    console.log('Fetching natural gas prices');

    const data = await this.fetchWithTimeout(url, 10000);

    // Check for API errors
    if (this.hasApiError(data)) {
      const errorMsg = this.getApiErrorMessage(data);
      console.warn('Alpha Vantage natural gas error:', errorMsg);

      if (this.isRateLimitError(data)) {
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }

      throw new Error(`API_ERROR: ${errorMsg}`);
    }

    const dataArray = data.data || [];
    if (dataArray.length === 0) {
      throw new Error('No natural gas data available');
    }

    const latest = dataArray[0];

    return {
      name: 'Natural Gas',
      value: parseFloat(latest.value || '0'),
      date: latest.date,
      unit: 'USD per MMBtu'
    };
  }

  /**
   * Get copper prices
   */
  async getCopper(): Promise<CommodityPrice> {
    const url = this.buildUrl(this.baseUrl, {
      function: 'COPPER',
      interval: 'monthly',
      apikey: this.apiKey
    });

    console.log('Fetching copper prices');

    const data = await this.fetchWithTimeout(url, 10000);

    // Check for API errors
    if (this.hasApiError(data)) {
      const errorMsg = this.getApiErrorMessage(data);
      console.warn('Alpha Vantage copper error:', errorMsg);

      if (this.isRateLimitError(data)) {
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }

      throw new Error(`API_ERROR: ${errorMsg}`);
    }

    const dataArray = data.data || [];
    if (dataArray.length === 0) {
      throw new Error('No copper data available');
    }

    const latest = dataArray[0];

    return {
      name: 'Copper',
      value: parseFloat(latest.value || '0'),
      date: latest.date,
      unit: 'USD per pound'
    };
  }
}

// Export singleton instance
export const alphaVantageDAO = new AlphaVantageDAO();
