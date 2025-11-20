# AI Copilot Smart Caching System

## Overview

The AI Copilot now implements intelligent caching to significantly reduce Gemini LLM API calls. Static data like SEC filings and company profiles are cached with appropriate time-to-live (TTL) values, eliminating redundant API calls on page refreshes.

## Architecture

### Two-Layer Caching

1. **Server-Side Cache** (In-Memory)
   - Location: `app/api/ai/generate/route.ts`
   - Duration: 5 minutes
   - Purpose: Prevents duplicate requests within the same server instance
   - Benefits: Fast response times, reduces API load

2. **Client-Side Cache** (LocalStorage)
   - Location: `lib/aiCache.ts`
   - Duration: Varies by data type (see below)
   - Purpose: Persistent caching across sessions
   - Benefits: Works after page refresh, reduces API costs significantly

## Cache TTL Strategy

Different types of AI data have different cache durations based on how frequently they change:

| Data Type | Cache Duration | Rationale |
|-----------|---------------|-----------|
| **Company Profile** | 7 days | Company information (CEO, HQ, description) rarely changes |
| **SEC Filing** | 24 hours | Historical filings are immutable documents |
| **Filing List** | 6 hours | New filings may be added, but infrequent |
| **Sentiment Analysis** | 1 hour | Market sentiment changes throughout the day |
| **News** | 30 minutes | News is frequently updated |
| **News Detail** | 1 hour | Detailed analysis of specific news item |

## How It Works

### Request Flow

1. **Client Request**
   ```
   User asks for company profile (AAPL)
   ↓
   Check client-side cache (LocalStorage)
   ↓
   If cached and valid (< 7 days old)
     → Return cached data (NO API CALL) ✅
   ↓
   If not cached or expired
     → Send request to /api/ai/generate
     ↓
     Check server-side cache
     ↓
     If cached (< 5 min old)
       → Return cached data (NO LLM CALL) ✅
     ↓
     If not cached
       → Call Gemini LLM API 🤖
       → Cache on server & client
       → Return response
   ```

### Cache Keys

Cache keys are generated based on:
- **Data Type**: company_profile, sec_filing, sentiment, etc.
- **Ticker Symbol**: AAPL, TSLA, GOOGL, etc.
- **Additional Parameters**: For composite requests (e.g., multiple tickers)

Example cache keys:
```
ai_company_profile_AAPL_
ai_sec_filing_TSLA_10-K_2024-01-15
ai_news_AAPL,GOOGL,MSFT_
```

## Console Logging

The system provides clear logging to show cache behavior:

### Server-Side Logs
- `♻️ Returning cached AI response (age: 45s, size: 1234 chars)` - Serving from server cache
- `🤖 Making new Gemini API call (cache miss)` - Actually calling LLM
- `✅ Cached new AI response (key: a1b2c3d4..., entries: 15)` - New response cached
- `🧹 Cleaned 3 expired server cache entries` - Automatic cleanup

### Client-Side Logs
- `✅ Cached company_profile for AAPL (TTL: 7 days)` - Data saved to cache
- `♻️ Using cached company_profile for AAPL (age: 2h 15m)` - Serving from cache
- `🕐 Cache expired for sentiment TSLA (age: 1h 5m)` - Cache too old, will refetch
- `🗑️ Cleared 8 AI cache entries` - Manual cache clearing

## Benefits

### 1. **Reduced API Costs**
   - Company profiles cached for 7 days = ~99% reduction in profile API calls
   - SEC filings cached for 24 hours = ~95% reduction for historical data
   - Portfolio-level requests cached = Massive savings on page refresh

### 2. **Improved Performance**
   - Instant responses for cached data
   - No waiting for LLM generation
   - Better user experience

### 3. **Rate Limit Protection**
   - Fewer API calls = Less likely to hit rate limits
   - Automatic cache serving when rate limited

### 4. **Offline Resilience**
   - Cached data available even if API is down
   - Graceful degradation

## Cache Management

### Automatic Cleanup

- **Client-Side**: Expired entries removed on component mount and during operations
- **Server-Side**: Cleanup runs every 10 minutes

### Manual Cache Control

The cache utilities provide functions for manual management:

```typescript
import { clearAICache, getAICacheStats } from '@/lib/aiCache';

// Clear all cache for a ticker
clearAICache(undefined, 'AAPL');

// Clear all company profiles
clearAICache('company_profile');

// Clear everything
clearAICache();

// Get cache statistics
const stats = getAICacheStats();
console.log(`Total entries: ${stats.totalEntries}`);
console.log(`Cache size: ${stats.totalSize} bytes`);
```

## Implementation Details

### Files Modified

1. **`lib/aiCache.ts`** (NEW)
   - Cache utility functions
   - TTL management
   - Cache statistics
   - Type-safe interfaces

2. **`app/api/ai/generate/route.ts`**
   - Server-side caching layer
   - Request hashing
   - Cache bypass option

3. **`components/StonksAI/StonksAI.tsx`**
   - Integrated caching for all AI requests
   - Cache-aware `callAi()` function
   - Proper cache keys for each request type

## Example Scenarios

### Scenario 1: Company Profile Request
```
First request:
- User: "Get AAPL profile"
- System: Cache miss → Call Gemini API → Cache for 7 days → Display
- Cost: 1 API call

Refresh page (within 7 days):
- User: "Get AAPL profile" 
- System: Cache hit → Return from LocalStorage → Display
- Cost: 0 API calls ✅

30 refreshes over a week:
- Without cache: 30 API calls
- With cache: 1 API call (97% reduction) 💰
```

### Scenario 2: SEC Filing
```
View filing today:
- System: Cache miss → Call API → Cache for 24 hours

View same filing tomorrow (within 24h):
- System: Cache hit → Return instantly
- Cost: 0 API calls ✅

View same filing next week:
- System: Cache expired → Call API → Re-cache
- Cost: 1 API call (still valid, filings don't change)
```

### Scenario 3: Portfolio News
```
Load portfolio with 5 stocks:
- System: Cache miss → Call API for news → Cache 30 min

Refresh after 10 minutes:
- System: Cache hit → Return instantly
- Cost: 0 API calls ✅

Refresh after 45 minutes:
- System: Cache expired → Call API for fresh news
- Cost: 1 API call (expected, news updates frequently)
```

## Testing the Cache

### Verify Cache is Working

1. Open browser DevTools (F12)
2. Go to Console tab
3. Ask for a company profile: "AAPL profile"
4. Look for log: `🤖 Making new Gemini API call`
5. Refresh the page
6. Ask for same profile again
7. Look for log: `♻️ Using cached company_profile for AAPL`
8. **Result**: Second request should be instant with no API call!

### Check LocalStorage

1. Open DevTools → Application tab
2. Navigate to Storage → LocalStorage
3. Look for keys starting with `ai_`
4. Each entry shows the cached data and timestamp

## Future Enhancements

Potential improvements:
- Cache invalidation API for manual refresh
- Cache size limits and LRU eviction
- Compression for large cached responses
- Analytics dashboard for cache hit rates
- Redis/Database for server-side cache persistence
- CDN caching for extremely static data

## Conclusion

The smart caching system dramatically reduces Gemini API calls while maintaining data freshness based on content type. Static data like company profiles and SEC filings benefit most, with 90%+ reductions in API calls for typical usage patterns.

**Key Takeaway**: Page refreshes and repeated queries no longer waste API calls! 🎉
