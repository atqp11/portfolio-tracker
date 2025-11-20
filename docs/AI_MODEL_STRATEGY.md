# AI Model Strategy & Implementation Guide

**Created:** November 20, 2025
**Updated:** November 20, 2025 (Aligned with System Design)
**Budget Target:** $35-60/month (inference only)
**Architecture:** Cloud-based hybrid RAG pipeline
**Core Feature:** Personal AI stock research agent with SEC filing analysis, news sentiment, and emotional support

---

## 🔄 Strategy Overview

This document consolidates the AI model strategy for a retail stock portfolio tracker serving **1,000 users** covering up to **500 stocks**. The architecture is **cloud-first** with no local GPU requirements.

### System Architecture

**Two distinct pipelines:**

#### Pipeline A: Batch Processing (NO RAG)
```
┌──────────────────────────────────────────────────────────────┐
│  INGESTION: SEC EDGAR Filings + News + Social Media         │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│  PREPROCESSING: PDF/HTML → Clean Text → Chunk (1k tokens)   │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│  BULK INFERENCE: Groq GPT-OSS 20B (summarization)           │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│  CACHE: Redis (summaries) + S3 (raw chunks as TEXT)         │
└──────────────────────────────────────────────────────────────┘
```

**❌ NO embeddings, NO vector DB in batch pipeline**

#### Pipeline B: Investor Chat (YES RAG)
```
┌──────────────────────────────────────────────────────────────┐
│  USER QUESTION: "What are TSLA risk factors?"                │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│  LAZY INDEXING: Load chunks from S3 → Embed → Index FAISS   │
│  (Only if not already indexed)                               │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│  RAG RETRIEVAL: top-k=8 relevant chunks from vector DB       │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│  CHAT INFERENCE: Gemini Flash → Gemini Pro (if low conf)    │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│  CACHE: Redis (RAG answers, 12-24h TTL)                     │
└──────────────────────────────────────────────────────────────┘
```

**✅ Embeddings only for chat queries (90% cost savings)**

### Key Design Decisions

**1. Cloud-Only Architecture**
- ✅ No local GPU required
- ✅ Serverless-ready (Vercel, AWS Lambda, Cloud Run)
- ✅ Scales horizontally with demand
- ✅ Managed infrastructure (Groq, Together AI, Google Vertex)

**2. Task-Specific Model Selection**
- SEC filings: Groq GPT-OSS 20B (fast, cheap bulk processing)
- News/social: Groq GPT-OSS 20B (batch 3×/day)
- User chat: Gemini Flash (low latency, good quality)
- Escalation: Gemini Pro (high confidence required)

**3. Aggressive Caching Strategy**
- Filing summaries: 30 days TTL
- News digests: 24-72 hours TTL
- RAG answers: 12-24 hours TTL (query hash keyed)
- Target >85% cache hit rate

**4. Confidence-Based Fallbacks**
- confidence ≥0.85 → accept and cache
- 0.6 ≤ confidence <0.85 → escalate to higher model
- confidence <0.6 → escalate to premium (Gemini Pro/GPT-4.1)

---

## 📊 Model Recommendation Table

| Task | Primary Model | Quality | Monthly Cost | Fallback 1 | Fallback 2 | Cache TTL |
|------|---------------|--------:|-------------:|-----------|-----------|----------:|
| **SEC filing extraction** | Groq GPT-OSS 20B | 9.0/10 | $1.8-2.5 | Qwen 14B (Together) | DeepSeek 14B | 30 days |
| **Filing long summary** | Groq GPT-OSS 20B | 8.7/10 | (included) | Qwen 20B | DeepSeek 20B | 30 days |
| **News summarization** | Groq GPT-OSS 20B | 9.2/10 | $6-8 | Together Qwen 14B | DeepSeek 14B | 24-72 hrs |
| **Social sentiment** | Groq GPT-OSS 20B | 9.2/10 | $4-5 | DeepSeek 14B | Qwen 14B | 24 hrs |
| **KPI / numeric parsing** | Groq / XBRL pipeline | 9.0/10 | $2-4 | Gemini Flash | Gemini Pro | persistent JSON |
| **Investor chat (RAG)** | Gemini Flash | 9.0/10 | $15-30 | Gemini Pro | OpenAI GPT-4.1 | 12-24 hrs |

### Total Monthly Cost Estimate

```
Bulk Processing (SEC filings, news, social):   $12-19/month
Chat & RAG (investor queries):                  $15-30/month
KPI extraction & parsing:                        $2-4/month
────────────────────────────────────────────────────────────
Total Inference Cost:                           $29-53/month

Additional infrastructure:
- Vector DB (FAISS/Pinecone, lazy indexed):      $0-10/month
- Object storage (S3/GCS):                       $2-5/month
- Redis cache:                                   $5-10/month
────────────────────────────────────────────────────────────
Total Operations Cost:                          $36-78/month
```

**Budget target met:** ✅ Within $35-100/month range

**Cost savings from lazy indexing:**
- Vector DB: $0-10/month (was $0-30/month) - **67% savings**
- Only index ~10-20% of filings (those actively queried)
- LRU eviction keeps vector DB small and fast

---

