# Stock Research Agent Spec vs Current App - Gap Analysis

**Date:** November 17, 2025  
**Purpose:** Identify missing features and differences between the new Stock Research Agent spec and current portfolio tracker implementation

---

## Executive Summary

### Key Differences

| Aspect | Current App (Portfolio PRD) | New Spec (Stock Research Agent) |
|--------|---------------------------|----------------------------------|
| **Primary Focus** | Personal portfolio tracking & thesis validation | Multi-user stock research platform with reports |
| **User Model** | Single user (Alex) → 10-100 users | 1,000+ users (free/premium tiers) |
| **AI Strategy** | Multi-model router (Gemini/OpenRouter) | Groq primary, DeepSeek secondary, GPT-4o-mini fallback |
| **Cost Target** | $20/month total | $100-150/month (1,000 users) = $0.01/user |
| **Report Types** | AI copilot conversations | Quick summaries (5 para) + Deep reports (2 pages) |
| **Update Frequency** | On-demand with caching | 3x daily scheduled batch jobs for Tier 1 stocks |
| **Stock Coverage** | User's portfolio only | 500 stocks (50 Tier 1 + 450 Tier 2) |
| **Caching** | 2-layer (Redis + client-side) | 3-layer (Redis hot + Supabase persistent + CDN) |
| **Job Scheduling** | None implemented | Supabase pg_cron with 5 scheduled jobs |
| **Quality Assurance** | None | Evaluation framework with confidence scoring |
| **User Tiers** | None (single user) | Free (10 stocks) vs Premium (25-50 stocks) |

---

## Missing Features in Current App

### 1. ⭐ CRITICAL: Stock Tier System

**What's Missing:**
- No concept of Tier 1 (hot stocks) vs Tier 2 (long tail)
- No batch generation strategy
- No tier promotion/demotion logic
- No usage-based tier rebalancing

**From New Spec:**
```
Tier 1 (50 stocks):
- Most popular stocks (AAPL, MSFT, etc.)
- Batch generation 3x daily (6 AM, 12 PM, 6 PM EST)
- 8-hour cache TTL
- Available to all users
- Cost: $1.13/month

Tier 2 (450 stocks):
- On-demand generation
- 24-hour cache TTL
- Premium users only
- Cost: ~$0.15/month
```

**Current App Status:** ❌ Not implemented

**Impact:** HIGH - Core architecture difference affecting scalability and cost

---

### 2. ⭐ CRITICAL: Scheduled Batch Jobs

**What's Missing:**
- No job scheduler (Supabase pg_cron or similar)
- No batch report generation
- No automated tier rebalancing
- No cache cleanup jobs
- No cost tracking jobs

**From New Spec:**
```
Job 1: Tier 1 Quick Summaries (3x daily)
- Schedule: 6 AM, 12 PM, 6 PM EST
- Generate 50 stocks in batches of 10
- Duration: 5-10 minutes
- Cost: $0.0125/run

Job 2: Deep Report Weekly Updates
- Schedule: Sunday 2 AM EST
- Update 75 reports for premium users
- Duration: 20-30 minutes
- Cost: $0.26/run

Job 3: Tier Rebalancing (Weekly)
- Schedule: Sunday 12:01 AM EST
- Analyze usage and promote/demote stocks

Job 4: Cache Cleanup (Daily)
- Schedule: 3 AM EST
- Delete stale reports >30 days

Job 5: Cost Tracking & Alerting (Hourly)
- Monitor AI spend
- Alert at 80% and 100% thresholds
```

**Current App Status:** ❌ Not implemented

**Impact:** CRITICAL - Prevents multi-user scaling and cost optimization

---

### 3. ⭐ CRITICAL: Report Types & Structure

**What's Missing:**
- No structured report generation
- No Quick Summary format (5 paragraphs)
- No Deep Research Report format (2 pages)
- No report versioning
- No confidence scoring

**From New Spec:**

