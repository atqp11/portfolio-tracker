/**
 * Financial Data Service
 *
 * Business logic layer for company fundamentals and financial statements.
 * Aggregates data from multiple sources with intelligent fallback via Data Source Orchestrator.
 *
 * Phase 1: Migrated to distributed cache (Vercel KV / Upstash Redis)
 * Phase 2: Migrated to Data Source Orchestrator (Yahoo Finance + Alpha Vantage merge)
 */
import { DataSourceOrchestrator } from '@lib/data-sources';
import {
  yahooFinanceFundamentalsProvider,
  alphaVantageFundamentalsProvider,
  type CompanyFundamentals,
} from '@lib/data-sources/provider-adapters';
import { DataResult } from '@lib/data-sources/types';
import { alphaVantageDAO } from '@backend/modules/stocks/dao/alpha-vantage.dao';
import { getCacheAdapter, type CacheAdapter } from '@lib/cache/adapter';
import { getCacheTTL } from '@lib/config/cache-ttl.config';
import type { TierName } from '@lib/config/types';

// ============================================================================
// INTERFACES
// ============================================================================

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

// Re-export CompanyFundamentals for backward compatibility
export type { CompanyFundamentals };

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class FinancialDataService {
  private readonly orchestrator: DataSourceOrchestrator;
  private readonly cache: CacheAdapter;
  private readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour fallback

  constructor() {
    this.orchestrator = DataSourceOrchestrator.getInstance();
    this.cache = getCacheAdapter();
  }

  /**
   * Get cache TTL based on user tier
   */
  private getCacheTTL(tier?: TierName): number {
    if (tier) {
      return getCacheTTL('fundamentals', tier);
    }
    return this.DEFAULT_TTL;
  }

  /**
   * Get company fundamentals with intelligent multi-source merging via orchestrator
   *
   * Strategy (managed by orchestrator):
   * 1. Check cache (TTL based on tier)
   * 2. Fetch from Yahoo Finance (faster, more complete)
   * 3. Fetch from Alpha Vantage in parallel
   * 4. Merge both sources using merge strategy
   * 5. Return stale cache if all fail (if allowStale: true)
   *
   * @param symbol - Stock ticker symbol
   * @param tier - User tier for TTL selection
   * @returns Comprehensive fundamentals data
   */
  async getFundamentals(symbol: string, tier?: TierName): Promise<CompanyFundamentals | null> {
    const result = await this.orchestrator.fetchWithMerge<CompanyFundamentals>({
      key: symbol,
      providers: [yahooFinanceFundamentalsProvider, alphaVantageFundamentalsProvider],
      mergeStrategy: this.mergeFundamentalsStrategy,
      minProviders: 1, // At least one provider must succeed
      cacheKeyPrefix: 'fundamentals',
      tier: tier || 'free',
      allowStale: true,
    });

    if (result.data === null) {
      console.error(`[FinancialDataService] Failed to fetch fundamentals for ${symbol}:`, result.errors);
      return null;
    }

    // Log cache/staleness info
    if (result.cached) {
      const ageMinutes = Math.round((result.age || 0) / 60000);
      console.log(`[FinancialDataService] Cache hit for ${symbol} fundamentals (age: ${ageMinutes}m)`);
    } else {
      console.log(`[FinancialDataService] Fresh fetch for ${symbol} fundamentals from ${result.source}`);
    }

    return result.data;
  }

  /**
   * Merge strategy for combining fundamentals from multiple providers
   * Prioritizes Yahoo Finance data, fills gaps with Alpha Vantage
   */
  private mergeFundamentalsStrategy = (
    results: Array<DataResult<CompanyFundamentals>>
  ): CompanyFundamentals | null => {
    // Extract successful results
    const yahoo = results.find(r => r.source === 'yahooFinance' && r.data !== null)?.data;
    const alphaVantage = results.find(r => r.source === 'alphaVantage' && r.data !== null)?.data;

    // Need at least one source
    if (!yahoo && !alphaVantage) {
      console.warn('[FinancialDataService] Merge strategy: No successful providers');
      return null;
    }

    const symbol = yahoo?.symbol || alphaVantage?.symbol || '';

    // Merge data with priority to Yahoo Finance
    const merged: CompanyFundamentals = {
      symbol,
      source: yahoo && alphaVantage ? 'merged' : yahoo ? 'yahooFinance' : 'alphaVantage',

      // Valuation metrics (Yahoo preferred)
      marketCap: yahoo?.marketCap ?? alphaVantage?.marketCap ?? null,
      trailingPE: yahoo?.trailingPE ?? alphaVantage?.trailingPE ?? null,
      forwardPE: yahoo?.forwardPE ?? alphaVantage?.forwardPE ?? null,
      pegRatio: yahoo?.pegRatio ?? alphaVantage?.pegRatio ?? null,
      priceToBook: yahoo?.priceToBook ?? alphaVantage?.priceToBook ?? null,
      priceToSales: yahoo?.priceToSales ?? alphaVantage?.priceToSales ?? null,

      // Profitability metrics
      profitMargins: yahoo?.profitMargins ?? alphaVantage?.profitMargins ?? null,
      operatingMargins: yahoo?.operatingMargins ?? alphaVantage?.operatingMargins ?? null,
      returnOnAssets: yahoo?.returnOnAssets ?? alphaVantage?.returnOnAssets ?? null,
      returnOnEquity: yahoo?.returnOnEquity ?? alphaVantage?.returnOnEquity ?? null,

      // Growth metrics
      earningsGrowth: yahoo?.earningsGrowth ?? alphaVantage?.earningsGrowth ?? null,
      revenueGrowth: yahoo?.revenueGrowth ?? alphaVantage?.revenueGrowth ?? null,
      earningsQuarterlyGrowth: yahoo?.earningsQuarterlyGrowth ?? alphaVantage?.earningsQuarterlyGrowth ?? null,

      // Per-share metrics
      epsTrailing: yahoo?.epsTrailing ?? alphaVantage?.epsTrailing ?? null,
      epsForward: yahoo?.epsForward ?? alphaVantage?.epsForward ?? null,
      revenuePerShare: yahoo?.revenuePerShare ?? alphaVantage?.revenuePerShare ?? null,

      // Financial health
      beta: yahoo?.beta ?? alphaVantage?.beta ?? null,
      dividendYield: yahoo?.dividendYield ?? alphaVantage?.dividendYield ?? null,
      totalRevenue: yahoo?.totalRevenue ?? alphaVantage?.totalRevenue ?? null,
      grossProfits: yahoo?.grossProfits ?? alphaVantage?.grossProfits ?? null,
      freeCashflow: yahoo?.freeCashflow ?? alphaVantage?.freeCashflow ?? null,
      operatingCashflow: yahoo?.operatingCashflow ?? alphaVantage?.operatingCashflow ?? null,
    };

    console.log(`[FinancialDataService] Merged fundamentals for ${symbol} (source: ${merged.source})`);
    return merged;
  };

  /**
   * Get income statement (annual)
   *
   * Uses cache + Alpha Vantage (single provider, simple fallback).
   *
   * @param symbol - Stock ticker symbol
   * @param tier - User tier for TTL selection
   * @returns Income statement data
   */
  async getIncomeStatement(symbol: string, tier?: TierName): Promise<FinancialStatement[]> {
    const cacheKey = `income-statement:${symbol}:v1`;
    const ttl = this.getCacheTTL(tier);

    // Check cache
    const cached = await this.cache.get<FinancialStatement[]>(cacheKey);
    if (cached) {
      console.log(`[FinancialDataService] Cache hit for income statement ${symbol}`);
      return cached;
    }

    console.log(`[FinancialDataService] Fetching income statement for ${symbol}`);
    const data = await alphaVantageDAO.getIncomeStatement(symbol);

    const statements = data.annualReports || [];
    await this.cache.set(cacheKey, statements, ttl);

    console.log(`[FinancialDataService] Income statement for ${symbol}: ${statements.length} annual reports`);
    return statements;
  }

  /**
   * Get balance sheet (annual)
   *
   * @param symbol - Stock ticker symbol
   * @param tier - User tier for TTL selection
   * @returns Balance sheet data
   */
  async getBalanceSheet(symbol: string, tier?: TierName): Promise<FinancialStatement[]> {
    const cacheKey = `balance-sheet:${symbol}:v1`;
    const ttl = this.getCacheTTL(tier);

    // Check cache
    const cached = await this.cache.get<FinancialStatement[]>(cacheKey);
    if (cached) {
      console.log(`[FinancialDataService] Cache hit for balance sheet ${symbol}`);
      return cached;
    }

    console.log(`[FinancialDataService] Fetching balance sheet for ${symbol}`);
    const data = await alphaVantageDAO.getBalanceSheet(symbol);

    const statements = data.annualReports || [];
    await this.cache.set(cacheKey, statements, ttl);

    console.log(`[FinancialDataService] Balance sheet for ${symbol}: ${statements.length} annual reports`);
    return statements;
  }

  /**
   * Get cash flow statement (annual)
   *
   * @param symbol - Stock ticker symbol
   * @param tier - User tier for TTL selection
   * @returns Cash flow data
   */
  async getCashFlow(symbol: string, tier?: TierName): Promise<FinancialStatement[]> {
    const cacheKey = `cash-flow:${symbol}:v1`;
    const ttl = this.getCacheTTL(tier);

    // Check cache
    const cached = await this.cache.get<FinancialStatement[]>(cacheKey);
    if (cached) {
      console.log(`[FinancialDataService] Cache hit for cash flow ${symbol}`);
      return cached;
    }

    console.log(`[FinancialDataService] Fetching cash flow for ${symbol}`);
    const data = await alphaVantageDAO.getCashFlow(symbol);

    const statements = data.annualReports || [];
    await this.cache.set(cacheKey, statements, ttl);

    console.log(`[FinancialDataService] Cash flow for ${symbol}: ${statements.length} annual reports`);
    return statements;
  }

  /**
   * Get all financial statements combined
   *
   * Fetches income statement, balance sheet, and cash flow in parallel.
   *
   * @param symbol - Stock ticker symbol
   * @param tier - User tier for TTL selection
   * @returns Combined financial statements
   */
  async getAllFinancials(symbol: string, tier?: TierName): Promise<FinancialStatements> {
    const cacheKey = `all-financials:${symbol}:v1`;
    const ttl = this.getCacheTTL(tier);

    // Check cache
    const cached = await this.cache.get<FinancialStatements>(cacheKey);
    if (cached) {
      console.log(`[FinancialDataService] Cache hit for all financials ${symbol}`);
      return {
        ...cached,
        source: 'cache'
      };
    }

    console.log(`[FinancialDataService] Fetching all financials for ${symbol}`);

    // Fetch all statements in parallel
    const [incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      this.getIncomeStatement(symbol, tier),
      this.getBalanceSheet(symbol, tier),
      this.getCashFlow(symbol, tier)
    ]);

    const result: FinancialStatements = {
      symbol,
      incomeStatement,
      balanceSheet,
      cashFlow,
      source: 'alphavantage',
      timestamp: Date.now()
    };

    await this.cache.set(cacheKey, result, ttl);

    console.log(`[FinancialDataService] All financials for ${symbol}: ${incomeStatement.length} income, ${balanceSheet.length} balance, ${cashFlow.length} cash flow`);
    return result;
  }
}

// Export singleton instance
export const financialDataService = new FinancialDataService();
