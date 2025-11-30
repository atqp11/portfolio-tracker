# User Tier Limits & Monetization Strategy

**Created:** November 20, 2025
**Status:** Ready for Implementation
**Revenue Model:** Freemium SaaS with 3 tiers

---

## 📊 Tier Comparison

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| **Price** | $0/month | $9.99/month | $29.99/month |
| **Chat Queries/Day** | 10 | 100 | Unlimited |
| **Portfolio Analysis/Day** | 1 | 10 | Unlimited |
| **SEC Filings/Month** | 3 | Unlimited | Unlimited |
| **News Updates** | 1×/day | 3×/day | Real-time |
| **AI Model** | Flash only | Flash + Pro | Flash + Pro (priority) |
| **Concurrent Requests** | 2 | 5 | 10 |
| **Escalation to Pro** | ❌ No | ✅ Yes | ✅ Yes (priority) |
| **Support** | Community | Email | Priority support |

---

## 💰 Economics Breakdown

### Cost per Active User (Monthly)

| Tier | Price | AI Cost | Margin | Margin % |
|------|-------|---------|--------|----------|
| **Free** | $0 | $0.10 | -$0.10 | N/A |
| **Pro** | $9.99 | $0.75 | $9.24 | 92.5% |
| **Premium** | $29.99 | $3.50 | $26.49 | 88.3% |

### Revenue Model (1,000 Users)

**Assumed Distribution:**
- 70% Free (700 users) → $0 revenue, $70/month AI cost
- 25% Pro (250 users) → $2,497.50 revenue, $187.50/month AI cost
- 5% Premium (50 users) → $1,499.50 revenue, $175/month AI cost

**Total Monthly:**
- Revenue: **$3,997.00**
- AI Costs: **$432.50**
- **Gross Margin: $3,564.50 (89.2%)**

**Annual (1,000 users):**
- Revenue: **$47,964/year**
- AI Costs: **$5,190/year**
- **Gross Margin: $42,774/year**

---

## 🎯 Rate Limit Details

### Free Tier Limits

**Daily:**
- 10 chat queries
- 1 portfolio analysis
- Gemini Flash only (no Pro escalation)
- Max 2 concurrent requests

**Monthly:**
- 3 SEC filing requests
- News updates: 1×/day batch only

**Annual equivalent:**
- ~3,600 chat queries/year
- ~365 portfolio analyses/year
- ~36 SEC filings/year
- Cost to serve: $1.20/year

### Pro Tier Limits

**Daily:**
- 100 chat queries
- 10 portfolio analyses
- Gemini Flash + Pro escalation
- Max 5 concurrent requests

**Monthly:**
- Unlimited SEC filings
- News updates: 3×/day batch

**Annual equivalent:**
- ~36,000 chat queries/year
- ~3,650 portfolio analyses/year
- Unlimited SEC filings
- Cost to serve: $9/year

### Premium Tier Limits

**Daily:**
- Unlimited chat queries
- Unlimited portfolio analyses
- Priority routing to Gemini Pro
- Max 10 concurrent requests

**Monthly:**
- Unlimited SEC filings
- Real-time news updates

**Annual equivalent:**
- Unlimited everything
- Expected cost to serve: $42/year

---

## 🚀 API Rate Limits (Provider)

### Groq (Bulk Processing)

**Free Tier:**
- 14,400 requests/day
- 100,000 tokens/minute
- Sufficient for ~500 users

**Paid Tier:**
- Custom limits
- Recommended at 1,000+ users

### Google Gemini Flash

**Free Tier:**
- 15 requests/minute
- 1,500 requests/day
- 1M tokens/day
- **Limitation:** Only ~150 users can use simultaneously

**Pay-as-you-go:**
- 1,000 requests/minute
- 4M tokens/minute
- **Recommended at 100+ users**

### Google Gemini Pro

**Free Tier:**
- 2 requests/minute
- 50 requests/day
- 32K tokens/day
- **Limitation:** Only for ~5 concurrent escalations

**Pay-as-you-go:**
- 1,000 requests/minute
- **Required for any production usage**

---

## ⚠️ Critical Thresholds

### When to Upgrade to Paid API Tiers

**Gemini (Pay-as-you-go):**
- ✅ Upgrade immediately (free tier too restrictive)
- Cost: ~$0.075 input, $0.30 output per 1M tokens
- Expected monthly: $15-30 for 100 users

**Groq (Paid):**
- ⏰ Upgrade at 500+ users
- Free tier sufficient for now
- Cost: $0.10 per 1M tokens (same as free)

