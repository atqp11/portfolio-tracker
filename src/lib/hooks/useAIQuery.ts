/**
 * useAIQuery.ts
 * 
 * TanStack Query hooks for AI data fetching with intelligent caching strategy.
 * 
 * CACHING STRATEGY:
 * 1. On mount: Batch fetch for all portfolio tickers → parse → store individual caches
 * 2. During session: Individual queries check cache first, update individual cache on miss
 * 3. On remount: If batch cache expired → refresh all, else reuse individual caches
 * 
 * TTLs:
 * - News: 1 hour
 * - Filings: 1 day (24 hours)
 * - Sentiment: 1 hour
 * - Company Profile: 7 days
 * - SEC Filing (individual): 24 hours
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// ============================================================================
// API CALLER
// ============================================================================

async function callAiApi(
  payload: { model: string; contents: string; config?: Record<string, unknown> }
): Promise<AIResponse> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 429 || errorData.rateLimitExceeded || errorData.quotaExceeded) {
      const message = errorData.error?.message || 'Rate limit exceeded';
      return { text: '', rateLimited: true, errorMessage: message };
    }
    throw new Error(errorData.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ============================================================================
// BATCH QUERY HOOKS
// These fetch data for all portfolio tickers and cache at individual level
// ============================================================================

/**
 * Batch fetch portfolio news - caches at individual stock level
 */
export function usePortfolioNews(tickers: string[], enabled = true) {
  const queryClient = useQueryClient();
  const tickersKey = [...tickers].sort().join(',');
  
  return useQuery({
    queryKey: ['ai', 'news', 'batch', tickersKey],
    queryFn: async (): Promise<Map<string, Article[]>> => {
      if (tickers.length === 0) return new Map();
      
      // Check if batch cache is valid
      if (isBatchCacheValid('batch_news', tickers)) {
        const { cached } = loadCachedStocks<Article[]>('batch_news', tickers);
        if (cached.size === tickers.length) {
          console.log('♻️ Using cached news for all tickers');
          return cached;
        }
      }
      
      // Fetch fresh data
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
      });

      if (response.rateLimited) {
        throw new Error(response.errorMessage || 'Rate limited');
      }

      const data = JSON.parse(response.text || '{}');
      const articles = data.articles || [];
      
      // Parse and cache at individual level
      const stockDataMap = parseBatchAndCacheIndividual<Article>('batch_news', articles, tickers);
      
      return stockDataMap as Map<string, Article[]>;
    },
    staleTime: getBatchCacheTTL('batch_news'),
    gcTime: getBatchCacheTTL('batch_news') * 2,
    enabled: enabled && tickers.length > 0,
    retry: false,
  });
}

/**
 * Batch fetch portfolio filings - caches at individual stock level
 */
export function usePortfolioFilings(tickers: string[], enabled = true) {
  const tickersKey = [...tickers].sort().join(',');
  
  return useQuery({
    queryKey: ['ai', 'filings', 'batch', tickersKey],
    queryFn: async (): Promise<Map<string, Filing[]>> => {
      if (tickers.length === 0) return new Map();
      
      // Check if batch cache is valid
      if (isBatchCacheValid('batch_filings', tickers)) {
        const { cached } = loadCachedStocks<Filing[]>('batch_filings', tickers);
        if (cached.size === tickers.length) {
          console.log('♻️ Using cached filings for all tickers');
          return cached;
        }
      }
      
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
      });

      if (response.rateLimited) {
        throw new Error(response.errorMessage || 'Rate limited');
      }

      const data = JSON.parse(response.text || '{}');
      const filings = data.filings || [];
      
      return parseBatchAndCacheIndividual<Filing>('batch_filings', filings, tickers) as Map<string, Filing[]>;
    },
    staleTime: getBatchCacheTTL('batch_filings'),
    gcTime: getBatchCacheTTL('batch_filings') * 2,
    enabled: enabled && tickers.length > 0,
    retry: false,
  });
}

/**
 * Batch fetch portfolio sentiment - caches at individual stock level
 */
export function usePortfolioSentiment(tickers: string[], enabled = true) {
  const tickersKey = [...tickers].sort().join(',');
  
  return useQuery({
    queryKey: ['ai', 'sentiment', 'batch', tickersKey],
    queryFn: async (): Promise<Map<string, SentimentData>> => {
      if (tickers.length === 0) return new Map();
      
      // Check if batch cache is valid
      if (isBatchCacheValid('batch_sentiment', tickers)) {
        const { cached } = loadCachedStocks<SentimentData>('batch_sentiment', tickers);
        if (cached.size === tickers.length) {
          console.log('♻️ Using cached sentiment for all tickers');
          return cached;
        }
      }
      
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
      });

      if (response.rateLimited) {
        throw new Error(response.errorMessage || 'Rate limited');
      }

      const data = JSON.parse(response.text || '{}');
      const sentiments = data.sentiments || [];
      
      return parseBatchAndCacheIndividual<SentimentData>('batch_sentiment', sentiments, tickers) as Map<string, SentimentData>;
    },
    staleTime: getBatchCacheTTL('batch_sentiment'),
    gcTime: getBatchCacheTTL('batch_sentiment') * 2,
    enabled: enabled && tickers.length > 0,
    retry: false,
  });
}

