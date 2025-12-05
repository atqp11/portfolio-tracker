/**
 * Data Provider Adapters
 *
 * Wraps existing DAOs to implement the DataProvider interface for use with
 * the Data Source Orchestrator. Each adapter transforms DAO responses to
 * standard application types and handles provider-specific error cases.
 *
 * Phase 3 of Production Readiness Plan
 *
 * @module provider-adapters
 */

import {
  DataProvider,
  BatchDataProvider,
  FetchOptions,
  ProviderError,
  ProviderErrorCode,
} from './types';

// DAOs
import { tiingoDAO, type TiingoQuoteResponse, type StockQuote as TiingoStockQuote } from '@backend/modules/stocks/dao/tiingo.dao';
import { yahooFinanceDAO, type YahooQuoteResponse, type YahooFundamentals } from '@backend/modules/stocks/dao/yahoo-finance.dao';
import { alphaVantageDAO, type AlphaVantageQuoteResponse, type CompanyOverview } from '@backend/modules/stocks/dao/alpha-vantage.dao';
import { secEdgarDAO, type SECFilingsResponse } from '@backend/modules/stocks/dao/sec-edgar.dao';
import { rssFeedDAO, type RSSArticle } from '@backend/modules/news/dao/rss-feed.dao';

// NOTE: FMP and Finnhub providers removed in Phase 3 - replaced by Tiingo (primary) + Yahoo Finance (fallback)

// ============================================================================
// STANDARDIZED DATA TYPES
// ============================================================================

/**
 * Standard stock quote format used across all providers
 */
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  timestamp: number;
  source: string;
}

/**
 * Standard fundamentals format combining data from multiple providers
 */
export interface CompanyFundamentals {
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
  source: string;
}

/**
 * Standard news article format
 */
export interface NewsArticle {
  headline: string;
  summary?: string;
  link: string;
  datetime: number; // Unix timestamp
  source: string;
}

/**
 * Standard SEC filing format
 */
export interface SECFiling {
  cik: string;
  entityName: string;
  tickers: string[];
  filings: Array<{
    form: string;
    filingDate: string;
    reportDate: string;
    accessionNumber: string;
    primaryDocument: string;
  }>;
  source: string;
}

// ============================================================================
// QUOTE PROVIDERS
// ============================================================================

/**
 * Tiingo Quote Provider (BATCH-CAPABLE)
 *
 * PRIMARY provider for stock quotes. Supports batch fetching up to 500 symbols.
 * Commercial redistribution allowed. $10/month for unlimited requests.
 *
 * Priority: 1 (use first)
 */
export class TiingoQuoteProvider implements BatchDataProvider<StockQuote> {
  readonly name = 'tiingo';
  readonly maxBatchSize = 500; // Tiingo supports up to 500 symbols per request

