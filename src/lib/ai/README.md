# AI Model Router Implementation

**Status:** ✅ **Implemented** (November 20, 2025)
**Architecture:** Confidence-based routing with Groq + Gemini
**Strategy Document:** [docs/AI_MODEL_STRATEGY.md](../../docs/AI_MODEL_STRATEGY.md)

---

## Overview

This implementation provides a production-ready AI routing system that:
- Uses **Groq GPT-OSS 20B** for bulk processing (SEC filings, news, sentiment)
- Uses **Gemini Flash/Pro** for interactive chat with confidence-based escalation
- Tracks costs and performance metrics via telemetry logging
- Implements aggressive caching to meet budget targets ($35-78/month)

---

## File Structure

```
lib/ai/
├── groq.ts                    # Groq service for bulk processing
├── gemini.ts                  # Gemini service for chat
├── confidence-router.ts       # Confidence-based routing logic
├── router.ts                  # Legacy tier-based router (deprecated)
└── README.md                  # This file

lib/telemetry/
└── ai-logger.ts               # Telemetry tracking for costs/metrics

app/api/ai/
├── chat/route.ts              # Chat endpoint with confidence routing
├── generate/route.ts          # Legacy Gemini endpoint (uses old router)
└── telemetry/ai/route.ts      # Telemetry stats API
```

---

## Usage

### 1. Investor Chat (Interactive)

**Use the confidence-based router for RAG-powered chat:**

```typescript
import { routeQueryWithConfidence } from '@lib/ai/confidence-router';

const response = await routeQueryWithConfidence({
  userMessage: 'What are TSLA risk factors?',
  ragContext: '[Chunk 1] TSLA 10-K Item 1A: Risk factors include...',
  portfolio: {
    symbols: ['TSLA', 'AAPL'],
    totalValue: 50000,
  },
});

console.log(response.text);          // AI answer
console.log(response.confidence);    // 0-1 confidence score
console.log(response.escalated);     // true if escalated to Gemini Pro
console.log(response.cost);          // Cost in USD
console.log(response.sources);       // Cited sources [Chunk 1], [Chunk 2], etc.
```

**API endpoint:**

```bash
POST /api/ai/chat
Content-Type: application/json

{
  "message": "What are TSLA risk factors?",
  "ragContext": "[Chunk 1] TSLA 10-K Item 1A: ...",
  "portfolio": {
    "symbols": ["TSLA", "AAPL"],
    "totalValue": 50000
  }
}

# Response:
{
  "text": "TSLA's main risks include...",
  "confidence": 0.92,
  "model": "gemini-2.0-flash-exp",
  "sources": ["[Chunk 1]", "[Chunk 2]"],
  "escalated": false,
  "cost": 0.000042,
  "cached": false
}
```

---

### 2. Bulk Processing (SEC Filings, News)

**Use Groq directly for deterministic batch tasks:**

```typescript
import { summarizeFiling, analyzeNewsSentiment } from '@lib/ai/groq';

// Summarize SEC filing chunks
const summary = await summarizeFiling(
  chunks,                // string[] of filing chunks
  '10-K',                // Filing type
  'Tesla Inc.'           // Company name
);

// Analyze news sentiment
const sentiment = await analyzeNewsSentiment(
  articles,              // Array of { headline, summary, source }
  'TSLA'                 // Stock symbol
);

console.log(sentiment.sentiment);    // 'positive' | 'neutral' | 'negative'
console.log(sentiment.keyPoints);    // ['...', '...', '...']
console.log(sentiment.relevance);    // 0.0 - 1.0
```

---

### 3. Telemetry Tracking

**For comprehensive telemetry integration guide, see:** [docs/TELEMETRY_INTEGRATION.md](../../docs/TELEMETRY_INTEGRATION.md)

**Quick example:**

```typescript
import { logInference } from '@lib/telemetry/ai-logger';

// Log AI inference
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
const stats = getTelemetryStats();

// View dashboard: /dashboard/costs
```

---

## Environment Variables

**Required:**

