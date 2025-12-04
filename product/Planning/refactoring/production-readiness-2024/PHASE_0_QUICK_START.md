# Phase 0 Quick Start Guide - Configuration System

**Timeline:** Week 0.5 (20 hours)
**Goal:** Create centralized configuration foundation for all providers, AI models, and cache settings
**Priority:** CRITICAL - Must complete before Phase 1+

---

## Why Phase 0 Matters

**Current Problem:**
- Settings scattered across 15+ service files
- Hardcoded timeouts, TTLs, API endpoints
- No startup validation (errors found in production)
- Adding new provider takes 2 hours of hunting through code

**After Phase 0:**
- ✅ All settings in 4 config files
- ✅ Add new provider in 10 minutes
- ✅ Startup validation catches errors before deployment
- ✅ Environment-based overrides (dev, staging, prod)

---

## Pre-Flight Checklist

Before starting, ensure:

- [ ] Production Readiness Plan reviewed and approved
- [ ] Budget approved ($1,000 for Phase 0, $10,500 total)
- [ ] Feature branch created: `feature/config-system`
- [ ] TypeScript knowledge (interfaces, const assertions)
- [ ] Access to all API keys for documentation purposes

---

## Day 1: Core Configuration (10 hours)

### Task 0.1: Create Configuration Directory Structure (30 min)

```bash
# Create directory structure
mkdir -p src/lib/config
mkdir -p src/lib/config/__tests__
mkdir -p docs/5_Guides
```

**Files to create:**
```
src/lib/config/
├── types.ts                    # Configuration interfaces
├── providers.config.ts         # Provider settings
├── ai-models.config.ts         # AI model configuration
├── cache-provider.config.ts    # Cache provider selection
├── cache-ttl.config.ts         # TTL settings
├── api-keys.config.ts          # API key mapping
├── validation.ts               # Startup validation
└── __tests__/
    ├── validation.test.ts
    └── providers.test.ts
```

---

### Task 0.2: Create Configuration Types (1 hour)

**File:** `src/lib/config/types.ts`

```typescript
/**
 * Configuration Type Definitions
 * Shared interfaces used across all configuration files
 */

/**
 * Circuit Breaker Configuration
 * Controls when a provider is temporarily disabled after failures
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  resetTimeout: number;         // Milliseconds before testing provider again
  halfOpenMaxRequests: number;  // Max concurrent requests in half-open state
}

/**
 * Rate Limit Configuration
 * Prevents exceeding provider rate limits
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
}

/**
 * Provider Configuration
 * Settings for external data providers (Tiingo, Yahoo Finance, etc.)
 */
export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;             // 1 = primary, 2 = fallback, 3 = tertiary
  baseUrl?: string;
  apiKey?: string;
  timeout: number;              // Request timeout in milliseconds
  retryAttempts: number;        // Number of retry attempts
  retryDelay: number;           // Delay between retries in milliseconds
  circuitBreaker: CircuitBreakerConfig;
  rateLimit: RateLimitConfig;
}

/**
 * AI Model Configuration
 * Settings for AI providers and models
 */
export interface AIModelConfig {
  provider: 'gemini' | 'groq' | 'openai';
  model: string;
  endpoint: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  priority: number;             // 1 = primary, 2 = fallback
  fallback?: AIModelConfig;     // Fallback model if primary fails
  costPerToken: {
    input: number;              // USD per 1K tokens
    output: number;             // USD per 1K tokens
  };
}

/**
 * Cache Provider Types
 */
export type CacheProviderType = 'upstash' | 'vercel-kv' | 'memory';

/**
 * Tier Name (from existing tier config)
 */
export type TierName = 'free' | 'basic' | 'premium';
```

**Success Criteria:**
- ✅ All configuration interfaces defined
- ✅ Type safety for all config objects
- ✅ No TypeScript errors

---

### Task 0.3: Create Provider Configuration (2.5 hours)

**File:** `src/lib/config/providers.config.ts`