---

## 📈 Growth Projections

### Break-Even Analysis

**Scenario 1: Conservative (70/25/5 split)**
- 700 free, 250 pro, 50 premium
- Revenue: $3,997/month
- AI costs: $433/month
- **Net: +$3,564/month** ✅

**Scenario 2: Aggressive (50/40/10 split)**
- 500 free, 400 pro, 100 premium
- Revenue: $6,996/month
- AI costs: $650/month
- **Net: +$6,346/month** ✅

**Scenario 3: Pessimistic (85/13/2 split)**
- 850 free, 130 pro, 20 premium
- Revenue: $1,898/month
- AI costs: $275/month
- **Net: +$1,623/month** ✅

**Conclusion:** Even at pessimistic conversion (15% paid), we're profitable on AI costs alone.

---

## 🛠️ Implementation Status

### ✅ Completed
- [x] Tier configuration system (`lib/auth/tier-limits.ts`)
- [x] Usage tracking (in-memory)
- [x] Quota checking functions
- [x] API endpoint (`/api/user/quota`)
- [x] Break-even calculations

### ⏳ Pending
- [ ] Integrate quota checks into AI chat route
- [ ] Add authentication (NextAuth or Clerk)
- [ ] Database-backed usage tracking (replace in-memory)
- [ ] Stripe integration for payments
- [ ] User dashboard showing quota usage
- [ ] Upgrade/downgrade flows
- [ ] Email notifications for quota warnings

---

## 🔌 API Usage

### Check User Quota

```bash
GET /api/user/quota?userId=user123&tier=pro

# Response:
{
  "userId": "user123",
  "tier": "pro",
  "limits": {
    "chatQueriesPerDay": 100,
    "portfolioAnalysisPerDay": 10,
    ...
  },
  "quotas": {
    "chatQueries": {
      "used": 23,
      "limit": 100,
      "remaining": 77
    },
    ...
  }
}
```

### Get All Tier Configs

```bash
POST /api/user/quota
Content-Type: application/json

{
  "action": "get-tiers"
}

# Response:
{
  "tiers": {
    "free": { ... },
    "pro": { ... },
    "premium": { ... }
  },
  "breakEvenAnalysis": {
    "totalMonthlyAICost": 432.50,
    "requiredRevenue": 3997.00,
    ...
  }
}
```

---

## 💡 Recommended Next Steps

### Phase 1: Authentication (Week 1)
1. Add NextAuth or Clerk for user authentication
2. Store user tier in database
3. Add tier badge to UI

### Phase 2: Quota Enforcement (Week 1-2)
1. Update `/api/ai/chat` to check quotas before processing
2. Return 429 (Too Many Requests) when quota exceeded
3. Add "Upgrade to Pro" CTA in error response

### Phase 3: Stripe Integration (Week 2-3)
1. Create Stripe products for Pro and Premium tiers
2. Add checkout flow
3. Handle webhook for subscription updates
4. Sync tier changes to database

### Phase 4: Usage Dashboard (Week 3-4)
1. Create `/dashboard/usage` page
2. Show real-time quota consumption
3. Add usage graphs (daily/monthly trends)
4. "Upgrade" button when approaching limits

### Phase 5: Monitoring (Week 4+)
1. Track conversion rate (free → pro)
2. Monitor churn rate
3. A/B test pricing
4. Add usage-based billing option

---

## 🎨 UI Mockups

### Quota Warning Banner

```
┌────────────────────────────────────────────────────────┐
│ ⚠️ You've used 8/10 chat queries today                 │
│ Upgrade to Pro for 100 queries/day                     │
│ [Upgrade Now] [Dismiss]                                │
└────────────────────────────────────────────────────────┘
```

### Tier Comparison Modal