## 🎯 Core Requirements

### User Base & Scale
- **Users:** 1,000 retail investors
- **Stocks per user:** Up to 50 stocks
- **Total universe:** Max 500 unique stocks
- **Ingestion cadence:**
  - SEC filings: ~100/day (lazy load on-demand)
  - News/social: Batch 3×/day for 500 stocks

### Primary Tasks

**1. SEC Filing Analysis**
- Extract and summarize 10-K, 10-Q, 8-K, 13F filings
- Parse structured KPIs (revenue, earnings, guidance)
- Identify material risks and changes
- Lazy load (only fetch when user requests specific filing)

**2. News & Social Sentiment**
- Aggregate news from multiple sources (Finnhub, Brave, NewsAPI)
- Batch sentiment analysis 3×/day
- Deduplicate and rank by relevance
- Cache digests for quick retrieval

**3. Portfolio Chat (RAG)**
- Answer user questions using cached summaries
- Retrieve relevant filing chunks for evidence
- Provide personalized advice with emotional support
- Escalate to premium models when confidence is low

**4. KPI Extraction**
- Parse XBRL numeric facts
- Extract tables from PDFs/HTML
- Validate against expected ranges
- Store as queryable JSON

---

## 💰 Detailed Cost Analysis

### Groq GPT-OSS 20B (Primary Bulk Model)

**Pricing:** $0.10 input, $0.10 output per 1M tokens

**Use cases:**
- SEC filing extraction
- Long-form summarization
- News batch processing
- Social sentiment analysis

**Monthly usage estimate (500 stocks):**
- SEC filings: ~100 filings/day × 10k avg tokens = 30M tokens/month
  - Cost: 30M × $0.10 = $3.00/month
- News summaries: 500 stocks × 3 batches/day × 2k avg tokens = 90M tokens/month
  - Cost: 90M × $0.10 = $9.00/month
- Social sentiment: 500 stocks × 3 batches/day × 1k avg tokens = 45M tokens/month
  - Cost: 45M × $0.10 = $4.50/month

**Total Groq cost:** ~$16.50/month

**Why Groq for bulk:**
- ✅ Extremely fast (800+ tokens/second)
- ✅ Cost-effective for high-volume processing
- ✅ Quality is 9/10 for summarization tasks
- ✅ Free tier available for testing

### Gemini Flash (Primary Chat Model)

**Pricing:** $0.0375 input, $0.15 output per 1M tokens (Flash-8B)
**Pricing:** $0.075 input, $0.30 output per 1M tokens (Flash)

**Use cases:**
- User-facing chat (RAG-based investor questions)
- Quick clarifications
- Portfolio optimization suggestions
- Emotional support conversations

**Monthly usage estimate (1,000 users):**
- Avg 50 queries/user/month × 1,000 users = 50k queries/month
- Avg 800 tokens/query (500 input RAG context + 300 output)
- Total: 50k × 800 = 40M tokens/month
  - Input: 25M × $0.075 = $1.875
  - Output: 15M × $0.30 = $4.50
  - **Total: ~$6.40/month**

**With aggressive caching (85% hit rate):**
- Only 15% of queries hit API: ~$1.00/month

**Why Gemini Flash for chat:**
- ✅ Low latency (500-800ms)
- ✅ High quality (9/10 for conversational AI)
- ✅ Built-in safety filters
- ✅ Good at empathetic responses

### Gemini Pro (Escalation Model)

**Pricing:** $1.25 input, $5.00 output per 1M tokens

**Use cases:**
- Low-confidence chat responses
- Complex multi-step reasoning
- Thesis validation requiring deep analysis
- User explicitly requests "deep dive"

**Monthly usage estimate:**
- ~5% of chat queries need escalation = 2,500 queries/month
- Avg 1,200 tokens/query (800 input RAG + 400 output)
- Total: 2,500 × 1,200 = 3M tokens/month
  - Input: 2M × $1.25 = $2.50
  - Output: 1M × $5.00 = $5.00
  - **Total: ~$7.50/month**

### Fallback Models (Rarely Used)

**Together AI (Qwen 14B/20B):**
- Pricing: $0.20 input, $0.20 output per 1M tokens
- Use: When Groq experiences outages (<1% of time)
- Expected cost: <$1/month

**DeepSeek 14B/20B:**
- Pricing: $0.14 input, $0.28 output per 1M tokens
- Use: Alternative fallback for bulk processing
- Expected cost: <$0.50/month

**OpenAI GPT-4.1 (Last Resort):**
- Pricing: $5.00 input, $15.00 output per 1M tokens
- Use: Absolute last resort when all else fails
- Expected cost: <$2/month (very rare)

---

## 🏗️ SEC Filings Ingestion Pipeline

### ⚠️ Important: RAG vs Non-RAG Workflows

**RAG is ONLY used for investor chat Q&A, NOT for batch filing summarization.**

Following best practices:
- ✅ Filing summaries: Deterministic batch processing (NO RAG)
- ✅ News/social: Batch sentiment (NO RAG)
- ✅ KPI extraction: Structured parsing (NO RAG)
- ✅ **Investor chat: Context-aware Q&A (YES RAG)**

