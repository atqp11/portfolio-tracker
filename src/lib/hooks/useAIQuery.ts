/**
 * useAIQuery.ts
 * 
 * TanStack Query hooks for AI data fetching with intelligent caching strategy.
 * 
 * CACHING STRATEGY:
 * 1. On mount: Batch fetch for all portfolio tickers → parse → store individual caches
 * 2. During session: Individual queries check cache first, update individual cache on miss
 * 3. On remount: If batch cache expired → refresh all, else reuse individual caches
 * 4. Portfolio change: Detect adds/removes → invalidate batch → fresh fetch
 * 
 * SCENARIOS HANDLED:
 * - First visit / page refresh → batch fetch for all stocks
 * - Navigation away and back → no call if cache valid
 * - User asks while fresh → instant memory hit (<10ms)
 * - Batch expires during chat → individual fetch only for queried stock
 * - User keeps asking same expired stock → deduped by TanStack Query
 * - Browser crash / storage cleared → fresh batch on next mount
 * - Portfolio change → fresh batch with new list
 * 
 * TTLs:
 * - News: 1 hour
 * - Filings: 1 day (24 hours)
 * - Sentiment: 1 hour
 * - Company Profile: 7 days
 * - SEC Filing (individual): 24 hours
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { 
  AIDataType, 
  AIBatchDataType,
  loadAICache, 
  saveAICache,
  parseBatchAndCacheIndividual,
  loadIndividualCache,
  isBatchCacheValid,
  loadCachedStocks,
  getCacheTTL,
  getBatchCacheTTL,
  saveBatchMetadata,
  detectPortfolioChange,
  savePortfolioTickers,
  invalidateAllBatchCaches,
  clearRemovedTickerCaches,
  isStorageAvailable,
  isCacheHealthy,
  recoverCache,
  AICacheError,
} from '@lib/utils/aiCache';

// ============================================================================
// TYPES
// ============================================================================

export interface SentimentData {
  ticker?: string;
  sentiment?: string;
  summary?: string;
  key_points?: string[];
}

export interface Filing {
  ticker?: string;
  form_type?: string;
  filing_date?: string;
  summary?: string;
  url?: string;
}

export interface Article {
  ticker?: string;
  headline?: string;
  summary?: string;
  sentiment?: string;
}

export interface Profile {
  description?: string;
  industry?: string;
  ceo?: string;
  headquarters?: string;
  website?: string;
}

interface AIResponse {
  text: string;
  fromCache?: boolean;
  cached?: boolean;
  rateLimited?: boolean;
  errorMessage?: string;
}

// Error types for better error handling
export class AIQueryError extends Error {
  constructor(
    message: string,
    public readonly code: 'RATE_LIMITED' | 'NETWORK_ERROR' | 'PARSE_ERROR' | 'API_ERROR',
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIQueryError';
  }
}

// ============================================================================
// API CALLER WITH ENHANCED ERROR HANDLING
// ============================================================================

async function callAiApi(
  payload: { model: string; contents: string; config?: Record<string, unknown> },
  isBatch = false
): Promise<AIResponse> {
  try {
    // Use batch endpoint for portfolio queries (doesn't count against chat quota)
    // Use generate endpoint for user chat messages (counts against chat quota)
    const endpoint = isBatch ? '/api/ai/batch' : '/api/ai/generate';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      
      // Rate limit error
      if (res.status === 429 || errorData.rateLimitExceeded || errorData.quotaExceeded) {
        const message = errorData.error?.message || 'Rate limit exceeded';
        return { text: '', rateLimited: true, errorMessage: message };
      }
      
      // Server errors (retryable)
      if (res.status >= 500) {
        throw new AIQueryError(
          `Server error: ${res.status}`,
          'API_ERROR',
          true // retryable
        );
      }
      
      throw new AIQueryError(
        errorData.error?.message || `HTTP ${res.status}`,
        'API_ERROR',
        false
      );
    }

    const result = await res.json();
    
    // Validate response structure
    if (typeof result.text !== 'string') {
      throw new AIQueryError('Invalid API response format', 'PARSE_ERROR', false);
    }
    
    return result;
  } catch (error) {
    // Network errors are retryable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AIQueryError('Network error - please check your connection', 'NETWORK_ERROR', true);
    }
    throw error;
  }
}

/**
 * Safely parse JSON response with fallback
 */
