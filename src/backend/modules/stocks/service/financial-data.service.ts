/**
 * Financial Data Service
 *
 * Business logic layer for company fundamentals and financial statements.
 * Aggregates data from multiple sources with intelligent fallback.
 */
import { alphaVantageDAO } from '@backend/modules/stocks/dao/alpha-vantage.dao';
import { yahooFinanceDAO, YahooFundamentals } from '@backend/modules/stocks/dao/yahoo-finance.dao';
import { loadFromCache, saveToCache, getCacheAge } from '@lib/utils/localStorageCache';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CompanyFundamentals {
  symbol: string;

  // Valuation metrics
  marketCap?: number | null;
  enterpriseValue?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  pegRatio?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;

  // Profitability metrics
  profitMargins?: number | null;
  operatingMargins?: number | null;
  returnOnAssets?: number | null;
  returnOnEquity?: number | null;

  // Growth metrics
  earningsGrowth?: number | null;
  revenueGrowth?: number | null;
  earningsQuarterlyGrowth?: number | null;

  // Per-share metrics
  epsTrailing?: number | null;
  epsForward?: number | null;
  revenuePerShare?: number | null;
  bookValuePerShare?: number | null;

  // Dividend metrics
  dividendYield?: number | null;
  dividendRate?: number | null;
  payoutRatio?: number | null;

  // Financial health
  beta?: number | null;
  totalRevenue?: number | null;
  grossProfits?: number | null;
  freeCashflow?: number | null;
  operatingCashflow?: number | null;
  totalCash?: number | null;
  totalDebt?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  quickRatio?: number | null;

  // Company info
  sector?: string | null;
  industry?: string | null;
  description?: string | null;

  source: 'yahoo' | 'alphavantage' | 'merged' | 'cache';
  timestamp: number;
}

export interface FinancialStatement {
  fiscalDateEnding: string;
  reportedCurrency: string;
  [key: string]: any;
}