### Workflow: Filing Ingestion (NO RAG - Batch Processing)

```
1. User requests filing (e.g., "Show me TSLA 10-K 2024")
   ↓
2. Check cache: filing_summary:{CIK}:{filing_type}:{period}
   ↓ (cache miss)
3. Fetch from EDGAR API → Store raw PDF/HTML in S3
   ↓
4. Preprocess: pdftotext or BeautifulSoup → Clean text
   ↓
5. Chunk: ~1,000 tokens per chunk, 150-250 token overlap
   ↓
6. Run Groq GPT-OSS 20B summarization on chunks
   ↓
7. Cache summary as TEXT in Redis (30 day TTL)
   ↓
8. Store chunks as TEXT in S3 (for future RAG indexing if needed)
   ↓
9. Return summary to user
```

**Key points:**
- ❌ NO embeddings computed during batch processing
- ❌ NO vector DB writes during summarization
- ✅ Chunks stored as plain text for later RAG indexing
- ✅ Summary cached as text in Redis

### Workflow: RAG Indexing (Selective - Only for Chat)

**Only index filings that users actively query:**

```
1. User asks: "What are TSLA risk factors?"
   ↓
2. Check if TSLA 10-K chunks are indexed in vector DB
   ↓ (not indexed yet)
3. Load chunks from S3 (stored during batch processing)
   ↓
4. Compute embeddings (bge-base) for TSLA 10-K chunks
   ↓
5. Index in FAISS with metadata
   ↓
6. Retrieve top-k relevant chunks for user question
   ↓
7. Build RAG prompt → Gemini Flash → Answer
```

**Lazy indexing benefits:**
- ✅ Only embed what users actually query (90% cost savings)
- ✅ Faster batch processing (no embedding overhead)
- ✅ Smaller vector DB (only "hot" filings indexed)

### Chunking Strategy

**Target chunk size:** 1,000 tokens (~750 words)
**Overlap:** 150-250 tokens (prevents context loss at boundaries)

**Chunk metadata (stored as TEXT in S3):**
```typescript
interface FilingChunk {
  chunk_id: string;
  filing_id: string;
  cik: string;
  company_name: string;
  filing_type: string; // '10-K', '10-Q', '8-K', '13F'
  period_end: string;
  section: string; // 'Item 1A Risk Factors', 'MD&A', etc.
  token_range: [number, number];
  text: string;
  // NO embedding field - computed on-demand for RAG only
}
```

**Vector DB entry (only for RAG-indexed chunks):**
```typescript
interface IndexedChunk extends FilingChunk {
  embedding: number[]; // 768-dim vector (bge-base)
  indexed_at: Date;
  last_accessed: Date; // For LRU eviction
}
```

**Section preservation:**
- Keep section headings intact
- Don't split mid-sentence
- Preserve table structures when possible

### Numeric KPI Extraction

**Two-pass approach:**

1. **XBRL parsing** (structured data):
   ```typescript
   interface KPI {
     ticker: string;
     period_end: string;
     revenue: number | null;
     net_income: number | null;
     total_assets: number | null;
     total_liabilities: number | null;
     eps: number | null;
     guidance: string | null;
   }
   ```

2. **Regex extraction** (unstructured tables):
   - Extract tables from HTML/PDF
   - Parse rows with numeric patterns
   - Validate against expected ranges
   - Flag inconsistencies for manual review

**Storage:**
- Persist as JSON in database
- Index for fast lookup by ticker + period
- Never expires (historical data)

---

## 📰 News & Social Sentiment Pipeline

### News Ingestion Workflow

```
1. Cron job runs 3×/day (8am, 12pm, 6pm ET)
   ↓
2. Fetch news for 500 stocks from:
   - Finnhub (company news)
   - Brave Search (recent articles)
   - NewsAPI (headlines)
   ↓
3. Deduplicate by URL + content similarity
   ↓
4. Preprocess: Clean HTML, extract text, normalize
   ↓
5. Chunk into 2k token blocks
   ↓
6. Batch process with Groq GPT-OSS 20B:
   - Sentiment (positive/neutral/negative)
   - Key points (3-5 bullet summary)
   - Relevance score (0-1)
   ↓
7. Store digests: news:{ticker}:{run_timestamp}
   ↓
8. Cache TTL: 24-72 hours
```

### Social Sentiment (Twitter/Reddit/StockTwits)

**Simpler pipeline:**
```
1. Collect mentions for 500 stocks (via APIs or scraping)
2. Filter spam/bots
3. Aggregate sentiment with Groq GPT-OSS 20B
4. Store: social:{ticker}:{run_timestamp}
5. Cache TTL: 6-24 hours (shorter, more volatile)
```

### Deduplication Strategy

**Content-based:**
```typescript
function deduplicateNews(articles: Article[]): Article[] {
  const seen = new Set<string>();

  return articles.filter(article => {
    // Hash URL
    const urlHash = hashString(article.url);
    if (seen.has(urlHash)) return false;

    // Hash first 200 chars of content (for rewrites)
    const contentHash = hashString(article.content.slice(0, 200));
    if (seen.has(contentHash)) return false;

    seen.add(urlHash);
    seen.add(contentHash);
    return true;
  });
}
```