export function safeParseResponse<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  
  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn('Failed to parse AI response, using fallback');
    return fallback;
  }
}

// ============================================================================
// PORTFOLIO CHANGE QUOTA TRACKING
// Client detects changes (localStorage), server counts them
// 
// SCENARIOS:
// 1. First batch (no previous portfolio in localStorage) → FREE, no quota check
// 2. Same portfolio, cache expired → FREE, no quota check
// 3. Portfolio changed → CHECK quota for free tier, COUNT if allowed
// 4. Paid user (unlimited) → Always allowed, never counted
// ============================================================================

interface PortfolioChangeQuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  unlimited: boolean;
  reason?: string;
}

// Track if a portfolio change was detected in this session
// Set by usePortfolioChangeDetection, consumed by batch hooks
let portfolioChangeDetectedInSession = false;
let isFirstBatchEver = false;

/**
 * Mark that a portfolio change was detected (called by usePortfolioChangeDetection)
 */
export function markPortfolioChangeDetected(): void {
  portfolioChangeDetectedInSession = true;
}

/**
 * Mark that this is the first batch ever (no previous portfolio)
 */
export function markFirstBatchEver(): void {
  isFirstBatchEver = true;
}

/**
 * Check if we should count this batch against quota
 * Only counts if: portfolio changed AND not first batch AND not unlimited tier
 */
function shouldCountAgainstQuota(): boolean {
  return portfolioChangeDetectedInSession && !isFirstBatchEver;
}

/**
 * Check portfolio change quota with the server
 * Returns quota status and whether batch refresh is allowed
 */
async function checkPortfolioChangeQuota(): Promise<PortfolioChangeQuotaResult> {
  try {
    const response = await fetch('/api/ai/portfolio-change');
    
    if (!response.ok) {
      // If quota check fails, allow the batch (fail open)
      console.warn('[Portfolio Change] Quota check failed, allowing batch');
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        unlimited: true,
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error('[Portfolio Change] Error checking quota:', error);
    // Fail open - allow the batch if we can't check quota
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      unlimited: true,
    };
  }
}

/**
 * Record a successful portfolio change (only for free tier)
 */
