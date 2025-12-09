# Admin Dashboard

**Created:** November 20, 2025
**Status:** ✅ **Production Ready**
**Route:** `/dashboard`

---

## Overview

The Admin Dashboard provides real-time monitoring and management capabilities for the Portfolio Tracker application, with a focus on AI cost tracking and performance metrics.

---

## Available Dashboards

### 1. Cost Tracking Dashboard (`/dashboard/costs`)

**Status:** ✅ **Active**

**For developer integration guide, see:** [docs/TELEMETRY_INTEGRATION.md](../../docs/TELEMETRY_INTEGRATION.md)

Comprehensive real-time monitoring of AI usage, costs, and performance metrics.

**Features:**
- Real-time cost tracking (Groq + Gemini)
- Performance metrics (cache hit rate, escalation rate, latency)
- Multiple time periods (1h, 24h, 7d, 30d)
- Auto-refresh (every 30 seconds)
- Visual charts and cost projections
- Metric threshold warnings

---

### 2. User Management (Coming Soon)

Manage user accounts, subscription tiers, and quotas.

**Planned Features:**
- User list with tier badges
- Quota usage per user
- Tier upgrades/downgrades
- User blocking/unblocking
- Activity logs

---

### 3. Analytics Dashboard (Coming Soon)

Business metrics and user behavior analysis.

**Planned Features:**
- Conversion funnel (free → pro → premium)
- Churn rate analysis
- Revenue trends
- Usage patterns
- Feature adoption rates

---

### 4. System Health (Coming Soon)

Infrastructure monitoring and uptime tracking.

**Planned Features:**
- Database connection health
- API provider status
- Error rate monitoring
- Uptime metrics
- Alert history

---

## Usage

### Accessing the Dashboard

```
# Development
http://localhost:3000/dashboard

# Production
https://your-domain.com/dashboard
```

**Navigation:**
- Click "Admin" button in top navigation
- Direct URL: `/dashboard/costs`

### API Endpoints

