# Retail Stock AI Pipeline — System Design & Recommendations

**Created:** 2025-11-19

## Executive summary
This document describes a fully cloud-based hybrid architecture for a retail-stock AI assistant used by **1,000 users** covering up to **500 stocks**. It consolidates prior conversations and gives a production-ready design covering:

- system architecture (ingest → RAG → chat),
- model recommendations per task (primary + fallbacks) with numeric quality scores and monthly cost estimates,
- **RAG usage taxonomy** (when RAG is required, optional, or not needed),
- **cache vs RAG vs direct model decision flow** (5-layer cache hierarchy with routing rules),
- **company fact sheet management strategy** (lazy loading, versioning, update triggers),
- **query classification & routing logic** (rule-based + LLM fallback with pseudocode),
- caching strategy and TTLs (including lazy load for SEC filings),
- ingestion, chunking, and embedding rules for filings (10-K, 10-Q, 8-K, 13F), news and social,
- fallback and confidence logic for local/cloud model selection,
- monitoring, security, and deployment considerations,
- sample prompts and API flow snippets.

This design assumes **no local GPU** and uses cloud inference providers (Groq, Together, Gemini, etc.) with aggressive caching and confidence-based fallbacks to minimize cost while preserving high-quality investor-facing outputs.

**Key innovation:** The document now includes comprehensive guidance on when to use RAG retrieval vs direct model inference vs cached results, with a 5-layer cache hierarchy (L1: query cache → L2: fact sheets → L3: pre-computed summaries → L4: RAG retrieval → L5: raw data fetch) designed to achieve **80% cache hit rate** and keep costs under $60/month.

---

## Core requirements (recap)
- **Users:** 1,000 retail users; each up to 50 stocks; **universe max 500 stocks**.
- **Ingest cadence:** ~100 SEC filings/day (lazy load), news/social batch 3× per day for 500 stocks.
- **Primary tasks:** SEC filing extraction/summarization, news/social sentiment, KPI extraction, portfolio chat.
- **Caching:** filings & summaries TTL = 30 days; news summaries TTL = 24–72 hours; embeddings cached 30 days.
- **Models:** cloud-first. Primary bulk model: Groq GPT-OSS 20B. Chat fallback: Gemini Flash (Gemini Pro for high-value cases).
- **Budget target:** keep recurring cost in the **\$35–\$100 / month** range for inference; total ops may include vector DB, storage, and monitoring.

---

## System architecture (high level)

**Components:**
- Ingestion Service (EDGAR fetcher, News/Social collectors)
- Preprocessor & Normalizer (PDF/HTML/XBRL -> Clean text)
- Chunker & Tokenizer (1k token target, 150–250 overlap)
- Embedding Service (serverless call to chosen embedding model)
- Vector Store (FAISS / managed vector DB)
- RAG Service (retrieval, prompt assembly)
- Inference Layer (Groq/Together for bulk; Gemini for chat)
- Cache Layer (Redis/Cloud cache + object storage for raw docs)
- API / Chat Frontend (user-facing)
- Monitoring & Logging (Prometheus/Grafana, audits)

**Flow:**
1. New filing request -> check cache -> if miss -> pull from EDGAR -> preprocess -> chunk -> embed -> store -> run bulk summarization -> cache results (30d).
2. News/social (3x/day) -> collect -> dedupe -> preprocess -> chunk -> embed -> run batch sentiment & summarization -> store & cache (24–72h).
3. User chat -> retrieve cached summaries & relevant chunks -> assemble RAG prompt -> call Gemini Flash (or Groq) -> return answer; if low confidence -> escalate to Pro model -> store final answer in cache.

(Include diagrams in your UI or architecture doc as needed.)

---

## SEC filings ingestion & chunking rules
**Input formats:** PDF, HTML (EDGAR), XBRL.

**Steps:**
1. Fetch raw filing via EDGAR (or vendor). Store raw file in object storage with metadata (CIK, filing_type, filing_date, accession, hash).
2. Convert to text: pdftotext / Apache Tika / BeautifulSoup for HTML. For XBRL, parse numeric facts to JSON (arelle or sec-xbrl parsing libs).
3. Clean & normalize: remove headers/footers, page markers, normalize whitespace, keep section headings.
4. Tokenize using the target model's tokenizer. Aim for chunk length **~1,000 tokens** with **150–250 token overlap**. Ensure chunk metadata includes `chunk_id`, `filing_id`, `section_heading`, `offset`, `token_count`.
5. Store chunks (text + metadata) in object storage and compute embeddings (embedding model of choice) and insert into vector DB (FAISS/managed).

**Chunk meta:** filing_id, cik, company_name, filing_type, period_end, chunk_id, section, token_range.

**Numeric extraction:** run a second pass for tables using XBRL facts and regex numeric extraction. Persist structured KPIs (revenue, net_income, assets, liabilities, guidance statements) as JSON documents in DB and index them for query.

---

## Embeddings and retrieval
- **Embedding model choices:** `bge-base`, `all-mpnet-base-v2`, or `intfloat/e5-large` depending on provider. Use the same embedding model for both filings and news to keep vectors comparable.
- **Index:** FAISS (local or managed) with `IndexHNSWFlat` for performance at scale. Normalize embeddings for cosine similarity.
- **Retieval strategy:** top-k = 8 for summary tasks; top-k = 12 for evidence-heavy answers. Use a re-ranker (cross-encoder) for edge-cases.