```typescript
import type { ProviderConfig } from './types';

/**
 * Data Provider Configuration
 *
 * Priority Levels:
 * - 1: PRIMARY (use first, highest reliability)
 * - 2: FALLBACK (use if primary fails)
 * - 3: TERTIARY (use only in specific cases, e.g., commodities)
 *
 * Usage:
 * - Services use orchestrator to try providers in priority order
 * - Circuit breaker automatically skips failing providers
 * - Rate limits prevent exceeding provider quotas
 */

export const PROVIDER_CONFIG = {
  // ========================================
  // STOCK QUOTE PROVIDERS
  // ========================================

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
      failureThreshold: 5,      // Open circuit after 5 failures
      resetTimeout: 60000,       // Try again after 1 minute
      halfOpenMaxRequests: 3,    // Allow 3 test requests
    },
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 10000,
    },
    // Tiingo-specific
    batchSize: 500,              // Max symbols per batch request
  },

  yahooFinance: {
    name: 'yahooFinance',
    enabled: true,
    priority: 2, // FALLBACK (use only if Tiingo fails)
    baseUrl: 'https://query2.finance.yahoo.com',
    apiKey: undefined,           // No API key needed
    timeout: 8000,
    retryAttempts: 1,            // Minimize usage (ToS respect)
    retryDelay: 500,
    circuitBreaker: {
      failureThreshold: 3,       // Conservative (respect ToS)
      resetTimeout: 120000,      // 2 minutes
      halfOpenMaxRequests: 1,
    },
    rateLimit: {
      requestsPerMinute: 10,     // Conservative (no official limit)
      requestsPerDay: 500,
    },
    maxCacheTTL: 5 * 60 * 1000,  // ToS compliance: 5 min max
    restrictions: 'Cannot redistribute data. Use as fallback only.',
  },

  alphaVantage: {
    name: 'alphaVantage',
    enabled: true,
    priority: 3, // TERTIARY (commodities only after Phase 3)
    baseUrl: 'https://www.alphavantage.co/query',
    apiKey: process.env.ALPHAVANTAGE_API_KEY,
    timeout: 15000,
    retryAttempts: 2,
    retryDelay: 2000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxRequests: 2,
    },
    rateLimit: {
      requestsPerMinute: 5,      // Free tier: 25/day ≈ 1/hour
      requestsPerDay: 25,
    },
  },

  // ========================================
  // NEWS PROVIDERS
  // ========================================

  rss: {
    name: 'rss',
    enabled: process.env.FEATURE_RSS_NEWS_ENABLED === 'true',
    priority: 1, // PRIMARY for news
    baseUrl: undefined,          // Multiple RSS feeds
    apiKey: undefined,
    timeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 30000,       // 30 seconds
      halfOpenMaxRequests: 1,
    },
    rateLimit: {
      requestsPerMinute: 30,     // RSS feeds are generous
      requestsPerDay: 1000,
    },
  },

  // ========================================
  // SEC EDGAR
  // ========================================

  secEdgar: {
    name: 'secEdgar',
    enabled: true,
    priority: 1, // PRIMARY for filings
    baseUrl: 'https://www.sec.gov',
    apiKey: undefined,
    timeout: 20000,              // SEC can be slow
    retryAttempts: 3,
    retryDelay: 2000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 120000,
      halfOpenMaxRequests: 2,
    },
    rateLimit: {
      requestsPerMinute: 10,     // SEC official limit: 10 req/sec
      requestsPerDay: 10000,
    },
    userAgent: 'Portfolio-Tracker your-email@example.com', // SEC requirement
  },
} as const;

/**
 * Get providers by priority (sorted)
 */
export function getProvidersByPriority(
  providerNames: (keyof typeof PROVIDER_CONFIG)[]
): ProviderConfig[] {
  return providerNames
    .map(name => PROVIDER_CONFIG[name])
    .filter(p => p.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get enabled providers for a specific use case
 */
export function getQuoteProviders(): ProviderConfig[] {
  return getProvidersByPriority(['tiingo', 'yahooFinance']);
}

export function getCommodityProviders(): ProviderConfig[] {
  return getProvidersByPriority(['tiingo', 'alphaVantage']);
}

export function getNewsProviders(): ProviderConfig[] {
  return getProvidersByPriority(['rss']);
}
```