export interface FinancialStatements {
  symbol: string;
  incomeStatement: FinancialStatement[];
  balanceSheet: FinancialStatement[];
  cashFlow: FinancialStatement[];
  source: 'alphavantage' | 'cache';
  timestamp: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class FinancialDataService {
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour (fundamentals don't change frequently)

  /**
   * Get company fundamentals with intelligent source merging
   *
   * Strategy:
   * 1. Check cache (1hr TTL)
   * 2. Try Yahoo Finance (faster, more complete)
   * 3. Fallback to Alpha Vantage
   * 4. Merge both sources if available
   * 5. Return stale cache if all fail
   *
   * @param symbol - Stock ticker symbol
   * @returns Comprehensive fundamentals data
   */
  async getFundamentals(symbol: string): Promise<CompanyFundamentals> {
    const cacheKey = `fundamentals-${symbol}`;

    // 1. Check cache
    const cached = loadFromCache<CompanyFundamentals>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[FinancialDataService] Cache hit for ${symbol} (age: ${getCacheAge(cacheKey)}ms)`);
      return {
        ...cached,
        source: 'cache'
      };
    }

    let yahooData: YahooFundamentals | null = null;
    let alphaVantageData: any | null = null;

    // 2. Try Yahoo Finance (primary for fundamentals)
    try {
      console.log(`[FinancialDataService] Fetching ${symbol} fundamentals from Yahoo Finance`);
      yahooData = await yahooFinanceDAO.getFundamentals(symbol);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[FinancialDataService] Yahoo Finance failed for ${symbol}: ${errorMsg}`);
    }

    // 3. Try Alpha Vantage (fallback for company overview)
    try {
      console.log(`[FinancialDataService] Fetching ${symbol} overview from Alpha Vantage`);
      alphaVantageData = await alphaVantageDAO.getCompanyOverview(symbol);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[FinancialDataService] Alpha Vantage failed for ${symbol}: ${errorMsg}`);
    }

    // 4. Merge data from both sources if available
    if (yahooData || alphaVantageData) {
      const merged = this.mergeFundamentals(symbol, yahooData, alphaVantageData);
      saveToCache(cacheKey, merged);
      return merged;
    }

    // 5. Return stale cache if available
    if (cached) {
      console.log(`[FinancialDataService] All providers failed, returning stale cache for ${symbol}`);
      return {
        ...cached,
        source: 'cache'
      };
    }

    throw new Error(`Failed to fetch fundamentals for ${symbol} from all providers`);
  }

  /**
   * Merge fundamentals from multiple sources
   * Prioritizes Yahoo Finance data, fills gaps with Alpha Vantage
   */
  private mergeFundamentals(
    symbol: string,
    yahoo: YahooFundamentals | null,
    alphaVantage: any | null
  ): CompanyFundamentals {
    const fundamentals: CompanyFundamentals = {
      symbol,
      source: yahoo && alphaVantage ? 'merged' : yahoo ? 'yahoo' : 'alphavantage',
      timestamp: Date.now()
    };

    // Priority 1: Yahoo Finance data
    if (yahoo) {
      fundamentals.marketCap = yahoo.marketCap;
      fundamentals.trailingPE = yahoo.trailingPE;
      fundamentals.forwardPE = yahoo.forwardPE;
      fundamentals.pegRatio = yahoo.pegRatio;
      fundamentals.priceToBook = yahoo.priceToBook;
      fundamentals.priceToSales = yahoo.priceToSales;
      fundamentals.beta = yahoo.beta;
      fundamentals.dividendYield = yahoo.dividendYield;
      fundamentals.epsTrailing = yahoo.epsTrailing;
      fundamentals.epsForward = yahoo.epsForward;
      fundamentals.revenuePerShare = yahoo.revenuePerShare;
      fundamentals.profitMargins = yahoo.profitMargins;
      fundamentals.operatingMargins = yahoo.operatingMargins;
      fundamentals.returnOnAssets = yahoo.returnOnAssets;
      fundamentals.returnOnEquity = yahoo.returnOnEquity;
      fundamentals.totalRevenue = yahoo.totalRevenue;
      fundamentals.grossProfits = yahoo.grossProfits;
      fundamentals.freeCashflow = yahoo.freeCashflow;
      fundamentals.operatingCashflow = yahoo.operatingCashflow;
      fundamentals.earningsGrowth = yahoo.earningsGrowth;
      fundamentals.revenueGrowth = yahoo.revenueGrowth;
      fundamentals.earningsQuarterlyGrowth = yahoo.earningsQuarterlyGrowth;
    }

    // Priority 2: Fill gaps with Alpha Vantage data
    if (alphaVantage) {
      fundamentals.marketCap = fundamentals.marketCap ?? alphaVantage.MarketCapitalization;
      fundamentals.trailingPE = fundamentals.trailingPE ?? alphaVantage.TrailingPE;
      fundamentals.forwardPE = fundamentals.forwardPE ?? alphaVantage.ForwardPE;
      fundamentals.pegRatio = fundamentals.pegRatio ?? alphaVantage.PEGRatio;
      fundamentals.priceToBook = fundamentals.priceToBook ?? alphaVantage.PriceToBookRatio;
      fundamentals.priceToSales = fundamentals.priceToSales ?? alphaVantage.PriceToSalesRatioTTM;
      fundamentals.beta = fundamentals.beta ?? alphaVantage.Beta;
      fundamentals.dividendYield = fundamentals.dividendYield ?? alphaVantage.DividendYield;
      fundamentals.epsTrailing = fundamentals.epsTrailing ?? alphaVantage.EPS;
      fundamentals.profitMargins = fundamentals.profitMargins ?? alphaVantage.ProfitMargin;
      fundamentals.operatingMargins = fundamentals.operatingMargins ?? alphaVantage.OperatingMarginTTM;
      fundamentals.returnOnAssets = fundamentals.returnOnAssets ?? alphaVantage.ReturnOnAssetsTTM;
      fundamentals.returnOnEquity = fundamentals.returnOnEquity ?? alphaVantage.ReturnOnEquityTTM;
      fundamentals.revenuePerShare = fundamentals.revenuePerShare ?? alphaVantage.RevenuePerShareTTM;
      fundamentals.bookValuePerShare = alphaVantage.BookValue;
      fundamentals.dividendRate = alphaVantage.DividendPerShare;
      fundamentals.payoutRatio = alphaVantage.PayoutRatio;
      fundamentals.sector = alphaVantage.Sector;
      fundamentals.industry = alphaVantage.Industry;
      fundamentals.description = alphaVantage.Description;
      fundamentals.debtToEquity = alphaVantage.DebtToEquityRatio;
      fundamentals.currentRatio = alphaVantage.CurrentRatio;
      fundamentals.quickRatio = alphaVantage.QuickRatio;
      fundamentals.earningsQuarterlyGrowth = fundamentals.earningsQuarterlyGrowth ?? alphaVantage.QuarterlyEarningsGrowthYOY;
      fundamentals.revenueGrowth = fundamentals.revenueGrowth ?? alphaVantage.QuarterlyRevenueGrowthYOY;
    }

    console.log(`[FinancialDataService] Merged fundamentals for ${symbol} (source: ${fundamentals.source})`);
    return fundamentals;
  }

  /**
   * Get income statement (annual)
   *
   * @param symbol - Stock ticker symbol
   * @returns Income statement data
   */
  async getIncomeStatement(symbol: string): Promise<FinancialStatement[]> {
    const cacheKey = `income-statement-${symbol}`;

    // Check cache
    const cached = loadFromCache<FinancialStatement[]>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[FinancialDataService] Cache hit for income statement ${symbol}`);
      return cached;
    }