**Quick Summary (6,500 tokens, $0.000325):**
1. Executive Summary (key takeaways, price, sentiment)
2. Recent News & Sentiment (3-5 headlines with analysis)
3. Fundamental Snapshot (P/E, revenue, EPS, peer comparison)
4. Technical Analysis (trend, RSI, MACD, volume)
5. Risk & Outlook (bull/bear/base case scenarios)

**Deep Research Report (40,000 tokens, $0.0035):**
1. Company Overview & Business Model (300 words)
2. Financial Deep Dive (500 words, 3-year trends)
3. Competitive Position & Moat (300 words)
4. News & Sentiment Extended (300 words, 30 days)
5. Bull/Bear/Base Case Valuation (500 words, DCF)
6. Risk Assessment & Catalysts (300 words)
7. Investment Recommendation (200 words, BUY/HOLD/SELL)

**Current App Status:** 
- ✅ Has AI copilot for conversations
- ❌ No structured report formats
- ❌ No confidence scoring
- ❌ No lazy loading for deep reports

**Impact:** HIGH - Core product differentiator missing

---

### 4. ⭐ HIGH: User Segmentation & Access Control

**What's Missing:**
- No free vs premium user tiers
- No Row Level Security (RLS) policies
- No rate limiting per user type
- No subscription management
- No access control matrix

**From New Spec:**
```
Free Users:
- 10 stocks from Tier 1 only
- Quick summaries only
- 3x daily updates
- 20 report requests/hour
- Cost: ~$0.01/month per user

Premium Users:
- 25-50 stocks from all 500
- Quick + deep reports
- 3x daily for Tier 1, 24hr cache for Tier 2
- 100 quick requests/hour, 50 deep requests/hour
- Cost: ~$1.00/month per user
```

**Current App Status:** 
- Single user system
- No authentication beyond basic setup
- No subscription tiers

**Impact:** HIGH - Prevents monetization and scaling

---

### 5. ⭐ HIGH: Quality Assurance & Evaluation

**What's Missing:**
- No report quality metrics
- No confidence scoring
- No user feedback collection
- No A/B testing framework
- No automated evaluation

**From New Spec:**
```
Quality Dimensions:
1. Accuracy (0-1): Factual correctness vs ground truth
2. Relevance (0-1): Pertinence to stock
3. Completeness (0-1): All sections present
4. Coherence (0-1): Logical flow and readability
5. Timeliness (0-1): Data freshness

Overall Confidence Score = weighted average
Target: >0.7

User Feedback:
- Star ratings (1-5)
- Quick tags (Helpful, Inaccurate, Outdated)
- Text feedback
- Implicit signals (time on page, scroll depth)
```

**Current App Status:** ❌ Not implemented

**Impact:** MEDIUM - Quality control and improvement loop missing

---

### 6. ⭐ MEDIUM: Three-Layer Caching

**What's Missing:**
- Only 2-layer cache (Redis + client-side)
- No persistent Supabase cache
- No CDN edge cache
- No stale-while-revalidate pattern
- No cache warming strategy

**From New Spec:**
```
Layer 1: Redis Hot Cache
- TTL: 5 minutes
- Top 100 most-requested stocks
- LRU eviction
- Cost: Free tier

Layer 2: Supabase Persistent Cache
- TTL: 8 hours (Tier 1), 24 hours (Tier 2), 7 days (deep)
- All generated reports
- JSONB storage
- Cost: Included

Layer 3: CDN Edge Cache (Future)
- TTL: 1 hour
- Global distribution
- Vercel CDN
```

**Current App Status:** 
- ✅ Redis cache exists
- ✅ Client-side cache via IndexedDB
- ❌ No Supabase persistent cache
- ❌ No stale-while-revalidate

**Impact:** MEDIUM - Performance and cost optimization opportunity

---

### 7. ⭐ MEDIUM: Data Sources & Processing

**What's Missing:**
- No Brave Search API integration for news
- No XBRL parsing with AI
- No sentiment analysis pipeline
- No social media sentiment (Phase 2)
- No SEC filing auto-detection