**Success Criteria:**
- ✅ All current providers configured
- ✅ Priority levels documented
- ✅ Circuit breaker settings reasonable
- ✅ Rate limits match provider documentation

---

### Task 0.4: Create AI Model Configuration (2.5 hours)

**File:** `src/lib/config/ai-models.config.ts`

```typescript
import type { AIModelConfig, TierName } from './types';

/**
 * AI Model Configuration
 *
 * Tier-Based Model Selection:
 * - Free: Cheapest models (Gemini Flash 8B)
 * - Basic: Balanced performance (Gemini Flash)
 * - Premium: Best quality (Gemini Pro)
 *
 * Task-Specific Overrides:
 * - Sentiment: Fast, cheap model (Groq Llama)
 * - Summarization: Balanced (Gemini Flash)
 * - Complex Analysis: High quality (Gemini Pro)
 */

export const AI_MODEL_CONFIG = {
  // ========================================
  // TIER-BASED MODEL SELECTION
  // ========================================

  tierModels: {
    free: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-flash-8b',
      priority: 1, // PRIMARY for free tier
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY!,
      maxTokens: 1024,
      temperature: 0.7,
      timeout: 30000,
      costPerToken: {
        input: 0.0001,   // $0.10 per 1M tokens
        output: 0.0003,  // $0.30 per 1M tokens
      },
      fallback: {
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        priority: 2, // FALLBACK
        endpoint: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY!,
        maxTokens: 1024,
        temperature: 0.7,
        timeout: 20000,
        costPerToken: {
          input: 0.0004,
          output: 0.0008,
        },
      },
    },

    basic: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-flash',
      priority: 1, // PRIMARY for basic tier
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY!,
      maxTokens: 2048,
      temperature: 0.7,
      timeout: 40000,
      costPerToken: {
        input: 0.00015,  // $0.15 per 1M tokens
        output: 0.0006,  // $0.60 per 1M tokens
      },
      fallback: {
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        priority: 2,
        endpoint: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY!,
        maxTokens: 2048,
        temperature: 0.7,
        timeout: 20000,
        costPerToken: {
          input: 0.0004,
          output: 0.0008,
        },
      },
    },

    premium: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-pro',
      priority: 1, // PRIMARY for premium tier
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY!,
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 60000,
      costPerToken: {
        input: 0.00125,  // $1.25 per 1M tokens
        output: 0.005,   // $5.00 per 1M tokens
      },
      fallback: {
        provider: 'gemini' as const,
        model: 'gemini-1.5-flash',
        priority: 2,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY!,
        maxTokens: 2048,
        temperature: 0.7,
        timeout: 40000,
        costPerToken: {
          input: 0.00015,
          output: 0.0006,
        },
      },
    },
  },

  // ========================================
  // TASK-SPECIFIC MODEL OVERRIDES
  // ========================================

  taskModels: {
    // Fast, cheap sentiment analysis
    sentiment: {
      provider: 'groq' as const,
      model: 'llama-3.3-70b-versatile',
      priority: 1,
      maxTokens: 512,
      temperature: 0.3, // Lower for consistency
    },

    // Balanced summarization
    summarization: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-flash',
      priority: 1,
      maxTokens: 1024,
      temperature: 0.5,
    },

    // High-quality complex analysis
    complexAnalysis: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-pro',
      priority: 1,
      maxTokens: 4096,
      temperature: 0.7,
    },
  },
};

/**
 * Get AI model configuration for a user tier
 * Optionally override with task-specific settings
 */
export function getAIModelConfig(
  tier: TierName,
  task?: keyof typeof AI_MODEL_CONFIG.taskModels
): AIModelConfig {
  const tierConfig = AI_MODEL_CONFIG.tierModels[tier];

  if (task && AI_MODEL_CONFIG.taskModels[task]) {
    // Merge tier config with task overrides
    return {
      ...tierConfig,
      ...AI_MODEL_CONFIG.taskModels[task],
    } as AIModelConfig;
  }

  return tierConfig;
}

/**
 * Estimate cost for a specific request
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  tier: TierName
): number {
  const config = getAIModelConfig(tier);
  const inputCost = (inputTokens / 1000) * config.costPerToken.input;
  const outputCost = (outputTokens / 1000) * config.costPerToken.output;
  return inputCost + outputCost;
}
```