```bash
# Groq (bulk processing)
GROQ_API_KEY=gsk_...

# Google Gemini (chat)
GEMINI_API_KEY=AIza...
# OR use legacy key
AI_API_KEY=AIza...
```

**Get API keys:**
- Groq: https://console.groq.com
- Google Gemini: https://ai.google.dev

---

## Confidence-Based Routing Logic

**Decision flow (from AI_MODEL_STRATEGY.md):**

```
1. User asks question → Retrieve RAG context
   ↓
2. Call primary model (Gemini Flash) with temp=0.3
   ↓
3. Extract confidence score + validate numeric claims
   ↓
4. IF confidence ≥0.85:
     → Accept and cache for 12-24 hours ✅
   ↓
5. ELSE IF 0.6 ≤ confidence <0.85:
     → Escalate to Gemini Pro (temp=0.0) ⬆️
     → Re-run and accept if improved
   ↓
6. ELSE IF confidence <0.6:
     → Escalate to Gemini Pro
     → Flag for manual review ⚠️
   ↓
7. Log all escalations for feedback loop
```

**Confidence scoring:**

```typescript
function estimateConfidence(response: string, context: string): number {
  let score = 0.5; // baseline

  // Boost confidence if:
  if (hasCitations)        score += 0.2;  // [Chunk 1], (per TSLA 10-K)
  if (hasSpecificNumbers)  score += 0.15; // $2.3B, 25%, etc.
  if (hasCoherentReasoning) score += 0.15; // >100 chars, not truncated
  if (hasMultipleSources)  score += 0.1;  // ≥3 chunk citations

  // Reduce confidence if:
  if (hasUncertainty)      score -= 0.2;  // "I think", "maybe", "possibly"
  if (missingContext)      score -= 0.15; // context <100 chars
  if (hasContradictions)   score -= 0.1;  // "however", "but" with short text

  return Math.max(0, Math.min(1, score));
}
```

---

## Migration from Old Router

**The old tier-based router (`lib/ai/router.ts`) is deprecated.**

**Changes:**

| Old (Tier-Based) | New (Confidence-Based) |
|------------------|------------------------|
| `routeQuery(query, 'tier1')` | `routeQueryWithConfidence({ userMessage: query })` |
| 3 tiers (tier1, tier2, tier3) | Confidence thresholds (0.85, 0.60) |
| OpenRouter models (DeepSeek, Qwen, Llama) | Groq (bulk) + Gemini (chat) |
| Query-based tier selection | Confidence-based escalation |

**To migrate:**

1. Replace `import { routeQuery } from '@lib/ai/router'` with:
   ```typescript
   import { routeQueryWithConfidence } from '@lib/ai/confidence-router';
   ```

2. Update function calls:
   ```typescript
   // Old
   const { tier, model } = routeQuery(query, 'tier1');

   // New
   const response = await routeQueryWithConfidence({
     userMessage: query,
     ragContext: context,
   });
   ```

3. The old `/api/ai/generate` route still uses the old router. **TODO: Migrate to confidence router.**

---

## Next Steps

**Phase 1: Core Infrastructure** ✅ (Week 1-2)
- [x] Install Groq SDK
- [x] Create Groq service (`lib/ai/groq.ts`)
- [x] Create Gemini service (`lib/ai/gemini.ts`)
- [x] Implement confidence-based router (`lib/ai/confidence-router.ts`)
- [x] Add telemetry logging (`lib/telemetry/ai-logger.ts`)
- [x] Create chat API endpoint (`app/api/ai/chat/route.ts`)
- [x] Create telemetry API endpoint (`app/api/telemetry/ai/route.ts`)

**Phase 2: SEC Filing Ingestion** (Week 2-3)
- [ ] Implement EDGAR fetcher (`lib/api/secEdgar.ts` - basic exists, needs enhancement)
- [ ] Build PDF/HTML preprocessor (`lib/preprocessing/filings.ts`)
- [ ] Create chunking utility (`lib/preprocessing/chunker.ts`)
- [ ] Integrate Groq for summarization
- [ ] Set up Redis caching (`lib/cache/redis.ts`)