**From New Spec:**
```
News & Sentiment:
- Brave Search API (free tier, 10K requests/month)
- AI-powered sentiment scoring (Groq Llama 8B)
- Sentiment categories: Positive/Neutral/Negative
- Score: -1.0 to +1.0

XBRL Parsing:
- SEC EDGAR API for filings
- AI parsing with Groq Llama 8B (~8k tokens)
- Cost: $0.0004 per filing
- Quarterly updates
```

**Current App Status:** 
- ✅ Has Yahoo Finance integration
- ✅ Has Alpha Vantage + FMP for fundamentals
- ✅ Has NewsAPI for articles
- ❌ No Brave Search
- ❌ No XBRL AI parsing
- ❌ No sentiment scoring

**Impact:** MEDIUM - Data quality and coverage enhancement

---

### 8. ⭐ MEDIUM: Cost Management & Monitoring

**What's Missing:**
- No real-time cost dashboard
- No budget alerts
- No cost tracking per model
- No emergency throttling
- No cost projection

**From New Spec:**
```
Daily Budget: $3.33 (to stay under $100/month)

Budget Allocation:
- Quick summaries: 40% ($1.33/day)
- Deep reports: 50% ($1.67/day)
- XBRL parsing: 5% ($0.17/day)
- Buffer: 5% ($0.17/day)

Alerts:
- Warning: 80% daily budget
- Critical: 90% (auto-throttle)
- Emergency: 100% (stop + serve stale)

Emergency Measures:
- Extend cache TTL by 2x
- Serve stale reports with warning
- Queue non-critical requests
- Notify admin via Slack/email
```

**Current App Status:** 
- ✅ Basic rate limit tracking
- ❌ No cost tracking
- ❌ No budget alerts
- ❌ No cost dashboard

**Impact:** MEDIUM - Risk of cost overruns

---

### 9. ⭐ LOW: Monitoring & Observability

**What's Missing:**
- No Sentry integration
- No Datadog metrics
- No comprehensive dashboards
- No health check endpoint
- No alert severity levels

**From New Spec:**
```
Monitoring Stack:
- Sentry: Error tracking and performance
- Datadog: Metrics, logs, APM
- Google Analytics: User behavior
- Custom Dashboard: Cost tracking

Key Metrics:
- API response time (p50, p95, p99)
- Cache hit rate
- Error rate
- Job completion rate
- Cost per report
- User satisfaction scores

Health Check Endpoint: /api/health
- Database connectivity
- Redis connectivity
- AI provider availability
- Data provider availability
```

**Current App Status:** 
- ✅ Basic console logging
- ❌ No Sentry
- ❌ No Datadog
- ❌ No health checks
- ❌ No dashboards

**Impact:** LOW - Operational visibility improvement

---

### 10. ⭐ LOW: Security & Compliance

**What's Missing:**
- No comprehensive security architecture
- No GDPR/CCPA compliance
- No audit logging
- No incident response playbooks
- No disaster recovery plan

**From New Spec:**
```
Security Features:
- Supabase Auth with JWT
- Row Level Security (RLS)
- Rate limiting per user tier
- Input validation with Zod
- Encryption at rest and in transit
- Secrets rotation policy

Compliance:
- GDPR compliant (EU users)
- CCPA compliant (California)
- Data retention policies
- Right to deletion
- Data export capability

Incident Response:
- Severity levels (Critical/High/Medium/Low)
- Response time SLAs
- Communication plan
- Post-mortem process
```

**Current App Status:** 
- ✅ Basic env variable protection
- ✅ Vercel security defaults
- ❌ No formal security architecture
- ❌ No compliance considerations
- ❌ No incident response plan

**Impact:** LOW - Important for enterprise/scale but not MVP

---

## Architectural Differences

### AI Model Strategy