**Success Criteria:**
- ✅ Tier-based model selection configured
- ✅ Task-specific overrides defined
- ✅ Fallback chains for each tier
- ✅ Cost tracking per model

---

### Task 0.5: Create Cache Provider Configuration (1.5 hours)

**File:** `src/lib/config/cache-provider.config.ts`

```typescript
import type { CacheProviderType } from './types';

/**
 * Cache Provider Configuration
 *
 * Supported Providers:
 * 1. Vercel KV - Upstash Redis managed by Vercel (recommended for Vercel)
 * 2. Upstash Redis - Direct Upstash connection (for non-Vercel deployments)
 * 3. In-Memory - Local development only (not production-safe)
 *
 * Auto-Detection Priority:
 * 1. Check for UPSTASH_REDIS_URL → use 'upstash'
 * 2. Check for KV_REST_API_URL → use 'vercel-kv'
 * 3. Default to 'memory' in development
 */

export interface CacheProviderConfig {
  type: CacheProviderType;
  upstash?: {
    priority: number;
    url?: string;
    token?: string;
  };
  vercelKV?: {
    priority: number;
    restUrl?: string;
    restToken?: string;
  };
  memory?: {
    priority: number;
  };
  fallback: CacheProviderType;
}

export const CACHE_PROVIDER_CONFIG: CacheProviderConfig = {
  type: detectCacheProvider(),

  // Direct Upstash Redis
  upstash: {
    priority: 1,
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  },

  // Vercel KV (Upstash managed by Vercel)
  vercelKV: {
    priority: 1,
    restUrl: process.env.KV_REST_API_URL,
    restToken: process.env.KV_REST_API_TOKEN,
  },

  // In-Memory (Development only)
  memory: {
    priority: 3,
  },

  fallback: 'memory',
};

/**
 * Auto-detect cache provider based on available credentials
 */
function detectCacheProvider(): CacheProviderType {
  // Priority 1: Direct Upstash
  if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    return 'upstash';
  }

  // Priority 2: Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return 'vercel-kv';
  }

  // Fallback: In-Memory (dev only)
  if (process.env.NODE_ENV === 'development') {
    return 'memory';
  }

  console.warn('[Cache] No Redis provider configured. Using in-memory cache.');
  return 'memory';
}

/**
 * Get human-readable cache provider name
 */
export function getCacheProviderName(): string {
  const type = CACHE_PROVIDER_CONFIG.type;
  switch (type) {
    case 'upstash':
      return 'Upstash Redis (Direct)';
    case 'vercel-kv':
      return 'Vercel KV (Upstash)';
    case 'memory':
      return 'In-Memory Cache (Dev Only)';
    default:
      return 'Unknown';
  }
}
```

**File:** `src/lib/config/cache-ttl.config.ts`