---

## Model choices & recommendation table
(See the numeric quality/cost comparison below — primary model followed by 1–2 fallbacks per task.)

**Legend:** Quality scores are out of 10 (higher = better). Cost columns are estimated monthly inference spend for your workload.

| Task | Primary Model | Quality | Monthly Cost (est) | Fallback 1 | Fallback 2 | Cache TTL |
|------|---------------|--------:|--------------------:|-----------|-----------|----------:|
| SEC filing extraction | Groq GPT‑OSS 20B | 9.0 | $1.8–2.5 | Qwen 14B (Together) | DeepSeek 14B | 30 days |
| Filing long summary | Groq GPT‑OSS 20B | 8.7 | included above | Qwen 20B | DeepSeek 20B | 30 days |
| News summarization | Groq GPT‑OSS 20B | 9.2 | $6–8 | Together Qwen 14B | DeepSeek 14B | 24–72 hrs |
| Social sentiment | Groq GPT‑OSS 20B | 9.2 | $4–5 | DeepSeek 14B | Qwen 14B | 24 hrs |
| KPI / numeric parsing | Groq / XBRL pipeline | 9.0 | $2–4 | Gemini Flash | Gemini Pro | persistent JSON |
| Investor chat (RAG) | Gemini Flash | 9.0 | $15–30 | Gemini Pro | OpenAI GPT-4.1 | 12–24 hrs |

> **Total hybrid monthly estimate:** **\$35–60** (inference only) — storage, vector DB, and API infra additional ~$10–30/mo.

---

## Fallback & confidence logic (production-ready)
**Confidence scoring mechanics:**
- **LLM self-score:** instruct model to output a confidence band (0–1) for each generated factual claim.
- **Cross-encoder re-ranker score:** use a small cross-encoder to score retrieval relevance (0–1).
- **Numeric match validator:** for numeric claims, run exact/regex lookup in retrieved chunks; if not found, mark as "Not in provided context".

**Decision flow (per query):**
1. Retrieve top-k evidence & assemble the RAG prompt.
2. Call primary model (Groq for bulk, Gemini Flash for chat) with temperature=0.0.
3. Extract LLM confidence and re-ranker score.
4. If `confidence >= 0.85` and numeric claims match → accept and cache.
5. If `0.6 <= confidence < 0.85` → escalate to higher-quality model (Groq→Qwen20 or Gemini Flash→Gemini Pro). Re-run and accept if improved.
6. If `confidence < 0.6` or numeric claims mismatch → escalate to premium API (Gemini Pro / GPT‑4.1) and mark result for manual review.
7. Log all escalations for feedback loop and model tuning.

**Fallback policy examples:**
- **Filing extraction**: Groq primary; if confidence < 0.6 → Qwen14 (Together); if still low → Gemini Flash.
- **Investor chat**: Gemini Flash primary; if low confidence or user flagged → Gemini Pro.

---

## Caching strategy (detailed)
Cache types & TTLs:

- **Filing raw text**: Key = `filing:{cik}:{filing_type}:{period}` → TTL 30 days (or rotate on new filing)
- **Filing chunk embeddings**: Key = `emb_chunk:{filing_id}:{chunk_id}` → TTL 30 days (or persist longer)
- **Filing summaries**: Key = `summary:filing:{cik}:{period}:{model_version}` → TTL 30 days
- **KPI JSON (parsed)**: Key = `kpi:filing:{cik}:{period}` → persistent until replaced
- **News digest per ticker**: Key = `news:{ticker}:{run_timestamp}` → TTL 24–72 hours
- **Social digest per ticker**: Key = `social:{ticker}:{run_timestamp}` → TTL 6–24 hours
- **User portfolio snapshot**: Key = `portfolio:{user_id}:{date}` → TTL 24 hours
- **RAG answer cache**: Key = `rag_answer:{query_hash}:{model_version}` → TTL 12–24 hours

**Cache invalidation rules:**
- If a new filing appears for a CIK, invalidate `summary:filing:*` and `rag_answer:*` keys referencing that filing.
- If embedding/index rebuild happens, mark embeddings expired and recompute lazily.
- Use model_version in cache keys to ensure changes to model prompts/models invalidates old cached outputs.

---

## RAG usage taxonomy: When to use retrieval vs direct model inference

This section critically examines **when RAG is required**, **when it's optional but valuable**, and **when it's NOT needed** (direct model inference is sufficient).

### Where RAG Is REQUIRED

These use cases **cannot** be answered without retrieval—the model has no basis to respond accurately:

1. **SEC filing-specific questions**
   - *Examples:* "What was Apple's revenue in Q3 2024?" / "Summarize risk factors from Tesla's latest 10-K"
   - *Why RAG required:* Model knowledge cutoff + need for exact filing data
   - *Retrieval target:* Filing chunks, KPI JSON, specific sections (Item 1A, Item 7, etc.)