**Phase 3: Embeddings & RAG** (Week 3-4)
- [ ] Implement embedding service (`lib/ai/embeddings.ts`)
- [ ] Integrate FAISS (`lib/vector/faiss.ts`)
- [ ] Build lazy indexing pipeline
- [ ] Test semantic search with sample queries

**Phase 4: News Pipeline** (Week 4-5)
- [ ] Aggregate news sources (Finnhub already integrated at `lib/dao/finnhub.dao.ts`)
- [ ] Build batch sentiment pipeline (`scripts/batch-news.ts`)
- [ ] Set up cron jobs (8am, 12pm, 6pm ET)
- [ ] Test news digests with cache

**Phase 5: UI Integration** (Week 5-6)
- [ ] Update StonksAI component to use new chat endpoint
- [ ] Build cost tracking dashboard
- [ ] Add confidence indicators in UI
- [ ] Display cited sources

**Phase 6: Monitoring** (Week 6+)
- [ ] Implement Slack/email alerts for metric thresholds
- [ ] Create admin dashboard for telemetry
- [ ] Add user feedback collection (thumbs up/down)
- [ ] Build feedback loop for model tuning

---

## Testing

**Test Groq integration:**

```bash
npx tsx scripts/test-groq.ts
```

**Test Gemini integration:**

```bash
npx tsx scripts/test-gemini.ts
```

**Test confidence router:**

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are TSLA risk factors?",
    "ragContext": "[Chunk 1] TSLA 10-K Item 1A: Risk factors include regulatory compliance..."
  }'
```

**Check telemetry:**

```bash
curl http://localhost:3000/api/telemetry/ai?period=1h
```

---

## Architecture Diagrams

### Two-Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PIPELINE A: Batch Processing (NO RAG)                      │
│                                                              │
│  SEC EDGAR → Preprocess → Chunk → Groq Summarize → Cache   │
│  News APIs → Preprocess → Chunk → Groq Sentiment → Cache   │
│                                                              │
│  ❌ NO embeddings   ❌ NO vector DB   ✅ Fast & cheap       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PIPELINE B: Investor Chat (YES RAG)                        │
│                                                              │
│  User Question → Lazy Index (S3 chunks → Embed → FAISS)    │
│               → Retrieve top-k chunks                       │
│               → Gemini Flash (confidence-based)             │
│               → Escalate to Pro if needed                   │
│               → Cache answer                                │
│                                                              │
│  ✅ Embeddings only for chat   ✅ Lazy indexing   ✅ Cited  │
└─────────────────────────────────────────────────────────────┘
```

### Confidence-Based Routing Flow

```
User Question
    ↓
Check Cache (12h TTL)
    ↓ (miss)
Retrieve RAG Context (if available)
    ↓
Call Gemini Flash (temp=0.3)
    ↓
Confidence ≥0.85?
    ├─ YES → Accept & Cache ✅
    └─ NO → Confidence ≥0.60?
            ├─ YES → Escalate to Gemini Pro ⬆️
            │        (temp=0.0, retry)
            │        ↓
            │    Improved? → Accept & Cache ✅
            │        ↓
            │    Still low? → Flag for review ⚠️
            └─ NO → Escalate to Gemini Pro ⬆️
                    Flag for review ⚠️
```

---

## References

- **[Telemetry Integration Guide](../../docs/TELEMETRY_INTEGRATION.md)** - Complete telemetry developer guide
- **AI Strategy:** [docs/AI_MODEL_STRATEGY.md](../../docs/AI_MODEL_STRATEGY.md)
- **System Design:** [docs/retail_stock_ai_pipeline_system_design_recommendations.md](../../docs/retail_stock_ai_pipeline_system_design_recommendations.md)
- **Groq Docs:** https://console.groq.com/docs
- **Google Gemini Docs:** https://ai.google.dev/docs
- **FAISS:** https://github.com/facebookresearch/faiss

---

*Last updated: November 26, 2025*
*Implemented by: Claude (AI Assistant)*