```typescript
import type { TierName } from './types';

/**
 * Cache TTL Configuration
 *
 * TTL Strategy:
 * - Free tier: Longer TTLs (reduce costs)
 * - Premium tier: Shorter TTLs (fresher data)
 * - Data type: Balance update frequency vs. cost
 */

export interface CacheTTLConfig {
  quotes: Record<TierName, number>;
  commodities: Record<TierName, number>;
  fundamentals: Record<TierName, number>;
  news: Record<TierName, number>;
  ai: Record<TierName, number>;
}

export const CACHE_TTL_CONFIG: CacheTTLConfig = {
  quotes: {
    free: 15 * 60 * 1000,    // 15 minutes
    basic: 10 * 60 * 1000,   // 10 minutes
    premium: 5 * 60 * 1000,  // 5 minutes
  },
  commodities: {
    free: 4 * 60 * 60 * 1000,  // 4 hours
    basic: 2 * 60 * 60 * 1000, // 2 hours
    premium: 1 * 60 * 60 * 1000, // 1 hour
  },
  fundamentals: {
    free: 7 * 24 * 60 * 60 * 1000,  // 7 days
    basic: 7 * 24 * 60 * 60 * 1000,
    premium: 7 * 24 * 60 * 60 * 1000,
  },
  news: {
    free: 60 * 60 * 1000,  // 1 hour
    basic: 60 * 60 * 1000,
    premium: 60 * 60 * 1000,
  },
  ai: {
    free: 12 * 60 * 60 * 1000,  // 12 hours
    basic: 12 * 60 * 60 * 1000,
    premium: 12 * 60 * 60 * 1000,
  },
};

/**
 * Get cache TTL for specific data type and user tier
 */
export function getCacheTTL(
  dataType: keyof CacheTTLConfig,
  tier: TierName
): number {
  return CACHE_TTL_CONFIG[dataType][tier];
}
```

**Success Criteria:**
- ✅ Auto-detection works correctly
- ✅ TTLs configured per tier and data type
- ✅ Clear documentation

---

## Day 2: Validation & Documentation (5 hours)

### Task 0.6: Create API Key Mapping (1.5 hours)

**File:** `src/lib/config/api-keys.config.ts`

```typescript
/**
 * API Key Mapping Reference
 *
 * Documents which API key is used by which provider
 * Helps with setup and troubleshooting
 */

export interface APIKeyInfo {
  envVar?: string | null;
  envVars?: string[];
  required: boolean;
  usage: string;
  documentation: string;
  freeTier?: string;
  paidTier?: string;
  restrictions?: string;
  note?: string;
}

export const API_KEY_MAPPING: Record<string, APIKeyInfo> = {
  tiingo: {
    envVar: 'TIINGO_API_KEY',
    required: true,
    usage: 'Stock quotes (primary), commodities',
    documentation: 'https://api.tiingo.com/documentation/general/overview',
    freeTier: 'Yes - $0/month (500 req/day)',
    paidTier: 'Power - $10/month (unlimited)',
  },

  gemini: {
    envVar: 'GEMINI_API_KEY',
    required: true,
    usage: 'AI chat, analysis, summaries (primary)',
    documentation: 'https://ai.google.dev/gemini-api/docs',
    freeTier: 'Yes - $0/month (60 req/min)',
  },

  groq: {
    envVar: 'GROQ_API_KEY',
    required: false,
    usage: 'AI fallback, sentiment analysis',
    documentation: 'https://console.groq.com/docs',
    freeTier: 'Yes - $0/month (30 req/min)',
  },

  vercelKV: {
    envVars: ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    required: false,
    usage: 'Vercel KV (Upstash managed by Vercel)',
    documentation: 'https://vercel.com/docs/storage/vercel-kv',
    freeTier: 'Yes - $0/month (30K commands)',
    note: 'Auto-configured in Vercel dashboard',
  },

  upstashRedis: {
    envVars: ['UPSTASH_REDIS_URL', 'UPSTASH_REDIS_TOKEN'],
    required: false,
    usage: 'Direct Upstash Redis connection',
    documentation: 'https://upstash.com/docs/redis',
    freeTier: 'Yes - $0/month (10K commands/day)',
  },

  yahooFinance: {
    envVar: null,
    required: false,
    usage: 'Quote fallback (internal use only)',
    documentation: 'https://finance.yahoo.com',
    restrictions: '⚠️ Cannot redistribute data per ToS. Use as fallback only.',
  },

  alphaVantage: {
    envVar: 'ALPHAVANTAGE_API_KEY',
    required: false,
    usage: 'Commodities fallback only',
    documentation: 'https://www.alphavantage.co/documentation/',
    freeTier: 'Yes - $0/month (25 req/day)',
    paidTier: 'Premium - $50/month',
  },
};

/**
 * Get list of missing required API keys
 */
export function getMissingRequiredKeys(): string[] {
  const missing: string[] = [];

  for (const [provider, config] of Object.entries(API_KEY_MAPPING)) {
    if (config.required) {
      if (config.envVars) {
        for (const envVar of config.envVars) {
          if (!process.env[envVar]) {
            missing.push(`${envVar} (${provider})`);
          }
        }
      } else if (config.envVar && !process.env[config.envVar]) {
        missing.push(`${config.envVar} (${provider})`);
      }
    }
  }

  return missing;
}

/**
 * Print API key setup guide
 */
export function printAPIKeyGuide(): void {
  console.log('\n📋 API Key Setup Guide\n');

  for (const [provider, config] of Object.entries(API_KEY_MAPPING)) {
    const status = config.required ? '🔴 REQUIRED' : '🟢 OPTIONAL';
    console.log(`${status} ${provider}`);
    console.log(`   Usage: ${config.usage}`);

    if (config.envVar) {
      console.log(`   Env Var: ${config.envVar}`);
    } else if (config.envVars) {
      console.log(`   Env Vars: ${config.envVars.join(', ')}`);
    }

    if (config.freeTier) {
      console.log(`   Free Tier: ${config.freeTier}`);
    }

    if (config.restrictions) {
      console.log(`   ⚠️  ${config.restrictions}`);
    }

    console.log(`   Docs: ${config.documentation}\n`);
  }
}
```