**Current App (Portfolio PRD):**
- Multi-model router with OpenRouter
- Tier 1: DeepSeek v3, Qwen Plus, Llama 3.1-70B
- Tier 2: Gemini 2.0 Flash Thinking, Qwen Max
- Tier 3: Gemini 2.0 Flash Thinking, DeepSeek Reasoner
- Fallback: Mistral Large, Llama 3.1-405B, Gemini
- Cost target: $20/month total

**New Spec (Stock Research Agent):**
- Groq Llama 3.1 8B primary ($0.05/M tokens)
- DeepSeek V3 secondary ($0.27/M tokens)
- GPT-4o-mini fallback ($0.60/M tokens)
- Smart routing based on task type
- Cost target: $100-150/month (1,000 users)

**Recommendation:** 
- New spec is more cost-optimized with Groq
- Consider hybrid: Groq for quick summaries, current models for deep analysis
- Implement fallback chain from both specs

### Caching Strategy

**Current App:**
- 2-layer: Redis (hot) + IndexedDB (client)
- Server-side 5-minute TTL
- Client-side longer TTL
- Cache key hashing

**New Spec:**
- 3-layer: Redis (5 min) + Supabase (hours/days) + CDN (future)
- Stale-while-revalidate pattern
- Cache warming for Tier 1 stocks
- Complex invalidation rules

**Recommendation:**
- Adopt 3-layer architecture
- Implement stale-while-revalidate
- Use Supabase for persistent storage
- Keep current client-side caching

### Update Frequency

**Current App:**
- On-demand with caching
- User-triggered refreshes
- No scheduled updates

**New Spec:**
- 3x daily batch jobs (6 AM, 12 PM, 6 PM)
- Weekly deep report updates
- Predictive cache warming
- Scheduled tier rebalancing

**Recommendation:**
- Implement batch jobs for scalability
- Keep on-demand for immediate needs
- Hybrid approach: scheduled + on-demand

---

## Implementation Priority

### Phase 1: Critical Foundation (Week 1-2)
1. ✅ **Multi-model router** (partially done, needs Groq integration)
2. ❌ **Stock tier system** (Tier 1/Tier 2 logic)
3. ❌ **Report type structures** (Quick Summary + Deep Report schemas)
4. ❌ **Supabase pg_cron setup** (job scheduler)
5. ❌ **3-layer caching** (add Supabase persistent layer)

### Phase 2: User & Quality (Week 3-4)
6. ❌ **User tiers** (free/premium with RLS)
7. ❌ **Rate limiting per tier**
8. ❌ **Quality evaluation framework**
9. ❌ **User feedback collection**
10. ❌ **Cost tracking dashboard**

### Phase 3: Automation & Scale (Week 5-6)
11. ❌ **Batch job: Tier 1 quick summaries** (3x daily)
12. ❌ **Batch job: Deep report weekly updates**
13. ❌ **Batch job: Tier rebalancing**
14. ❌ **Stale-while-revalidate pattern**
15. ❌ **Cache warming strategy**

### Phase 4: Data & Intelligence (Week 7-8)
16. ❌ **Brave Search API integration**
17. ❌ **XBRL parsing with AI**
18. ❌ **Sentiment analysis pipeline**
19. ❌ **News aggregation improvements**
20. ❌ **A/B testing framework**

### Phase 5: Monitoring & Security (Week 9-10)
21. ❌ **Sentry integration**
22. ❌ **Cost monitoring & alerts**
23. ❌ **Health check endpoint**
24. ❌ **Security hardening**
25. ❌ **Disaster recovery plan**

---

## Feature Alignment Table