2. **Recent news & events (< 6 months)**
   - *Examples:* "What news came out about NVDA this week?" / "Summarize recent earnings call highlights"
   - *Why RAG required:* Post-cutoff events, time-sensitive data
   - *Retrieval target:* News digest cache, social sentiment summaries

3. **Portfolio-specific queries**
   - *Examples:* "How is my portfolio performing vs S&P500?" / "Which of my holdings reported earnings this week?"
   - *Why RAG required:* User-specific data not in model training
   - *Retrieval target:* User portfolio snapshot, holdings metadata, performance cache

4. **Company-specific numeric KPIs**
   - *Examples:* "What is Microsoft's P/E ratio?" / "Show me AAPL's debt-to-equity over 3 years"
   - *Why RAG required:* Precise numeric data from structured sources
   - *Retrieval target:* KPI JSON (parsed from XBRL), company fact sheet, financial metrics DB

5. **Multi-company comparative analysis**
   - *Examples:* "Compare gross margins for GOOGL, META, AMZN in last 2 quarters"
   - *Why RAG required:* Multi-source structured data aggregation
   - *Retrieval target:* Multiple KPI JSONs, fact sheets, filing summaries

### Where RAG Is OPTIONAL (But Adds Value)

These can be answered by the model alone, but RAG **improves accuracy, freshness, or depth**:

1. **General company background & business model**
   - *Examples:* "What does Nvidia do?" / "Explain Amazon's business segments"
   - *Direct model capability:* Can give general answer from training data
   - *RAG enhancement:* Adds latest 10-K Item 1 (Business) section for current structure, recent acquisitions, segment changes
   - *Decision logic:* Use RAG if user asks for "latest" or "current" structure; skip for general overviews

2. **Pattern-of-life summaries for companies**
   - *Examples:* "What's typical for Apple's product release cycle?" / "How does Tesla usually respond to production challenges?"
   - *Direct model capability:* Has general knowledge of historical patterns
   - *RAG enhancement:* Can retrieve last 3 years of 10-Ks, 8-Ks to show evidence-based patterns rather than generic statements
   - *Decision logic:* Use RAG for **evidence-backed** pattern analysis; skip for casual conversational responses

3. **Industry trends & sector analysis**
   - *Examples:* "What are key trends in the semiconductor industry?" / "How is the EV market evolving?"
   - *Direct model capability:* Can provide general industry knowledge up to cutoff
   - *RAG enhancement:* Add recent analyst reports, news summaries, sector-specific filings
   - *Decision logic:* Use RAG if freshness matters (< 6 months) or user wants data-driven analysis; skip for educational/general questions

4. **Historical context & company evolution**
   - *Examples:* "How has Microsoft's strategy changed over the last decade?"
   - *Direct model capability:* General historical knowledge
   - *RAG enhancement:* Retrieve CEO letters, strategy sections from 10-Ks over time
   - *Decision logic:* Use RAG for detailed/evidence-based timelines; skip for quick overviews

5. **Investment thesis generation**
   - *Examples:* "Should I invest in TSLA?" / "What's the bull case for NVDA?"
   - *Direct model capability:* Can generate generic thesis from general knowledge
   - *RAG enhancement:* Ground thesis in latest financials, news sentiment, analyst viewpoints
   - *Decision logic:* **Always use RAG for investor-facing recommendations** to avoid hallucinations and ensure data-backed claims

### Where RAG Is NOT NEEDED

Direct model inference is sufficient and more cost-effective:

1. **General financial education**
   - *Examples:* "What is a P/E ratio?" / "Explain how dividend yields work" / "What's the difference between common and preferred stock?"
   - *Why skip RAG:* Static knowledge, no company/time-specific data needed
   - *Route to:* Direct model (Gemini Flash / cached responses)

2. **Broad market concepts**
   - *Examples:* "How does the Federal Reserve affect stock prices?" / "What causes market volatility?"
   - *Why skip RAG:* Conceptual explanations, no retrieval benefit
   - *Route to:* Direct model

3. **Calculation & formula help**
   - *Examples:* "How do I calculate CAGR?" / "What's the formula for enterprise value?"
   - *Why skip RAG:* Mathematical/procedural knowledge
   - *Route to:* Direct model (can provide formula + example)

4. **General investment advice (non-specific)**
   - *Examples:* "What's a good diversification strategy?" / "How should I think about risk tolerance?"
   - *Why skip RAG:* Generic guidance, not tied to specific securities
   - *Route to:* Direct model (with standard disclaimers)

5. **Conversational/clarification queries**
   - *Examples:* "Can you explain that again?" / "What did you mean by 'free cash flow'?"
   - *Why skip RAG:* Referring to prior conversation context (use chat history, not RAG)
   - *Route to:* Direct model with conversation context

6. **System/feature questions**
   - *Examples:* "How do I add a stock to my portfolio?" / "Can you track crypto?"
   - *Why skip RAG:* Product/feature documentation, not financial data
   - *Route to:* Direct model or static help docs

---

## Cache vs RAG vs Direct Model: Decision flow

This section defines the **routing logic** to decide whether to hit cache, perform RAG retrieval, or go directly to the model.

### Decision Tree (Query Processing)