**Success Criteria:**
- ✅ All providers documented
- ✅ Required vs optional clearly marked
- ✅ Links to documentation included

---

### Task 0.7: Create Startup Validation (2 hours)

**File:** `src/lib/config/validation.ts`

```typescript
import { CACHE_PROVIDER_CONFIG, getCacheProviderName } from './cache-provider.config';
import { PROVIDER_CONFIG } from './providers.config';
import { getMissingRequiredKeys, printAPIKeyGuide } from './api-keys.config';

/**
 * Validate Configuration at Startup
 *
 * Catches configuration errors before deployment:
 * - Missing required API keys
 * - Production without Redis cache
 * - No enabled providers
 * - Invalid environment variables
 */

export function validateConfiguration(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('\n🔍 Validating Configuration...\n');

  // 1. Check required API keys
  const missingKeys = getMissingRequiredKeys();
  if (missingKeys.length > 0) {
    errors.push(`Missing required API keys: ${missingKeys.join(', ')}`);
  }

  // 2. Check cache provider
  if (!CACHE_PROVIDER_CONFIG.vercelKV?.restUrl && !CACHE_PROVIDER_CONFIG.upstash?.url) {
    warnings.push('No Redis cache configured. Using in-memory cache (not suitable for production)');
  }

  // 3. Production without Redis = CRITICAL ERROR
  if (process.env.NODE_ENV === 'production' && CACHE_PROVIDER_CONFIG.type === 'memory') {
    errors.push(
      '❌ CRITICAL: Production requires Redis (Vercel KV or Upstash). ' +
      'In-memory cache will cause 0% hit rate in serverless.'
    );
  }

  // 4. Check provider priorities and availability
  const quoteProviders = [PROVIDER_CONFIG.tiingo, PROVIDER_CONFIG.yahooFinance]
    .filter(p => p.enabled);

  if (quoteProviders.length === 0) {
    errors.push('No quote providers enabled. Check FEATURE_TIINGO_ENABLED or provider config.');
  }

  const newsProviders = [PROVIDER_CONFIG.rss].filter(p => p.enabled);
  if (newsProviders.length === 0) {
    warnings.push('No news providers enabled. Check FEATURE_RSS_NEWS_ENABLED.');
  }

  // 5. Check for conflicting environment variables
  if (process.env.UPSTASH_REDIS_URL && process.env.KV_REST_API_URL) {
    warnings.push(
      'Both Upstash and Vercel KV credentials found. Will use Upstash (higher priority).'
    );
  }

  // Log results
  if (errors.length > 0) {
    console.error('❌ Configuration Errors:\n');
    errors.forEach(err => console.error(`   ${err}`));
    console.error('\n💡 Tip: Run printAPIKeyGuide() to see setup instructions\n');
    throw new Error('Invalid configuration. Fix errors above before starting app.');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Configuration Warnings:\n');
    warnings.forEach(warn => console.warn(`   ${warn}\n`));
  }

  // Success
  console.log('✅ Configuration Validated Successfully\n');
  console.log(`   Cache Provider: ${getCacheProviderName()}`);

  const primaryQuote = quoteProviders.find(p => p.priority === 1);
  if (primaryQuote) {
    console.log(`   Quote Primary: ${primaryQuote.name}`);
  }

  const enabledCount = Object.values(PROVIDER_CONFIG).filter(p => p.enabled).length;
  console.log(`   Enabled Providers: ${enabledCount}`);
  console.log('');
}

/**
 * Call validation during app startup
 * Server-side only (not in browser)
 */
if (typeof window === 'undefined') {
  try {
    validateConfiguration();
  } catch (error) {
    console.error('Configuration validation failed:', error);
    // In development, continue anyway but show warning
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Continuing in development mode despite validation errors');
    } else {
      // In production, exit
      process.exit(1);
    }
  }
}
```