  async fetch(symbol: string, options?: FetchOptions): Promise<StockQuote> {
    try {
      const quote = await tiingoDAO.getQuote(symbol);

      // Tiingo DAO already returns standardized StockQuote format
      return quote;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async batchFetch(symbols: string[], options?: FetchOptions): Promise<Record<string, StockQuote>> {
    try {
      const quotesMap = await tiingoDAO.batchGetQuotes(symbols);

      // Convert Map to Record for orchestrator compatibility
      return Object.fromEntries(quotesMap);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): ProviderError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('timeout') || message.includes('timed out')) {
      return new ProviderError(this.name, ProviderErrorCode.TIMEOUT, message, error as Error);
    }

    if (message.includes('401') || message.includes('403') || message.includes('API key')) {
      return new ProviderError(this.name, ProviderErrorCode.AUTHENTICATION, message, error as Error);
    }

    if (message.includes('404') || message.includes('No quote data')) {
      return new ProviderError(this.name, ProviderErrorCode.NOT_FOUND, message, error as Error);
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return new ProviderError(this.name, ProviderErrorCode.RATE_LIMIT, message, error as Error);
    }

    if (message.includes('Network error') || message.includes('fetch')) {
      return new ProviderError(this.name, ProviderErrorCode.NETWORK_ERROR, message, error as Error);
    }

    return new ProviderError(this.name, ProviderErrorCode.UNKNOWN, message, error as Error);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('AAPL');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Yahoo Finance Quote Provider
 *
 * FALLBACK provider for stock quotes (priority 2).
 * No batch support - must call individually for each symbol.
 */
export class YahooFinanceQuoteProvider implements DataProvider<StockQuote> {
  readonly name = 'yahooFinance';

  async fetch(symbol: string, options?: FetchOptions): Promise<StockQuote> {
    try {
      const rawQuote = await yahooFinanceDAO.getQuote(symbol);

      return this.transformQuote(rawQuote, symbol);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private transformQuote(raw: YahooQuoteResponse, symbol: string): StockQuote {
    return {
      symbol: raw.symbol || symbol,
      price: raw.price,
      change: raw.change,
      changePercent: raw.changePercent,
      timestamp: Date.now(),
      source: 'yahooFinance',
    };
  }

  private handleError(error: unknown): ProviderError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('timeout') || message.includes('timed out')) {
      return new ProviderError(this.name, ProviderErrorCode.TIMEOUT, message, error as Error);
    }

    if (message.includes('401') || message.includes('403') || message.includes('API key')) {
      return new ProviderError(this.name, ProviderErrorCode.AUTHENTICATION, message, error as Error);
    }

    if (message.includes('404') || message.includes('No quote data')) {
      return new ProviderError(this.name, ProviderErrorCode.NOT_FOUND, message, error as Error);
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return new ProviderError(this.name, ProviderErrorCode.RATE_LIMIT, message, error as Error);
    }

    if (message.includes('Network error') || message.includes('fetch')) {
      return new ProviderError(this.name, ProviderErrorCode.NETWORK_ERROR, message, error as Error);
    }

    return new ProviderError(this.name, ProviderErrorCode.UNKNOWN, message, error as Error);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('AAPL');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Alpha Vantage Quote Provider (with batch support)
 *
 * Provides stock quotes from Alpha Vantage API.
 * Supports parallel batch fetching for multiple symbols.
 */
export class AlphaVantageQuoteProvider implements BatchDataProvider<StockQuote> {
  readonly name = 'alphaVantage';
  readonly maxBatchSize = 10; // Parallel requests limit

  async fetch(symbol: string, options?: FetchOptions): Promise<StockQuote> {
    try {
      const rawQuote = await alphaVantageDAO.getQuote(symbol);

      return this.transformQuote(rawQuote, symbol);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async batchFetch(symbols: string[], options?: FetchOptions): Promise<Record<string, StockQuote>> {
    try {
      const rawQuotes = await alphaVantageDAO.getQuotes(symbols);

      const results: Record<string, StockQuote> = {};
      for (const [symbol, rawQuote] of Object.entries(rawQuotes)) {
        results[symbol] = this.transformQuote(rawQuote, symbol);
      }

      return results;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private transformQuote(raw: AlphaVantageQuoteResponse, symbol: string): StockQuote {
    return {
      symbol: raw.symbol || symbol,
      price: raw.price,
      change: raw.change,
      changePercent: raw.changePercent,
      timestamp: Date.now(),
      source: 'alphaVantage',
    };
  }

  private handleError(error: unknown): ProviderError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('RATE_LIMIT')) {
      return new ProviderError(this.name, ProviderErrorCode.RATE_LIMIT, message, error as Error);
    }

    if (message.includes('API_ERROR')) {
      return new ProviderError(this.name, ProviderErrorCode.INVALID_RESPONSE, message, error as Error);
    }

    if (message.includes('timeout')) {
      return new ProviderError(this.name, ProviderErrorCode.TIMEOUT, message, error as Error);
    }

    if (message.includes('No quote data')) {
      return new ProviderError(this.name, ProviderErrorCode.NOT_FOUND, message, error as Error);
    }

    return new ProviderError(this.name, ProviderErrorCode.UNKNOWN, message, error as Error);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('AAPL');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Financial Modeling Prep Quote Provider (with batch support)
 *
 * Provides stock quotes from FMP API.
 * Supports parallel batch fetching for multiple symbols.
 */
// ============================================================================
// FUNDAMENTALS PROVIDERS
// ============================================================================

/**
 * Yahoo Finance Fundamentals Provider
 *
 * Provides company fundamentals from Yahoo Finance API.
 */
export class YahooFinanceFundamentalsProvider implements DataProvider<CompanyFundamentals> {
  readonly name = 'yahooFinance';

  async fetch(symbol: string, options?: FetchOptions): Promise<CompanyFundamentals> {
    try {
      const rawFundamentals = await yahooFinanceDAO.getFundamentals(symbol);

      return this.transformFundamentals(rawFundamentals, symbol);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private transformFundamentals(raw: YahooFundamentals, symbol: string): CompanyFundamentals {
    return {
      symbol: raw.symbol || symbol,
      marketCap: raw.marketCap,
      trailingPE: raw.trailingPE,
      forwardPE: raw.forwardPE,
      pegRatio: raw.pegRatio,
      priceToBook: raw.priceToBook,
      priceToSales: raw.priceToSales,
      beta: raw.beta,
      dividendYield: raw.dividendYield,
      epsTrailing: raw.epsTrailing,
      epsForward: raw.epsForward,
      revenuePerShare: raw.revenuePerShare,
      profitMargins: raw.profitMargins,
      operatingMargins: raw.operatingMargins,
      returnOnAssets: raw.returnOnAssets,
      returnOnEquity: raw.returnOnEquity,
      totalRevenue: raw.totalRevenue,
      grossProfits: raw.grossProfits,
      freeCashflow: raw.freeCashflow,
      operatingCashflow: raw.operatingCashflow,
      earningsGrowth: raw.earningsGrowth,
      revenueGrowth: raw.revenueGrowth,
      earningsQuarterlyGrowth: raw.earningsQuarterlyGrowth,
      source: 'yahooFinance',
    };
  }

  private handleError(error: unknown): ProviderError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('timeout')) {
      return new ProviderError(this.name, ProviderErrorCode.TIMEOUT, message, error as Error);
    }

    if (message.includes('No Yahoo Finance data')) {
      return new ProviderError(this.name, ProviderErrorCode.NOT_FOUND, message, error as Error);
    }

    return new ProviderError(this.name, ProviderErrorCode.UNKNOWN, message, error as Error);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('AAPL');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Alpha Vantage Fundamentals Provider
 *
 * Provides company overview data from Alpha Vantage API.
 */
export class AlphaVantageFundamentalsProvider implements DataProvider<CompanyFundamentals> {
  readonly name = 'alphaVantage';

  async fetch(symbol: string, options?: FetchOptions): Promise<CompanyFundamentals> {
    try {
      const rawOverview = await alphaVantageDAO.getCompanyOverview(symbol);

      return this.transformOverview(rawOverview, symbol);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private transformOverview(raw: CompanyOverview, symbol: string): CompanyFundamentals {
    const parseFloat = (value: string | undefined): number | null => {
      if (!value || value === 'None') return null;
      const parsed = Number(value);
      return isNaN(parsed) ? null : parsed;
    };

    return {
      symbol: raw.Symbol || symbol,
      marketCap: parseFloat(raw.MarketCapitalization),
      trailingPE: parseFloat(raw.TrailingPE),
      forwardPE: parseFloat(raw.ForwardPE),
      pegRatio: parseFloat(raw.PEGRatio),
      priceToBook: parseFloat(raw.PriceToBookRatio),
      priceToSales: parseFloat(raw.PriceToSalesRatioTTM),
      beta: parseFloat(raw.Beta),
      dividendYield: parseFloat(raw.DividendYield),
      epsTrailing: parseFloat(raw.EPS),
      epsForward: parseFloat(raw.DilutedEPSTTM),
      revenuePerShare: parseFloat(raw.RevenuePerShareTTM),
      profitMargins: parseFloat(raw.ProfitMargin),
      operatingMargins: parseFloat(raw.OperatingMarginTTM),
      returnOnAssets: parseFloat(raw.ReturnOnAssetsTTM),
      returnOnEquity: parseFloat(raw.ReturnOnEquityTTM),
      totalRevenue: parseFloat(raw.RevenueTTM),
      grossProfits: parseFloat(raw.GrossProfitTTM),
      earningsGrowth: parseFloat(raw.QuarterlyEarningsGrowthYOY),
      revenueGrowth: parseFloat(raw.QuarterlyRevenueGrowthYOY),
      freeCashflow: null, // Not available in Alpha Vantage overview
      operatingCashflow: null,
      earningsQuarterlyGrowth: parseFloat(raw.QuarterlyEarningsGrowthYOY),
      source: 'alphaVantage',
    };
  }

  private handleError(error: unknown): ProviderError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('RATE_LIMIT')) {
      return new ProviderError(this.name, ProviderErrorCode.RATE_LIMIT, message, error as Error);
    }

    if (message.includes('No overview data')) {
      return new ProviderError(this.name, ProviderErrorCode.NOT_FOUND, message, error as Error);
    }

    return new ProviderError(this.name, ProviderErrorCode.UNKNOWN, message, error as Error);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('AAPL');
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// SEC FILING PROVIDER
// ============================================================================

/**
 * SEC EDGAR Filing Provider
 *
 * Provides SEC filings from SEC EDGAR API.
 */
export class SECEdgarProvider implements DataProvider<SECFiling> {
  readonly name = 'secEdgar';

  async fetch(symbolOrCik: string, options?: FetchOptions): Promise<SECFiling> {
    try {
      let cik = symbolOrCik;

      // If input looks like a ticker symbol (not all digits), resolve to CIK
      if (!/^\d+$/.test(symbolOrCik)) {
        const resolvedCik = await secEdgarDAO.getCikByTicker(symbolOrCik);
        if (!resolvedCik) {
          throw new Error(`Could not resolve ticker ${symbolOrCik} to CIK`);
        }
        cik = resolvedCik;
      }

      const rawFilings: SECFilingsResponse = await secEdgarDAO.getCompanyFilings(cik);

      return this.transformFilings(rawFilings);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private transformFilings(raw: SECFilingsResponse): SECFiling {
    const filings = raw.filings.recent;
    const filingsArray = [];

    const length = Math.min(
      filings.accessionNumber.length,
      filings.form.length,
      filings.filingDate.length
    );

    for (let i = 0; i < length; i++) {
      filingsArray.push({
        form: filings.form[i],
        filingDate: filings.filingDate[i],
        reportDate: filings.reportDate[i],
        accessionNumber: filings.accessionNumber[i],
        primaryDocument: filings.primaryDocument[i],
      });
    }

    return {
      cik: raw.cik,
      entityName: raw.name,
      tickers: raw.tickers || [],
      filings: filingsArray,
      source: 'secEdgar',
    };
  }

  private handleError(error: unknown): ProviderError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('timeout') || message.includes('timed out')) {
      return new ProviderError(this.name, ProviderErrorCode.TIMEOUT, message, error as Error);
    }

    if (message.includes('404') || message.includes('No filings found')) {
      return new ProviderError(this.name, ProviderErrorCode.NOT_FOUND, message, error as Error);
    }

    if (message.includes('Network error')) {
      return new ProviderError(this.name, ProviderErrorCode.NETWORK_ERROR, message, error as Error);
    }

    if (message.includes('Invalid') || message.includes('Unexpected')) {
      return new ProviderError(this.name, ProviderErrorCode.INVALID_RESPONSE, message, error as Error);
    }

    return new ProviderError(this.name, ProviderErrorCode.UNKNOWN, message, error as Error);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with Apple's CIK
      await this.fetch('0000320193');
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// COMMODITY PROVIDERS
// ============================================================================

/**
 * Standard commodity data format
 */
export interface CommodityData {
  name: string;
  price: number;
  timestamp: string;
  source: string;
}

/**
 * Alpha Vantage Commodity Provider
 *
 * Provides commodity prices (WTI Oil, Natural Gas, Copper) from Alpha Vantage API.
 */
export class AlphaVantageCommodityProvider implements DataProvider<CommodityData> {
  readonly name = 'alphaVantage';

  async fetch(commodityType: string, options?: FetchOptions): Promise<CommodityData> {
    try {
      let rawData;

      switch (commodityType.toLowerCase()) {
        case 'oil':
        case 'wti':
          rawData = await alphaVantageDAO.getWTIOil();
          break;
        case 'gas':
        case 'naturalgas':
          rawData = await alphaVantageDAO.getNaturalGas();
          break;
        case 'copper':
          rawData = await alphaVantageDAO.getCopper();
          break;
        default:
          throw new Error(`Unknown commodity type: ${commodityType}`);
      }

      return {
        name: rawData.name,
        price: rawData.value,
        timestamp: `${rawData.date} (Alpha Vantage)`,
        source: 'alphaVantage',
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): ProviderError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('RATE_LIMIT')) {
      return new ProviderError(this.name, ProviderErrorCode.RATE_LIMIT, message, error as Error);
    }

    if (message.includes('API_ERROR')) {
      return new ProviderError(this.name, ProviderErrorCode.INVALID_RESPONSE, message, error as Error);
    }

    if (message.includes('timeout')) {
      return new ProviderError(this.name, ProviderErrorCode.TIMEOUT, message, error as Error);
    }

    if (message.includes('No') || message.includes('not found')) {
      return new ProviderError(this.name, ProviderErrorCode.NOT_FOUND, message, error as Error);
    }

    return new ProviderError(this.name, ProviderErrorCode.UNKNOWN, message, error as Error);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('oil');
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// NEWS PROVIDERS
// ============================================================================

/**
 * RSS Feed News Provider
 *
 * Provides news from RSS feeds (free, no API key required).
 */
export class RSSNewsProvider implements DataProvider<NewsArticle[]> {
  readonly name = 'rssFeed';

  async fetch(symbol: string, options?: FetchOptions): Promise<NewsArticle[]> {
    try {
      const limit = (options?.context?.limit as number | undefined) ?? 20;
      const rssResults = await rssFeedDAO.getCompanyNews(symbol, limit);

      return rssResults.map((result) => ({
        headline: result.title,
        summary: result.description || '',
        link: result.url,
        datetime: result.publishedAt,
        source: result.source,
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): ProviderError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('timeout')) {
      return new ProviderError(this.name, ProviderErrorCode.TIMEOUT, message, error as Error);
    }

    if (message.includes('Network error') || message.includes('fetch')) {
      return new ProviderError(this.name, ProviderErrorCode.NETWORK_ERROR, message, error as Error);
    }

    if (message.includes('No news found')) {
      return new ProviderError(this.name, ProviderErrorCode.NOT_FOUND, message, error as Error);
    }

    return new ProviderError(this.name, ProviderErrorCode.UNKNOWN, message, error as Error);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('AAPL', { context: { limit: 1 } });
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// PROVIDER INSTANCES (Singletons)
// ============================================================================

// Quote Providers
export const tiingoQuoteProvider = new TiingoQuoteProvider();
export const yahooFinanceQuoteProvider = new YahooFinanceQuoteProvider();
export const alphaVantageQuoteProvider = new AlphaVantageQuoteProvider();

// Fundamentals Providers
export const yahooFinanceFundamentalsProvider = new YahooFinanceFundamentalsProvider();
export const alphaVantageFundamentalsProvider = new AlphaVantageFundamentalsProvider();

// Filing Providers
export const secEdgarProvider = new SECEdgarProvider();

// Commodity Providers
export const alphaVantageCommodityProvider = new AlphaVantageCommodityProvider();

// News Providers
export const rssNewsProvider = new RSSNewsProvider();

// ============================================================================
// PROVIDER GROUPS
// ============================================================================

/**
 * Pre-configured provider groups for common use cases
 *
 * Phase 3: Updated to use Tiingo (primary) + Yahoo Finance (fallback) for quotes
 * Removed: FMP, Finnhub, Brave Search (deprecated providers)
 * News now uses RSS feeds (no provider adapter needed)
 */
export const PROVIDER_GROUPS = {
  quotes: [tiingoQuoteProvider, yahooFinanceQuoteProvider, alphaVantageQuoteProvider],
  fundamentals: [yahooFinanceFundamentalsProvider, alphaVantageFundamentalsProvider],
  filings: [secEdgarProvider],
  commodities: [alphaVantageCommodityProvider],
  news: [rssNewsProvider],
} as const;