See [Telemetry Integration Guide](../../docs/TELEMETRY_INTEGRATION.md#api-reference) for complete API documentation.

---

## Dashboard Components

### MetricCard
Displays a single key metric with icon and subtitle.

**Props:**
- `title`: string
- `value`: string
- `subtitle`: string
- `icon`: string (emoji)
- `valueColor?`: string (Tailwind class)

### LatencyCard
Shows latency metric with progress bar and target comparison.

**Props:**
- `title`: string
- `value`: number (ms)
- `target`: number (ms)
- `unit`: string

### ProjectionCard
Displays cost projection for a given period.

**Props:**
- `period`: string ('Daily', 'Weekly', 'Monthly', 'Annual')
- `cost`: number
- `target?`: number

---

## Cost Breakdown

### Current Costs (Example 24h)

**Provider Breakdown:**
- Groq (Bulk): $1.20 (40%)
- Gemini Flash: $1.50 (50%)
- Gemini Pro: $0.30 (10%)

**Total:** $3.00/day → **$90/month projected**

**With 85% cache hit rate:**
- Actual API calls: 15% of requests
- Cost savings: ~$17/month
- **Effective cost: ~$73/month**

---

## Alerts & Warnings

Dashboard shows warnings when metrics exceed thresholds. See [Telemetry Integration Guide](../../docs/TELEMETRY_INTEGRATION.md#understanding-warnings) for complete threshold documentation and optimization strategies.

---

## Time Period Selection

### Available Periods

- **1h** - Last 1 hour (granular, for debugging)
- **24h** - Last 24 hours (default, daily monitoring)
- **7d** - Last 7 days (weekly trends)
- **30d** - Last 30 days (monthly analysis)

### Auto-Refresh

- **Enabled by default** (every 30 seconds)
- **Toggle button** to enable/disable
- **Useful for live monitoring** during peak hours

---

## Cost Projections

### Calculation Method

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

### Example (24h period, $2.50 cost)

- Daily: $2.50
- Weekly: $17.50
- Monthly: $75.00 ⚠️ (Above $60 target)
- Annual: $900.00

**Action:** Review escalation rate and cache settings

---

## Performance Optimization & Monitoring

See [Telemetry Integration Guide](../../docs/TELEMETRY_INTEGRATION.md#performance-optimization-strategies) for:
- Cache hit rate optimization strategies
- Escalation rate reduction techniques
- Daily, weekly, and monthly monitoring checklists
- Cost savings estimates

---

## Integration with User Tiers

### Cost Attribution (Future)

**Goal:** Track costs per user tier for profitability analysis

```typescript
// Example: User tier cost breakdown
{
  free: {
    users: 700,
    totalCost: $70,
    costPerUser: $0.10,
    revenue: $0,
    margin: -$70
  },
  pro: {
    users: 250,
    totalCost: $187.50,
    costPerUser: $0.75,
    revenue: $2497.50,
    margin: $2310
  },
  premium: {
    users: 50,
    totalCost: $175,
    costPerUser: $3.50,
    revenue: $1499.50,
    margin: $1324.50
  }
}
```

**Total Margin:** $3,564.50/month (89% gross margin)

---

## Troubleshooting

### Dashboard Not Loading

**Check:**
1. Dev server running: `npm run dev`
2. Cost dashboard accessible at `/admin/costs`
3. Browser console for errors

### No Data Showing

**Possible causes:**
- No AI requests made yet (try `/api/ai/chat`)
- In-memory logs cleared (restart dev server)
- Period selection too narrow (switch to 24h)

### Charts Not Rendering

**Check:**
- Recharts installed: `npm list recharts`
- Browser supports SVG
- Console errors (component exceptions)

---

## Development

### Adding New Metrics

```typescript
// 1. Update telemetry logger
// lib/telemetry/ai-logger.ts
export interface InferenceLog {
  // ... existing fields
  newMetric: number; // Add here
}

// 2. Update dashboard display
// app/dashboard/costs/page.tsx
<MetricCard
  title="New Metric"
  value={stats.newMetric.toString()}
  ...
/>

// 3. Add to stats calculation
// lib/telemetry/ai-logger.ts
const newMetric = periodLogs.reduce(
  (sum, log) => sum + log.newMetric, 0
);
```

### Custom Visualizations

```typescript
// Add to dashboard page
import { AreaChart, Area } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={timeSeriesData}>
    <XAxis dataKey="time" />
    <YAxis />
    <Area type="monotone" dataKey="cost" fill="#3b82f6" />
  </AreaChart>
</ResponsiveContainer>
```

---

## Related Documentation

- **[Telemetry Integration Guide](../../docs/TELEMETRY_INTEGRATION.md)** - Complete developer guide
- [AI Model Strategy](../../docs/AI_MODEL_STRATEGY.md) - Model selection strategy
- [User Tier Limits](../../docs/USER_TIER_LIMITS.md) - Tier quotas and limits
- [AI Router README](../../lib/ai/README.md) - AI system overview
- [Telemetry Logger](../../lib/telemetry/ai-logger.ts) - Source code

---

## Screenshots

### Main Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│  AI Cost Tracking Dashboard                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Total Requests    💰 Total Cost    📈 Avg Cost    ⚡ Cache│
│     1,234               $2.34           $0.0019        87.5%│
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Cost by      │  │ Requests by  │                       │
│  │ Provider     │  │ Task Type    │                       │
│  │  (Pie Chart) │  │  (Bar Chart) │                       │
│  └──────────────┘  └──────────────┘                       │
│                                                             │
│  Performance Metrics                                        │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐                 │
│  │ Cache   │ │Escalation│ │Confidence  │                 │
│  │ 87.5%   │ │  8.2%    │ │  91.3%     │                 │
│  └─────────┘ └──────────┘ └────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

*Last updated: November 26, 2025*