    console.log(`[FinancialDataService] Fetching income statement for ${symbol}`);
    const data = await alphaVantageDAO.getIncomeStatement(symbol);

    const statements = data.annualReports || [];
    saveToCache(cacheKey, statements);

    console.log(`[FinancialDataService] Income statement for ${symbol}: ${statements.length} annual reports`);
    return statements;
  }

  /**
   * Get balance sheet (annual)
   *
   * @param symbol - Stock ticker symbol
   * @returns Balance sheet data
   */
  async getBalanceSheet(symbol: string): Promise<FinancialStatement[]> {
    const cacheKey = `balance-sheet-${symbol}`;

    // Check cache
    const cached = loadFromCache<FinancialStatement[]>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[FinancialDataService] Cache hit for balance sheet ${symbol}`);
      return cached;
    }

    console.log(`[FinancialDataService] Fetching balance sheet for ${symbol}`);
    const data = await alphaVantageDAO.getBalanceSheet(symbol);

    const statements = data.annualReports || [];
    saveToCache(cacheKey, statements);

    console.log(`[FinancialDataService] Balance sheet for ${symbol}: ${statements.length} annual reports`);
    return statements;
  }

  /**
   * Get cash flow statement (annual)
   *
   * @param symbol - Stock ticker symbol
   * @returns Cash flow data
   */
  async getCashFlow(symbol: string): Promise<FinancialStatement[]> {
    const cacheKey = `cash-flow-${symbol}`;

    // Check cache
    const cached = loadFromCache<FinancialStatement[]>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[FinancialDataService] Cache hit for cash flow ${symbol}`);
      return cached;
    }

    console.log(`[FinancialDataService] Fetching cash flow for ${symbol}`);
    const data = await alphaVantageDAO.getCashFlow(symbol);

    const statements = data.annualReports || [];
    saveToCache(cacheKey, statements);

    console.log(`[FinancialDataService] Cash flow for ${symbol}: ${statements.length} annual reports`);
    return statements;
  }

  /**
   * Get all financial statements combined
   *
   * Fetches income statement, balance sheet, and cash flow in parallel.
   *
   * @param symbol - Stock ticker symbol
   * @returns Combined financial statements
   */
  async getAllFinancials(symbol: string): Promise<FinancialStatements> {
    const cacheKey = `all-financials-${symbol}`;

    // Check cache
    const cached = loadFromCache<FinancialStatements>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[FinancialDataService] Cache hit for all financials ${symbol}`);
      return {
        ...cached,
        source: 'cache'
      };
    }

    console.log(`[FinancialDataService] Fetching all financials for ${symbol}`);

    // Fetch all statements in parallel
    const [incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      this.getIncomeStatement(symbol),
      this.getBalanceSheet(symbol),
      this.getCashFlow(symbol)
    ]);

    const result: FinancialStatements = {
      symbol,
      incomeStatement,
      balanceSheet,
      cashFlow,
      source: 'alphavantage',
      timestamp: Date.now()
    };

    saveToCache(cacheKey, result);

    console.log(`[FinancialDataService] All financials for ${symbol}: ${incomeStatement.length} income, ${balanceSheet.length} balance, ${cashFlow.length} cash flow`);
    return result;
  }
}

// Export singleton instance
export const financialDataService = new FinancialDataService();