// ============================================================================
// INDIVIDUAL QUERY HOOKS
// These are used for single stock queries during chat
// ============================================================================

/**
 * Individual stock sentiment - checks cache, updates on miss
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
      // 1. Check portfolio cache first (from batch query)
      if (portfolioSentiment?.has(tickerUpper)) {
        console.log(`♻️ Using portfolio cache for ${tickerUpper} sentiment`);
        return portfolioSentiment.get(tickerUpper)!;
      }
      
      // 2. Check individual cache
      const cached = loadIndividualCache<SentimentData>('batch_sentiment', tickerUpper);
      if (cached) {
        console.log(`♻️ Using individual cache for ${tickerUpper} sentiment`);
        return cached;
      }
      
      // 3. Fetch fresh
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
        throw new Error(response.errorMessage || 'Rate limited');
      }

      const data = JSON.parse(response.text || '{}');
      
      // Cache the individual result
      saveAICache('sentiment', tickerUpper, data);
      
      return data;
    },
    staleTime: getCacheTTL('sentiment'),
    gcTime: getCacheTTL('sentiment') * 2,
    enabled: enabled && !!ticker,
    retry: false,
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
        console.log(`♻️ Using portfolio cache for ${tickerUpper} filing`);
        return cachedFilings[0];
      }
      
      // 2. Check individual cache
      const cached = loadAICache<Filing>('sec_filing', tickerUpper);
      if (cached) {
        console.log(`♻️ Using individual cache for ${tickerUpper} filing`);
        return cached;
      }
      
      // 3. Fetch fresh
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `Provide details for the single most recent important SEC filing (like 8-K, 10-K, 10-Q) for the stock ticker: ${ticker}. Include the form type, the filing date, a brief one-sentence summary, and the direct URL to the filing on the SEC EDGAR website.`,
        config: { responseMimeType: 'application/json' }
      });

      if (response.rateLimited) {
        throw new Error(response.errorMessage || 'Rate limited');
      }

      const data = JSON.parse(response.text || '{}');
      
      // Cache the individual result
      saveAICache('sec_filing', tickerUpper, data);
      
      return data;
    },
    staleTime: getCacheTTL('sec_filing'),
    gcTime: getCacheTTL('sec_filing') * 2,
    enabled: enabled && !!ticker,
    retry: false,
  });
}

/**
 * Company profile query
 */
export function useCompanyProfile(ticker: string, enabled = true) {
  const tickerUpper = ticker.toUpperCase();
  
  return useQuery({
    queryKey: ['ai', 'company_profile', tickerUpper],
    queryFn: async (): Promise<Profile> => {
      // Check cache first
      const cached = loadAICache<Profile>('company_profile', tickerUpper);
      if (cached) {
        console.log(`♻️ Using cached profile for ${tickerUpper}`);
        return cached;
      }
      
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
        throw new Error(response.errorMessage || 'Rate limited');
      }

      const data = JSON.parse(response.text || '{}');
      
      // Cache the result
      saveAICache('company_profile', tickerUpper, data);
      
      return data;
    },
    staleTime: getCacheTTL('company_profile'),
    gcTime: getCacheTTL('company_profile') * 2,
    enabled: enabled && !!ticker,
    retry: false,
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
      if (!article) throw new Error('No article provided');
      
      const cacheKey = article.ticker || headlineKey;
      const cached = loadAICache('news_detail', cacheKey);
      if (cached) return cached;
      
      const response = await callAiApi({
        model: 'gemini-2.5-flash',
        contents: `Based on the headline: "${article.headline}" and the initial summary: "${article.summary}", please provide a more detailed, expanded summary of the news article AND a list of 3-5 key takeaways as bullet points. Elaborate on the key points and the potential impact on the stock.`,
        config: { responseMimeType: 'application/json' }
      });

      if (response.rateLimited) {
        throw new Error(response.errorMessage || 'Rate limited');
      }

      const data = JSON.parse(response.text || '{}');
      saveAICache('news_detail', cacheKey, data);
      
      return {
        detailed_summary: data.detailed_summary || data.detailedSummary || '',
        key_takeaways: data.key_takeaways || data.keyTakeaways || []
      };
    },
    staleTime: getCacheTTL('news_detail'),
    gcTime: getCacheTTL('news_detail') * 2,
    enabled: enabled && !!article?.headline,
    retry: false,
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
      if (cached) return cached;
      
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
        throw new Error(response.errorMessage || 'Rate limited');
      }

      const data = JSON.parse(response.text || '{}');
      const filings = data.filings || [];
      
      saveAICache('filing_list', tickerUpper, filings);
      
      return filings;
    },
    staleTime: getCacheTTL('filing_list'),
    gcTime: getCacheTTL('filing_list') * 2,
    enabled: enabled && !!ticker,
    retry: false,
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