**Success Criteria:**
- ✅ Catches missing API keys
- ✅ Detects production without Redis
- ✅ Validates provider configuration
- ✅ Clear error messages

---

### Task 0.8: Create Tests (1.5 hours)

**File:** `src/lib/config/__tests__/validation.test.ts`

```typescript
import { validateConfiguration } from '../validation';
import { getMissingRequiredKeys } from '../api-keys.config';

describe('Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('detects missing required API keys', () => {
    // Remove required keys
    delete process.env.TIINGO_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const missing = getMissingRequiredKeys();
    expect(missing).toContain('TIINGO_API_KEY (tiingo)');
    expect(missing).toContain('GEMINI_API_KEY (gemini)');
  });

  test('passes with all required keys', () => {
    process.env.TIINGO_API_KEY = 'test-key';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.KV_REST_API_URL = 'https://test.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token';

    const missing = getMissingRequiredKeys();
    expect(missing).toHaveLength(0);
  });

  test('detects production without Redis', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.KV_REST_API_URL;
    delete process.env.UPSTASH_REDIS_URL;

    expect(() => validateConfiguration()).toThrow(/Production requires Redis/);
  });

  test('allows development without Redis', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.KV_REST_API_URL;
    delete process.env.UPSTASH_REDIS_URL;
    process.env.TIINGO_API_KEY = 'test';
    process.env.GEMINI_API_KEY = 'test';

    // Should not throw in development
    expect(() => validateConfiguration()).not.toThrow();
  });
});
```

**File:** `src/lib/config/__tests__/providers.test.ts`