---

## 🔍 RAG (Retrieval-Augmented Generation)

### ⚠️ RAG Scope: Investor Chat ONLY

**Where RAG is needed:**
- ✅ Investor chat Q&A ("Why did NVDA drop?" "What are TSLA risk factors?")
- ✅ Portfolio-aware insights ("Analyze my holdings")
- ✅ Multi-filing comparisons ("Compare AAPL margins last 3 years")
- ✅ Context-heavy questions requiring evidence

**Where RAG is NOT needed:**
- ❌ Filing summarization (batch processing)
- ❌ News/social sentiment (batch processing)
- ❌ KPI extraction (structured parsing)

**Why this matters:**
- 50-80% cheaper (shorter reasoning, fewer tokens)
- Avoids hallucinations (cites actual filing text)
- Supports citations (chunk IDs, section references)
- Enables portfolio personalization

### Embedding Model Selection

**Options:**
- `bge-base-en-v1.5` (768-dim, fast, good quality) ⭐ **Recommended**
- `all-mpnet-base-v2` (768-dim, sentence transformers)
- `intfloat/e5-large` (1024-dim, higher quality, slower)

**Embedding API:**
- HuggingFace Inference API (free tier: 30k requests/month)
- Together AI (embedding endpoint)
- OpenAI text-embedding-3-small ($0.02/1M tokens)

### Vector Store: FAISS (Lazy Indexing)

**Index type:** `IndexHNSWFlat` (Hierarchical Navigable Small World)
- Fast approximate nearest neighbor search
- Good recall at scale
- In-memory or persisted to disk

**Lazy indexing strategy:**
- ❌ DON'T index all 500 stocks × 10 filings = 500k vectors upfront
- ✅ DO index only filings users actively query (~10-20% of total)
- ✅ Cache hot filings, evict cold ones (LRU)

**Realistic vector DB size (with lazy indexing):**
- 50 stocks × 10 filings × 100 chunks = ~50k vectors (10% of total)
- FAISS in-memory: ~400MB RAM (768-dim float32)
- Pinecone free tier: ✅ More than sufficient
- Cost: $0-10/month (vs $30/month if indexing everything)

**Alternative (managed):**
- Pinecone (free tier: 1M vectors, 5GB storage)
- Weaviate (open-source, self-hosted)
- Chroma (embedded vector DB)

### Retrieval Strategy (Chat Only)

**Query flow:**
```typescript
async function retrieveContext(
  userQuery: string,
  symbols: string[], // User's portfolio holdings
  topK: number = 8
): Promise<IndexedChunk[]> {
  // 1. Embed user query
  const queryEmbedding = await embedText(userQuery);

  // 2. Filter by user's portfolio symbols (if relevant)
  const filter = symbols.length > 0 ? { cik: symbols } : null;

  // 3. Search vector DB with filter
  const results = await faissIndex.search(queryEmbedding, topK, filter);

  // 4. Re-rank with cross-encoder (optional, for edge cases)
  if (results.some(r => r.score < 0.75)) {
    results = await rerank(results, userQuery);
  }

  return results;
}
```

**topK tuning:**
- Simple questions: topK = 5-8 (faster, sufficient)
- Evidence-heavy questions: topK = 10-12 (more thorough)
- Re-ranker: Use only when top result score <0.75

---

## 🧠 Confidence-Based Routing Logic

### Confidence Scoring Mechanics

```typescript
interface ConfidenceScore {
  result: string;
  confidence: number; // 0.0 - 1.0
  reasoning_tokens: number;
  sources_cited: string[];
}

function calculateConfidence(response: LLMResponse): number {
  let score = 0.5; // baseline

  // Boost confidence if:
  if (response.has_chain_of_thought) score += 0.2;
  if (response.cites_specific_numbers) score += 0.15;
  if (response.reasoning_coherent) score += 0.15;
  if (response.sources.length >= 3) score += 0.1;

  // Reduce confidence if:
  if (response.contains(/I think|maybe|possibly/i)) score -= 0.2;
  if (response.missing_context) score -= 0.15;
  if (response.contradictory_statements) score -= 0.3;

  return Math.max(0, Math.min(1, score));
}
```

### Decision Flow (Per Query)

```
1. User asks question → Retrieve top-k evidence from vector DB
   ↓
2. Assemble RAG prompt with retrieved chunks
   ↓
3. Call primary model (Gemini Flash) with temperature=0.0
   ↓
4. Extract confidence score + validate numeric claims
   ↓
5. IF confidence ≥0.85 AND numeric claims match:
     → Accept and cache for 12-24 hours
   ↓
6. ELSE IF 0.6 ≤ confidence <0.85:
     → Escalate to Gemini Pro
     → Re-run and accept if improved
   ↓
7. ELSE IF confidence <0.6 OR numeric mismatch:
     → Escalate to premium (Gemini Pro or GPT-4.1)
     → Mark for manual review
   ↓
8. Log all escalations for feedback loop
```

### Fallback Policy Examples

**SEC filing extraction:**
```
Primary: Groq GPT-OSS 20B (temp=0.0)
↓ (confidence <0.6)
Fallback 1: Qwen 14B (Together AI)
↓ (still low confidence)
Fallback 2: Gemini Flash
↓ (last resort)
Manual review flagged
```