| Feature | Current App | New Spec | Priority | Effort |
|---------|------------|----------|----------|--------|
| AI Multi-model Router | ✅ Partial | ✅ Required | HIGH | 2 days |
| Groq Integration | ❌ None | ✅ Primary | HIGH | 1 day |
| Stock Tier System | ❌ None | ✅ Required | CRITICAL | 3 days |
| Batch Job Scheduler | ❌ None | ✅ Required | CRITICAL | 2 days |
| Quick Summary Reports | ❌ None | ✅ Required | CRITICAL | 3 days |
| Deep Research Reports | ❌ None | ✅ Required | HIGH | 4 days |
| User Tiers (Free/Premium) | ❌ None | ✅ Required | HIGH | 3 days |
| Row Level Security | ❌ None | ✅ Required | HIGH | 2 days |
| 3-Layer Caching | ⚠️ 2-layer | ✅ Required | MEDIUM | 2 days |
| Stale-While-Revalidate | ❌ None | ✅ Required | MEDIUM | 1 day |
| Quality Evaluation | ❌ None | ✅ Required | MEDIUM | 3 days |
| User Feedback System | ❌ None | ✅ Required | MEDIUM | 2 days |
| Cost Tracking Dashboard | ❌ None | ✅ Required | MEDIUM | 2 days |
| Brave Search Integration | ❌ None | ⚠️ Optional | LOW | 1 day |
| XBRL AI Parsing | ❌ None | ⚠️ Optional | LOW | 2 days |
| Sentiment Analysis | ❌ None | ✅ Required | MEDIUM | 2 days |
| Monitoring (Sentry/Datadog) | ❌ None | ⚠️ Optional | LOW | 1 day |
| Health Check Endpoint | ❌ None | ⚠️ Optional | LOW | 0.5 day |

**Legend:**
- ✅ Implemented
- ⚠️ Partial
- ❌ Not implemented

---

## Cost Comparison

### Current App (Portfolio PRD)
- Target: $20/month
- User: Single user (Alex)
- Models: OpenRouter multi-model
- Caching: Aggressive (client + server)
- Updates: On-demand
- **Per-user cost:** $20/month (1 user)

### New Spec (Stock Research Agent)
- Target: $100-150/month
- Users: 1,000 users (free + premium)
- Models: Groq primary, DeepSeek secondary
- Caching: 3-layer with scheduled batches
- Updates: 3x daily + weekly deep
- **Per-user cost:** $0.10-0.15/month

**Conclusion:** New spec is 133-200x more cost-efficient per user due to:
1. Batch generation for popular stocks
2. Cheaper primary model (Groq)
3. Aggressive caching with 90%+ hit rate
4. Tier system preventing duplicate work

---

## Recommendations

### 1. Adopt Core Architecture from New Spec
- Stock tier system
- Batch job scheduler
- 3-layer caching
- Stale-while-revalidate

**Rationale:** These enable cost-efficient scaling to 100+ users

### 2. Keep Current App's Strengths
- Thesis tracking & validation
- Investment checklist system
- Risk analytics dashboard
- Portfolio-specific features

**Rationale:** Differentiated features not in new spec

### 3. Hybrid AI Strategy
- Use Groq for quick summaries (cost-effective)
- Use current multi-model router for deep analysis
- Keep Gemini for thesis validation (existing integration)

**Rationale:** Best of both worlds - cost + quality

### 4. Implement in Phases
- Phase 1: Core architecture (tier system, batch jobs)
- Phase 2: User tiers & quality (free/premium, feedback)
- Phase 3: Automation & scale (scheduled jobs, caching)
- Phase 4-5: Enhancements (data sources, monitoring)

**Rationale:** Progressive enhancement, validate at each step

### 5. Merge Report Types with Existing Features
- Quick summaries → New feature
- Deep reports → Enhanced thesis validation
- AI copilot → Keeps conversational interface

**Rationale:** Combine structured reports with flexible chat

---

## Next Steps

1. **Review & Prioritize:** Discuss with stakeholders which features to adopt
2. **Architecture Decision:** Finalize hybrid approach (tier system + current features)
3. **Database Schema:** Design tables for stock tiers, reports, user tiers, feedback
4. **Prototype:** Build Tier 1 batch job with Groq for 10 stocks
5. **Validate:** Test cost, quality, and performance
6. **Iterate:** Expand based on learnings

---

**Document Status:** DRAFT for review  
**Next Review:** After stakeholder discussion  
**Decision Deadline:** Before starting Phase 1 implementation