```typescript
import { PROVIDER_CONFIG, getProvidersByPriority, getQuoteProviders } from '../providers.config';

describe('Provider Configuration', () => {
  test('all providers have required fields', () => {
    for (const [name, config] of Object.entries(PROVIDER_CONFIG)) {
      expect(config.name).toBe(name);
      expect(config).toHaveProperty('priority');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('circuitBreaker');
      expect(config).toHaveProperty('rateLimit');
    }
  });

  test('providers sorted by priority', () => {
    const providers = getProvidersByPriority(['tiingo', 'yahooFinance']);

    expect(providers[0].priority).toBeLessThanOrEqual(providers[1].priority);
  });

  test('quote providers include Tiingo and Yahoo', () => {
    process.env.FEATURE_TIINGO_ENABLED = 'true';

    const providers = getQuoteProviders();
    const names = providers.map(p => p.name);

    expect(names).toContain('tiingo');
    expect(names).toContain('yahoo-finance');
  });

  test('circuit breaker thresholds are reasonable', () => {
    for (const [name, config] of Object.entries(PROVIDER_CONFIG)) {
      expect(config.circuitBreaker.failureThreshold).toBeGreaterThan(0);
      expect(config.circuitBreaker.failureThreshold).toBeLessThan(20);
      expect(config.circuitBreaker.resetTimeout).toBeGreaterThan(0);
    }
  });
});
```

**Run tests:**
```bash
npm test src/lib/config
```

**Success Criteria:**
- ✅ All tests passing
- ✅ Missing keys detected
- ✅ Production validation works
- ✅ Provider priority sorting correct

---

## Day 3: Documentation (5 hours)

### Task 0.9: Create Configuration Management Guide (5 hours)

**File:** `docs/5_Guides/CONFIGURATION_MANAGEMENT.md`

Create comprehensive documentation covering:
- Overview of configuration system
- How to add new providers
- How to adjust settings via env vars
- Provider priority explanation
- API key setup guide
- Troubleshooting common issues

*[Content too long - see PRODUCTION_READINESS_PLAN.md Task 0.6 for reference]*

**Success Criteria:**
- ✅ Complete guide written
- ✅ Examples for all common tasks
- ✅ Troubleshooting section included

---

## Verification Checklist

Before moving to Phase 1, verify:

**Code:**
- [ ] All 7 config files created
- [ ] No TypeScript errors (`npm run tsc`)
- [ ] All tests passing (`npm test src/lib/config`)
- [ ] No hardcoded API keys in config files

**Configuration:**
- [ ] startup validation runs without errors
- [ ] Cache provider auto-detected correctly
- [ ] All providers have priority levels documented
- [ ] API key mapping complete

**Documentation:**
- [ ] CONFIGURATION_MANAGEMENT.md created
- [ ] Examples show how to use configs
- [ ] Troubleshooting section complete

**Testing:**
- [ ] Validation tests passing
- [ ] Provider config tests passing
- [ ] Missing keys correctly detected

---

## Common Issues & Solutions

### Issue: "Missing required API keys"

**Solution:**
1. Run: `node -e "require('./src/lib/config/api-keys.config').printAPIKeyGuide()"`
2. Add missing keys to `.env.local`
3. Restart dev server

### Issue: "Production requires Redis"

**Solution:**
1. Enable Vercel KV in Vercel dashboard, OR
2. Create Upstash account and add credentials
3. Verify env vars are set

### Issue: TypeScript errors in config files

**Solution:**
1. Ensure `src/lib/config/types.ts` is created first
2. Run `npm install` to update dependencies
3. Check import paths are correct

---

## Next Steps

After Phase 0 is complete:

1. ✅ Commit changes: `git commit -m "feat(phase-0): add configuration system"`
2. ✅ Create PR: "Phase 0: Configuration System Foundation"
3. ✅ Get code review
4. ✅ Merge to main
5. **Start Phase 1:** Cache Migration (uses configs from Phase 0)

---

## Time Tracking

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| 0.1 Directory setup | 0.5h | | |
| 0.2 Types | 1h | | |
| 0.3 Provider config | 2.5h | | |
| 0.4 AI model config | 2.5h | | |
| 0.5 Cache config | 1.5h | | |
| 0.6 API key mapping | 1.5h | | |
| 0.7 Validation | 2h | | |
| 0.8 Tests | 1.5h | | |
| 0.9 Documentation | 5h | | |
| **Total** | **20h** | | |

---

**Good luck! This foundation makes everything else 10x easier.** 🚀