**Investor chat:**
```
Primary: Gemini Flash (temp=0.3 for slight creativity)
↓ (confidence <0.75 OR user flagged "deep dive")
Escalate: Gemini Pro (temp=0.0 for precision)
↓ (edge case, very rare)
Last Resort: GPT-4.1 (temp=0.0)
```

---

## 🎭 "Finch" Prompting Strategy

### System Prompt for Investor Chat

```
You are Finch, a calm, slightly sarcastic but deeply caring portfolio coach for retail investors.

Rules:
- Never give direct buy/sell orders (say "you might consider…")
- Always explain the why in 1–2 short sentences
- Mirror the user's emotional state first (greed → caution, fear → reassurance)
- Use loss aversion positively: "Most people regret selling in panic more than missing a 10% gain"
- End every rebalancing suggestion with a one-sentence behavioral nudge
- Keep answers under 180 words unless asked for depth
- Cite sources: Include chunk IDs or filing sections (e.g., "per TSLA 10-K Item 1A")

Tone Examples:
❌ "I recommend selling TSLA immediately due to overvaluation."
✅ "TSLA's P/E of 65 is stretched (per Q3 2024 10-Q). You might consider trimming 20% if you're worried about volatility."

❌ "Your portfolio is poorly diversified."
✅ "Three energy stocks? Bold. But if oil drops 30%, you'll feel it everywhere at once. (See 2020 crash for reference.)"

❌ "Don't panic sell."
✅ "I get it - seeing red sucks. But historically, panic selling locks in losses. Take a breath first? (Your thesis on CNQ still holds.)"
```

### Context-Aware Prompting

```typescript
function buildRAGPrompt(
  userMessage: string,
  portfolio: Portfolio,
  retrievedChunks: Chunk[]
): string {
  return `
## Portfolio Context
- Total Value: $${portfolio.total_value.toLocaleString()}
- Top Holdings: ${portfolio.top_holdings.map(h => `${h.symbol} (${h.weight}%)`).join(', ')}
- Sector Concentration: ${portfolio.sector_concentration}
- YTD Performance: ${portfolio.ytd_return}%

## Retrieved Evidence
${retrievedChunks.map((chunk, i) => `
[Chunk ${i + 1}] (${chunk.filing_type} ${chunk.period_end}, ${chunk.section})
${chunk.text}
`).join('\n')}

## User Question
${userMessage}

## Instructions
Answer the user's question using only the provided evidence. Cite chunk IDs for all factual claims. If information is not in the retrieved chunks, say "not in provided context." Respond in Finch's tone (calm, caring, slightly sarcastic).
  `.trim();
}
```

### Emotional State Detection

```typescript
const EMOTIONAL_KEYWORDS = {
  fear: /worried|scared|panic|anxious|nervous|stress|afraid|terrified|crash/i,
  greed: /moon|rocket|10x|lambo|yolo|all.?in|fomo|buy more/i,
  regret: /should have|wish I|missed out|too late|opportunity cost/i,
  confusion: /don't understand|confused|lost|help|explain|why did|what does/i
};

function detectEmotion(message: string): string | null {
  for (const [emotion, pattern] of Object.entries(EMOTIONAL_KEYWORDS)) {
    if (pattern.test(message)) return emotion;
  }
  return null;
}

function adjustTone(emotion: string | null): string {
  switch (emotion) {
    case 'fear':
      return 'Reassuring, data-driven, remind of long-term perspective, cite historical recoveries';
    case 'greed':
      return 'Cautious, bring up risks, historical corrections, "trees don\'t grow to the sky"';
    case 'regret':
      return 'Empathetic, reframe as learning, focus on next best action, "sunk cost fallacy"';
    case 'confusion':
      return 'Patient, explain like talking to a friend, use analogies, avoid jargon';
    default:
      return 'Balanced, informative, slightly witty, cite specific facts';
  }
}
```

---

## 🗄️ Caching Strategy (Detailed)

### Cache Types & TTLs

**Redis cache keys:**

| Key Pattern | TTL | Invalidation Trigger |
|-------------|-----|---------------------|
| `filing:{cik}:{filing_type}:{period}` | 30 days | New filing for same CIK + type |
| `filing_summary:{cik}:{period}:{model_version}` | 30 days | Model version bump |
| `emb_chunk:{filing_id}:{chunk_id}` | 30 days | Filing reprocessed |
| `kpi:filing:{cik}:{period}` | Persistent | Manual override only |
| `news:{ticker}:{run_timestamp}` | 24-72 hrs | Next batch run |
| `social:{ticker}:{run_timestamp}` | 6-24 hrs | Next batch run |
| `portfolio:{user_id}:{date}` | 24 hrs | User updates portfolio |
| `rag_answer:{query_hash}:{model_version}` | 12-24 hrs | Model version bump |

### Cache Invalidation Rules

