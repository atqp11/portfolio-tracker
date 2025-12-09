# Telemetry Integration Guide for Developers

> **Comprehensive developer guide for integrating telemetry tracking into features and monitoring AI costs and performance**

## Table of Contents

1. [Overview](#overview)
2. [Quick Start (5 Minutes)](#quick-start-5-minutes)
3. [Core Concepts](#core-concepts)
4. [Integration Patterns](#integration-patterns)
5. [Best Practices](#best-practices)
6. [Monitoring & Dashboards](#monitoring--dashboards)
7. [API Reference](#api-reference)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Topics](#advanced-topics)

---

## Overview

The portfolio tracker implements a comprehensive telemetry system for tracking AI model usage, costs, and performance metrics.

### System Architecture

**Two Telemetry Systems:**

1. **AI Telemetry** (`lib/telemetry/ai-logger.ts`)
   - Tracks AI inference metrics (costs, tokens, latency, confidence)
   - In-memory storage (circular buffer, max 10,000 entries)
   - Real-time dashboard at `/dashboard/costs`
   - Automatic metric threshold monitoring

2. **Rate Limit Telemetry** (`lib/metrics.ts`)
   - Records API rate limit events
   - Disk-based queue with automatic compaction
   - Optional remote forwarding via HTTP
   - Durable logging for reliability

### Key Features

- Real-time cost tracking across providers (Groq, Gemini, OpenAI)
- Performance metrics (cache hit rate, escalation rate, latency percentiles)
- Automatic threshold warnings
- Cost projections (daily, weekly, monthly, annual)
- Export functionality for analysis

---

## Quick Start (5 Minutes)

### 1. Log an AI Inference

```typescript
import { logInference } from '@lib/telemetry/ai-logger';

// After your AI model call
const response = await model.generateContent(prompt);

logInference({
  model: 'gemini-2.0-flash-exp',
  provider: 'gemini',
  taskType: 'chat',
  tokens_in: 150,
  tokens_out: 250,
  latency_ms: 1250,
  confidence: 0.92,
  cost_usd: 0.000042,
  escalated: false,
  cache_hit: false,
});
```

### 2. Get Telemetry Statistics

```typescript
import { getTelemetryStats, checkMetricThresholds } from '@lib/telemetry/ai-logger';

// Get stats for last 24 hours
const stats = getTelemetryStats();

console.log(stats.totalRequests);      // 1234
console.log(stats.cacheHitRate);       // 0.87 (87%)
console.log(stats.escalationRate);     // 0.08 (8%)
console.log(stats.totalCostUsd);       // $2.34
console.log(stats.avgLatencyMs);       // 1250ms
console.log(stats.p95LatencyMs);       // 3200ms

// Check if metrics exceed thresholds
const warnings = checkMetricThresholds(stats);
warnings.forEach(w => console.warn(w));
// ⚠️ Cache hit rate 78.5% < 80% target
```

### 3. View Dashboard

Navigate to: **`/dashboard/costs`**

The dashboard shows:
- Real-time metrics with auto-refresh (30s)
- Cost breakdown by provider
- Request distribution by task type
- Performance warnings
- Recent logs
- Export functionality

### 4. Record Rate Limits

```typescript
import { recordRateLimit } from '@lib/metrics';

// When external API returns 429
try {
  const data = await fetch('https://api.example.com/data');
} catch (error) {
  if (error.status === 429) {
    await recordRateLimit('example_api', 'Rate limit exceeded');
  }
}
```

---

## Core Concepts

### InferenceLog Interface

Every AI call should be logged with these fields:

```typescript
interface InferenceLog {
  timestamp: Date;                  // Auto-set by system
  model: string;                    // e.g., "gemini-2.0-flash-exp"
  provider: 'groq' | 'gemini' | 'openai';
  taskType: 'filing_summary' | 'news_sentiment' | 'chat' | 'kpi_extraction' | 'other';
  tokens_in: number;                // Input tokens consumed
  tokens_out: number;               // Output tokens generated
  latency_ms: number;               // Response time in milliseconds
  confidence: number;               // 0-1 confidence score
  cost_usd: number;                 // Cost in USD
  escalated: boolean;               // True if escalated to higher-tier model
  cache_hit: boolean;               // True if response came from cache
  user_feedback?: 'thumbs_up' | 'thumbs_down' | 'report';
  error?: string;                   // Error message if call failed
}
```

### Target Metrics

From `AI_MODEL_STRATEGY.md` and dashboard configuration:

| Metric | Target | Alert Threshold | Impact |
|--------|--------|-----------------|--------|
| **Cache Hit Rate** | >85% | <80% | Saves ~$10-15/month per 5% improvement |
| **Escalation Rate** | <10% | >15% | Saves ~$5-8/month when optimized |
| **Avg Cost/Request** | <$0.05 | >$0.10 | Critical for profitability |
| **P50 Latency** | <1.5s | >3s | User experience impact |
| **P95 Latency** | <4s | >7s | Tail latency monitoring |
| **Low Confidence Rate** | <5% | >5% | Quality assurance |
| **Daily Cost** | <$3 | >$5 | Budget management |
| **Monthly Cost** | <$60 | >$100 | Sustainability |

### Task Types

Use specific task types for better analysis:

| Task Type | Use Case | Typical Cost |
|-----------|----------|--------------|
| `chat` | Interactive user questions | $0.001-0.01 |
| `filing_summary` | SEC filing summarization | $0.002-0.005 |
| `news_sentiment` | News article analysis | $0.001-0.003 |
| `kpi_extraction` | Extract KPIs from filings | $0.002-0.004 |
| `other` | Miscellaneous tasks | Varies |

---

## Integration Patterns

### Pattern 1: Basic AI Call with Telemetry

```typescript
import { logInference } from '@lib/telemetry/ai-logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function analyzeStockSentiment(ticker: string, news: string[]) {
  const startTime = Date.now();

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Analyze sentiment for ${ticker}: ${news.join('\n')}`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const latency = Date.now() - startTime;

    // Extract token counts from API response
    const tokensIn = result.usageMetadata?.promptTokenCount || 0;
    const tokensOut = result.usageMetadata?.candidatesTokenCount || 0;

    // Calculate actual cost
    const cost = calculateCost('gemini-2.0-flash-exp', tokensIn, tokensOut);

    // Log the inference
    logInference({
      model: 'gemini-2.0-flash-exp',
      provider: 'gemini',
      taskType: 'news_sentiment',
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      latency_ms: latency,
      confidence: 0.85,
      cost_usd: cost,
      escalated: false,
      cache_hit: false,
    });

    return response.text();
  } catch (error) {
    const latency = Date.now() - startTime;

    // Log failed inference
    logInference({
      model: 'gemini-2.0-flash-exp',
      provider: 'gemini',
      taskType: 'news_sentiment',
      tokens_in: 0,
      tokens_out: 0,
      latency_ms: latency,
      confidence: 0,
      cost_usd: 0,
      escalated: false,
      cache_hit: false,
      error: error.message,
    });

    throw error;
  }
}
```

### Pattern 2: Confidence-Based Routing with Escalation

```typescript
import { logInference } from '@lib/telemetry/ai-logger';
import { routeQueryWithConfidence } from '@lib/ai/confidence-router';

export async function processUserQuery(query: string, context: string) {
  const startTime = Date.now();

  // Use confidence-based router
  const result = await routeQueryWithConfidence({
    userMessage: query,
    ragContext: context,
  });

  const latency = Date.now() - startTime;

  // Log with escalation tracking
  logInference({
    model: result.model,
    provider: result.provider,
    taskType: 'chat',
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    latency_ms: latency,
    confidence: result.confidence,
    cost_usd: result.cost,
    escalated: result.escalated,         // Track if escalated from Flash to Pro
    cache_hit: false,
  });

  return result;
}
```

### Pattern 3: Caching Integration

```typescript
import { logInference } from '@lib/telemetry/ai-logger';
import { getCachedResponse, setCachedResponse } from '@lib/ai/cache';

export async function getFilingSummary(filingUrl: string) {
  const cacheKey = `filing:${filingUrl}`;
  const startTime = Date.now();

  // Check cache first
  const cached = await getCachedResponse(cacheKey);

  if (cached) {
    const latency = Date.now() - startTime;

    // Log cache hit with zero cost
    logInference({
      model: cached.model,
      provider: cached.provider,
      taskType: 'filing_summary',
      tokens_in: 0,              // No tokens consumed on cache hit
      tokens_out: 0,
      latency_ms: latency,
      confidence: cached.confidence,
      cost_usd: 0,               // No cost for cache hit
      escalated: false,
      cache_hit: true,           // Mark as cache hit
    });

    return cached.response;
  }

  // Cache miss - call AI model
  const result = await callAIModel(filingUrl);
  const latency = Date.now() - startTime;

  // Cache the result (12-hour TTL)
  await setCachedResponse(cacheKey, result, { ttl: 43200 });

  // Log cache miss
  logInference({
    model: result.model,
    provider: result.provider,
    taskType: 'filing_summary',
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    latency_ms: latency,
    confidence: result.confidence,
    cost_usd: result.cost,
    escalated: result.escalated,
    cache_hit: false,            // Cache miss
  });

  return result.response;
}
```

### Pattern 4: Batch Processing with Telemetry

```typescript
import { logInference } from '@lib/telemetry/ai-logger';

export async function processBatchKPIExtraction(filings: Filing[]) {
  const results = [];

  for (const filing of filings) {
    const startTime = Date.now();

    try {
      const result = await extractKPIs(filing);
      const latency = Date.now() - startTime;

      // Log each batch item
      logInference({
        model: 'gemini-2.0-flash-exp',
        provider: 'gemini',
        taskType: 'kpi_extraction',
        tokens_in: result.tokensIn,
        tokens_out: result.tokensOut,
        latency_ms: latency,
        confidence: result.confidence,
        cost_usd: result.cost,
        escalated: false,
        cache_hit: false,
      });

      results.push(result);
    } catch (error) {
      console.error(`Failed to process filing ${filing.id}:`, error);

      // Log failure
      logInference({
        model: 'gemini-2.0-flash-exp',
        provider: 'gemini',
        taskType: 'kpi_extraction',
        tokens_in: 0,
        tokens_out: 0,
        latency_ms: Date.now() - startTime,
        confidence: 0,
        cost_usd: 0,
        escalated: false,
        cache_hit: false,
        error: error.message,
      });
    }
  }

  return results;
}
```

### Pattern 5: Rate Limit Handling

```typescript
import { recordRateLimit } from '@lib/metrics';

export async function fetchStockPrice(ticker: string) {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${API_KEY}`
    );

    if (response.status === 429) {
      // Record rate limit event
      await recordRateLimit('alpha_vantage', 'API rate limit exceeded for GLOBAL_QUOTE');
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}
```

### Pattern 6: Multi-Provider Fallback

```typescript
import { recordRateLimit } from '@lib/metrics';

export async function fetchWithRetry(
  provider: string,
  fetchFn: () => Promise<Response>,
  maxRetries = 3
) {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchFn();

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (attempt + 1) * 5000;

        // Record rate limit event
        await recordRateLimit(
          provider,
          `Rate limit on attempt ${attempt + 1}/${maxRetries}. Retry-After: ${retryAfter}s`
        );

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
```

---

## Best Practices

### 1. Always Log AI Inferences

**DO:**
```typescript
const result = await model.generateContent(prompt);
logInference({ /* all fields */ });
```

**DON'T:**
```typescript
const result = await model.generateContent(prompt);
// Missing logging - costs hidden!
```

### 2. Use Accurate Token Counts

**DO:**
```typescript
// Use actual counts from API response
const tokensIn = result.usageMetadata?.promptTokenCount || 0;
const tokensOut = result.usageMetadata?.candidatesTokenCount || 0;

logInference({
  tokens_in: tokensIn,
  tokens_out: tokensOut,
  // ...
});
```

**DON'T:**
```typescript
// Hardcoding or guessing
logInference({
  tokens_in: 100,  // Wrong!
  tokens_out: 200, // Wrong!
  // ...
});
```

### 3. Calculate Real Costs

**DO:**
```typescript
import { calculateCost } from '@lib/ai/cost-calculator';

const cost = calculateCost(
  'gemini-2.0-flash-exp',
  result.usageMetadata.promptTokenCount,
  result.usageMetadata.candidatesTokenCount
);

logInference({ cost_usd: cost });
```

**DON'T:**
```typescript
logInference({ cost_usd: 0 }); // Hides actual spending!
```

### 4. Set Meaningful Confidence Scores

**DO:**
```typescript
// Use model-provided confidence or calculated score
const confidence = result.candidates[0].finishReason === 'STOP' ? 0.9 : 0.5;
logInference({ confidence });
```

**DON'T:**
```typescript
logInference({ confidence: 1.0 }); // Misleading!
```

### 5. Track Escalations

**DO:**
```typescript
let escalated = false;
let model = 'gemini-2.0-flash-exp';

if (result.confidence < 0.6) {
  model = 'gemini-2.0-pro-exp';
  escalated = true;
}

logInference({ model, escalated });
```

### 6. Log Cache Hits Correctly

**DO:**
```typescript
if (cached) {
  logInference({
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    cache_hit: true,
    // ... other fields from cache metadata
  });
}
```

### 7. Handle Errors Gracefully

**DO:**
```typescript
try {
  const result = await callAI(prompt);
  logInference({ /* success */ });
} catch (error) {
  logInference({
    tokens_in: 0,
    tokens_out: 0,
    confidence: 0,
    cost_usd: 0,
    error: error.message,
  });
  throw error;
}
```

### 8. Use Specific Task Types

**DO:**
```typescript
logInference({ taskType: 'filing_summary' });  // Clear
logInference({ taskType: 'news_sentiment' });  // Clear
```

**DON'T:**
```typescript
logInference({ taskType: 'other' });  // Not useful for analysis
```

---

## Monitoring & Dashboards

### Cost Tracking Dashboard

**Location:** `/dashboard/costs`

**Features:**
- Real-time metrics (auto-refresh every 30 seconds)
- Multiple time periods: 1h, 24h, 7d, 30d
- Visual charts:
  - Cost by provider (Pie chart)
  - Requests by task type (Bar chart)
  - Performance metrics (Progress bars)
- Cost projections (daily, weekly, monthly, annual)
- Automated warnings for threshold violations
- Recent logs table with export functionality

**Key Metrics Displayed:**
- Total Requests
- Total Cost ($)
- Avg Cost per Request
- Cache Hit Rate (%)
- Escalation Rate (%)
- Average Confidence Score
- Latency (P50, P95)

### Understanding Warnings

The dashboard shows warnings when metrics exceed thresholds:

```
⚠️ Performance Warnings
• Cache hit rate 78.5% < 80% target
• P95 latency 7200ms > 7s target
• Escalation rate 16.2% > 15% threshold
```

**Action Items by Warning:**

| Warning | Recommended Action |
|---------|-------------------|
| Cache hit rate low | Increase TTL, implement query normalization |
| Escalation rate high | Improve RAG context, fine-tune thresholds |
| High latency | Optimize prompts, check API performance |
| High cost/request | Review model selection, increase caching |
| Low confidence rate | Improve prompt engineering, add examples |

### Accessing Telemetry Data

Telemetry data is accessed via the Cost Tracking Dashboard at `/admin/costs`. The dashboard uses Server Components to call the telemetry service directly, providing real-time metrics without API overhead.

**Programmatic Access:**

If you need to access telemetry data programmatically, use the controller or service directly:

```typescript
import { telemetryController } from '@backend/modules/telemetry/telemetry.controller';

// From a Server Component or Server Action
const stats = await telemetryController.getTelemetryStats({ period: '24h' });
```

**Response Structure:**
```typescript
{
  period: '24h',
  stats: {
    totalRequests: 1234,
    cacheHitRate: 0.87,
    escalationRate: 0.08,
    totalCostUsd: 2.34,
    avgLatencyMs: 1250,
    p50LatencyMs: 1050,
    p95LatencyMs: 3200,
    avgCostPerRequest: 0.0019,
    costByProvider: { gemini: 1.80, groq: 0.54 },
    requestsByTaskType: { chat: 1100, filing_summary: 134 },
    avgConfidence: 0.913,
    lowConfidenceCount: 12
  },
  warnings: ["⚠️ P95 latency 7200ms > 7s target"]
}
```

### Cost Projections

**Calculation Method:**

```typescript
// Daily cost
dailyCost = (periodCost / periodHours) * 24

// Weekly cost
weeklyCost = (periodCost / periodHours) * 168

// Monthly cost
monthlyCost = (periodCost / periodHours) * 730

// Annual cost
annualCost = monthlyCost * 12
```

**Example (24h period, $2.50 cost):**
- Daily: $2.50
- Weekly: $17.50
- Monthly: $75.00 ⚠️ (Above $60 target)
- Annual: $900.00

### Performance Optimization Strategies

#### Improving Cache Hit Rate

**Target:** >85% (Current: 78%)

**Strategies:**
1. Increase cache TTL for stable data (filings: 30 days)
2. Pre-warm cache for popular queries
3. Implement query normalization (lowercase, trim)
4. Add fuzzy matching for similar queries

**Impact:** 85% hit rate saves ~$10-15/month

#### Reducing Escalation Rate

**Target:** <10% (Current: 12%)

**Strategies:**
1. Improve RAG context quality (better chunk retrieval)
2. Fine-tune confidence scoring thresholds
3. Add more examples to prompts
4. Use chain-of-thought prompting

**Impact:** 10% escalation saves ~$5-8/month

### Monitoring Best Practices

#### Daily Review (5 minutes)
- [ ] Check total daily cost (<$3 target)
- [ ] Review warning banner (resolve any issues)
- [ ] Check cache hit rate (>85%)
- [ ] Monitor escalation rate (<10%)

#### Weekly Review (15 minutes)
- [ ] Analyze 7-day trends
- [ ] Review cost projections
- [ ] Identify cost spikes
- [ ] Optimize high-cost queries

#### Monthly Review (30 minutes)
- [ ] Compare actual vs projected costs
- [ ] Calculate profit margins by tier
- [ ] Review user growth impact on costs
- [ ] Adjust pricing if needed

---

## API Reference

### AI Telemetry Functions

#### `logInference(log: Omit<InferenceLog, 'timestamp'>): void`

Log an AI inference event.

```typescript
logInference({
  model: 'gemini-2.0-flash-exp',
  provider: 'gemini',
  taskType: 'chat',
  tokens_in: 150,
  tokens_out: 250,
  latency_ms: 1250,
  confidence: 0.92,
  cost_usd: 0.000042,
  escalated: false,
  cache_hit: false,
});
```

#### `getTelemetryStats(periodHours?: number): TelemetryStats`

Get aggregated telemetry statistics for a time period.

**Parameters:**
- `periodHours` (optional): Time period in hours (default: 24)

**Returns:** `TelemetryStats` object

```typescript
const stats = getTelemetryStats(24);
console.log('Total cost:', stats.totalCostUsd);
console.log('Cache hit rate:', stats.cacheHitRate);
```

#### `getRecentLogs(limit?: number): InferenceLog[]`

Get recent inference logs.

**Parameters:**
- `limit` (optional): Maximum number of logs (default: 100)

**Returns:** Array of `InferenceLog`

```typescript
const recentLogs = getRecentLogs(50);
```

#### `clearLogs(): void`

Clear all in-memory telemetry logs (use with caution).

```typescript
clearLogs();
```

#### `checkMetricThresholds(stats: TelemetryStats): string[]`

Check if metrics violate thresholds and return warnings.

**Parameters:**
- `stats`: Telemetry statistics object

**Returns:** Array of warning messages

```typescript
const stats = getTelemetryStats();
const warnings = checkMetricThresholds(stats);
warnings.forEach(w => console.warn(w));
```

### Rate Limit Telemetry Functions

#### `recordRateLimit(provider: string, message: string): Promise<void>`

Record a rate limit event.

**Parameters:**
- `provider`: API provider name (e.g., 'alpha_vantage')
- `message`: Description of rate limit event

```typescript
await recordRateLimit('alpha_vantage', 'API rate limit exceeded');
```

---

## Testing

### Unit Testing with Mock Logger

```typescript
// __tests__/my-feature.test.ts
import { logInference } from '@lib/telemetry/ai-logger';

jest.mock('@lib/telemetry/ai-logger');

describe('Stock Sentiment Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log inference metrics', async () => {
    const result = await analyzeStockSentiment('AAPL', ['news1', 'news2']);

    expect(logInference).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.0-flash-exp',
        provider: 'gemini',
        taskType: 'news_sentiment',
        tokens_in: expect.any(Number),
        tokens_out: expect.any(Number),
        latency_ms: expect.any(Number),
        confidence: expect.any(Number),
        cost_usd: expect.any(Number),
      })
    );
  });

  it('should log errors', async () => {
    const mockError = new Error('API Error');
    jest.spyOn(global, 'fetch').mockRejectedValue(mockError);

    await expect(analyzeStockSentiment('AAPL', [])).rejects.toThrow();

    expect(logInference).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'API Error',
        cost_usd: 0,
      })
    );
  });
});
```

### Integration Testing

```typescript
// __tests__/telemetry.integration.test.ts
import { logInference, getTelemetryStats } from '@lib/telemetry/ai-logger';

describe('Telemetry Integration', () => {
  beforeEach(() => {
    clearLogs();
  });

  it('should track multiple inferences', () => {
    logInference({
      model: 'gemini-2.0-flash-exp',
      provider: 'gemini',
      taskType: 'chat',
      tokens_in: 100,
      tokens_out: 200,
      latency_ms: 1000,
      confidence: 0.9,
      cost_usd: 0.001,
      escalated: false,
      cache_hit: false,
    });

    const stats = getTelemetryStats();
    expect(stats.totalRequests).toBe(1);
    expect(stats.totalCostUsd).toBe(0.001);
  });
});
```

### Manual Testing Checklist

- [ ] AI inference logged correctly
- [ ] Token counts are accurate
- [ ] Cost calculations match actual API pricing
- [ ] Cache hits show zero tokens/cost
- [ ] Escalations are tracked
- [ ] Errors are logged without crashing
- [ ] Rate limits appear in logs/rate_limits.log
- [ ] Dashboard shows recent logs
- [ ] Metrics aggregate correctly over different periods
- [ ] Warnings appear when thresholds exceeded

---

## Troubleshooting

### Issue: No logs appearing in dashboard

**Symptoms:** Dashboard shows zero requests

**Possible Causes:**
1. `logInference()` not being called
2. Code path not executing
3. Exceptions thrown before logging

**Solution:**
```typescript
// Add debug logging
console.log('About to call AI...');
const result = await callAI(prompt);
console.log('AI call completed, logging...');
logInference({ /* ... */ });
console.log('Telemetry logged');
```

### Issue: Token counts are zero

**Symptoms:** `tokens_in` and `tokens_out` always 0

**Solution:**
```typescript
// Use actual counts from API response
const tokensIn = result.usageMetadata?.promptTokenCount || 0;
const tokensOut = result.usageMetadata?.candidatesTokenCount || 0;
```

### Issue: Costs appear incorrect

**Symptoms:** Costs don't match expectations

**Solution:**
```typescript
import { calculateCost } from '@lib/ai/cost-calculator';

const cost = calculateCost(
  'gemini-2.0-flash-exp',
  tokensIn,
  tokensOut
);
```

### Issue: Rate limit logs not appearing

**Solution:**
```bash
# Create logs directory
mkdir -p logs

# Always await recordRateLimit
await recordRateLimit('provider', 'message');
```

### Issue: Dashboard shows "Cache hit rate 0%"

**Solution:**
```typescript
// Ensure cache_hit is set correctly
const cached = await getFromCache(key);
if (cached) {
  logInference({
    cache_hit: true,  // Must be true!
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
  });
}
```

---

## Advanced Topics

### Cost-Aware Feature Toggles

```typescript
import { getTelemetryStats } from '@lib/telemetry/ai-logger';

export async function shouldEnableFeature(featureName: string): Promise<boolean> {
  const stats = getTelemetryStats(24);
  const dailyBudget = 5.0; // $5/day

  if (stats.totalCostUsd > dailyBudget) {
    const nonEssentialFeatures = ['advanced_analysis', 'detailed_summaries'];
    return !nonEssentialFeatures.includes(featureName);
  }

  return true;
}
```

### Adaptive Model Selection

```typescript
import { getTelemetryStats } from '@lib/telemetry/ai-logger';

export function selectModelBasedOnPerformance() {
  const stats = getTelemetryStats(1); // Last hour

  // If cache hit rate is low, prefer cheaper model
  if (stats.cacheHitRate < 0.5) {
    return 'gemini-2.0-flash-exp';
  }

  // If escalation rate is high, use Pro model directly
  if (stats.escalationRate > 0.2) {
    return 'gemini-2.0-pro-exp';
  }

  return 'gemini-2.0-flash-exp';
}
```

### Daily Cost Alerts

```typescript
import { getTelemetryStats } from '@lib/telemetry/ai-logger';

export async function checkDailyCosts() {
  const stats = getTelemetryStats(24);
  const dailyBudget = 10.0;

  if (stats.totalCostUsd > dailyBudget * 0.9) {
    await sendAlert({
      type: 'warning',
      message: `AI costs at ${(stats.totalCostUsd / dailyBudget * 100).toFixed(1)}% of budget`,
      cost: stats.totalCostUsd,
      projectedMonthly: stats.totalCostUsd * 30,
    });
  }
}
```

### Custom Metrics

```typescript
export function calculateCustomMetrics(logs: InferenceLog[]) {
  // Cost per task type
  const costByTask = logs.reduce((acc, log) => {
    acc[log.taskType] = (acc[log.taskType] || 0) + log.cost_usd;
    return acc;
  }, {} as Record<string, number>);

  // Success rate
  const successRate = logs.filter(l => !l.error).length / logs.length;

  // Average confidence by task
  const avgConfidenceByTask = Object.fromEntries(
    Object.entries(
      logs.reduce((acc, log) => {
        if (!acc[log.taskType]) acc[log.taskType] = { sum: 0, count: 0 };
        acc[log.taskType].sum += log.confidence;
        acc[log.taskType].count++;
        return acc;
      }, {})
    ).map(([task, { sum, count }]) => [task, sum / count])
  );

  return { costByTask, successRate, avgConfidenceByTask };
}
```

---

## Example Telemetry Logs

```
🤖 AI Log: gemini/gemini-2.0-flash-exp | chat | 1250ms | 0.0042¢ | conf:0.92 | FRESH
🤖 AI Log: gemini/gemini-2.0-pro-exp | chat | 2100ms | 0.0380¢ | conf:0.88 | ESCALATED
🤖 AI Log: groq/llama3-groq-70b-8192 | filing_summary | 450ms | 0.0018¢ | conf:0.95 | FRESH
🤖 AI Log: gemini/gemini-2.0-flash-exp | chat | 120ms | 0.0000¢ | conf:0.92 | CACHE HIT
```

---

## Related Documentation

- **AI Router:** [lib/ai/README.md](../lib/ai/README.md) - AI system architecture
- **Admin Dashboard:** [app/(dashboard)/admin/README.md](../app/(dashboard)/admin/README.md) - Dashboard features
- **AI Strategy:** [docs/AI_MODEL_STRATEGY.md](./AI_MODEL_STRATEGY.md) - Model selection strategy
- **Telemetry Logger:** [lib/telemetry/ai-logger.ts](../lib/telemetry/ai-logger.ts) - Source code

---

## Summary

This guide covered:

1. **Quick Start** - 5-minute integration guide
2. **Core Concepts** - InferenceLog interface, metrics, task types
3. **Integration Patterns** - 6 common patterns with code examples
4. **Best Practices** - 8 key practices for accurate telemetry
5. **Monitoring** - Dashboard features, API endpoints, optimization strategies
6. **API Reference** - Complete function documentation
7. **Testing** - Unit and integration testing approaches
8. **Troubleshooting** - Common issues and solutions
9. **Advanced Topics** - Cost-aware features, adaptive selection, custom metrics

### Quick Reference

```typescript
// Log AI inference
import { logInference } from '@lib/telemetry/ai-logger';
logInference({
  model: 'gemini-2.0-flash-exp',
  provider: 'gemini',
  taskType: 'chat',
  tokens_in: 150,
  tokens_out: 250,
  latency_ms: 1250,
  confidence: 0.92,
  cost_usd: 0.000042,
  escalated: false,
  cache_hit: false,
});

// Get statistics
import { getTelemetryStats } from '@lib/telemetry/ai-logger';
const stats = getTelemetryStats(24);

// Record rate limit
import { recordRateLimit } from '@lib/metrics';
await recordRateLimit('alpha_vantage', 'Rate limit exceeded');

// View dashboard: /dashboard/costs
```

---

**Questions or Issues?**

1. Check the troubleshooting section
2. Review code examples in this guide
3. Consult existing telemetry code
4. Ask in the development team chat

Happy tracking!

---

*Last updated: November 26, 2025*
*Consolidated from lib/ai/README.md and app/(dashboard)/admin/README.md*