async function recordPortfolioChange(): Promise<void> {
  try {
    await fetch('/api/ai/portfolio-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });
  } catch (error) {
    console.error('[Portfolio Change] Error recording change:', error);
    // Don't fail the batch if recording fails
  }
}

// Store last quota check result for sharing between batch hooks
let lastQuotaCheck: {
  result: PortfolioChangeQuotaResult;
  timestamp: number;
} | null = null;

const QUOTA_CHECK_CACHE_TTL = 10000; // 10 seconds - enough for all 3 batch hooks to share

/**
 * Get or fetch portfolio change quota (cached for short period to avoid duplicate calls)
 * Only called when shouldCountAgainstQuota() is true
 */
async function getPortfolioChangeQuota(): Promise<PortfolioChangeQuotaResult> {
  const now = Date.now();
  
  // Use cached result if recent
  if (lastQuotaCheck && now - lastQuotaCheck.timestamp < QUOTA_CHECK_CACHE_TTL) {
    return lastQuotaCheck.result;
  }
  
  // Fetch fresh quota check
  const result = await checkPortfolioChangeQuota();
  lastQuotaCheck = { result, timestamp: now };
  
  return result;
}

// Track if we've already recorded the portfolio change for this session
let recordedChangeInSession = false;

/**
 * Record change once per session (reset on page reload or portfolio change)
 */
async function recordChangeOnce(): Promise<void> {
  // Only record once per session
  if (recordedChangeInSession) {
    return;
  }
  
  await recordPortfolioChange();
  recordedChangeInSession = true;
  // Reset the change detection flag after recording
  portfolioChangeDetectedInSession = false;
  isFirstBatchEver = false;
}

// Quota exceeded error for UI handling
export class PortfolioChangeQuotaExceededError extends Error {
  constructor(
    message: string,
    public readonly remaining: number,
    public readonly limit: number
  ) {
    super(message);
    this.name = 'PortfolioChangeQuotaExceededError';
  }
}

// ============================================================================
// PORTFOLIO CHANGE HOOK
// Detects portfolio changes and triggers cache invalidation
// ============================================================================

/**
 * Hook to detect portfolio changes and invalidate caches
 * Should be called at the top of the component that uses AI queries
 */
export function usePortfolioChangeDetection(tickers: string[]) {
  const queryClient = useQueryClient();
  const previousTickersRef = useRef<string[]>([]);
  
  useEffect(() => {
    if (tickers.length === 0) return;
    
    const { changed, added, removed, previousTickers } = detectPortfolioChange(tickers);
    
    // Check if this is the first batch ever (no previous portfolio)
    const isFirstEver = previousTickers.length === 0;
    
    if (changed) {
      console.log('🔄 Portfolio changed, invalidating caches...');
      
      // Clear caches for removed tickers
      if (removed.length > 0) {
        clearRemovedTickerCaches(removed);
      }
      
      // Invalidate all batch caches to trigger fresh fetch
      invalidateAllBatchCaches();
      
      // Invalidate TanStack Query caches
      queryClient.invalidateQueries({ queryKey: ['ai', 'news', 'batch'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'filings', 'batch'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'sentiment', 'batch'] });
      
      // Save new portfolio for future detection
      savePortfolioTickers(tickers);
      
      // Mark portfolio change detected (for quota tracking)
      // Only mark as "change" if there was a previous portfolio to compare against
      if (isFirstEver) {
        markFirstBatchEver();
        console.log('📦 First batch ever - no quota consumed');
      } else {
        markPortfolioChangeDetected();
        console.log('📊 Portfolio change detected - will check quota');
      }
      
      // Reset the recorded change tracker so next batch records the change
      recordedChangeInSession = false;
    } else if (previousTickersRef.current.length === 0) {
      // First mount with same portfolio - just save tickers
      savePortfolioTickers(tickers);
    }
    
    previousTickersRef.current = tickers;
  }, [tickers, queryClient]);
}

// ============================================================================
// CACHE HEALTH HOOK
// Checks storage availability and recovers from corruption
// ============================================================================

export function useCacheHealth() {
  useEffect(() => {
    if (!isStorageAvailable()) {
      console.warn('⚠️ localStorage not available, caching disabled');
      return;
    }
    
    if (!isCacheHealthy()) {
      console.warn('⚠️ Cache corruption detected, recovering...');
      recoverCache();
    }
  }, []);
}

// ============================================================================
// BATCH QUERY HOOKS
// These fetch data for all portfolio tickers and cache at individual level
// Handles: first visit, remount, portfolio changes, storage cleared
// ============================================================================

/**
 * Batch fetch portfolio news - caches at individual stock level
 * 
 * Scenarios:
 * - First visit: Fetches all, caches individually (FREE - first batch)
 * - Remount (cache valid): Returns from localStorage, no API call (FREE)
 * - Remount (cache expired): Fresh batch fetch (FREE - just expired)
 * - Portfolio change: Check quota first, then fetch (COUNTS for free tier)
 */
export function usePortfolioNews(tickers: string[], enabled = true) {
  const queryClient = useQueryClient();
  const tickersKey = [...tickers].sort().join(',');
  
  return useQuery({
    queryKey: ['ai', 'news', 'batch', tickersKey],
    queryFn: async (): Promise<Map<string, Article[]>> => {
      if (tickers.length === 0) return new Map();
      
      // Check if batch cache is valid (handles remount scenario)
      if (isBatchCacheValid('batch_news', tickers)) {
        const { cached, missing } = loadCachedStocks<Article[]>('batch_news', tickers);
        
        // All stocks cached - instant return (<10ms)
        if (missing.length === 0) {
          console.log('♻️ [NEWS] Using cached data for all tickers (remount hit)');
          return cached;
        }
        
        // Partial cache - refresh all for consistency
        console.log(`⚠️ [NEWS] Partial cache (${missing.length} missing), refreshing all`);
      }
      
      // Only check quota if this is a portfolio change (not first batch or cache refresh)
      if (shouldCountAgainstQuota()) {
        const quotaResult = await getPortfolioChangeQuota();
        
        // If quota not allowed (portfolio changed and free tier exhausted limit)
        if (!quotaResult.allowed) {
          console.log(`⛔ [NEWS] Portfolio change quota exceeded: ${quotaResult.reason}`);
          throw new PortfolioChangeQuotaExceededError(
            quotaResult.reason || 'Daily portfolio change limit reached',
            quotaResult.remaining,
            quotaResult.limit
          );
        }
      }
      
      console.log(`🔄 [NEWS] Fetching batch for ${tickers.length} tickers`);

      // Fetch fresh data using batch endpoint (doesn't count against chat quota)
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `Provide the top 10 recent news headlines for the following stock tickers: ${tickers.join(', ')}. For each article, include the stock ticker, a brief one-sentence summary, and the overall sentiment ('POSITIVE', 'NEGATIVE', or 'NEUTRAL').`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              articles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    headline: { type: 'string' },
                    summary: { type: 'string' },
                    sentiment: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }, true); // isBatch = true

      if (response.rateLimited) {
        throw new AIQueryError(response.errorMessage || 'Rate limited', 'RATE_LIMITED', false);
      }

      const data = safeParseResponse(response.text, { articles: [] });
      const articles = data.articles || [];
      
      // Parse and cache at individual level
      const stockDataMap = parseBatchAndCacheIndividual<Article>('batch_news', articles, tickers);
      
      // Record the portfolio change (only if this was a portfolio change, not first batch)
      // This is the "leader" hook - news runs first, so it records the change
      if (shouldCountAgainstQuota()) {
        await recordChangeOnce();
      }
      
      console.log(`✅ [NEWS] Cached ${stockDataMap.size} stocks`);
      
      return stockDataMap as Map<string, Article[]>;
    },
    staleTime: getBatchCacheTTL('batch_news'),
    gcTime: getBatchCacheTTL('batch_news') * 2,
    enabled: enabled && tickers.length > 0,
    retry: (failureCount, error) => {
      // Don't retry quota exceeded errors
      if (error instanceof PortfolioChangeQuotaExceededError) {
        return false;
      }
      // Only retry network/server errors, max 2 retries
      if (error instanceof AIQueryError && error.retryable) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Batch fetch portfolio filings - caches at individual stock level
 * Relies on news hook to record the change (leader pattern)
 */
export function usePortfolioFilings(tickers: string[], enabled = true) {
  const tickersKey = [...tickers].sort().join(',');
  
  return useQuery({
    queryKey: ['ai', 'filings', 'batch', tickersKey],
    queryFn: async (): Promise<Map<string, Filing[]>> => {
      if (tickers.length === 0) return new Map();
      
      // Check if batch cache is valid
      if (isBatchCacheValid('batch_filings', tickers)) {
        const { cached, missing } = loadCachedStocks<Filing[]>('batch_filings', tickers);
        if (missing.length === 0) {
          console.log('♻️ [FILINGS] Using cached data for all tickers');
          return cached;
        }
        console.log(`⚠️ [FILINGS] Partial cache, refreshing all`);
      }
      
      // Only check quota if this is a portfolio change (not first batch or cache refresh)
      if (shouldCountAgainstQuota()) {
        const quotaResult = await getPortfolioChangeQuota();
        
        if (!quotaResult.allowed) {
          console.log(`⛔ [FILINGS] Portfolio change quota exceeded`);
          throw new PortfolioChangeQuotaExceededError(
            quotaResult.reason || 'Daily portfolio change limit reached',
            quotaResult.remaining,
            quotaResult.limit
          );
        }
      }
      
      console.log(`🔄 [FILINGS] Fetching batch for ${tickers.length} tickers`);

      // Fetch fresh data using batch endpoint (doesn't count against chat quota)
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `Provide the top 5 most recent and important SEC filings (like 8-K, 10-K, 10-Q) for the following stock tickers: ${tickers.join(', ')}. For each filing, include the stock ticker, the form type, the filing date, and a brief one-sentence summary.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              filings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    form_type: { type: 'string' },
                    filing_date: { type: 'string' },
                    summary: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }, true); // isBatch = true

      if (response.rateLimited) {
        throw new AIQueryError(response.errorMessage || 'Rate limited', 'RATE_LIMITED', false);
      }

      const data = safeParseResponse(response.text, { filings: [] });
      const filings = data.filings || [];
      
      const stockDataMap = parseBatchAndCacheIndividual<Filing>('batch_filings', filings, tickers);
      console.log(`✅ [FILINGS] Cached ${stockDataMap.size} stocks`);
      
      return stockDataMap as Map<string, Filing[]>;
    },
    staleTime: getBatchCacheTTL('batch_filings'),
    gcTime: getBatchCacheTTL('batch_filings') * 2,
    enabled: enabled && tickers.length > 0,
    retry: (failureCount, error) => {
      if (error instanceof PortfolioChangeQuotaExceededError) {
        return false;
      }
      if (error instanceof AIQueryError && error.retryable) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Batch fetch portfolio sentiment - caches at individual stock level
 * Relies on news hook to record the change (leader pattern)
 */
export function usePortfolioSentiment(tickers: string[], enabled = true) {
  const tickersKey = [...tickers].sort().join(',');
  
  return useQuery({
    queryKey: ['ai', 'sentiment', 'batch', tickersKey],
    queryFn: async (): Promise<Map<string, SentimentData>> => {
      if (tickers.length === 0) return new Map();
      
      // Check if batch cache is valid
      if (isBatchCacheValid('batch_sentiment', tickers)) {
        const { cached, missing } = loadCachedStocks<SentimentData>('batch_sentiment', tickers);
        if (missing.length === 0) {
          console.log('♻️ [SENTIMENT] Using cached data for all tickers');
          return cached;
        }
        console.log(`⚠️ [SENTIMENT] Partial cache, refreshing all`);
      }
      
      // Only check quota if this is a portfolio change (not first batch or cache refresh)
      if (shouldCountAgainstQuota()) {
        const quotaResult = await getPortfolioChangeQuota();
        
        if (!quotaResult.allowed) {
          console.log(`⛔ [SENTIMENT] Portfolio change quota exceeded`);
          throw new PortfolioChangeQuotaExceededError(
            quotaResult.reason || 'Daily portfolio change limit reached',
            quotaResult.remaining,
            quotaResult.limit
          );
        }
      }
      
      console.log(`🔄 [SENTIMENT] Fetching batch for ${tickers.length} tickers`);

      // Fetch fresh data using batch endpoint (doesn't count against chat quota)
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `You are a specialized stock market analysis chatbot. For each of the following stock tickers: ${tickers.join(', ')}, provide a sentiment analysis. For each stock, include the ticker symbol, overall sentiment ('BULLISH', 'BEARISH', or 'NEUTRAL'), a concise summary, and 3-5 key bullet points supporting your analysis.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              sentiments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    sentiment: { type: 'string' },
                    summary: { type: 'string' },
                    key_points: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }, true); // isBatch = true

      if (response.rateLimited) {
        throw new AIQueryError(response.errorMessage || 'Rate limited', 'RATE_LIMITED', false);
      }

      const data = safeParseResponse(response.text, { sentiments: [] });
      const sentiments = data.sentiments || [];
      
      const stockDataMap = parseBatchAndCacheIndividual<SentimentData>('batch_sentiment', sentiments, tickers);
      console.log(`✅ [SENTIMENT] Cached ${stockDataMap.size} stocks`);
      
      return stockDataMap as Map<string, SentimentData>;
    },
    staleTime: getBatchCacheTTL('batch_sentiment'),
    gcTime: getBatchCacheTTL('batch_sentiment') * 2,
    enabled: enabled && tickers.length > 0,
    retry: (failureCount, error) => {
      if (error instanceof PortfolioChangeQuotaExceededError) {
        return false;
      }
      if (error instanceof AIQueryError && error.retryable) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

// ============================================================================
// INDIVIDUAL QUERY HOOKS
// These are used for single stock queries during chat
// Handles: expiry during chat, deduplication (via TanStack Query), fresh fetch
// ============================================================================

/**
 * Individual stock sentiment - checks cache, updates on miss
 * 
 * Scenarios:
 * - Batch cache hit: Returns from portfolio data (<10ms)
 * - Individual cache hit: Returns from localStorage
 * - Cache expired during chat: Fresh individual fetch
 * - User asks again while fetching: TanStack Query dedupes automatically
 */
export function useStockSentiment(
  ticker: string, 
  portfolioSentiment?: Map<string, SentimentData>,
  enabled = true
) {
  const tickerUpper = ticker.toUpperCase();
  
  return useQuery({
    queryKey: ['ai', 'sentiment', tickerUpper],
    queryFn: async (): Promise<SentimentData> => {
      // 1. Check portfolio cache first (from batch query) - instant
      if (portfolioSentiment?.has(tickerUpper)) {
        console.log(`♻️ [SENTIMENT] Portfolio cache hit for ${tickerUpper}`);
        return portfolioSentiment.get(tickerUpper)!;
      }
      
      // 2. Check individual cache (localStorage)
      const cached = loadIndividualCache<SentimentData>('batch_sentiment', tickerUpper);
      if (cached) {
        console.log(`♻️ [SENTIMENT] Individual cache hit for ${tickerUpper}`);
        return cached;
      }
      
      // 3. Fetch fresh (cache expired or never cached)
      console.log(`🔄 [SENTIMENT] Fetching fresh for ${tickerUpper}`);
      
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `You are a specialized stock market analysis chatbot. Based on recent public news and financial data, perform a sentiment analysis for the stock with the ticker symbol: ${ticker}. Provide a concise summary and 3-5 key bullet points supporting your analysis.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              sentiment: { type: 'string' },
              summary: { type: 'string' },
              key_points: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      });

      if (response.rateLimited) {
        throw new AIQueryError(response.errorMessage || 'Rate limited', 'RATE_LIMITED', false);
      }

      const data = safeParseResponse(response.text, { sentiment: 'NEUTRAL', summary: '', key_points: [] });
      
      // Cache the individual result
      saveAICache('sentiment', tickerUpper, data);
      console.log(`✅ [SENTIMENT] Cached ${tickerUpper}`);
      
      return data;
    },
    staleTime: getCacheTTL('sentiment'),
    gcTime: getCacheTTL('sentiment') * 2,
    enabled: enabled && !!ticker,
    retry: (failureCount, error) => {
      if (error instanceof AIQueryError && error.retryable) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Individual stock filing - checks cache, updates on miss
 */
export function useStockFiling(
  ticker: string,
  portfolioFilings?: Map<string, Filing[]>,
  enabled = true
) {
  const tickerUpper = ticker.toUpperCase();
  
  return useQuery({
    queryKey: ['ai', 'sec_filing', tickerUpper],
    queryFn: async (): Promise<Filing> => {
      // 1. Check portfolio cache first
      const cachedFilings = portfolioFilings?.get(tickerUpper);
      if (cachedFilings && cachedFilings.length > 0) {
        console.log(`♻️ [FILING] Portfolio cache hit for ${tickerUpper}`);
        return cachedFilings[0];
      }
      
      // 2. Check individual cache
      const cached = loadAICache<Filing>('sec_filing', tickerUpper);
      if (cached) {
        console.log(`♻️ [FILING] Individual cache hit for ${tickerUpper}`);
        return cached;
      }
      
      // 3. Fetch fresh
      console.log(`🔄 [FILING] Fetching fresh for ${tickerUpper}`);
      
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `Provide details for the single most recent important SEC filing (like 8-K, 10-K, 10-Q) for the stock ticker: ${ticker}. Include the form type, the filing date, a brief one-sentence summary, and the direct URL to the filing on the SEC EDGAR website.`,
        config: { responseMimeType: 'application/json' }
      });

      if (response.rateLimited) {
        throw new AIQueryError(response.errorMessage || 'Rate limited', 'RATE_LIMITED', false);
      }

      const data = safeParseResponse(response.text, { form_type: '', filing_date: '', summary: '' });
      
      // Cache the individual result
      saveAICache('sec_filing', tickerUpper, data);
      console.log(`✅ [FILING] Cached ${tickerUpper}`);
      
      return data;
    },
    staleTime: getCacheTTL('sec_filing'),
    gcTime: getCacheTTL('sec_filing') * 2,
    enabled: enabled && !!ticker,
    retry: (failureCount, error) => {
      if (error instanceof AIQueryError && error.retryable) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Company profile query - long TTL (7 days)
 */
export function useCompanyProfile(ticker: string, enabled = true) {
  const tickerUpper = ticker.toUpperCase();
  
  return useQuery({
    queryKey: ['ai', 'company_profile', tickerUpper],
    queryFn: async (): Promise<Profile> => {
      // Check cache first
      const cached = loadAICache<Profile>('company_profile', tickerUpper);
      if (cached) {
        console.log(`♻️ [PROFILE] Cache hit for ${tickerUpper}`);
        return cached;
      }
      
      console.log(`🔄 [PROFILE] Fetching fresh for ${tickerUpper}`);
      
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `Provide a company profile for the stock ticker: ${ticker}. Include its business description, industry, current CEO, headquarters location, and official website URL.`,
        config: { 
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              industry: { type: 'string' },
              ceo: { type: 'string' },
              headquarters: { type: 'string' },
              website: { type: 'string' }
            }
          }
        }
      });

      if (response.rateLimited) {
        throw new AIQueryError(response.errorMessage || 'Rate limited', 'RATE_LIMITED', false);
      }

      const data = safeParseResponse(response.text, { description: '', industry: '', ceo: '', headquarters: '', website: '' });
      
      // Cache the result
      saveAICache('company_profile', tickerUpper, data);
      console.log(`✅ [PROFILE] Cached ${tickerUpper}`);
      
      return data;
    },
    staleTime: getCacheTTL('company_profile'),
    gcTime: getCacheTTL('company_profile') * 2,
    enabled: enabled && !!ticker,
    retry: (failureCount, error) => {
      if (error instanceof AIQueryError && error.retryable) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * News detail query (for modal expansion)
 */
export function useNewsDetail(article: Article | null, enabled = true) {
  const headlineKey = article?.headline?.substring(0, 30) || '';
  
  return useQuery({
    queryKey: ['ai', 'news_detail', headlineKey],
    queryFn: async (): Promise<{ detailed_summary: string; key_takeaways: string[] }> => {
      if (!article) throw new AIQueryError('No article provided', 'API_ERROR', false);
      
      const cacheKey = article.ticker || headlineKey;
      const cached = loadAICache('news_detail', cacheKey);
      if (cached) {
        console.log(`♻️ [NEWS_DETAIL] Cache hit`);
        return cached;
      }
      
      console.log(`🔄 [NEWS_DETAIL] Fetching fresh`);
      
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `Based on the headline: "${article.headline}" and the initial summary: "${article.summary}", please provide a more detailed, expanded summary of the news article AND a list of 3-5 key takeaways as bullet points. Elaborate on the key points and the potential impact on the stock.`,
        config: { responseMimeType: 'application/json' }
      });

      if (response.rateLimited) {
        throw new AIQueryError(response.errorMessage || 'Rate limited', 'RATE_LIMITED', false);
      }

      const data = safeParseResponse(response.text, { detailed_summary: '', key_takeaways: [] }) as Record<string, unknown>;
      saveAICache('news_detail', cacheKey, data);
      console.log(`✅ [NEWS_DETAIL] Cached`);
      
      return {
        detailed_summary: (data.detailed_summary || data.detailedSummary || '') as string,
        key_takeaways: (data.key_takeaways || data.keyTakeaways || []) as string[]
      };
    },
    staleTime: getCacheTTL('news_detail'),
    gcTime: getCacheTTL('news_detail') * 2,
    enabled: enabled && !!article?.headline,
    retry: (failureCount, error) => {
      if (error instanceof AIQueryError && error.retryable) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Filing list for single stock
 */
export function useStockFilingList(ticker: string, enabled = true) {
  const tickerUpper = ticker.toUpperCase();
  
  return useQuery({
    queryKey: ['ai', 'filing_list', tickerUpper],
    queryFn: async (): Promise<Filing[]> => {
      const cached = loadAICache<Filing[]>('filing_list', tickerUpper);
      if (cached) {
        console.log(`♻️ [FILING_LIST] Cache hit for ${tickerUpper}`);
        return cached;
      }
      
      console.log(`🔄 [FILING_LIST] Fetching fresh for ${tickerUpper}`);
      
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `Provide a list of the 10 most recent important SEC filings for ${ticker}. For each, include form type, filing date, a one-sentence summary, and the direct URL to the filing's index page on the SEC EDGAR website.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              filings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    form_type: { type: 'string' },
                    filing_date: { type: 'string' },
                    summary: { type: 'string' },
                    url: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      });

      if (response.rateLimited) {
        throw new AIQueryError(response.errorMessage || 'Rate limited', 'RATE_LIMITED', false);
      }

      const data = safeParseResponse(response.text, { filings: [] });
      const filings = data.filings || [];
      
      saveAICache('filing_list', tickerUpper, filings);
      console.log(`✅ [FILING_LIST] Cached ${tickerUpper}`);
      
      return filings;
    },
    staleTime: getCacheTTL('filing_list'),
    gcTime: getCacheTTL('filing_list') * 2,
    enabled: enabled && !!ticker,
    retry: (failureCount, error) => {
      if (error instanceof AIQueryError && error.retryable) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Prefetch individual stock data from portfolio batch results
 * Call this after batch queries complete to hydrate individual query caches
 */
export function usePrefetchFromBatch(
  newsData: Map<string, Article[]> | undefined,
  filingsData: Map<string, Filing[]> | undefined,
  sentimentData: Map<string, SentimentData> | undefined
) {
  const queryClient = useQueryClient();
  
  // Prefetch individual queries from batch data
  if (newsData) {
    newsData.forEach((articles, ticker) => {
      queryClient.setQueryData(['ai', 'news', ticker], articles);
    });
  }
  
  if (filingsData) {
    filingsData.forEach((filings, ticker) => {
      if (filings.length > 0) {
        queryClient.setQueryData(['ai', 'sec_filing', ticker], filings[0]);
      }
      queryClient.setQueryData(['ai', 'filing_list', ticker], filings);
    });
  }
  
  if (sentimentData) {
    sentimentData.forEach((sentiment, ticker) => {
      queryClient.setQueryData(['ai', 'sentiment', ticker], sentiment);
    });
  }
}