```
User Query
    ↓
┌───────────────────────────────────────┐
│ 1. Query Classification               │
│   - Intent detection (extraction,     │
│     comparison, education, chat)      │
│   - Temporal signals (latest, recent, │
│     this week, Q3 2024)               │
│   - Entity extraction (tickers, CIKs) │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ 2. Cache Lookup Strategy              │
│   - Exact match: hash(query + context)│
│   - Semantic match: embed query,      │
│     check cached query embeddings     │
│   - Entity-based: check fact sheet,   │
│     KPI JSON, filing summary caches   │
└───────────────────────────────────────┘
    ↓
    ├─ CACHE HIT (confidence > 0.9) ────→ Return cached result
    │                                     (update access timestamp)
    ↓
┌───────────────────────────────────────┐
│ 3. RAG Necessity Check                │
│   - Is this a "RAG REQUIRED" use case?│
│   - Does query reference specific     │
│     entities, time periods, or data?  │
│   - Is model cutoff insufficient?     │
└───────────────────────────────────────┘
    ↓
    ├─ NO RAG NEEDED ───────────────────→ Direct model inference
    │                                     (Gemini Flash, cache result)
    ↓
┌───────────────────────────────────────┐
│ 4. Retrieval Strategy                 │
│   A. Check Company Fact Sheet first   │
│      (for basic stats, metadata)      │
│   B. Semantic search (vector DB)      │
│      top-k=8-12 chunks                │
│   C. Metadata filter (CIK, date range,│
│      filing type, section)            │
│   D. Hybrid: keyword + semantic       │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ 5. RAG Inference                      │
│   - Assemble prompt (context + query) │
│   - Call primary model (Groq/Gemini)  │
│   - Extract confidence score          │
└───────────────────────────────────────┘
    ↓
    ├─ High confidence (≥0.85) ─────────→ Cache & return
    ├─ Medium confidence (0.6-0.85) ────→ Escalate to better model
    └─ Low confidence (<0.6) ───────────→ Premium model + flag for review
```

### Detailed Routing Rules

#### Rule 1: Exact Cache Hit (Highest Priority)
- **Condition:** `query_hash` exists in cache AND `TTL > 0` AND `model_version` matches
- **Action:** Return cached response immediately
- **Metrics:** Cache hit rate target > 85%
- **Examples:**
  - "What was AAPL revenue in Q3 2024?" → cached summary from prior identical query
  - "Show my portfolio performance" → cached if asked within TTL window

#### Rule 2: Company Fact Sheet Check (Second Priority)
- **Condition:** Query asks for **basic company stats** or **static metadata**
- **Action:** Load `company_fact_sheet.json` from cache/storage (see strategy below)
- **When to use:**
  - Ticker symbol, company name, sector, industry
  - Market cap, shares outstanding (if recent enough)
  - Exchange, headquarters, CEO name
  - Fundamental ratios (if fact sheet updated from latest filing)
- **Fallback:** If fact sheet stale (>30 days old for fundamentals) → proceed to RAG
- **Examples:**
  - "What sector is MSFT in?" → fact sheet
  - "Who is the CEO of Tesla?" → fact sheet
  - "What's NVDA's market cap?" → fact sheet (if fresh) else RAG