```typescript
// When new filing arrives for a CIK
async function onNewFiling(cik: string, filingType: string) {
  await redis.del(`filing:${cik}:${filingType}:*`);
  await redis.del(`filing_summary:${cik}:*`);
  await redis.del(`rag_answer:*`); // Invalidate all RAG answers (may reference old filing)
}

// When embedding/index rebuild happens
async function onIndexRebuild() {
  await redis.del('emb_chunk:*'); // Mark all embeddings for recomputation
  // Recompute lazily on next query
}

// When model prompts change
async function onModelVersionBump(newVersion: string) {
  await redis.del(`*:model_version:${oldVersion}`);
  // All cached summaries/answers invalidated
}
```

### Object Storage (S3/GCS)

**Raw filing storage:**
```
s3://portfolio-tracker-filings/
├── {cik}/
│   ├── 10-K/
│   │   ├── 2024-12-31.pdf
│   │   ├── 2023-12-31.pdf
│   │   └── metadata.json
│   ├── 10-Q/
│   │   ├── 2024-09-30.pdf
│   │   ├── 2024-06-30.pdf
│   │   └── metadata.json
│   └── 8-K/
│       └── {accession_number}.pdf
```

**Metadata:**
```json
{
  "cik": "0000789019",
  "company_name": "Microsoft Corporation",
  "filing_type": "10-K",
  "period_end": "2024-06-30",
  "filed_date": "2024-07-30",
  "accession_number": "0000789019-24-000456",
  "url": "https://www.sec.gov/Archives/edgar/...",
  "hash": "sha256:abc123...",
  "file_size_bytes": 2456789,
  "processed": true,
  "summary_cached": true
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: SEC Filing Ingestion (Week 1-2)

**Goal:** Lazy-load SEC filings and cache summaries

**Tasks:**
1. **EDGAR API integration** (`lib/api/secEdgar.ts`)
   ```typescript
   async function fetchFiling(cik: string, type: string, period: string): Promise<Filing> {
     // Fetch from EDGAR
     // Store in S3
     // Return metadata
   }
   ```

2. **PDF/HTML preprocessing** (`lib/preprocessing/filings.ts`)
   ```typescript
   async function preprocessFiling(rawFile: Buffer, format: 'pdf' | 'html'): Promise<string> {
     // pdftotext or BeautifulSoup
     // Clean text
     // Return normalized string
   }
   ```

3. **Chunking utility** (`lib/preprocessing/chunker.ts`)
   ```typescript
   function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): Chunk[] {
     // Tokenize
     // Split into chunks
     // Add metadata
   }
   ```

4. **Groq bulk summarization** (`lib/ai/groq.ts`)
   ```typescript
   async function summarizeFiling(chunks: Chunk[]): Promise<string> {
     // Call Groq GPT-OSS 20B
     // Return summary
   }
   ```

5. **Cache implementation** (`lib/cache/redis.ts`)
   ```typescript
   async function cacheSummary(key: string, summary: string, ttl: number): Promise<void> {
     await redis.setex(key, ttl, summary);
   }
   ```

### Phase 2: Embeddings & Vector Store (Week 2-3)

**Goal:** Enable semantic search over filing chunks

**Tasks:**
1. **Embedding service** (`lib/ai/embeddings.ts`)
   ```typescript
   async function embedText(text: string): Promise<number[]> {
     // Call HuggingFace or Together AI
     // Return 768-dim vector
   }
   ```

2. **FAISS integration** (`lib/vector/faiss.ts`)
   ```typescript
   class FAISSIndex {
     async addChunks(chunks: Chunk[]): Promise<void>;
     async search(queryEmbedding: number[], topK: number): Promise<Chunk[]>;
     async save(path: string): Promise<void>;
     async load(path: string): Promise<void>;
   }
   ```

3. **Batch embedding pipeline** (`scripts/embed-filings.ts`)
   ```bash
   npx tsx scripts/embed-filings.ts --cik 0000789019 --type 10-K --period 2024-06-30
   ```

### Phase 3: News & Social Sentiment (Week 3-4)

**Goal:** Batch process news and social media for 500 stocks

**Tasks:**
1. **News aggregator** (`lib/api/news-aggregator.ts`)
   ```typescript
   async function fetchNewsForStocks(symbols: string[]): Promise<Article[]> {
     // Parallel calls to Finnhub, Brave, NewsAPI
     // Deduplicate
     // Return aggregated list
   }
   ```

2. **Batch sentiment pipeline** (`scripts/batch-news.ts`)
   ```bash
   # Cron: 0 8,12,18 * * * (8am, 12pm, 6pm ET)
   npx tsx scripts/batch-news.ts --stocks all
   ```

3. **Social collector** (`lib/api/social.ts`)
   ```typescript
   async function fetchSocialSentiment(symbol: string): Promise<SocialDigest> {
     // Twitter/Reddit/StockTwits API
     // Aggregate mentions
     // Batch process with Groq
   }
   ```

### Phase 4: RAG Chat Interface (Week 4-5)

**Goal:** User-facing chat with RAG-based answers

**Tasks:**
1. **RAG service** (`lib/ai/rag.ts`)
   ```typescript
   async function answerQuestion(
     userQuery: string,
     portfolio: Portfolio
   ): Promise<{ answer: string; confidence: number; sources: string[] }> {
     // Retrieve chunks
     // Build prompt
     // Call Gemini Flash
     // Return answer + confidence
   }
   ```

2. **Confidence router** (`lib/ai/router.ts`)
   ```typescript
   async function routeQuery(
     query: string,
     context: RAGContext
   ): Promise<{ result: string; model: string; cost: number }> {
     // Try Gemini Flash
     // Escalate if confidence <0.75
     // Return final answer
   }
   ```

3. **Chat UI component** (`components/StonksAI/ChatInterface.tsx`)
   ```typescript
   'use client';

   export function ChatInterface({ portfolio }: Props) {
     const [messages, setMessages] = useState<Message[]>([]);

     async function handleSend(userMessage: string) {
       const response = await fetch('/api/ai/chat', {
         method: 'POST',
         body: JSON.stringify({ message: userMessage, portfolio })
       });
       const { answer, sources } = await response.json();
       setMessages([...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: answer, sources }]);
     }

     return <div>{/* Chat UI */}</div>;
   }
   ```

### Phase 5: Monitoring & Optimization (Week 5-6)

**Goal:** Track costs, performance, and optimize

**Tasks:**
1. **Telemetry logging** (`lib/telemetry/logger.ts`)
   ```typescript
   interface InferenceLog {
     timestamp: Date;
     model: string;
     tokens_in: number;
     tokens_out: number;
     latency_ms: number;
     confidence: number;
     cost_usd: number;
     escalated: boolean;
     cache_hit: boolean;
   }
   ```

2. **Cost dashboard** (`app/admin/costs/page.tsx`)
   - Daily/weekly/monthly costs by model
   - Cache hit rate (target >85%)
   - Escalation rate (target <10%)
   - Model performance metrics

3. **Alerts** (`lib/monitoring/alerts.ts`)
   ```typescript
   if (dailyCost > 5) {
     sendSlackAlert('Daily cost exceeded $5!');
   }

   if (cacheHitRate < 0.80) {
     sendSlackAlert('Cache hit rate dropped below 80%');
   }
   ```

---

## 🔐 Security, Compliance & Governance

### Data Encryption
- **At rest:** S3 buckets encrypted with AES-256
- **In transit:** HTTPS only (TLS 1.2+)
- **API keys:** Stored in environment variables, never committed to git

### PII Handling
- **User data:** Strip PII from logs (no email/name in telemetry)
- **Portfolio data:** Encrypted in database
- **Separate storage:** Telemetry and content stored separately

### Retention Policy
- **SEC filings:** 30 days in cache, persistent in S3
- **News digests:** 24-72 hours in cache, then purged
- **LLM outputs:** Audit log for 90 days (compliance)
- **User portfolio:** Persistent (user controls deletion)

### Rate Limiting
- **API routes:** 100 requests/hour per IP (client-side)
- **LLM providers:** Respect provider limits (Groq: 100k tokens/min)
- **EDGAR:** Max 10 requests/second per SEC rules

### Access Control
- **Service accounts:** Least-privilege IAM roles
- **API keys:** Rotate every 90 days
- **Database:** Row-level security (RLS) if multi-tenant

---

## 📊 Monitoring & KPIs

### Target Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| **Cache hit rate** | >85% | <80% |
| **Average inference cost per summary** | <$0.05 | >$0.10 |
| **Fallback rate** | <10% | >15% |
| **Hallucination / numeric mismatch rate** | <2% | >5% |
| **Latency P50 (chat)** | <1.5s | >3s |
| **Latency P95 (chat)** | <4s | >7s |
| **User satisfaction** | >4.5/5 | <4.0/5 |
| **Daily cost (total)** | <$3 | >$5 |
| **Monthly cost (total)** | <$60 | >$100 |

### Feedback Loop

**Collect flagged outputs:**
```typescript
interface FlaggedOutput {
  query: string;
  answer: string;
  confidence: number;
  user_feedback: 'thumbs_up' | 'thumbs_down' | 'report';
  reason: string | null;
  timestamp: Date;
}
```

**Periodic review:**
- Weekly: Review all flagged outputs
- Monthly: Retrain re-ranker or confidence scoring logic
- Quarterly: Evaluate new models (Groq updates, Gemini improvements)

---

## 🔗 Next Steps

### Immediate (This Week)

**1. Environment Setup**
- [ ] Create accounts: Groq, Together AI, Google Vertex AI
- [ ] Get API keys and configure `.env.local`
- [ ] Set up Redis (Upstash free tier or local)
- [ ] Configure S3/GCS bucket for filing storage

**2. Test Groq Integration**
```bash
# Install SDK
npm install groq-sdk