```
┌─────────────────────────────────────────────────────────┐
│              Choose Your Plan                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  FREE        PRO          PREMIUM                       │
│  $0/mo       $9.99/mo     $29.99/mo                    │
│                                                         │
│  10 chats    100 chats    Unlimited                    │
│  1 analysis  10 analysis  Unlimited                    │
│  3 filings   Unlimited    Unlimited                    │
│                                                         │
│  [Current]   [Upgrade]    [Upgrade]                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Metrics to Track

### Usage Metrics
- Daily Active Users (DAU) by tier
- Chat queries per user (average)
- Portfolio analyses per user (average)
- SEC filing requests per user (average)

### Business Metrics
- Conversion rate (free → pro → premium)
- Churn rate by tier
- Average Revenue Per User (ARPU)
- Customer Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)

### Cost Metrics
- AI cost per user by tier
- Cache hit rate (impacts costs)
- Escalation rate (Flash → Pro)
- Total monthly AI spend

### Health Metrics
- Quota exhaustion rate (% of users hitting limits)
- Upgrade rate after hitting quota
- Downgrade rate
- Support ticket volume by tier

---

## 🚨 Risk Mitigation

### Risk: API Costs Spike

**Mitigation:**
- Set hard caps on Gemini API usage ($100/day)
- Monitor costs in real-time
- Alert when daily spend exceeds $50
- Implement graceful degradation (fallback to cached responses)

### Risk: Low Conversion Rate

**Mitigation:**
- Start with generous free tier (10 chats/day)
- Show value before paywall
- Add "Upgrade to Pro" CTAs at quota limits
- Offer 7-day free trial of Pro tier

### Risk: Provider Rate Limits

**Mitigation:**
- Upgrade to Gemini pay-as-you-go immediately
- Use Groq free tier until 500+ users
- Implement request queuing for rate limit errors
- Cache aggressively (target 85% hit rate)

---

## ✅ Current Implementation

### What's Built and Working

**Tier Configuration System** (`lib/auth/tier-limits.ts`)
- ✅ Complete tier definitions (Free, Pro, Premium)
- ✅ Rate limit configurations per tier
- ✅ Cost tracking and margin calculations
- ✅ Break-even analysis built-in
- ✅ In-memory usage tracking with daily/monthly resets
- ✅ Quota checking functions (`checkQuota`, `getUserUsageStats`)

**Cost Tracking Dashboard** (`/dashboard/costs`)
- ✅ Real-time AI usage metrics
- ✅ Cost tracking by provider (Groq, Gemini Flash, Gemini Pro)
- ✅ Performance metrics (cache hit rate, escalation rate, latency)
- ✅ Multiple time period views (1h, 24h, 7d, 30d)
- ✅ Auto-refresh capability (30-second intervals)
- ✅ Visual charts and graphs (Recharts)
  - Cost breakdown by provider (Pie Chart)
  - Requests by task type (Bar Chart)
  - Performance progress bars
  - Latency metrics cards
- ✅ Cost projections (daily, weekly, monthly, annual)
- ✅ Warning system for threshold breaches
- ✅ Export functionality for telemetry logs

**AI Telemetry System** (`lib/telemetry/ai-logger.ts`)
- ✅ In-memory logging of all AI requests
- ✅ Cost tracking per request
- ✅ Provider and model tracking
- ✅ Confidence scoring and escalation tracking
- ✅ Cache hit/miss tracking
- ✅ Latency metrics (P50, P95, average)
- ✅ Statistics aggregation by time period
- ✅ Warning detection based on target thresholds

**Multi-Model AI Router** (`lib/ai/router.ts`)
- ✅ Confidence-based routing (Groq → Gemini Flash → Gemini Pro)
- ✅ Automatic escalation on low confidence
- ✅ Cost-aware model selection
- ✅ Fallback handling for provider failures
- ✅ Integration with telemetry system

**Navigation & UI**
- ✅ Admin navigation link in main header
- ✅ Dashboard home page with feature cards
- ✅ Responsive design (mobile-friendly)
- ✅ Dark theme styling (gray-950 background)

**API Endpoints**
- ✅ `/api/user/quota` - Quota checking and tier info
- ✅ `/api/telemetry/ai` - Telemetry stats retrieval
- ✅ `/api/ai/chat` - AI chat with routing and telemetry

**Documentation**
- ✅ Complete user tier limits documentation (`USER_TIER_LIMITS.md`)
- ✅ AI model strategy documentation (`AI_MODEL_STRATEGY.md`)
- ✅ Cost tracking dashboard guide (`app/dashboard/README.md`)
- ✅ AI router documentation (`lib/ai/README.md`)

### What's Documented but Not Yet Built

**Authentication & User Management**
- ⏳ NextAuth or Clerk integration
- ⏳ User tier storage in database
- ⏳ Tier badge in UI

**Quota Enforcement**
- ⏳ Quota checks in AI chat route
- ⏳ 429 response when quota exceeded
- ⏳ "Upgrade to Pro" CTA in error responses
- ⏳ User-specific quota tracking

**Payment Integration**
- ⏳ Stripe setup (products, checkout, webhooks)
- ⏳ Subscription management
- ⏳ Upgrade/downgrade flows
- ⏳ Trial period handling

**Database-Backed Usage Tracking**
- ⏳ Replace in-memory usage tracking with database
- ⏳ User usage history storage
- ⏳ Persistent quota counters

**User Dashboard**
- ⏳ `/dashboard/usage` page
- ⏳ Quota consumption display
- ⏳ Usage graphs (daily/monthly trends)
- ⏳ Upgrade prompts when approaching limits

**Monitoring & Analytics**
- ⏳ Conversion rate tracking (free → pro)
- ⏳ Churn rate monitoring
- ⏳ Revenue reporting
- ⏳ A/B testing framework

---

## 🚀 Next Steps (Optional Enhancements)

### Phase 1: Enhanced Visualizations

**Time-Series Charts**
- Add cost over time line charts
- Hourly/daily/weekly trend analysis
- Comparison across time periods
- Cost spike detection and highlighting

**User-Specific Cost Attribution**
- Track AI costs per user ID
- Cost breakdown by user tier
- Identify high-cost users
- Cost per feature attribution (chat, analysis, filings)
- ROI calculation per user tier

### Phase 2: Advanced Alerting

**Email Alerts for Threshold Breaches**
- Send emails when:
  - Daily cost exceeds $5
  - Monthly projection exceeds $100
  - Cache hit rate drops below 80%
  - P95 latency exceeds 7 seconds
  - Escalation rate exceeds 15%
- Configurable alert thresholds per metric
- Daily/weekly summary emails

**Slack Integration for Warnings**
- Real-time Slack notifications for critical alerts
- Daily cost summary posts
- Weekly performance reports
- Integration with Slack webhooks
- Custom channel configuration

### Phase 3: Analytics & Insights

**Cost Comparison Between Tiers**
- Visual comparison of actual costs vs. revenue per tier
- Profitability heatmaps
- User distribution analysis
- Margin trends over time
- Tier migration patterns

**Budget Forecasting with ML**
- Predict future costs based on usage trends
- Seasonal adjustment models
- User growth impact projections
- Auto-scaling recommendations
- Cost optimization suggestions

### Phase 4: Reporting & Export

**Download Reports as PDF**
- Generate PDF reports with:
  - Executive summary
  - Cost breakdown charts
  - Performance metrics
  - Time-series graphs
  - Cost projections
- Scheduled report generation (weekly/monthly)
- Custom date range selection
- Branding and styling options

### Phase 5: Advanced Features

**Real-Time Dashboard Updates**
- WebSocket integration for live metrics
- Live cost counter
- Real-time alert notifications
- Collaborative viewing (multi-user)

**Cost Anomaly Detection**
- ML-based anomaly detection
- Automatic spike investigation
- Root cause analysis
- Remediation suggestions

**Advanced Quota Management**
- Burst allowances (temporary quota increases)
- Quota rollover (unused quotas)
- Custom quota rules per user
- API-based quota adjustments

**Multi-Region Cost Tracking**
- Track costs by deployment region
- Provider comparison by region
- Latency vs. cost trade-offs
- Geo-based routing optimization

### Implementation Priority

**High Priority (Near-term):**
1. User-specific cost attribution (for profitability analysis)
2. Email alerts for threshold breaches (operational necessity)
3. Time-series charts (better trend visibility)

**Medium Priority (3-6 months):**
4. Cost comparison between tiers (business insights)
5. Slack integration (team visibility)
6. PDF reports (stakeholder communication)

**Low Priority (Future/Nice-to-have):**
7. Budget forecasting with ML (advanced planning)
8. Real-time dashboard updates (optimization)
9. Cost anomaly detection (automation)

### Estimated Development Time

| Enhancement | Complexity | Dev Time |
|-------------|-----------|----------|
| Time-series charts | Low | 2-3 days |
| User-specific cost attribution | Medium | 1 week |
| Email alerts | Low | 2-3 days |
| Slack integration | Low | 1-2 days |
| Cost comparison charts | Low | 2-3 days |
| Budget forecasting (ML) | High | 2-3 weeks |
| PDF report generation | Medium | 1 week |
| Real-time updates (WebSocket) | Medium | 1 week |

**Total for all enhancements:** ~6-8 weeks of development

---

## 📚 Related Documents

- [AI Model Strategy](./AI_MODEL_STRATEGY.md)
- [System Design](./retail_stock_ai_pipeline_system_design_recommendations.md)
- [Feature Roadmap](./FEATURE_ROADMAP.md)
- [Active TODOs](./ACTIVE_TODOS.md)

---

*Last updated: November 20, 2025*