#### Rule 3: Direct Model (No Retrieval)
- **Condition:** Query classified as "general education" or "conceptual"
- **Action:** Call Gemini Flash (or Groq for bulk) with system prompt, **no context injection**
- **Cache result:** TTL = 7 days (generic answers don't change often)
- **Examples:**
  - "What is a 10-K filing?"
  - "How do I calculate ROE?"
  - "Explain what Beta means in investing"

#### Rule 4: RAG Retrieval (Required or Optional with High Value)
- **Condition:** Query references specific entity + time period, OR needs evidence-based response
- **Action:**
  1. Load company fact sheet for entity metadata (CIK, ticker)
  2. Perform semantic search in vector DB (filings + news + social)
  3. Apply metadata filters (date range, filing type, section heading)
  4. Retrieve top-k chunks (k=8 for summaries, k=12 for detailed analysis)
  5. Check if KPI JSON exists for numeric queries → merge structured data into prompt
  6. Assemble RAG prompt with retrieved context
  7. Call primary model → evaluate confidence → cache if high confidence
- **Examples:**
  - "What were the risk factors in TSLA's latest 10-K?" → RAG (filing chunks)
  - "Compare GOOGL and META revenue growth in last 2 quarters" → RAG (multiple KPI JSONs)
  - "What's the latest news on NVDA?" → RAG (news digest cache)

#### Rule 5: Hybrid Retrieval (Complex Multi-Part Queries)
- **Condition:** Query has multiple sub-intents (education + specific data)
- **Action:**
  1. Decompose query into sub-queries
  2. Route educational parts → direct model
  3. Route data parts → RAG
  4. Synthesize final answer with both sources
- **Examples:**
  - "Explain what revenue growth means and show me AAPL's growth over 3 years"
    - Part 1: "Explain revenue growth" → direct model
    - Part 2: "AAPL revenue 3 years" → RAG (KPI JSON)
  - "What's a good P/E ratio and what is Tesla's current P/E?"
    - Part 1: "good P/E ratio" → direct model (general guidance)
    - Part 2: "TSLA P/E" → fact sheet or RAG (latest filing)

### Cache Hierarchy & Lookup Order

**Order of operations for data queries:**

1. **L1: Query result cache** (Redis, 12-24h TTL)
   - Key: `rag_answer:{query_hash}:{model_version}`
   - Fastest return, covers repeat questions

2. **L2: Company fact sheet cache** (Redis/S3, 30-day TTL)
   - Key: `fact_sheet:{ticker}` or `fact_sheet:{cik}`
   - Covers basic company info, metadata, key stats
   - Updated on new filing or manual refresh

3. **L3: Pre-computed summary cache** (Redis/S3, TTL varies)
   - Filing summaries: 30 days
   - News digests: 24-72 hours
   - KPI JSON: persistent until replaced
   - Social sentiment: 6-24 hours

4. **L4: RAG retrieval** (vector DB + chunk storage)
   - Hit when no cache match or cache stale
   - Most expensive (embedding + inference cost)
   - Result gets cached back to L1

5. **L5: Raw data fetch** (EDGAR, news APIs, social feeds)
   - Only on cache miss + no prior ingestion
   - Triggers full pipeline: fetch → preprocess → chunk → embed → summarize → cache

### Cost-Optimized Query Strategy

**Budget allocation guideline:**

- **80% of queries** should hit L1 or L2 (cache) → **~$0 inference cost**
- **15% of queries** hit L3 (pre-computed summaries) or L4 (RAG) → **low cost** (Groq/Together)
- **5% of queries** require fresh data fetch (L5) or premium model escalation → **higher cost** (Gemini Pro / GPT-4)

**Implementation tactics:**

1. **Aggressive caching:** Cache even medium-confidence answers (≥0.75) with shorter TTL
2. **Query normalization:** Normalize synonymous queries to same hash ("AAPL revenue Q3" = "Apple Q3 revenue")
3. **Prefetch popular queries:** Daily batch job to prefill cache for common portfolio queries (top 100 tickers × top 10 question templates)
4. **Fact sheet pre-warming:** Keep fact sheets for user's portfolio holdings always warm in cache

---

## Company fact sheet management strategy

The **Company Fact Sheet** (`fact_sheet.json`) is a **structured JSON document** that stores frequently accessed company metadata and key statistics. It serves as a fast lookup layer (L2 cache) to avoid RAG retrieval for basic company info.

### Fact Sheet Schema

```json
{
  "ticker": "AAPL",
  "cik": "0000320193",
  "company_name": "Apple Inc.",
  "exchange": "NASDAQ",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "headquarters": "Cupertino, CA",
  "founded": "1976",
  "ceo": "Tim Cook",
  "website": "https://www.apple.com",
  "description": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",

  "fundamental_metrics": {
    "market_cap": 2800000000000,
    "shares_outstanding": 15634232000,
    "last_price": 179.23,
    "pe_ratio": 28.5,
    "forward_pe": 26.3,
    "price_to_book": 45.2,
    "price_to_sales": 7.1,
    "dividend_yield": 0.0052,
    "beta": 1.29,
    "52_week_high": 199.62,
    "52_week_low": 164.08,
    "avg_volume_10d": 52341000,
    "as_of_date": "2024-11-18"
  },

  "latest_financials": {
    "period_end": "2024-09-30",
    "filing_type": "10-K",
    "fiscal_year": 2024,
    "revenue": 391035000000,
    "gross_profit": 170782000000,
    "operating_income": 123217000000,
    "net_income": 101956000000,
    "eps_diluted": 6.42,
    "total_assets": 364980000000,
    "total_liabilities": 290437000000,
    "shareholders_equity": 74543000000,
    "cash_and_equivalents": 30737000000,
    "free_cash_flow": 110543000000,
    "currency": "USD"
  },

  "metadata": {
    "fact_sheet_version": "1.2",
    "last_updated": "2024-11-18T10:23:00Z",
    "last_filing_date": "2024-10-31",
    "last_filing_accession": "0000320193-24-000123",
    "data_sources": ["EDGAR", "market_data_api"],
    "next_earnings_date": "2025-01-30"
  }
}
```

### When to Use Fact Sheet vs RAG

| Query Type | Use Fact Sheet | Use RAG | Reason |
|------------|---------------|---------|--------|
| Company name, ticker, sector | ✅ | ❌ | Static metadata |
| CEO, headquarters, website | ✅ | ❌ | Rarely changes |
| Market cap, P/E ratio | ✅ (if fresh) | ❌ (if stale >7 days) | Semi-static, update weekly |
| Latest revenue, EPS | ✅ | ❌ | Extracted from latest filing |
| Revenue **growth** over 3 years | ❌ | ✅ | Requires multi-period comparison |
| Risk factors, MD&A summary | ❌ | ✅ | Narrative content, not structured |
| Recent news/sentiment | ❌ | ✅ | Time-series data |
| Detailed segment breakdown | ❌ | ✅ | Requires full filing sections |

### Fact Sheet Update Strategy

#### Trigger-Based Updates

1. **New SEC filing detected** (10-K, 10-Q)
   - Extract `latest_financials` from XBRL facts or parsed KPI JSON
   - Update `metadata.last_filing_date` and `metadata.last_filing_accession`
   - Recalculate ratios (P/E, P/B, etc.) if price data available
   - Invalidate old fact sheet cache → write new version

2. **Daily market data refresh** (for active portfolio holdings)
   - Update `fundamental_metrics.last_price`, `market_cap`, `52_week_high/low`
   - Update `fundamental_metrics.as_of_date`
   - Keep TTL = 24 hours for market-sensitive fields

3. **Weekly refresh** (for all 500 stocks in universe)
   - Fetch latest price data from market API
   - Recalculate derived metrics (P/E, P/S, etc.)
   - Update `avg_volume_10d`, `beta` from rolling calculations

4. **Manual/on-demand refresh**
   - User requests explicit refresh: `/refresh AAPL`
   - Admin triggers refresh for data quality issues
   - Earnings date changes, CEO change announcements (via 8-K alert)

#### Lazy Load Strategy

- **Do NOT** pre-generate fact sheets for all 500 stocks upfront
- **Generate on first query** for a ticker:
  1. User asks: "What's the P/E for XYZ?"
  2. Check cache: `fact_sheet:XYZ` → MISS
  3. Check if latest filing exists in DB → if yes, extract financials
  4. Fetch market data from API (price, market cap)
  5. Generate fact sheet JSON
  6. Store in cache (TTL = 30 days for filing data, 24h for market data)
  7. Return answer from fact sheet
- **Subsequent queries** for XYZ hit cache → instant response

#### Versioning & Schema Evolution

- Include `fact_sheet_version` in schema
- If schema changes (e.g., add new field `debt_to_equity`):
  - Increment version to `1.3`
  - Cache key becomes `fact_sheet:{ticker}:v1.3`
  - Old versions auto-expire (different key)
  - Regenerate fact sheets lazily as queries come in

#### Storage & Access Pattern

- **Primary storage:** S3 / object storage (persistent)
  - Path: `s3://bucket/fact_sheets/{cik}/fact_sheet_v{version}.json`
- **Cache layer:** Redis (fast access)
  - Key: `fact_sheet:{ticker}` → JSON string
  - TTL: 30 days (or until new filing)
- **Access pattern:**
  1. Check Redis: `GET fact_sheet:AAPL`
  2. If miss → load from S3 → populate Redis
  3. If S3 miss → generate from DB/API → save to S3 + Redis
  4. Return fact sheet to query processor

#### Integration with RAG Pipeline

When RAG retrieval is needed:

1. **Always fetch fact sheet first** (cheap, fast)
2. Use fact sheet metadata to **filter RAG retrieval:**
   - `cik` → filter vector search to specific company's filings
   - `latest_financials.period_end` → filter to relevant time range
   - `sector`, `industry` → add context to prompt (help model understand company)
3. **Inject fact sheet into RAG prompt:**
   ```
   Company: {company_name} ({ticker})
   Sector: {sector} | Industry: {industry}
   Latest Financials (as of {period_end}): Revenue ${revenue}, Net Income ${net_income}, EPS ${eps}

   Retrieved Filing Excerpts:
   [chunks from vector DB]

   User Question: {query}
   ```
4. Model has both **structured data** (fact sheet) and **narrative context** (RAG chunks) → higher quality answer

---

## Query classification & routing logic (implementation-ready)

This section provides the **classifier design** and **routing rules** to operationalize the decision flow above.

### Query Classifier Design

**Approach:** Lightweight **rule-based classifier** + optional **small LLM classifier** for edge cases.

#### Rule-Based Classification (Primary)

Use regex patterns and keyword matching (fast, zero cost):

```python
import re
from typing import Literal

QueryIntent = Literal[
    "extraction",      # Get specific data point(s)
    "comparison",      # Compare multiple entities/periods
    "summarization",   # Summarize filing/news/sentiment
    "education",       # Explain concept, define term
    "portfolio",       # User portfolio-specific query
    "system"          # System/feature question
]

def classify_query(query: str, user_context: dict) -> dict:
    query_lower = query.lower()

    # Temporal signals (indicates freshness needed → RAG likely)
    temporal_keywords = ["latest", "recent", "this week", "this month", "today",
                          "last quarter", "Q1", "Q2", "Q3", "Q4", "2024", "2025"]
    has_temporal = any(kw in query_lower for kw in temporal_keywords)

    # Educational signals (→ direct model)
    education_keywords = ["what is", "what does", "how do i calculate",
                           "explain", "what's the difference", "define"]
    is_education = any(kw in query_lower for kw in education_keywords)

    # Extraction signals (→ fact sheet or RAG)
    extraction_keywords = ["revenue", "earnings", "eps", "profit", "debt",
                            "assets", "cash flow", "market cap", "p/e"]
    is_extraction = any(kw in query_lower for kw in extraction_keywords)

    # Comparison signals (→ RAG, likely multi-entity)
    comparison_keywords = ["compare", "vs", "versus", "difference between",
                            "which is better", "higher", "lower"]
    is_comparison = any(kw in query_lower for kw in comparison_keywords)

    # Portfolio signals (→ portfolio cache + RAG)
    portfolio_keywords = ["my portfolio", "my holdings", "my stocks",
                           "should i", "my performance"]
    is_portfolio = any(kw in query_lower for kw in portfolio_keywords)

    # Entity extraction (tickers)
    ticker_pattern = r'\b[A-Z]{1,5}\b'  # Simple ticker match
    entities = re.findall(ticker_pattern, query)
    entities = [e for e in entities if e not in ["CEO", "CFO", "USA", "IPO"]]  # filter false positives

    # Intent classification logic
    if is_portfolio:
        intent = "portfolio"
    elif is_education and not (is_extraction or has_temporal):
        intent = "education"
    elif is_comparison:
        intent = "comparison"
    elif is_extraction:
        intent = "extraction"
    elif any(kw in query_lower for kw in ["summarize", "summary", "key points"]):
        intent = "summarization"
    else:
        intent = "extraction"  # default assumption

    return {
        "intent": intent,
        "entities": entities,
        "has_temporal": has_temporal,
        "is_education": is_education,
        "needs_rag": (has_temporal or is_extraction or is_comparison or is_portfolio) and not is_education
    }
```

#### LLM-Based Classifier (Fallback for Ambiguous Queries)

For edge cases where rule-based fails, use a **small fast model** (Groq Llama 8B or Gemini Flash):

```python
CLASSIFIER_PROMPT = """
Classify this user query into one of: extraction, comparison, summarization, education, portfolio, system.

Also identify:
- Entities mentioned (tickers, company names)
- Does it need real-time or filing data? (yes/no)

Query: "{query}"

Output JSON:
{{"intent": "...", "entities": [...], "needs_data_retrieval": true/false}}
"""

def llm_classify(query: str) -> dict:
    response = call_groq(CLASSIFIER_PROMPT.format(query=query), temperature=0.0)
    return parse_json(response)
```

### Routing Decision Matrix

| Intent | Entities | Temporal | Route | Cache Check | RAG Needed | Model |
|--------|----------|----------|-------|-------------|------------|-------|
| education | None | No | Direct | L1 (7d TTL) | ❌ | Gemini Flash |
| extraction | 1 entity | No | Fact sheet → RAG fallback | L2 → L3 → L4 | ⚠️ (if fact sheet stale) | Gemini Flash |
| extraction | 1 entity | Yes | RAG | L1 → L4 | ✅ | Groq (bulk) / Gemini Flash (chat) |
| comparison | 2+ entities | Any | RAG (multi-entity) | L1 → L4 | ✅ | Groq / Gemini Flash |
| summarization | 1 entity | Yes | RAG (filing/news) | L1 → L3 → L4 | ✅ | Groq |
| portfolio | User holdings | Any | Portfolio cache + RAG | L1 → L3 → L4 | ✅ | Gemini Flash |
| system | None | No | Direct (or static docs) | L1 (permanent) | ❌ | Gemini Flash |

### Implementation Flow (Pseudocode)

```python
def process_query(query: str, user_id: str):
    # Step 1: Classify
    classification = classify_query(query, user_context=get_user_context(user_id))
    intent = classification["intent"]
    entities = classification["entities"]
    needs_rag = classification["needs_rag"]

    # Step 2: Cache lookup (L1)
    cache_key = compute_query_hash(query, user_id, model_version="v1.2")
    cached_result = redis.get(f"rag_answer:{cache_key}")
    if cached_result and cache_confidence(cached_result) > 0.9:
        return cached_result

    # Step 3: Route based on intent
    if intent == "education" or intent == "system":
        # Direct model, no RAG
        result = call_model_direct(query, model="gemini-flash")
        redis.setex(f"rag_answer:{cache_key}", ttl=7*24*3600, value=result)
        return result

    if intent == "extraction" and len(entities) == 1 and not classification["has_temporal"]:
        # Try fact sheet first (L2)
        ticker = entities[0]
        fact_sheet = get_fact_sheet(ticker)  # checks Redis → S3 → generate
        if fact_sheet and is_fresh(fact_sheet, max_age_days=30):
            # Answer from fact sheet if possible
            answer = extract_from_fact_sheet(fact_sheet, query)
            if answer:
                redis.setex(f"rag_answer:{cache_key}", ttl=24*3600, value=answer)
                return answer
        # Fact sheet miss or stale → fallthrough to RAG

    if needs_rag:
        # Step 4: RAG retrieval
        context_chunks = retrieve_context(query, entities, classification)

        # Step 5: Assemble prompt & call model
        prompt = assemble_rag_prompt(query, context_chunks, user_context)
        result = call_model_with_rag(prompt, model="gemini-flash")

        # Step 6: Confidence check & escalation
        confidence = extract_confidence(result)
        if confidence < 0.6:
            # Escalate to premium model
            result = call_model_with_rag(prompt, model="gemini-pro")
            flag_for_review(query, result, reason="low_confidence")

        # Step 7: Cache result
        ttl = 12*3600 if classification["has_temporal"] else 24*3600
        redis.setex(f"rag_answer:{cache_key}", ttl=ttl, value=result)

        return result

    # Fallback: direct model
    result = call_model_direct(query, model="gemini-flash")
    redis.setex(f"rag_answer:{cache_key}", ttl=24*3600, value=result)
    return result
```

---

## Critical gaps filled & recommendations summary

### Gaps Identified in Original Document

1. ❌ **No RAG usage taxonomy** → Now added: Required / Optional / Not Needed sections
2. ❌ **No cache vs RAG vs model decision tree** → Now added: 5-layer cache hierarchy + routing rules
3. ❌ **No Company Fact Sheet strategy** → Now added: schema, update triggers, lazy load, versioning
4. ❌ **No query classification logic** → Now added: rule-based + LLM fallback classifier
5. ❌ **No guidance on when to skip RAG** → Now explicit: 6 categories where RAG not needed
6. ❌ **No pattern-of-life or optional RAG use cases** → Now added: 5 optional-but-valuable scenarios
7. ❌ **No multi-hop or hybrid query handling** → Now added: query decomposition strategy
8. ❌ **No cost optimization tactics** → Now added: 80/15/5 rule, prefetch, query normalization

### Key Additions Made

1. **RAG Usage Taxonomy** (lines 133-257)
   - 5 required use cases
   - 5 optional use cases (including pattern-of-life)
   - 6 cases where RAG not needed

2. **Cache vs RAG vs Model Decision Flow** (lines 259-406)
   - 5-layer cache hierarchy (L1-L5)
   - Decision tree with routing rules
   - Cost-optimized query strategy (80/15/5 split)
   - Hybrid retrieval for complex queries

3. **Company Fact Sheet Management** (lines 408-554)
   - Full JSON schema with metadata, fundamentals, financials
   - Trigger-based update strategy (filing, daily, weekly)
   - Lazy load approach (don't pre-gen all 500 stocks)
   - Versioning & schema evolution
   - Integration with RAG pipeline

4. **Query Classification & Routing** (lines 556-713)
   - Rule-based classifier (regex + keywords)
   - LLM fallback for ambiguous cases
   - Routing decision matrix (6 intent types)
   - Full pseudocode implementation

### Recommendations for Implementation

1. **Start with rule-based classifier** → iterate to LLM if needed (cost-effective)
2. **Implement fact sheet lazy loading first** → biggest quick win for cache hit rate
3. **Monitor cache hit rates per layer** → optimize TTLs based on actual usage patterns
4. **Track "RAG not needed" queries** → ensure they're routed to direct model (cost savings)
5. **A/B test optional RAG use cases** → measure if RAG actually improves user satisfaction vs cost
6. **Build query normalization early** → synonyms, ticker aliases ("AAPL" = "Apple" = "Apple Inc")
7. **Prefetch top 100 queries weekly** → warm cache for 80% of traffic

---

## Prompt templates (samples)
**System prompt (filing summarizer):**
```
You are FinSumm-Assistant, an expert financial document summarizer. Use only the provided excerpts. For each factual statement, include the source chunk id. If a number or claim is not present in the retrieved context, say "not in provided context." Output: short headline, 5 key bullets (with chunk ids), material risks, follow-ups, suggested action.
```

**User prompt (investor chat):**
```
User portfolio: [ticker list]. Use cached summaries and latest news digests. Answer: 1-sentence thesis, 3 supporting facts (cite chunk ids), risk note, suggested action. If uncertain, ask the user to approve a deeper analysis (escalate to premium).```

---

## API flow snippets (pseudo)
1. `GET /filing/{cik}/{type}/{period}` -> check cache -> if miss -> fetch EDGAR -> preprocess -> chunk -> embed -> store -> summarize -> return.
2. `POST /batch/news` -> enqueue -> dedupe -> chunk -> embed -> batch infer (Groq) -> store digests.
3. `POST /chat/query` -> retrieve user snapshot & relevant chunks -> assemble RAG -> call Gemini Flash -> if low confidence -> escalate -> return.

---

## Monitoring, metrics & feedback loops
Track these KPIs:
- Cache hit rate (target > 85%)
- Average inference cost per summary
- Fallback rate (target < 10%)
- Hallucination flags / numeric mismatch rate
- Latency P50/P95
- User satisfaction / upvote rate

Feedback loop:
- Collect flagged outputs for manual curation.
- Periodically fine-tune re-ranker or small classifiers to reduce fallbacks.

---

## Security, compliance & governance
- Encrypt S3 buckets at rest, use signed URLs.
- PII handling: strip user PII from logs; separate telemetry and content storage.
- Retention: filings and parsed KPIs kept per TTL policy; keep an audit log of LLM outputs for 90 days.
- Rate limit API keys, use service accounts and least-privilege IAM roles.

---

## Deployment & cost ops
- Use serverless functions / Kubernetes for workers.
- Use managed vector DB (Pinecone/Chroma/Weaviate) for reliability at scale if budget allows; FAISS on ephemeral nodes is OK for cost saving.
- Expected inference + vector costs: **$35–60/month** for the hybrid setup (Groq + Gemini Flash) + storage and DB ($10–30/month).

---

## Next steps / deliverables I can produce
- Full **FastAPI microservices** skeleton for ingestion, RAG, and chat endpoints (complete with Redis caching).
- **Dockerfile + deployment scripts** for cloud provider of choice.
- **Cost calculator spreadsheet** to tune model splits (Groq vs Together vs Gemini).
- **Benchmark harness** for your sample filings & news to measure real fallback rates.

---

*Document prepared by: ChatGPT (assistant).*


