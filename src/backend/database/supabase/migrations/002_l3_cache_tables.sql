-- ============================================================================
-- L3 Database Cache Tables Migration
-- ============================================================================
-- Purpose: Long-term persistent storage for expensive-to-compute data
-- Created: 2025-12-03
-- ============================================================================

-- 1. SEC Filing Summaries Cache Table
-- Purpose: Cache AI-generated summaries of SEC filings (expensive to regenerate)
-- TTL: 1 year (filings are immutable once published)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cache_filing_summaries (
  -- Primary Key
  ticker VARCHAR(10) NOT NULL,
  filing_type VARCHAR(20) NOT NULL,  -- '10-K', '10-Q', '8-K', etc.
  filing_date DATE NOT NULL,

  -- Summary Data
  summary_text TEXT NOT NULL,        -- AI-generated summary
  key_points JSONB,                  -- ["Revenue up 20%", "Expanding to Asia"]
  sentiment_score DECIMAL(3,2),      -- -1.0 to 1.0

  -- Metadata
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  generated_by VARCHAR(50),          -- 'gemini-1.5-flash', 'groq-llama3'
  data_version INTEGER NOT NULL DEFAULT 1,

  -- Cache Control
  expires_at TIMESTAMP,              -- Optional expiration (default: 1 year)

  PRIMARY KEY (ticker, filing_type, filing_date)
);

-- Index for recent summaries query
CREATE INDEX IF NOT EXISTS idx_filing_summaries_ticker_date
  ON cache_filing_summaries(ticker, filing_date DESC);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_filing_summaries_expires
  ON cache_filing_summaries(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- 2. Company Profiles Cache Table
-- Purpose: Aggregated company data from multiple sources (3-5 API calls)
-- TTL: 30-90 days (based on company size/volatility)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cache_company_profiles (
  -- Primary Key
  ticker VARCHAR(10) PRIMARY KEY,

  -- Profile Data (JSONB for flexibility)
  profile_data JSONB NOT NULL,
  /*
  Expected JSON structure:
  {
    "name": "Apple Inc.",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "description": "...",
    "headquarters": "Cupertino, CA",
    "website": "https://apple.com",
    "employees": 164000,
    "founded": 1976,
    "ceo": "Tim Cook",
    "market_cap": 3000000000000,
    "sources": ["fmp", "sec_edgar", "yahoo_finance"]
  }
  */

  -- Cache Control
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  data_version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP NOT NULL,

  -- Metadata
  source_count INTEGER NOT NULL,     -- How many sources aggregated
  last_verified TIMESTAMP
);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_company_profiles_expires
  ON cache_company_profiles(expires_at);

-- ============================================================================
-- 3. Historical News Sentiment Cache Table
-- Purpose: Store batch-processed news sentiment (expensive to reprocess)
-- TTL: Permanent (historical data doesn't change)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cache_news_sentiment (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- News Identification
  ticker VARCHAR(10) NOT NULL,
  news_date DATE NOT NULL,
  news_url TEXT,
  news_title TEXT NOT NULL,

  -- Sentiment Data
  sentiment_score DECIMAL(3,2) NOT NULL,  -- -1.0 to 1.0
  sentiment_label VARCHAR(20) NOT NULL,    -- 'positive', 'negative', 'neutral'
  confidence DECIMAL(3,2),                 -- 0.0 to 1.0

  -- Summary
  ai_summary TEXT,
  key_topics JSONB,                        -- ["earnings", "product_launch"]

  -- Metadata
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_by VARCHAR(50),                -- 'gemini-1.5-flash'
  data_version INTEGER NOT NULL DEFAULT 1
);

-- Index for ticker + date queries
CREATE INDEX IF NOT EXISTS idx_news_sentiment_ticker_date
  ON cache_news_sentiment(ticker, news_date DESC);

-- Index for sentiment analysis queries
CREATE INDEX IF NOT EXISTS idx_news_sentiment_score
  ON cache_news_sentiment(ticker, sentiment_score, news_date);

-- Unique constraint (prevent duplicate processing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_sentiment_unique
  ON cache_news_sentiment(ticker, news_date, news_url);

-- ============================================================================
-- Row Level Security (RLS)
-- All cache tables are accessed by service role only, no direct user access
-- ============================================================================

ALTER TABLE cache_filing_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_news_sentiment ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for backend operations)
-- Drop policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Service role full access on filing summaries" ON cache_filing_summaries;
DROP POLICY IF EXISTS "Service role full access on company profiles" ON cache_company_profiles;
DROP POLICY IF EXISTS "Service role full access on news sentiment" ON cache_news_sentiment;

-- Create policies
CREATE POLICY "Service role full access on filing summaries"
  ON cache_filing_summaries
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on company profiles"
  ON cache_company_profiles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on news sentiment"
  ON cache_news_sentiment
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE cache_filing_summaries IS 'L3 cache for AI-generated SEC filing summaries';
COMMENT ON TABLE cache_company_profiles IS 'L3 cache for aggregated company profile data';
COMMENT ON TABLE cache_news_sentiment IS 'L3 cache for processed news sentiment analysis';

COMMENT ON COLUMN cache_filing_summaries.ticker IS 'Stock ticker symbol';
COMMENT ON COLUMN cache_filing_summaries.filing_type IS 'SEC filing type (10-K, 10-Q, 8-K)';
COMMENT ON COLUMN cache_filing_summaries.summary_text IS 'AI-generated summary of the filing';
COMMENT ON COLUMN cache_filing_summaries.expires_at IS '1 year TTL for immutable filings';

COMMENT ON COLUMN cache_company_profiles.profile_data IS 'Aggregated company data from multiple sources';
COMMENT ON COLUMN cache_company_profiles.expires_at IS '30-90 day TTL based on company size';

COMMENT ON COLUMN cache_news_sentiment.sentiment_score IS 'Sentiment score from -1.0 (negative) to 1.0 (positive)';
COMMENT ON COLUMN cache_news_sentiment.sentiment_label IS 'Categorical sentiment classification';
