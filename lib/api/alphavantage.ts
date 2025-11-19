// lib/api/alphavantage.ts

// ============================================================================
// INTERFACES
// ============================================================================

export interface AlphaVantageQuote {
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

export interface IncomeStatement {
  fiscalDateEnding: string;
  reportedCurrency: string;
  grossProfit: string;
  totalRevenue: string;
  costOfRevenue: string;
  costofGoodsAndServicesSold: string;
  operatingIncome: string;
  sellingGeneralAndAdministrative: string;
  researchAndDevelopment: string;
  operatingExpenses: string;
  investmentIncomeNet: string;
  netInterestIncome: string;
  interestIncome: string;
  interestExpense: string;
  nonInterestIncome: string;
  otherNonOperatingIncome: string;
  depreciation: string;
  depreciationAndAmortization: string;
  incomeBeforeTax: string;
  incomeTaxExpense: string;
  interestAndDebtExpense: string;
  netIncomeFromContinuingOperations: string;
  comprehensiveIncomeNetOfTax: string;
  ebit: string;
  ebitda: string;
  netIncome: string;
}

export interface BalanceSheet {
  fiscalDateEnding: string;
  reportedCurrency: string;
  totalAssets: string;
  totalCurrentAssets: string;
  cashAndCashEquivalentsAtCarryingValue: string;
  cashAndShortTermInvestments: string;
  inventory: string;
  currentNetReceivables: string;
  totalNonCurrentAssets: string;
  propertyPlantEquipment: string;
  accumulatedDepreciationAmortizationPPE: string;
  intangibleAssets: string;
  intangibleAssetsExcludingGoodwill: string;
  goodwill: string;
  investments: string;
  longTermInvestments: string;
  shortTermInvestments: string;
  otherCurrentAssets: string;
  otherNonCurrentAssets: string;
  totalLiabilities: string;
  totalCurrentLiabilities: string;
  currentAccountsPayable: string;
  deferredRevenue: string;
  currentDebt: string;
  shortTermDebt: string;
  totalNonCurrentLiabilities: string;
  capitalLeaseObligations: string;
  longTermDebt: string;
  currentLongTermDebt: string;
  longTermDebtNoncurrent: string;
  shortLongTermDebtTotal: string;
  otherCurrentLiabilities: string;
  otherNonCurrentLiabilities: string;
  totalShareholderEquity: string;
  treasuryStock: string;
  retainedEarnings: string;
  commonStock: string;
  commonStockSharesOutstanding: string;
}

export interface CashFlowStatement {
  fiscalDateEnding: string;
  reportedCurrency: string;
  operatingCashflow: string;
  paymentsForOperatingActivities: string;
  proceedsFromOperatingActivities: string;
  changeInOperatingLiabilities: string;
  changeInOperatingAssets: string;
  depreciationDepletionAndAmortization: string;
  capitalExpenditures: string;
  changeInReceivables: string;
  changeInInventory: string;
  profitLoss: string;
  cashflowFromInvestment: string;
  cashflowFromFinancing: string;
  proceedsFromRepaymentsOfShortTermDebt: string;
  paymentsForRepurchaseOfCommonStock: string;
  paymentsForRepurchaseOfEquity: string;
  paymentsForRepurchaseOfPreferredStock: string;
  dividendPayout: string;
  dividendPayoutCommonStock: string;
  dividendPayoutPreferredStock: string;
  proceedsFromIssuanceOfCommonStock: string;
  proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet: string;
  proceedsFromIssuanceOfPreferredStock: string;
  proceedsFromRepurchaseOfEquity: string;
  proceedsFromSaleOfTreasuryStock: string;
  changeInCashAndCashEquivalents: string;
  changeInExchangeRate: string;
  netIncome: string;
}

export interface FinancialData {
  annualReports: IncomeStatement[] | BalanceSheet[] | CashFlowStatement[];
  quarterlyReports: IncomeStatement[] | BalanceSheet[] | CashFlowStatement[];
}

const API_KEY = process.env.ALPHAVANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';
import { markRateLimited } from '../rateLimitTracker';
import { recordRateLimit } from '../metrics';

// Adding detailed logging to debug fetching quotes
export const fetchAlphaVantageQuote = async (symbol: string): Promise<AlphaVantageQuote | null> => {
  if (!API_KEY) {
    console.warn('Alpha Vantage API key not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced to 5 seconds for faster failure

  try {
    console.log(`Fetching quote for symbol: ${symbol}`);

    const response = await fetch(
      `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`,
      { signal: controller.signal }
    );

    console.log(`Response received for symbol: ${symbol}`);
    const data = await response.json();
    console.log(`Data for symbol ${symbol}:`, data);

    // Check for rate limit or error messages
    if (data['Error Message'] || data['Note'] || data['Information']) {
      const errorMsg = data['Error Message'] || data['Note'] || data['Information'];
      console.warn(`Alpha Vantage error for ${symbol}:`, errorMsg);

      // Throw specific error for rate limits so it can be caught and classified
      if (errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('api rate limit')) {
        try { recordRateLimit('alpha_vantage', errorMsg); } catch {}
        try { markRateLimited('alpha_vantage', 1); } catch {}
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }

      return null;
    }

    const quote = data['Global Quote'];
    if (!quote) {
      console.warn(`No quote data for ${symbol}`);
      return null;
    }

    console.log(`Parsed quote for ${symbol}:`, quote);
    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent']
    };
  } catch (error) {
    console.warn(`Alpha Vantage fetch failed for ${symbol}:`, error);
    // Propagate rate-limit errors so callers can handle them specially
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate_limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    return null;
  } finally {
    clearTimeout(timeoutId); // Always clear timeout
  }
};

export const fetchAlphaVantageQuotes = async (symbols: string[]): Promise<Record<string, number>> => {
  const priceMap: Record<string, number> = {};
  let rateLimitDetected = false;
  
  // Make all API calls in parallel - let Alpha Vantage handle rate limiting
  // This is much faster as we get results immediately until we hit the limit
  const promises = symbols.map(symbol => 
    fetchAlphaVantageQuote(symbol)
      .then(quote => ({ symbol, quote, error: null }))
      .catch(error => {
        console.warn(`Failed to fetch ${symbol}:`, error);
        // Check if it's a rate limit error
        if (error?.message?.includes('RATE_LIMIT')) {
          rateLimitDetected = true;
        }
        return { symbol, quote: null, error };
      })
  );
  
  // Wait for all requests to complete (or fail)
  const results = await Promise.all(promises);
  
  // Build price map from results
  results.forEach(({ symbol, quote }) => {
    if (quote) {
      priceMap[symbol] = quote.price;
    }
  });
  
  // If rate limit detected, throw error so it can be properly handled
  if (rateLimitDetected && Object.keys(priceMap).length === 0) {
    throw new Error('RATE_LIMIT: API rate limit exceeded. Please try again later or upgrade your API plan.');
  }
  
  return priceMap;
};

// Batch function that tries to get as many quotes as possible within rate limits
export const fetchAlphaVantageBatch = async (symbols: string[]): Promise<Record<string, number> | { error: string; type: string; status: number }> => {
  if (!API_KEY) {
    console.error('Alpha Vantage API key is missing. Please set the API_KEY environment variable in your .env.local file.');
    return {
      error: 'API key not configured',
      type: 'auth',
      status: 401
    };
  }

  // For free tier, we can only do 5 calls per minute
  // Take first 5 symbols and process them
  const limitedSymbols = symbols.slice(0, 5);
  
  console.log(`Fetching Alpha Vantage quotes for: ${limitedSymbols.join(', ')}`);
  
  try {
    const result = await fetchAlphaVantageQuotes(limitedSymbols);
    
    // If no quotes were fetched, it might be a rate limit issue
    if (Object.keys(result).length === 0 && limitedSymbols.length > 0) {
      return {
        error: 'No quotes could be fetched. This may be due to API rate limits.',
        type: 'rate_limit',
        status: 429
      };
    }
    
    return result;
  } catch (error: any) {
    console.error('Batch fetch error:', error);
    return {
      error: error?.message || 'Failed to fetch quotes',
      type: 'unknown',
      status: 503
    };
  }
};

// ============================================================================
// FUNDAMENTAL DATA ENDPOINTS
// ============================================================================

/**
 * Fetch company overview with fundamental metrics
 * Includes: P/E, P/B, ROE, ROA, margins, EV/EBITDA, etc.
 */
export const fetchCompanyOverview = async (symbol: string): Promise<CompanyOverview | null> => {
  if (!API_KEY) {
    console.warn('Alpha Vantage API key not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    console.log(`Fetching company overview for: ${symbol}`);

    const response = await fetch(
      `${BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`,
      { signal: controller.signal }
    );

    const data = await response.json();

    // Check for errors
    if (data['Error Message'] || data['Note'] || data['Information']) {
      const errorMsg = data['Error Message'] || data['Note'] || data['Information'];
      console.warn(`Alpha Vantage overview error for ${symbol}:`, errorMsg);
      
      if (errorMsg.toLowerCase().includes('rate limit')) {
        try { recordRateLimit('alpha_vantage', errorMsg); } catch {}
        try { markRateLimited('alpha_vantage', 1); } catch {}
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }
      
      return null;
    }

    // Check if we got valid data
    if (!data.Symbol) {
      console.warn(`No overview data for ${symbol}`);
      return null;
    }

    return data as CompanyOverview;
  } catch (error) {
    console.warn(`Failed to fetch overview for ${symbol}:`, error);
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate_limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    return null;
  } finally {
    clearTimeout(timeoutId); // Always clear timeout
  }
};

/**
 * Fetch income statement (annual and quarterly)
 * Returns 5 years of annual data and 20 quarters
 */
export const fetchIncomeStatement = async (symbol: string): Promise<FinancialData | null> => {
  if (!API_KEY) {
    console.warn('Alpha Vantage API key not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    console.log(`Fetching income statement for: ${symbol}`);

    const response = await fetch(
      `${BASE_URL}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${API_KEY}`,
      { signal: controller.signal }
    );

    const data = await response.json();

    // Check for errors
    if (data['Error Message'] || data['Note'] || data['Information']) {
      const errorMsg = data['Error Message'] || data['Note'] || data['Information'];
      console.warn(`Alpha Vantage income statement error for ${symbol}:`, errorMsg);
      
      if (errorMsg.toLowerCase().includes('rate limit')) {
        try { recordRateLimit('alpha_vantage', errorMsg); } catch {}
        try { markRateLimited('alpha_vantage', 1); } catch {}
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }
      
      return null;
    }

    return {
      annualReports: data.annualReports || [],
      quarterlyReports: data.quarterlyReports || []
    };
  } catch (error) {
    console.warn(`Failed to fetch income statement for ${symbol}:`, error);
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate_limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    return null;
  } finally {
    clearTimeout(timeoutId); // Always clear timeout
  }
};

/**
 * Fetch balance sheet (annual and quarterly)
 */
export const fetchBalanceSheet = async (symbol: string): Promise<FinancialData | null> => {
  if (!API_KEY) {
    console.warn('Alpha Vantage API key not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    console.log(`Fetching balance sheet for: ${symbol}`);

    const response = await fetch(
      `${BASE_URL}?function=BALANCE_SHEET&symbol=${symbol}&apikey=${API_KEY}`,
      { signal: controller.signal }
    );

    const data = await response.json();

    // Check for errors
    if (data['Error Message'] || data['Note'] || data['Information']) {
      const errorMsg = data['Error Message'] || data['Note'] || data['Information'];
      console.warn(`Alpha Vantage balance sheet error for ${symbol}:`, errorMsg);
      
      if (errorMsg.toLowerCase().includes('rate limit')) {
        try { recordRateLimit('alpha_vantage', errorMsg); } catch {}
        try { markRateLimited('alpha_vantage', 1); } catch {}
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }
      
      return null;
    }

    return {
      annualReports: data.annualReports || [],
      quarterlyReports: data.quarterlyReports || []
    };
  } catch (error) {
    console.warn(`Failed to fetch balance sheet for ${symbol}:`, error);
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate_limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    return null;
  } finally {
    clearTimeout(timeoutId); // Always clear timeout
  }
};

/**
 * Fetch cash flow statement (annual and quarterly)
 */
export const fetchCashFlow = async (symbol: string): Promise<FinancialData | null> => {
  if (!API_KEY) {
    console.warn('Alpha Vantage API key not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    console.log(`Fetching cash flow for: ${symbol}`);

    const response = await fetch(
      `${BASE_URL}?function=CASH_FLOW&symbol=${symbol}&apikey=${API_KEY}`,
      { signal: controller.signal }
    );

    const data = await response.json();

    // Check for errors
    if (data['Error Message'] || data['Note'] || data['Information']) {
      const errorMsg = data['Error Message'] || data['Note'] || data['Information'];
      console.warn(`Alpha Vantage cash flow error for ${symbol}:`, errorMsg);
      
      if (errorMsg.toLowerCase().includes('rate limit')) {
        try { recordRateLimit('alpha_vantage', errorMsg); } catch {}
        try { markRateLimited('alpha_vantage', 1); } catch {}
        throw new Error(`RATE_LIMIT: ${errorMsg}`);
      }
      
      return null;
    }

    return {
      annualReports: data.annualReports || [],
      quarterlyReports: data.quarterlyReports || []
    };
  } catch (error) {
    console.warn(`Failed to fetch cash flow for ${symbol}:`, error);
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate_limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    if (error && (error as any).message && (error as any).message.toString().toLowerCase().includes('rate limit')) {
      try { recordRateLimit('alpha_vantage', (error as any).message); } catch {}
      try { markRateLimited('alpha_vantage', 1); } catch {}
      throw error;
    }
    return null;
  } finally {
    clearTimeout(timeoutId); // Always clear timeout
  }
};

/**
 * Fetch all fundamental data for a symbol (optimized for caching)
 */
export const fetchAllFundamentals = async (symbol: string) => {
  const [overview, income, balance, cashFlow] = await Promise.all([
    fetchCompanyOverview(symbol),
    fetchIncomeStatement(symbol),
    fetchBalanceSheet(symbol),
    fetchCashFlow(symbol)
  ]);

  return {
    overview,
    income,
    balance,
    cashFlow,
    fetchedAt: new Date().toISOString()
  };
};