# Test endpoint
npx tsx scripts/test-groq.ts
```

**3. Test Gemini Integration**
```bash
# Install SDK
npm install @google-cloud/vertexai

# Test endpoint
npx tsx scripts/test-gemini.ts
```

### Phase 1: Filing Ingestion (Week 1-2)

- [ ] Implement EDGAR fetcher (`lib/api/secEdgar.ts`)
- [ ] Build PDF/HTML preprocessor (`lib/preprocessing/filings.ts`)
- [ ] Create chunking utility (`lib/preprocessing/chunker.ts`)
- [ ] Integrate Groq for summarization (`lib/ai/groq.ts`)
- [ ] Set up Redis caching (`lib/cache/redis.ts`)
- [ ] Test end-to-end: EDGAR → chunk → summarize → cache

### Phase 2: Vector Store (Week 2-3)

- [ ] Implement embedding service (`lib/ai/embeddings.ts`)
- [ ] Integrate FAISS (`lib/vector/faiss.ts`)
- [ ] Build batch embedding pipeline (`scripts/embed-filings.ts`)
- [ ] Test semantic search with sample queries

### Phase 3: News Pipeline (Week 3-4)

- [ ] Aggregate news sources (`lib/api/news-aggregator.ts`)
- [ ] Build batch sentiment pipeline (`scripts/batch-news.ts`)
- [ ] Set up cron jobs (8am, 12pm, 6pm ET)
- [ ] Test news digests with cache

### Phase 4: RAG Chat (Week 4-5)

- [ ] Build RAG service (`lib/ai/rag.ts`)
- [ ] Implement confidence router (`lib/ai/router.ts`)
- [ ] Create chat UI (`components/StonksAI/ChatInterface.tsx`)
- [ ] Add API route `/api/ai/chat`
- [ ] Test with sample portfolio questions

### Phase 5: Monitoring (Week 5-6)

- [ ] Implement telemetry logging (`lib/telemetry/logger.ts`)
- [ ] Build cost dashboard (`app/admin/costs/page.tsx`)
- [ ] Set up alerts (Slack/email)
- [ ] Monitor for first week and adjust

---

## 📚 Reference Links

**Model Providers:**
- Groq: https://console.groq.com
- Together AI: https://api.together.xyz
- Google Vertex AI: https://cloud.google.com/vertex-ai
- OpenAI: https://platform.openai.com

**Vector Stores:**
- FAISS: https://github.com/facebookresearch/faiss
- Pinecone: https://www.pinecone.io
- Weaviate: https://weaviate.io

**Embedding Models:**
- bge-base: https://huggingface.co/BAAI/bge-base-en-v1.5
- e5-large: https://huggingface.co/intfloat/e5-large
- all-mpnet: https://huggingface.co/sentence-transformers/all-mpnet-base-v2

**SEC EDGAR:**
- EDGAR API: https://www.sec.gov/edgar/sec-api-documentation
- XBRL parsing: https://github.com/Arelle/Arelle

**News APIs:**
- Finnhub: https://finnhub.io
- Brave Search: https://brave.com/search/api/
- NewsAPI: https://newsapi.org

---

## 📝 RAG Best Practices Summary

### What We Got Right

✅ **Separated RAG from batch processing**
- Filing summaries: Deterministic chunking + summarization (NO RAG)
- News/social: Batch sentiment (NO RAG)
- KPI extraction: Structured parsing (NO RAG)
- **Investor chat ONLY:** RAG with lazy indexing

✅ **Lazy indexing strategy**
- Don't embed all 500 stocks × 10 filings upfront
- Index on-demand when users query specific filings
- LRU eviction keeps vector DB small (~10-20% of total)
- **Result:** 67% cost savings on vector DB ($0-10/month vs $0-30/month)

✅ **Cost efficiency**
- 50-80% cheaper than naive approach
- Embeddings only for chat queries
- Shorter reasoning chains (RAG provides context)
- Avoids hallucinations with citations

✅ **Two-pipeline architecture**
- **Pipeline A:** Batch processing (fast, no embeddings)
- **Pipeline B:** Chat with RAG (context-aware, cited)

### Why This Works

**For filing summarization:**
- Entire filing is processed deterministically
- No need for semantic search
- Cheaper and faster without RAG overhead

**For investor chat:**
- User questions require specific evidence
- RAG retrieves relevant chunks from filings
- Enables citations ("per TSLA 10-K Item 1A")
- Supports portfolio personalization

**The key insight:** RAG adds value only when you need to search for specific information in a large corpus. Batch summarization processes everything linearly, so RAG adds zero value.

---

## ✅ Strategy Approval Checklist

Before proceeding with implementation, confirm:

- [ ] Budget approved: $35-60/month for inference + $10-30/month for infrastructure
- [ ] Cloud-only architecture understood (no local GPU)
- [ ] **Two-pipeline approach** understood (batch NO RAG, chat YES RAG)
- [ ] Primary models confirmed: Groq GPT-OSS 20B (bulk), Gemini Flash (chat)
- [ ] SEC filing ingestion pipeline scope agreed upon
- [ ] News/social sentiment batch frequency confirmed (3×/day)
- [ ] **Lazy indexing strategy** approved (embed on-demand, LRU eviction)
- [ ] RAG retrieval strategy approved (FAISS, topK=5-12, portfolio filtering)
- [ ] Caching TTLs accepted (30d filings, 24-72h news, 12-24h RAG)
- [ ] Confidence thresholds validated (0.85 accept, 0.6-0.85 escalate, <0.6 premium)
- [ ] Monitoring KPIs and alert thresholds agreed upon

**Questions or adjustments needed?**

---

*Document maintained by: Claude (AI Assistant)*
*Last validated: November 20, 2025*
*Aligned with: retail_stock_ai_pipeline_system_design_recommendations.md + RAG best practices*
