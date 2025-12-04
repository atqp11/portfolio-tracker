# Configuration Management Guide

**Last Updated:** 2025-12-03
**Applies to:** Phase 0+

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration Files](#configuration-files)
3. [Environment Variables](#environment-variables)
4. [Provider Configuration](#provider-configuration)
5. [AI Model Configuration](#ai-model-configuration)
6. [Cache Configuration](#cache-configuration)
7. [Adding New Providers](#adding-new-providers)
8. [Startup Validation](#startup-validation)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Portfolio Tracker uses a centralized configuration system to manage all provider settings, AI models, cache providers, and TTLs. This approach:

- ✅ **Eliminates hardcoded settings** scattered across service files
- ✅ **Enables environment-based overrides** (dev, staging, prod)
- ✅ **Simplifies adding new providers** (from 2 hours to 10 minutes)
- ✅ **Catches configuration errors** before deployment via startup validation
- ✅ **Supports A/B testing** and feature flags

### Configuration Architecture

```
src/lib/config/
├── types.ts                    # TypeScript interfaces
├── providers.config.ts         # Data provider settings (Tiingo, Yahoo, etc.)
├── ai-models.config.ts         # AI model selection per tier
├── cache-provider.config.ts    # Cache provider auto-detection
├── cache-ttl.config.ts         # TTL settings per data type & tier
├── api-keys.config.ts          # API key mapping & documentation
├── validation.ts               # Startup validation logic
└── __tests__/                  # Configuration tests
```

---

## Configuration Files

### `types.ts`

Defines TypeScript interfaces for all configuration objects:

- `ProviderConfig` - External data providers
- `AIModelConfig` - AI model settings
- `CacheProviderConfig` - Cache provider selection
- `CacheTTLConfig` - TTL settings
- `APIKeyInfo` - API key metadata
- `ValidationResult` - Validation results

### `providers.config.ts`

Configures all external data providers (stocks, news, filings, etc.):

```typescript
export const PROVIDER_CONFIG = {
  tiingo: {
    name: 'tiingo',
    enabled: process.env.FEATURE_TIINGO_ENABLED === 'true',
    priority: 1, // PRIMARY for stock quotes
    baseUrl: 'https://api.tiingo.com/tiingo',
    apiKey: process.env.TIINGO_API_KEY,
    timeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxRequests: 3,
    },
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 10000,
    },
    batchSize: 500,
  },
  // ... other providers
};
```

**Helper Functions:**

- `getProvidersByPriority(names[])` - Get providers sorted by priority
- `getEnabledProviders()` - Get all enabled providers
- `getProviderConfig(name)` - Get config for specific provider
- `isProviderAvailable(name)` - Check if provider has valid credentials
- `getProvidersForDataType(type)` - Get providers for quotes, news, etc.

### `ai-models.config.ts`

Configures AI models per user tier and task type:

```typescript
export const AI_MODEL_CONFIG = {
  tierModels: {
    free: {
      provider: 'gemini',
      model: 'gemini-1.5-flash-8b',
      maxTokens: 1024,
      costPerToken: { input: 0.0001, output: 0.0003 },
      fallback: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    },
    // ... basic, premium
  },
  taskModels: {
    sentiment: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    summarization: { provider: 'gemini', model: 'gemini-1.5-flash' },
    complexAnalysis: { provider: 'gemini', model: 'gemini-1.5-pro' },
  },
};
```

**Helper Functions:**

- `getAIModelConfig(tier, task?)` - Get AI model for tier/task
- `estimateCost(inputTokens, outputTokens, tier, task?)` - Estimate request cost
- `getAIProviders()` - Get list of all AI providers

### `cache-provider.config.ts`

Auto-detects and configures cache provider:

```typescript
export const CACHE_PROVIDER_CONFIG = {
  type: detectCacheProvider(), // 'upstash' | 'vercel-kv' | 'memory'
  upstash: {
    priority: 1,
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  },
  vercelKV: {
    priority: 1,
    restUrl: process.env.KV_REST_API_URL,
    restToken: process.env.KV_REST_API_TOKEN,
  },
  memory: { priority: 3 },
  fallback: 'memory',
};
```

**Auto-Detection Priority:**

1. Check `UPSTASH_REDIS_URL` → use `'upstash'`
2. Check `KV_REST_API_URL` → use `'vercel-kv'`
3. Default to `'memory'` in development

**Helper Functions:**

- `getCacheProviderName()` - Human-readable provider name
- `isRedisCacheAvailable()` - Check if using Redis
- `getCacheProviderDetails()` - Get detailed provider info

### `cache-ttl.config.ts`

Defines cache TTLs per data type and user tier:

```typescript
export const CACHE_TTL_CONFIG = {
  quotes: {
    free: 15 * 60 * 1000,    // 15 min
    basic: 10 * 60 * 1000,   // 10 min
    premium: 5 * 60 * 1000,  // 5 min
  },
  // ... commodities, news, filings, aiChat, portfolioAnalysis
};
```

**Helper Functions:**

- `getCacheTTL(dataType, tier)` - Get TTL in milliseconds
- `getTierTTLs(tier)` - Get all TTLs for a tier
- `formatTTL(ttl)` - Format TTL as human-readable string
- `getCacheTTLSeconds(dataType, tier)` - Get TTL in seconds (for Redis)

### `api-keys.config.ts`

Documents all API keys and their usage:

```typescript
export const API_KEY_MAPPING = {
  tiingo: {
    envVar: 'TIINGO_API_KEY',
    required: true,
    usage: 'Stock quotes (primary), commodities',
    documentation: 'https://api.tiingo.com/documentation/general/overview',
    freeTier: 'Yes - $0/month (500 req/day)',
    paidTier: 'Power - $10/month (unlimited)',
  },
  // ... other providers
};
```

**Helper Functions:**

- `getMissingRequiredKeys()` - Get list of missing required keys
- `isAPIKeyConfigured(provider)` - Check if key is configured
- `getAPIKeyConfig(provider)` - Get API key metadata
- `printAPIKeyGuide()` - Print setup guide to console
- `getAPIKeyStatus()` - Get summary of configured keys

### `validation.ts`

Validates configuration at application startup:

```typescript
export function validateConfiguration(): ValidationResult {
  // Checks:
  // 1. Required API keys present
  // 2. Production has Redis cache
  // 3. At least one provider enabled
  // 4. No conflicting env vars
  // 5. Provider configs are valid
}
```

**Helper Functions:**

- `validateConfiguration()` - Run validation, return results
- `validateConfigurationOrThrow()` - Throw error if validation fails
- `isProductionReady()` - Check if config is production-ready

---

## Environment Variables

### Required (Production)

```bash
# Data Providers
TIINGO_API_KEY=your-tiingo-key           # Stock quotes (primary)
GEMINI_API_KEY=your-gemini-key           # AI primary

# Cache Provider (choose ONE)
# Option 1: Vercel KV (Upstash managed by Vercel)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# Option 2: Direct Upstash Redis
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...
```

### Optional (Fallbacks & Enhancements)

```bash
# AI Fallback
GROQ_API_KEY=your-groq-key

# Commodities Fallback
ALPHAVANTAGE_API_KEY=your-av-key

# Feature Flags (Gradual Rollout)
FEATURE_TIINGO_ENABLED=true              # Enable Tiingo provider
FEATURE_RSS_NEWS_ENABLED=true            # Enable RSS news feeds
USE_REDIS_CACHE=true                     # Emergency rollback toggle
```

### Development

In development, you can omit cache credentials:

```bash
# Minimal development setup
TIINGO_API_KEY=your-tiingo-key
GEMINI_API_KEY=your-gemini-key
NODE_ENV=development

# App will automatically use in-memory cache
```

---

## Provider Configuration

### Provider Priority Levels

- **Priority 1 (Primary):** Use first, highest reliability
- **Priority 2 (Fallback):** Use if primary fails
- **Priority 3 (Tertiary):** Use only for specific cases

### Example: Stock Quote Providers

```typescript
const quoteProviders = getProvidersForDataType('quotes');
// Returns: [
//   { name: 'tiingo', priority: 1, ... },
//   { name: 'yahooFinance', priority: 2, ... }
// ]
```

**Fallback Chain:**

1. Try Tiingo → Success? Cache & return
2. Tiingo fails → Try Yahoo Finance → Success? Cache & return
3. Both fail → Return stale cache (if available)
4. No cache → Error response

### Circuit Breaker

Prevents cascading failures by temporarily disabling failing providers:

```typescript
circuitBreaker: {
  failureThreshold: 5,      // Open circuit after 5 failures
  resetTimeout: 60000,       // Try again after 1 minute
  halfOpenMaxRequests: 3,    // Allow 3 test requests
}
```

**States:**

- **CLOSED:** Normal operation
- **OPEN:** Provider disabled (too many failures)
- **HALF_OPEN:** Testing if provider recovered

### Rate Limiting

Prevents exceeding provider quotas:

```typescript
rateLimit: {
  requestsPerMinute: 100,
  requestsPerDay: 10000,
}
```

---

## AI Model Configuration

### Tier-Based Selection

**Free Tier:**

- Primary: Gemini Flash 8B (cheapest)
- Fallback: Groq Llama 3.3 70B

**Basic Tier:**

- Primary: Gemini Flash (balanced)
- Fallback: Groq Llama 3.3 70B

**Premium Tier:**

- Primary: Gemini Pro (highest quality)
- Fallback: Gemini Flash

### Task-Specific Overrides

For certain tasks, use specialized models (all with fallbacks):

- **Sentiment Analysis:** Groq Llama 3.3 → Fallback to Gemini Flash 8B
- **Summarization:** Gemini Flash → Fallback to Gemini Flash 8B
- **Complex Analysis:** Gemini Pro → Fallback to Gemini Flash

**Usage:**

```typescript
import { getAIModelConfig } from '@/lib/config/ai-models.config';

// Get default model for free tier
const config = getAIModelConfig('free');

// Get sentiment-specific model (overrides tier default)
const sentimentConfig = getAIModelConfig('free', 'sentiment');
```

### Complete Fallback Strategy

Every AI model configuration includes a fallback to ensure maximum reliability:

| Tier/Task | Primary Model | Fallback Model | Strategy |
|-----------|---------------|----------------|----------|
| **Free Tier** | Gemini Flash 8B<br>($0.10 per 1M tokens) | Groq Llama 3.3 70B<br>($0.40 per 1M tokens) | Cheapest → Fast alternative |
| **Basic Tier** | Gemini Flash<br>($0.15 per 1M tokens) | Groq Llama 3.3 70B<br>($0.40 per 1M tokens) | Balanced → Fast alternative |
| **Premium Tier** | Gemini Pro<br>($1.25 per 1M tokens) | Gemini Flash<br>($0.15 per 1M tokens) | Best quality → Balanced fallback |
| **Sentiment Task** | Groq Llama 3.3<br>(Fast & cheap) | Gemini Flash 8B<br>(Even cheaper) | Speed → Cost optimization |
| **Summarization Task** | Gemini Flash<br>(Balanced) | Gemini Flash 8B<br>(Cheaper alternative) | Quality → Cost optimization |
| **Complex Analysis Task** | Gemini Pro<br>(Highest quality) | Gemini Flash<br>(Still good) | Best → Balanced fallback |

### How Fallbacks Work in Practice

When you request an AI model, the system follows this fallback chain:

**1. Try Primary Model First**

```typescript
const config = getAIModelConfig('free', 'sentiment');
// Primary: Groq Llama 3.3 70B
console.log(config.model); // 'llama-3.3-70b-versatile'
console.log(config.provider); // 'groq'
```

**2. Automatic Fallback on Failure**

If the primary model fails (API error, timeout, rate limit):

```typescript
// System automatically tries fallback
console.log(config.fallback?.model); // 'gemini-1.5-flash-8b'
console.log(config.fallback?.provider); // 'gemini'
```

**3. Circuit Breaker Protection**

The system tracks failures and automatically skips failing providers:

- **After 5 consecutive failures** → Circuit opens
- **Skip failed provider for 60 seconds**
- **Automatically use fallback model**
- **After 60 seconds** → Test primary model again (half-open state)
- **If successful** → Close circuit, resume normal operation
- **If still failing** → Keep circuit open

### Fallback Chain Logic

```
User Request for AI Response
        ↓
    Get Model Config
    (tier + task type)
        ↓
  Check Circuit Breaker
        ↓
   ┌────────────────┐
   │ Circuit Closed?│
   └────┬───────────┘
        │ YES
        ↓
   Try Primary Model
        ↓
   ┌────────────────┐
   │   Successful?  │
   └────┬───────┬───┘
        │ YES   │ NO
        ↓       ↓
    Return   Track Failure
    Result   (Circuit Breaker)
                ↓
         Try Fallback Model
                ↓
           Successful?
             ↓     ↓
           YES     NO
            ↓       ↓
         Return   Return Error
         Result   (Both failed)
```

**Example Scenario:**

```typescript
// User: Free tier, requesting sentiment analysis
const config = getAIModelConfig('free', 'sentiment');

// Step 1: Try Groq Llama 3.3
// → Groq API is down (500 error)
// → Circuit breaker records failure (1/5)

// Step 2: Automatically try fallback (Gemini Flash 8B)
// → Gemini API responds successfully
// → Return result to user

// Step 3: Next request
// → Try Groq again (circuit still closed)
// → Groq still down (2/5 failures)
// → Fallback to Gemini again

// Step 4: After 5 failures
// → Circuit OPENS for Groq
// → Skip Groq entirely for 60 seconds
// → Use Gemini Flash 8B directly

// Step 5: After 60 seconds
// → Circuit enters HALF-OPEN state
// → Try Groq with 1 test request
// → If successful → Circuit CLOSES
// → If fails → Circuit stays OPEN for another 60s
```

### Benefits of This Approach

✅ **100% Fallback Coverage**
- Every tier model has a fallback
- Every task model has a fallback
- Never completely fail if one provider is down

✅ **Automatic Failover**
- No manual intervention required
- Seamless user experience
- System handles provider outages gracefully

✅ **Cost Optimization**
- Fallback to cheaper models when possible
- Avoid expensive models during outages
- Smart cost management during failures

✅ **Performance Protection**
- Circuit breaker prevents cascading failures
- Automatic recovery when provider comes back
- Prevents overwhelming failing providers

✅ **Reliability**
- Multiple AI providers configured
- Automatic provider switching
- Graceful degradation (premium → basic models)

### Cost Estimation

```typescript
import { estimateCost } from '@/lib/config/ai-models.config';

const cost = estimateCost(1000, 500, 'free');
console.log(`Estimated cost: $${cost.toFixed(4)}`); // $0.0003

// Estimate with task override
const sentimentCost = estimateCost(1000, 500, 'free', 'sentiment');
console.log(`Sentiment cost: $${sentimentCost.toFixed(4)}`); // $0.0008
```

---

## Cache Configuration

### Cache Providers

**1. Vercel KV (Recommended for Vercel)**

- Upstash Redis managed by Vercel
- Auto-configured through Vercel dashboard
- HTTP REST API connection

**Setup:**

1. Go to Vercel project dashboard
2. Navigate to Storage → Create → KV Store
3. Environment variables auto-configured

**2. Upstash Redis (Direct)**

- Use if you need control outside Vercel
- Direct Redis protocol connection

**Setup:**

1. Create account at [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy credentials to `.env`:

```bash
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...
```

**3. In-Memory (Development Only)**

- No Redis needed for local development
- Zero cost, but not suitable for production

### Cache TTL Strategy

**Free Tier:** Longer TTLs (reduce costs)
**Premium Tier:** Shorter TTLs (fresher data)

| Data Type | Free | Basic | Premium |
| --- | --- | --- | --- |
| Quotes | 15 min | 10 min | 5 min |
| Commodities | 4 hours | 2 hours | 1 hour |
| News | 1 hour | 1 hour | 1 hour |
| Filings | 7 days | 7 days | 7 days |
| AI Chat | 12 hours | 12 hours | 12 hours |

**Usage:**

```typescript
import { getCacheTTL } from '@/lib/config/cache-ttl.config';

const ttl = getCacheTTL('quotes', 'free'); // 900000 (15 min)
```

---

## Adding New Providers

### Step 1: Add Provider Configuration

Edit `src/lib/config/providers.config.ts`:

```typescript
export const PROVIDER_CONFIG = {
  // ... existing providers

  newProvider: {
    name: 'new-provider',
    enabled: process.env.FEATURE_NEW_PROVIDER_ENABLED === 'true',
    priority: 2, // Fallback
    baseUrl: 'https://api.newprovider.com',
    apiKey: process.env.NEW_PROVIDER_API_KEY,
    timeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxRequests: 3,
    },
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerDay: 5000,
    },
  } satisfies ProviderConfig,
};
```

### Step 2: Add to Provider Groups

```typescript
export const PROVIDER_GROUPS = {
  quotes: ['tiingo', 'yahooFinance', 'newProvider'] as const,
  // ... other groups
};
```

### Step 3: Document API Key

Edit `src/lib/config/api-keys.config.ts`:

```typescript
export const API_KEY_MAPPING = {
  // ... existing keys

  newProvider: {
    envVar: 'NEW_PROVIDER_API_KEY',
    required: false,
    usage: 'Stock quotes fallback',
    documentation: 'https://newprovider.com/docs',
    freeTier: 'Yes - $0/month (1000 req/day)',
    paidTier: 'Pro - $20/month',
  },
};
```

### Step 4: Add Environment Variable

`.env.local`:

```bash
NEW_PROVIDER_API_KEY=your-api-key
FEATURE_NEW_PROVIDER_ENABLED=true
```

### Step 5: Create DAO

Create `src/backend/modules/stocks/dao/new-provider.dao.ts`:

```typescript
import { BaseDAO } from '@backend/common/dao/base.dao';
import { PROVIDER_CONFIG } from '@/lib/config/providers.config';

export class NewProviderDAO extends BaseDAO {
  private config = PROVIDER_CONFIG.newProvider;

  async getQuote(symbol: string) {
    const url = `${this.config.baseUrl}/quote?symbol=${symbol}&token=${this.config.apiKey}`;
    return await this.fetchWithTimeout(url, this.config.timeout);
  }
}
```

### Step 6: Use in Service

Update `src/backend/modules/stocks/service/stock-data.service.ts`:

```typescript
async getQuote(symbol: string, userTier: TierName) {
  const result = await this.orchestrator.fetchWithFallback(
    [
      {
        name: 'tiingo',
        priority: 1,
        fetch: () => this.tiingoDAO.getQuote(symbol),
      },
      {
        name: 'newProvider',
        priority: 2,
        fetch: () => this.newProviderDAO.getQuote(symbol),
      },
    ],
    {
      cacheKey: `quote:${symbol}`,
      cacheTTL: getCacheTTL('quotes', userTier),
      allowStale: true,
    }
  );

  return result.data;
}
```

**Done! Adding a new provider now takes ~10 minutes instead of 2 hours.**

---

## Startup Validation

The configuration system validates settings at application startup:

### What is Validated

1. ✅ **Required API keys** are present
2. ✅ **Production has Redis cache** (not in-memory)
3. ✅ **At least one provider** is enabled
4. ✅ **No conflicting environment variables**
5. ✅ **Provider configurations** are valid

### Validation Output

**Success:**

```
🔍 Validating Configuration...

✅ Configuration Validated Successfully

   Cache Provider: Vercel KV (Upstash)
   Quote Primary: tiingo
   Enabled Providers: 5
```

**Errors:**

```
🔍 Validating Configuration...

❌ Configuration Errors:

   Missing required API keys: TIINGO_API_KEY (tiingo), GEMINI_API_KEY (gemini)
   ❌ CRITICAL: Production requires Redis (Vercel KV or Upstash). In-memory cache will cause 0% hit rate in serverless.

💡 Tip: Run printAPIKeyGuide() to see setup instructions
```

### Manual Validation

```typescript
import {
  validateConfiguration,
  isProductionReady,
} from '@/lib/config/validation';

// Check configuration
const result = validateConfiguration();
if (!result.success) {
  console.error('Validation failed:', result.errors);
}

// Check production readiness
if (isProductionReady()) {
  console.log('Ready for production deployment');
}
```

---

## Troubleshooting

### Issue: "Missing required API keys"

**Solution:**

1. Run API key guide:

```bash
node -e "require('./src/lib/config/api-keys.config').printAPIKeyGuide()"
```

2. Add missing keys to `.env.local`
3. Restart dev server

### Issue: "Production requires Redis"

**Cause:** Deployed to production without cache provider

**Solution:**

**Option 1: Enable Vercel KV**

1. Go to Vercel dashboard → Storage
2. Create KV Store
3. Redeploy (env vars auto-configured)

**Option 2: Use Upstash Direct**

1. Create account at [upstash.com](https://upstash.com)
2. Create Redis database
3. Add credentials to Vercel env vars:

```bash
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...
```

4. Redeploy

### Issue: Provider always failing

**Check:**

1. **API key configured?**

```typescript
import { isAPIKeyConfigured } from '@/lib/config/api-keys.config';

console.log(isAPIKeyConfigured('tiingo')); // false?
```

2. **Provider enabled?**

```typescript
import { PROVIDER_CONFIG } from '@/lib/config/providers.config';

console.log(PROVIDER_CONFIG.tiingo.enabled); // false?
```

3. **Circuit breaker open?**

Check logs for "Circuit open for [provider], skipping"

**Fix:** Wait for reset timeout (60 seconds) or restart server

### Issue: TypeScript errors in config files

**Solution:**

1. Ensure `src/lib/config/types.ts` exists
2. Run `npm install` to update dependencies
3. Check import paths are correct
4. Restart TypeScript server (VS Code: Cmd+Shift+P → "Restart TS Server")

### Issue: Cache not working

**Check:**

1. **Cache provider type:**

```typescript
import { getCacheProviderDetails } from '@/lib/config/cache-provider.config';

console.log(getCacheProviderDetails());
// { type: 'memory', isRedis: false }
```

2. **If production + memory cache:**

- You need to configure Redis (see above)

3. **If Redis configured but not working:**

- Check credentials are correct
- Verify Redis instance is accessible
- Check Vercel logs for connection errors

### Issue: Configuration changes not applied

**Solution:**

1. **Restart dev server** (config is cached)
2. **Check environment variables** are set
3. **Verify no typos** in env var names
4. **Clear Next.js cache:**

```bash
rm -rf .next
npm run dev
```

### Need More Help?

1. **Check validation output** for specific errors
2. **Run API key guide** for setup instructions
3. **Review logs** for detailed error messages
4. **Check provider documentation** for API issues

---

## Best Practices

### 1. Use Environment Variables for Secrets

❌ **Bad:**

```typescript
apiKey: 'sk-1234567890abcdef';
```

✅ **Good:**

```typescript
apiKey: process.env.TIINGO_API_KEY;
```

### 2. Use Feature Flags for Gradual Rollout

```bash
# Start with 10% of users
FEATURE_NEW_PROVIDER_ENABLED=false

# After validation, enable for everyone
FEATURE_NEW_PROVIDER_ENABLED=true
```

### 3. Set Reasonable Timeouts

- **Fast APIs:** 5-10 seconds
- **Slow APIs (SEC):** 15-20 seconds
- **Never exceed:** 60 seconds (UX impact)

### 4. Configure Circuit Breakers

- **Failure threshold:** 3-5 (balance sensitivity vs. false positives)
- **Reset timeout:** 60-120 seconds (give provider time to recover)
- **Half-open requests:** 1-3 (test cautiously)

### 5. Document New Providers

Always update `api-keys.config.ts` when adding providers:

- Environment variable name
- Usage description
- Documentation link
- Free/paid tier info
- Any restrictions

---

## Summary

The centralized configuration system:

- ✅ Eliminates scattered hardcoded settings
- ✅ Simplifies adding new providers (10 minutes vs. 2 hours)
- ✅ Catches errors before deployment
- ✅ Supports environment-based overrides
- ✅ Enables A/B testing and gradual rollouts

**Next Steps:**

1. Review Phase 0 Quick Start Guide
2. Set up required environment variables
3. Run `npm run dev` and check validation output
4. Proceed to Phase 1 (Cache Migration)
